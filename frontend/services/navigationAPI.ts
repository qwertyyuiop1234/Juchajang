
import { diskCache } from '../utils/diskCache';

// 단순화된 API URL 설정 (ngrok 터널만 사용)
const getApiBaseUrl = () => {
  // 개발/프로덕션 상관없이 ngrok 터널 사용
  const ngrokUrl = "https://bb8ce69870ae.ngrok-free.app/api";
  console.log("🚇 ngrok 터널 URL 강제 사용:", ngrokUrl);
  return ngrokUrl;
};

const API_BASE_URL = getApiBaseUrl();

// 디버깅을 위해 API URL 로그 출력
console.log("🔍 API_BASE_URL:", API_BASE_URL);

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DirectionRequest {
  start: Coordinates;
  goal: Coordinates;
  option?: "trafast" | "tracomfort" | "traoptimal";
}

interface WaypointsDirectionRequest extends DirectionRequest {
  waypoints?: Coordinates[];
}

interface RouteDeviationRequest {
  currentLocation: Coordinates;
  path: number[];
  threshold?: number;
}

interface RerouteRequest {
  currentLocation: Coordinates;
  originalGoal: Coordinates;
  option?: "trafast" | "tracomfort" | "traoptimal";
}

export interface DirectionResponse {
  distance: number;
  duration: number;
  tollFare: number;
  fuelPrice: number;
  path: number[];
  guide: any[];
  section: any[];
  bbox: number[];
  polyline: Coordinates[];
  type?: string;
  rerouted?: boolean;
  timestamp?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class NavigationAPI {
  // 간단한 메모리 캐시 (TTL)
  private cache = new Map<string, { data: any; expiry: number }>();
  private inflight = new Map<string, AbortController>();
  private readonly defaultTtlMs = 60_000; // 60s

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...options.headers,
      },
      ...options,
    };

    // 디버그 레벨 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log("🌐 API 요청:", url);
      console.log("⚙️ 요청 옵션:", config);
    }

    try {
      const response = await fetch(url, config);
      
      // 성공 응답은 디버그 레벨에서만 로깅
      if (process.env.NODE_ENV === 'development') {
        console.log("📡 응답 상태:", response.status);
      }

      const result: ApiResponse<T> = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log("📦 응답 데이터 요약:", {
          success: result.success,
          거리: `${(result.data as any)?.distance}m`,
          시간: `${Math.round((result.data as any)?.duration / 1000)}초`,
          길안내_개수: (result.data as any)?.guide?.length || 0,
          첫_길안내_예시: (result.data as any)?.guide?.[0] || '데이터 없음',
          통행료: `${(result.data as any)?.tollFare}원`,
          유류비: `${(result.data as any)?.fuelPrice}원`
        });
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      return result.data as T;
    } catch (error) {
      // AbortError는 사용자 의도적 취소이므로 무해화 처리 (디버그 레벨만)
      if (error instanceof Error && error.name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`🔄 요청 취소됨: ${endpoint} (AbortError)`);
        }
        throw error; // 상위에서 처리하도록 전파
      }

      // 5xx 서버 오류나 네트워크 오류에만 재시도 (최대 1회)
      const isRetryable = (
        (error instanceof Error && error.message.includes('HTTP error! status: 5')) ||
        (error instanceof TypeError && error.message.includes('fetch'))
      );

      if (isRetryable && retryCount === 0) {
        const delay = 200 + Math.random() * 200; // 200-400ms 지수백오프
        console.warn(`🔄 재시도 예정 (${delay.toFixed(0)}ms 후): ${endpoint}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      // 심각한 오류만 에러 레벨로 로깅
      console.error(`❌ API request failed: ${endpoint}`, error);
      if (process.env.NODE_ENV === 'development') {
        console.error("🔍 전체 URL:", url);
      }
      throw error;
    }
  }

  async getDirections(request: DirectionRequest): Promise<DirectionResponse> {
    return this.request<DirectionResponse>("/navigation/directions", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getMultipleRoutes(
    start: Coordinates,
    goal: Coordinates
  ): Promise<DirectionResponse[]> {
    return this.request<DirectionResponse[]>(
      "/navigation/directions/multiple",
      {
        method: "POST",
        body: JSON.stringify({ start, goal }),
      }
    );
  }

  async getDirectionsWithWaypoints(
    request: WaypointsDirectionRequest
  ): Promise<DirectionResponse> {
    return this.request<DirectionResponse>("/navigation/directions/waypoints", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async checkRouteDeviation(request: RouteDeviationRequest): Promise<{
    isDeviated: boolean;
    nearestPoint: {
      index: number;
      distance: number;
      point: Coordinates;
    };
    threshold: number;
  }> {
    return this.request("/navigation/route/deviation-check", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getReroute(request: RerouteRequest): Promise<DirectionResponse> {
    return this.request<DirectionResponse>("/navigation/route/reroute", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getNearbyParkingTopN(
    latitude: number,
    longitude: number,
    limit: number = 10,
    radiusKm?: number,
    signal?: AbortSignal
  ): Promise<Array<{
    parking_code: string;
    parking_name: string;
    addr: string;
    lat_wgs84: string;
    lng_wgs84: string;
    distance_km: number;
    pay_yn_name?: string;
    weekday_begin?: string;
    weekday_end?: string;
    rates?: string;
    time_rate?: string;
    add_rates?: string;
    add_time_rate?: string;
  }>> {
    const body: any = { latitude, longitude, limit };
    if (radiusKm) body.radiusKm = radiusKm;
    return this.request('/parking/nearby', {
      method: 'POST',
      body: JSON.stringify(body),
      signal
    });
  }

  async getAllParkingLotsInBounds(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 5,
    zoomLevel?: number
  ): Promise<Array<{
    parking_code: string;
    parking_name: string;
    addr: string;
    lat_wgs84: string;
    lng_wgs84: string;
    parking_status_name?: string;
    capacity?: number;
    cur_parking?: number;
    available?: number;
    statusColor?: string;
  }>> {
    const zoom = zoomLevel || 15;
    const key = `nearby:${centerLat.toFixed(4)},${centerLng.toFixed(4)},${radiusKm},z${zoom}`;
    const now = Date.now();

    // 1. 메모리 캐시 확인 (가장 빠름)
    const memoryCached = this.cache.get(key);
    if (memoryCached && memoryCached.expiry > now) {
      return memoryCached.data;
    }

    // 2. 디스크 캐시 확인 (SWR: 즉시 반환)
    const diskCached = await diskCache.get(centerLat, centerLng, radiusKm, zoom);
    if (diskCached) {
      // 메모리 캐시에도 저장 (다음 요청을 위해)
      this.cache.set(key, { data: diskCached, expiry: now + this.defaultTtlMs });
      
      // 백그라운드에서 네트워크 요청 (SWR)
      this.refreshInBackground(centerLat, centerLng, radiusKm, zoom, key);
      
      return diskCached as Array<{
        parking_code: string;
        parking_name: string;
        addr: string;
        lat_wgs84: string;
        lng_wgs84: string;
        parking_status_name?: string;
        capacity?: number;
        cur_parking?: number;
        available?: number;
        statusColor?: string;
      }>;
    }

    // 3. 네트워크 요청 (캐시 미스)
    return this.fetchFromNetwork(centerLat, centerLng, radiusKm, zoom, key);
  }

  /**
   * 백그라운드에서 데이터 갱신 (SWR)
   */
  private async refreshInBackground(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    zoom: number,
    key: string
  ): Promise<void> {
    try {
      const freshData = await this.fetchFromNetwork(centerLat, centerLng, radiusKm, zoom, key);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 백그라운드 갱신 완료:', key);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('🔄 백그라운드 갱신 실패:', error);
      }
      // 백그라운드 갱신 실패는 무시 (캐시된 데이터 유지)
    }
  }

  /**
   * 네트워크에서 데이터 가져오기
   */
  private async fetchFromNetwork(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    zoom: number,
    key: string
  ): Promise<Array<{
    parking_code: string;
    parking_name: string;
    addr: string;
    lat_wgs84: string;
    lng_wgs84: string;
    parking_status_name?: string;
    capacity?: number;
    cur_parking?: number;
    available?: number;
    statusColor?: string;
  }>> {
    const now = Date.now();
    
    // 동일 키의 진행 중 요청이 있으면 취소
    const prev = this.inflight.get(key);
    if (prev) {
      try { prev.abort(); } catch {}
      this.inflight.delete(key);
    }

    const controller = new AbortController();
    this.inflight.set(key, controller);

    try {
      // 1차: nearby API 시도
      const data = await this.request<Array<{
        parking_code: string;
        parking_name: string;
        addr: string;
        lat_wgs84: string;
        lng_wgs84: string;
        parking_status_name?: string;
        capacity?: number;
        cur_parking?: number;
        available?: number;
        statusColor?: string;
      }>>('/parking/nearby', {
        method: 'POST',
        body: JSON.stringify({
          latitude: centerLat,
          longitude: centerLng,
          limit: 30, // 30개만 요청 (백엔드에서 거리순 정렬된 상위 30개 반환)
          radiusKm: radiusKm
        }),
        signal: controller.signal
      });
      
      // 성공 시 모든 캐시에 저장 (write-through)
      this.cache.set(key, { data, expiry: now + this.defaultTtlMs });
      await diskCache.set(centerLat, centerLng, radiusKm, zoom, data);
      
      return data;
    } catch (error) {
      // AbortError는 무해화 처리 (빈 배열 반환)
      if (error instanceof Error && error.name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.debug('🔄 주차장 마커 로드 취소됨 (AbortError)');
        }
        return [];
      }

      // 2차: in-bounds API 폴백 시도 (5xx/네트워크 오류만)
      const isRetryable = (
        (error instanceof Error && error.message.includes('HTTP error! status: 5')) ||
        (error instanceof TypeError && error.message.includes('fetch'))
      );

      if (isRetryable) {
        console.warn('🔄 nearby API 실패, in-bounds API로 폴백 시도');
        try {
          // 바운딩 박스 계산
          const latDelta = radiusKm / 111;
          const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
          const minLat = centerLat - latDelta;
          const maxLat = centerLat + latDelta;
          const minLng = centerLng - lngDelta;
          const maxLng = centerLng + lngDelta;

          const fallbackData = await this.request<Array<{
            parking_code: string;
            parking_name: string;
            addr: string;
            lat_wgs84: string;
            lng_wgs84: string;
            parking_status_name?: string;
            capacity?: number;
            cur_parking?: number;
            available?: number;
            statusColor?: string;
          }>>('/parking/in-bounds', {
            method: 'POST',
            body: JSON.stringify({
              minLat,
              minLng,
              maxLat,
              maxLng,
              limit: 100
            }),
            signal: controller.signal
          });

          // 폴백 성공 시에도 캐시에 저장
          this.cache.set(key, { data: fallbackData, expiry: now + this.defaultTtlMs });
          await diskCache.set(centerLat, centerLng, radiusKm, zoom, fallbackData);
          
          return fallbackData;
        } catch (fallbackError) {
          console.error('❌ 폴백 API도 실패:', fallbackError);
          // 폴백도 실패하면 빈 배열 반환
          return [];
        }
      }

      // 재시도 불가능한 오류는 그대로 전파
      throw error;
    } finally {
      this.inflight.delete(key);
    }
  }

  async getParkingDetail(parkingCode: string | number): Promise<{ success: boolean; data?: any; message?: string; }> {
    return this.request(`/parking/${parkingCode}`, {
      method: 'GET'
    });
  }

  async getParkingPredictions(parkingCode: string | number): Promise<{ success: boolean; data?: any; message?: string; }> {
    return this.request(`/parking/${parkingCode}/predictions`, {
      method: 'GET'
    });
  }

  async reportParkingStatus(
    parkingCode: string | number,
    statusName: '여유' | '보통' | '혼잡'
  ): Promise<{ success: boolean; message?: string; }>{
    return this.request(`/parking/status/report`, {
      method: 'POST',
      body: JSON.stringify({ parkingCode, statusName })
    });
  }

  async searchParkingLots(
    query: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    data?: Array<{
      parking_code: string;
      parking_name: string;
      addr: string;
      lat_wgs84: string;
      lng_wgs84: string;
      distance_km: number;
      average_rating: number;
      total_reviews: number;
      capacity?: number;
      cur_parking?: number;
      parking_status_name?: string;
      rates?: string;
      time_rate?: string;
      pay_yn_name?: string;
      weekday_begin?: string;
      weekday_end?: string;
    }>;
    total_found?: number;
    query?: string;
    message?: string;
  }> {
    // 검색 API는 전체 응답 객체를 반환해야 함 (다른 API들과 동일)
    const url = `${API_BASE_URL}/parking/search`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      method: "POST",
      body: JSON.stringify({ query, limit }),
    };

    console.log("🌐 검색 API 요청:", url);
    console.log("⚙️ 검색 요청 옵션:", config);

    try {
      const response = await fetch(url, config);
      console.log("📡 검색 응답 상태:", response.status);

      const result = await response.json();
      console.log("📦 검색 응답 전체:", result);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return result; // 전체 응답 객체 반환
    } catch (error) {
      console.error(`❌ 검색 API request failed:`, error);
      throw error;
    }
  }

  async searchPlace(
    query: string,
    display: number = 5,
    start: number = 1,
    sort: string = "random"
  ): Promise<{
    total: number;
    display: number;
    items: Array<{
      title: string;
      link: string;
      category: string;
      description: string;
      telephone: string;
      address: string;
      roadAddress: string;
      mapx: number;
      mapy: number;
    }>;
  }> {
    const params = new URLSearchParams({
      query,
      display: display.toString(),
      start: start.toString(),
      sort,
    });

    return this.request(`/navigation/search/place?${params}`, {
      method: "GET",
    });
  }

  async searchNearbyParkingLots(
    latitude: number,
    longitude: number,
    radius: number = 1000
  ): Promise<{
    destination: {
      latitude: number;
      longitude: number;
    };
    parkingLots: Array<{
      title: string;
      link: string;
      category: string;
      description: string;
      telephone: string;
      address: string;
      roadAddress: string;
      mapx: number;
      mapy: number;
      distance: number;
    }>;
  }> {
    return this.request("/navigation/search/nearby-parking", {
      method: "POST",
      body: JSON.stringify({
        latitude,
        longitude,
        radius,
      }),
    });
  }


  async getAIParkingRecommendations(
    destinationLat: number,
    destinationLng: number,
    numRecommendations: number = 3,
    predictionTime?: string
  ): Promise<{
    success: boolean;
    data: Array<{
      parking_code: string;
      parking_name: string;
      addr: string;
      coordinates: [number, number];
      predicted_available: number;
      congestion_level: string;
      congestion_rate: number;
      distance_km: number;
      total_score: number;
      tel?: string;
      pay_yn_name?: string;
      weekday_begin?: string;
      weekday_end?: string;
    }>;
    total_found: number;
    prediction_time: string;
    models_trained: number;
    message: string;
  }> {
    const body: any = {
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      num_recommendations: numRecommendations,
    };

    if (predictionTime) {
      body.prediction_time = predictionTime;
    }

    // AI 추천 API는 전체 응답 객체를 반환해야 함
    const url = `${API_BASE_URL}/parking/recommend-ai`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      method: "POST",
      body: JSON.stringify(body),
    };

    // AI 추천은 Prophet 모델 학습으로 인해 시간이 오래 걸릴 수 있음
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90초 타임아웃
    config.signal = controller.signal;

    console.log("🌐 AI API 요청:", url);
    console.log("⚙️ AI 요청 옵션:", config);

    try {
      const response = await fetch(url, config);
      console.log("📡 AI 응답 상태:", response.status);

      const result = await response.json();
      console.log("📦 AI 응답 전체:", result);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      clearTimeout(timeoutId); // 성공 시 타임아웃 해제
      return result;
    } catch (error) {
      clearTimeout(timeoutId); // 에러 시 타임아웃 해제
      console.error(`❌ AI API request failed:`, error);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI 추천 요청이 시간 초과되었습니다. (90초)");
      }

      throw error;
    }
  }


  /**
   * 캐시 초기화 (앱 시작 시)
   */
  async initializeCache(): Promise<void> {
    await diskCache.preloadRecentKeys();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 NavigationAPI 캐시 초기화 완료');
    }
  }

  /**
   * 캐시 무효화 (필요 시)
   */
  async invalidateCache(): Promise<void> {
    this.cache.clear();
    this.inflight.clear();
    await diskCache.invalidateAll();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 NavigationAPI 캐시 무효화 완료');
    }
  }
}

export const navigationAPI = new NavigationAPI();
export default navigationAPI;
