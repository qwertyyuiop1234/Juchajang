import { NativeModules, Platform } from "react-native";

// 여러 방법으로 개발 서버 호스트를 감지
const getApiBaseUrl = () => {
  if (__DEV__) {
    console.log("🔍 개발 환경에서 API 서버 주소 감지 중...");

    // iOS에서 핫스팟 사용 시 강제로 터널 URL 사용
    if (Platform.OS === "ios") {
      console.log(
        "📱 iOS 환경 - 핫스팟 Client Isolation 문제로 인해 터널 URL 강제 사용"
      );
      const tunnelUrl = "https://2d0a36f94585.ngrok-free.app/api";
      console.log("🚇 백엔드 터널 URL 사용:", tunnelUrl);
      return tunnelUrl;
    }

    // Android나 기타 환경에서는 기존 로직 사용
    try {
      const scriptURL = NativeModules.SourceCode?.scriptURL;
      console.log("📱 Script URL:", scriptURL);

      if (scriptURL && scriptURL.includes("://")) {
        const urlParts = scriptURL.split("://");
        const protocol = urlParts[0];
        const hostAndPath = urlParts[1];
        const host = hostAndPath.split("/")[0].split(":")[0];

        console.log("🔍 Protocol:", protocol);
        console.log("🔍 추출된 호스트:", host);

        if (
          host.includes(".exp.direct") ||
          host.includes(".ngrok.io") ||
          host.includes(".localtunnel.me")
        ) {
          const detectedUrl = `${protocol}://${host}/api`;
          console.log("🚇 터널 모드 감지된 API URL:", detectedUrl);
          return detectedUrl;
        } else if (
          host !== "localhost" &&
          host !== "127.0.0.1" &&
          host !== "::1"
        ) {
          const detectedUrl = `${protocol}://${host}:5001/api`;
          console.log("✅ 자동 감지된 API URL (IP):", detectedUrl);
          return detectedUrl;
        }
      }
    } catch (error) {
      console.log("❌ 스크립트 URL 방식 실패:", error);
    }

    // 환경 변수 폴백
    const envHost = process.env.EXPO_PUBLIC_DEV_SERVER_HOST;
    if (envHost && envHost !== "localhost") {
      const detectedUrl = `http://${envHost}:5001/api`;
      console.log("✅ 환경변수로 감지된 API URL:", detectedUrl);
      return detectedUrl;
    }

    // Android 에뮬레이터 폴백
    const fallbackUrl = "http://10.0.2.2:5001/api";
    console.log("🤖 Android/기타 폴백 URL:", fallbackUrl);
    return fallbackUrl;
  }

  // 프로덕션 환경
  return "https://your-production-api.com/api";
};

// ngrok 터널 URL 사용 (고정)
const API_BASE_URL = "https://2d0a36f94585.ngrok-free.app/api";

// 동적 감지 사용 시
// const API_BASE_URL = getApiBaseUrl();

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
