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
      const tunnelUrl = "https://9de419250648.ngrok-free.app/api";
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
}

export const navigationAPI = new NavigationAPI();
export default navigationAPI;
