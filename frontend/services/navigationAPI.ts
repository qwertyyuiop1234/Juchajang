
// 단순화된 API URL 설정 (ngrok 터널만 사용)
const getApiBaseUrl = () => {
  // 개발/프로덕션 상관없이 ngrok 터널 사용
  const ngrokUrl = "https://477995459e77.ngrok-free.app/api";
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
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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

    console.log("🌐 API 요청:", url);
    console.log("⚙️ 요청 옵션:", config);

    try {
      const response = await fetch(url, config);
      console.log("📡 응답 상태:", response.status);

      const result: ApiResponse<T> = await response.json();
      console.log("📦 응답 데이터:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      return result.data as T;
    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error);
      console.error("🔍 전체 URL:", url);
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
    radiusKm?: number
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
      body: JSON.stringify(body)
    });
  }

  async getParkingDetail(parkingCode: string | number): Promise<{ success: boolean; data?: any; message?: string; }> {
    return this.request(`/parking/detail/${parkingCode}`, {
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

  async getParkingRecommendations(
    destinationLat: number,
    destinationLng: number,
    numRecommendations: number = 3
  ): Promise<{
    success: boolean;
    data: Array<{
      parking_code: string;
      parking_name: string;
      addr: string;
      coordinates: [number, number];
      distance_km: number;
      tel?: string;
      pay_yn_name?: string;
      weekday_begin?: string;
      weekday_end?: string;
    }>;
    total_found: number;
    message: string;
  }> {
    const body = {
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      num_recommendations: numRecommendations,
    };

    // 거리기반 추천 API는 전체 응답 객체를 반환해야 함
    const url = `${API_BASE_URL}/parking/recommend`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      method: "POST",
      body: JSON.stringify(body),
    };

    console.log("🌐 거리기반 API 요청:", url);
    console.log("⚙️ 거리기반 요청 옵션:", config);

    try {
      const response = await fetch(url, config);
      console.log("📡 거리기반 응답 상태:", response.status);

      const result = await response.json();
      console.log("📦 거리기반 응답 전체:", result);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ 거리기반 API request failed:`, error);
      throw error;
    }
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
}

export const navigationAPI = new NavigationAPI();
export default navigationAPI;
