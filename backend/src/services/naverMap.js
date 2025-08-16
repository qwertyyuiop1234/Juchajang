import { ENV } from "../config/env.js";
import axios from "axios";

export class NaverMapService {
  constructor() {
    this.baseUrl = "https://maps.apigw.ntruss.com";
    this.clientId = ENV.NAVER_CLIENT_ID;
    this.clientSecret = ENV.NAVER_CLIENT_SECRET;
    this.localClientId = ENV.NAVER_CLIENT_LOCAL_ID;
    this.localClientSecret = ENV.NAVER_CLIENT_LOCAL_SECRET;
    this.googleApiKey = ENV.GOOGLE_MAPS_API_KEY;
  }

  async getDirections(start, goal, option = "trafast") {
    try {
      console.log("🗺️ Naver Directions 5 API 경로 검색 시작:", {
        start: `${start.longitude},${start.latitude}`,
        goal: `${goal.longitude},${goal.latitude}`,
        option,
      });

      return await this.getDirectionsFromNaver(start, goal, option);
    } catch (error) {
      console.error("❌ Naver Directions 5 API 실패:", error.message);
      throw error;
    }
  }

  async getDirectionsFromNaver(start, goal, option) {
    console.log("🔵 네이버 클라우드 플랫폼 Directions 5 API 시도");

    // Directions 5 API 엔드포인트 사용
    const url = `${this.baseUrl}/map-direction/v1/driving`;
    const params = new URLSearchParams({
      start: `${start.longitude},${start.latitude}`,
      goal: `${goal.longitude},${goal.latitude}`,
      option: option,
    });

    console.log(`🌐 Directions 5 API URL: ${url}?${params}`);
    console.log(
      `🔑 API 키 정보: { clientId: '${this.clientId?.slice(
        0,
        4
      )}***', clientSecret: '${this.clientSecret?.slice(0, 4)}***' }`
    );

    const response = await fetch(`${url}?${params}`, {
      method: "GET",
      headers: {
        "X-NCP-APIGW-API-KEY-ID": this.clientId,
        "X-NCP-APIGW-API-KEY": this.clientSecret,
        Accept: "application/json",
      },
    });

    console.log(`📡 Directions 5 API 응답 상태: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Directions 5 API HTTP 에러: ${response.status}`);
      console.error(`❌ 에러 응답: ${errorText}`);
      throw new Error(
        `Naver Directions 5 API failed: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("✅ 네이버 Directions 5 API 성공");
    console.log("📊 응답 데이터 구조:", Object.keys(data));
    return this.formatDirectionResponse(data);
  }

  async getDirectionsFromGoogle(start, goal, option) {
    console.log("🔵 Google Directions API 시도");

    const url = "https://maps.googleapis.com/maps/api/directions/json";
    const params = new URLSearchParams({
      origin: `${start.latitude},${start.longitude}`,
      destination: `${goal.latitude},${goal.longitude}`,
      mode: "driving",
      language: "ko",
      region: "kr",
      key: this.googleApiKey,
    });

    // 한국에서는 avoid 옵션이 문제가 될 수 있으므로 제거
    // if (option === "trafast") {
    //   params.append("avoid", "tolls");
    // } else if (option === "tracomfort") {
    //   params.append("avoid", "highways");
    // }

    console.log(`🌐 Google Directions API URL: ${url}?${params}`);

    const response = await fetch(`${url}?${params}`, {
      method: "GET",
    });

    console.log(`📡 Google Directions API 응답 상태: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Google Directions API HTTP 에러: ${response.status}`);
      console.error(`❌ 에러 응답: ${errorText}`);
      throw new Error(
        `Google Directions API failed: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    console.log(`📊 Google API 응답:`, {
      status: data.status,
      routes_count: data.routes?.length || 0,
      error_message: data.error_message,
    });

    if (data.status === "ZERO_RESULTS") {
      console.warn(
        `⚠️ 경로를 찾을 수 없습니다. 좌표 확인: start(${start.latitude}, ${start.longitude}) → goal(${goal.latitude}, ${goal.longitude})`
      );
      throw new Error(
        "해당 지역에서 경로를 찾을 수 없습니다. 다른 경로 API를 시도합니다."
      );
    }

    if (data.status !== "OK") {
      console.error(`❌ Google API 에러: ${data.status}`, data.error_message);
      throw new Error(
        `Google Directions API error: ${data.status} - ${
          data.error_message || "Unknown error"
        }`
      );
    }

    console.log("✅ Google Directions API 성공");
    console.log("📊 응답 데이터 구조:", Object.keys(data));
    return this.formatGoogleDirectionResponse(data);
  }

  async getDirectionsFromOpenRoute(start, goal, option = "trafast") {
    try {
      console.log("🌍 OpenRouteService API 사용");

      const url = "https://api.openrouteservice.org/v2/directions/driving-car";
      const coordinates = [
        [start.longitude, start.latitude],
        [goal.longitude, goal.latitude],
      ];

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "5b3ce3597851110001cf6248a4bf4d6938a14d9ebb04fe9f632c2d4a", // 공개 API 키
        },
        body: JSON.stringify({
          coordinates: coordinates,
          format: "geojson",
        }),
      });

      if (!response.ok) {
        console.warn(`⚠️ OpenRoute API 실패: ${response.status}, 폴백 사용`);
        return this.generateFallbackRoute(start, goal);
      }

      const data = await response.json();
      console.log("✅ OpenRouteService 성공");

      if (data.features && data.features.length > 0) {
        const route = data.features[0];
        const properties = route.properties;
        const geometry = route.geometry;

        return {
          distance: Math.round(properties.segments[0].distance),
          duration: Math.round(properties.segments[0].duration),
          tollFare: 0,
          fuelPrice: 0,
          path: this.geometryToPath(geometry.coordinates),
          guide: this.generateSimpleGuide(geometry.coordinates),
          section: [],
          bbox: [],
          polyline: this.coordinatesToPolyline(geometry.coordinates),
        };
      }

      return this.generateFallbackRoute(start, goal);
    } catch (error) {
      console.error("❌ OpenRouteService 에러:", error);
      return this.generateFallbackRoute(start, goal);
    }
  }

  generateFallbackRoute(start, goal) {
    console.log("🎯 도로 기반 폴백 경로 생성");

    // 직선 거리 계산
    const straightDistance = this.calculateDistance(start, goal);

    // 도로를 따라가는 실제 거리 추정 (직선거리 * 1.3~1.5 배)
    const roadDistance = straightDistance * (1.3 + Math.random() * 0.2);

    // 도시 지역에서의 평균 속도 고려 (시속 30-40km)
    const avgSpeedKmh = 35;
    const duration = (roadDistance / 1000 / avgSpeedKmh) * 3600; // 초 단위

    // 도로 네트워크를 모방한 경로 생성
    const roadBasedRoute = this.generateRoadBasedRoute(start, goal);

    return {
      distance: Math.round(roadDistance),
      duration: Math.round(duration),
      tollFare: this.estimateTollFare(roadDistance),
      fuelPrice: this.estimateFuelPrice(roadDistance),
      path: roadBasedRoute.path,
      guide: roadBasedRoute.guide,
      section: roadBasedRoute.section,
      bbox: [
        Math.min(start.longitude, goal.longitude) - 0.01,
        Math.min(start.latitude, goal.latitude) - 0.01,
        Math.max(start.longitude, goal.longitude) + 0.01,
        Math.max(start.latitude, goal.latitude) + 0.01,
      ],
      polyline: roadBasedRoute.polyline,
    };
  }

  generateRoadBasedRoute(start, goal) {
    console.log("🛣️ 도로 네트워크 기반 경로 생성");
    console.log("🎯 시작점:", start);
    console.log("🏁 도착점:", goal);

    const path = [];
    const polyline = [];
    const guide = [];
    const section = [];

    // 주요 중간 지점들을 생성 (실제 도로망을 모방)
    const waypoints = this.generateWaypoints(start, goal);
    console.log("📍 생성된 웨이포인트:", waypoints.length, "개");
    waypoints.forEach((wp, idx) => {
      console.log(
        `   ${idx}: (${wp.latitude.toFixed(6)}, ${wp.longitude.toFixed(6)})`
      );
    });

    // 각 구간별 경로 생성
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segmentStart = waypoints[i];
      const segmentEnd = waypoints[i + 1];

      // 구간별 세부 경로점들 생성
      const segmentPoints = this.generateSegmentPoints(
        segmentStart,
        segmentEnd
      );

      segmentPoints.forEach((point) => {
        path.push(point.longitude);
        path.push(point.latitude);
        polyline.push({
          longitude: point.longitude,
          latitude: point.latitude,
        });
      });

      // 구간별 가이드 생성
      if (i < waypoints.length - 2) {
        const turnType = this.determineTurnType(
          waypoints[i],
          waypoints[i + 1],
          waypoints[i + 2]
        );
        guide.push({
          type: turnType,
          instructions: this.getTurnInstruction(turnType),
          distance: this.calculateDistance(segmentStart, segmentEnd),
          duration:
            (this.calculateDistance(segmentStart, segmentEnd) / 35) * 3.6, // 시속 35km
          pointIndex: i * 10, // 대략적인 포인트 인덱스
        });
      }
    }

    // 도착 가이드 추가
    guide.push({
      type: 88, // 도착
      instructions: "목적지에 도착했습니다",
      distance: 0,
      duration: 0,
      pointIndex: polyline.length - 1,
    });

    console.log("📏 최종 폴리라인 포인트 수:", polyline.length);
    console.log("📏 처음 5개 포인트:");
    polyline.slice(0, 5).forEach((point, idx) => {
      console.log(
        `   ${idx}: (${point.latitude.toFixed(6)}, ${point.longitude.toFixed(
          6
        )})`
      );
    });
    console.log("🎯 턴바이턴 가이드 수:", guide.length);

    return { path, polyline, guide, section };
  }

  generateWaypoints(start, goal) {
    const waypoints = [start];

    // 거리에 따라 중간 지점 개수 결정
    const distance = this.calculateDistance(start, goal);
    const numWaypoints = Math.min(8, Math.max(2, Math.floor(distance / 2000))); // 2km마다 중간 지점

    for (let i = 1; i < numWaypoints; i++) {
      const ratio = i / numWaypoints;

      // 기본 직선 경로
      let lat = start.latitude + (goal.latitude - start.latitude) * ratio;
      let lng = start.longitude + (goal.longitude - start.longitude) * ratio;

      // 도로망을 모방한 오프셋 추가
      const roadOffset = this.generateRoadOffset(ratio, distance);
      lat += roadOffset.lat;
      lng += roadOffset.lng;

      waypoints.push({ latitude: lat, longitude: lng });
    }

    waypoints.push(goal);
    return waypoints;
  }

  generateRoadOffset(ratio, totalDistance) {
    // 도시 도로망의 특성을 모방
    // 중간 지점에서 더 큰 우회, 시작/끝점에서는 작은 우회
    const baseOffset =
      Math.sin(ratio * Math.PI) * 0.008 * Math.min(1, totalDistance / 5000); // 오프셋을 크게 증가

    // 더 뚜렷한 경로 변화를 위해 추가 패턴 적용
    const zigzagOffset = Math.sin(ratio * Math.PI * 4) * 0.003;

    return {
      lat: (Math.random() - 0.5) * baseOffset + zigzagOffset * 0.5,
      lng: (Math.random() - 0.5) * baseOffset * 1.5 + zigzagOffset * 0.8, // 경도 방향으로 더 큰 변화
    };
  }

  generateSegmentPoints(start, end) {
    const points = [];
    const steps = 15; // 각 구간당 15개 포인트로 증가

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;

      // 베지어 곡선을 사용하여 자연스러운 도로 형태 생성
      let lat = start.latitude + (end.latitude - start.latitude) * ratio;
      let lng = start.longitude + (end.longitude - start.longitude) * ratio;

      // 더 뚜렷한 도로 곡률 추가
      const curveOffset1 = Math.sin(ratio * Math.PI * 2) * 0.0008; // 주 곡선
      const curveOffset2 = Math.sin(ratio * Math.PI * 6) * 0.0003; // 미세 진동

      // S자 곡선과 같은 도로 패턴 추가
      const sPattern = Math.sin(ratio * Math.PI * 1.5) * 0.0006;

      lat += curveOffset1 + curveOffset2 + sPattern * 0.7;
      lng += curveOffset1 * 1.2 + curveOffset2 * 0.6 + sPattern;

      points.push({
        latitude: lat,
        longitude: lng,
      });
    }

    return points;
  }

  determineTurnType(prev, current, next) {
    if (!prev || !current || !next) return 1; // 직진

    // 벡터 계산으로 회전 방향 결정
    const v1 = {
      x: current.longitude - prev.longitude,
      y: current.latitude - prev.latitude,
    };
    const v2 = {
      x: next.longitude - current.longitude,
      y: next.latitude - current.latitude,
    };

    // 외적으로 회전 방향 계산
    const cross = v1.x * v2.y - v1.y * v2.x;
    const dot = v1.x * v2.x + v1.y * v2.y;
    const angle = (Math.atan2(cross, dot) * 180) / Math.PI;

    if (Math.abs(angle) < 15) return 1; // 직진
    else if (angle > 15) return 3; // 우회전
    else return 2; // 좌회전
  }

  getTurnInstruction(type) {
    const instructions = {
      1: "직진하세요",
      2: "좌회전하세요",
      3: "우회전하세요",
      12: "왼쪽 방향으로 이동하세요",
      13: "오른쪽 방향으로 이동하세요",
      88: "목적지에 도착했습니다",
    };
    return instructions[type] || "계속 진행하세요";
  }

  estimateTollFare(distance) {
    // 거리 기반 통행료 추정 (10km 이상 시 기본 요금)
    return distance > 10000 ? Math.round((distance / 1000) * 100) : 0;
  }

  estimateFuelPrice(distance) {
    // km당 연비 기반 유류비 추정
    const fuelEfficiency = 10; // km/L
    const fuelPrice = 1600; // 원/L
    return Math.round((distance / 1000 / fuelEfficiency) * fuelPrice);
  }

  generateSmoothPath(start, goal) {
    const path = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lng = start.longitude + (goal.longitude - start.longitude) * ratio;
      const lat = start.latitude + (goal.latitude - start.latitude) * ratio;

      // 도로를 따라가는 것처럼 약간의 곡선 추가
      const curveOffset = Math.sin(ratio * Math.PI) * 0.001;
      path.push(lng + curveOffset);
      path.push(lat + curveOffset * 0.5);
    }

    return path;
  }

  generateSmoothPolyline(start, goal) {
    const points = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lng = start.longitude + (goal.longitude - start.longitude) * ratio;
      const lat = start.latitude + (goal.latitude - start.latitude) * ratio;

      // 자연스러운 곡선을 위한 곡률 추가
      const curveOffset = Math.sin(ratio * Math.PI) * 0.001;
      points.push({
        longitude: lng + curveOffset,
        latitude: lat + curveOffset * 0.5,
      });
    }

    return points;
  }

  generateSimpleGuideFromPoints(start, goal) {
    return [
      {
        type: 1, // 직진
        instructions: "목적지 방향으로 이동하세요",
        distance: this.calculateDistance(start, goal),
        duration: Math.max(300, this.calculateDistance(start, goal) * 0.06),
        pointIndex: 0,
      },
      {
        type: 88, // 도착
        instructions: "목적지에 도착했습니다",
        distance: 0,
        duration: 0,
        pointIndex: 20,
      },
    ];
  }

  coordinatesToPolyline(coordinates) {
    return coordinates.map((coord) => ({
      longitude: coord[0],
      latitude: coord[1],
    }));
  }

  geometryToPath(coordinates) {
    const path = [];
    coordinates.forEach((coord) => {
      path.push(coord[0]); // longitude
      path.push(coord[1]); // latitude
    });
    return path;
  }

  generateSimpleGuide(coordinates) {
    const totalDistance = this.calculateDistanceFromCoordinates(coordinates);
    const estimatedDuration = Math.max(300, totalDistance * 0.06);

    return [
      {
        type: 1,
        instructions: "경로를 따라 이동하세요",
        distance: totalDistance,
        duration: estimatedDuration,
        pointIndex: 0,
      },
      {
        type: 88,
        instructions: "목적지에 도착했습니다",
        distance: 0,
        duration: 0,
        pointIndex: coordinates.length - 1,
      },
    ];
  }

  calculateDistanceFromCoordinates(coordinates) {
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const prev = {
        longitude: coordinates[i - 1][0],
        latitude: coordinates[i - 1][1],
      };
      const curr = {
        longitude: coordinates[i][0],
        latitude: coordinates[i][1],
      };
      totalDistance += this.calculateDistance(prev, curr);
    }
    return totalDistance;
  }

  async getDirectionsWithWaypoints(
    start,
    goal,
    waypoints = [],
    option = "trafast"
  ) {
    try {
      console.log("🗺️ Naver API 경유지 포함 경로 검색 시작");

      const url = `${this.baseUrl}/map-direction/v1/driving`;
      const params = new URLSearchParams({
        start: `${start.longitude},${start.latitude}`,
        goal: `${goal.longitude},${goal.latitude}`,
        option: option,
      });

      if (waypoints.length > 0) {
        const waypointsString = waypoints
          .map((point) => `${point.longitude},${point.latitude}`)
          .join(":");
        params.append("waypoints", waypointsString);
      }

      const response = await fetch(`${url}?${params}`, {
        method: "GET",
        headers: {
          "X-NCP-APIGW-API-KEY-ID": this.clientId,
          "X-NCP-APIGW-API-KEY": this.clientSecret,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Naver Directions API HTTP 에러: ${response.status}`);
        console.error(`❌ 에러 응답: ${errorText}`);
        throw new Error(
          `Naver Directions API failed: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("✅ 네이버 Directions API 경유지 포함 경로 검색 성공");
      return this.formatDirectionResponse(data);
    } catch (error) {
      console.error("❌ Naver API 경유지 포함 경로 검색 실패:", error.message);
      throw error;
    }
  }

  formatDirectionResponse(data) {
    if (!data.route || !data.route.trafast || data.route.trafast.length === 0) {
      throw new Error("경로 데이터가 없습니다.");
    }

    const route = data.route.trafast[0];
    const summary = route.summary;

    return {
      distance: summary.distance,
      duration: summary.duration,
      tollFare: summary.tollFare || 0,
      fuelPrice: summary.fuelPrice || 0,
      path: route.path,
      guide: route.guide || [],
      section: route.section || [],
      bbox: summary.bbox,
      polyline: this.decodePolyline(route.path),
    };
  }

  formatGoogleDirectionResponse(data) {
    if (!data.routes || data.routes.length === 0) {
      throw new Error("Google API에서 경로 데이터가 없습니다.");
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // 폴리라인 디코딩
    const polylinePoints = this.decodeGooglePolyline(
      route.overview_polyline.points
    );

    // path 배열 생성 (네이버 형식과 호환)
    const path = [];
    polylinePoints.forEach((point) => {
      path.push(point.longitude);
      path.push(point.latitude);
    });

    // 턴바이턴 가이드 생성
    const guide = this.convertGoogleStepsToGuide(leg.steps);

    return {
      distance: leg.distance.value, // 미터 단위
      duration: leg.duration.value, // 초 단위
      tollFare: 0, // Google API는 통행료 정보 제공 안 함
      fuelPrice: this.estimateFuelPrice(leg.distance.value),
      path: path,
      guide: guide,
      section: [],
      bbox: this.calculateBounds(polylinePoints),
      polyline: polylinePoints,
    };
  }

  decodeGooglePolyline(encoded) {
    const points = [];
    let index = 0,
      lat = 0,
      lng = 0;

    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }

    return points;
  }

  convertGoogleStepsToGuide(steps) {
    const guide = [];

    steps.forEach((step, index) => {
      // HTML 태그 제거
      const instructions = step.html_instructions.replace(/<[^>]*>/g, "");

      // 방향 유형 결정
      let type = 1; // 기본값: 직진
      if (instructions.includes("우회전") || instructions.includes("right")) {
        type = 3;
      } else if (
        instructions.includes("좌회전") ||
        instructions.includes("left")
      ) {
        type = 2;
      }

      guide.push({
        type: type,
        instructions: instructions,
        distance: step.distance.value,
        duration: step.duration.value,
        pointIndex: index * 10, // 대략적인 포인트 인덱스
      });
    });

    // 도착 가이드 추가
    guide.push({
      type: 88,
      instructions: "목적지에 도착했습니다",
      distance: 0,
      duration: 0,
      pointIndex: steps.length * 10,
    });

    return guide;
  }

  calculateBounds(points) {
    if (points.length === 0) return [];

    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    points.forEach((point) => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    return [minLng, minLat, maxLng, maxLat];
  }

  decodePolyline(path) {
    const coordinates = [];
    // path는 이미 [longitude, latitude] 쌍의 2차원 배열
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      if (Array.isArray(point) && point.length >= 2) {
        coordinates.push({
          longitude: point[0],
          latitude: point[1],
        });
      }
    }
    return coordinates;
  }

  async getMultipleRoutes(start, goal) {
    try {
      console.log("🗺️ Naver API 다중 경로 검색 시작");
      const options = ["trafast", "tracomfort", "traoptimal"];
      const routes = await Promise.all(
        options.map(async (option) => {
          try {
            const result = await this.getDirectionsFromNaver(
              start,
              goal,
              option
            );
            return {
              type: option,
              ...result,
            };
          } catch (error) {
            console.error(
              `❌ Naver API 경로 옵션 ${option} 실패:`,
              error.message
            );
            return null;
          }
        })
      );

      const validRoutes = routes.filter((route) => route !== null);
      if (validRoutes.length === 0) {
        throw new Error("모든 경로 옵션에서 결과를 찾을 수 없습니다.");
      }

      return validRoutes;
    } catch (error) {
      console.error("❌ 다중 경로 검색 전체 실패:", error.message);
      throw error;
    }
  }

  calculateDistance(point1, point2) {
    const R = 6371e3;
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  findNearestPoint(currentLocation, path) {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < path.length; i += 2) {
      const pathPoint = {
        latitude: path[i + 1],
        longitude: path[i],
      };
      const distance = this.calculateDistance(currentLocation, pathPoint);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i / 2;
      }
    }

    return {
      index: nearestIndex,
      distance: minDistance,
      point: {
        latitude: path[nearestIndex * 2 + 1],
        longitude: path[nearestIndex * 2],
      },
    };
  }

  checkRouteDeviation(currentLocation, path, threshold = 50) {
    const nearestPoint = this.findNearestPoint(currentLocation, path);
    return nearestPoint.distance > threshold;
  }

  // search location with using naver search api
  async searchPlace(query, display = 5, start = 1, sort = "random") {
    try {
      console.log(`🔍 네이버 API 호출 시작: query=${query}`);
      console.log(`🔑 Client ID: ${this.localClientId ? "OK" : "MISSING"}`);
      console.log(
        `🔑 Client Secret: ${this.localClientSecret ? "OK" : "MISSING"}`
      );

      const url = "https://openapi.naver.com/v1/search/local.json";
      const params = new URLSearchParams({
        query: query,
        display: display.toString(),
        start: start.toString(),
        sort: sort,
      });

      console.log(`🌐 요청 URL: ${url}?${params}`);

      const response = await fetch(`${url}?${params}`, {
        method: "GET",
        headers: {
          "X-Naver-Client-Id": this.localClientId,
          "X-Naver-Client-Secret": this.localClientSecret,
        },
      });

      console.log(`📡 응답 상태: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP 에러: ${response.status}, 응답: ${errorText}`);
        throw new Error(
          `HTTP error! status: ${response.status}, response: ${errorText}`
        );
      }

      const data = await response.json();
      console.log(`✅ 네이버 API 성공: ${data.items?.length || 0}개 결과`);
      return this.formatSearchResponse(data);
    } catch (error) {
      console.error("❌ 네이버 Local Search API 에러:", error);
      throw new Error("장소 검색에 실패했습니다.");
    }
  }

  formatSearchResponse(data) {
    if (!data.items || data.items.length === 0) {
      return {
        total: 0,
        display: 0,
        items: [],
      };
    }

    const items = data.items.map((item) => {
      // 좌표 변환을 더 안전하게 처리
      let mapx, mapy;
      try {
        // 문자열에서 숫자만 추출 후 변환
        const rawMapx = String(item.mapx).replace(/[^0-9]/g, "");
        const rawMapy = String(item.mapy).replace(/[^0-9]/g, "");

        mapx = parseInt(rawMapx) / 10000000;
        mapy = parseInt(rawMapy) / 10000000;

        // 변환된 좌표가 유효한지 확인
        if (isNaN(mapx) || isNaN(mapy) || mapx === 0 || mapy === 0) {
          console.warn(`잘못된 좌표값: mapx=${item.mapx}, mapy=${item.mapy}`);
          mapx = 0;
          mapy = 0;
        }
      } catch (error) {
        console.error(
          `좌표 변환 실패: mapx=${item.mapx}, mapy=${item.mapy}`,
          error
        );
        mapx = 0;
        mapy = 0;
      }

      return {
        title: item.title.replace(/<[^>]*>/g, ""), // HTML 태그 제거
        link: item.link || "",
        category: item.category || "",
        description: item.description
          ? item.description.replace(/<[^>]*>/g, "")
          : "",
        telephone: item.telephone || "",
        address: item.address || "",
        roadAddress: item.roadAddress || "",
        mapx: mapx, // 경도
        mapy: mapy, // 위도
      };
    });

    return {
      total: data.total,
      display: data.display,
      items: items,
    };
  }

  async searchNearbyParkingLots(destinationLat, destinationLng, radius = 1000) {
    try {
      console.log(`주차장 검색 시작: ${destinationLat}, ${destinationLng}`);

      // 더 다양한 주차장 관련 검색어 사용
      const parkingQueries = [
        "주차장",
        "공영주차장",
        "지하주차장",
        "타임스퀘어 주차장",
        "백화점 주차장",
        "빌딩 주차장",
      ];
      const allParkingLots = [];

      for (const query of parkingQueries) {
        try {
          console.log(`검색어: ${query}`);
          const results = await this.searchPlace(query, 5);
          console.log(`${query} 검색 결과:`, results.items?.length || 0);

          if (results.items && results.items.length > 0) {
            // 모든 결과에 거리 계산 추가
            const itemsWithDistance = results.items.map((item) => {
              const distance = this.calculateDistance(
                { latitude: destinationLat, longitude: destinationLng },
                { latitude: item.mapy, longitude: item.mapx }
              );
              console.log(
                `📏 거리 계산: ${
                  item.title
                } - 목적지(${destinationLat}, ${destinationLng}) vs 주차장(${
                  item.mapy
                }, ${item.mapx}) = ${Math.round(distance)}m`
              );
              return { ...item, distance };
            });

            allParkingLots.push(...itemsWithDistance);
          }
        } catch (queryError) {
          console.error(`검색어 "${query}" 검색 실패:`, queryError);
        }
      }

      console.log(`전체 검색된 장소 수: ${allParkingLots.length}`);

      // 거리 기준으로 필터링 및 정렬
      const nearbyParkingLots = allParkingLots
        .filter((item) => item.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      console.log(`반경 ${radius}m 내 장소 수: ${nearbyParkingLots.length}`);

      // 중복 제거 (제목과 주소가 같은 경우)
      const uniqueParkingLots = nearbyParkingLots
        .filter(
          (lot, index, self) =>
            index ===
            self.findIndex(
              (l) => l.title === lot.title && l.address === lot.address
            )
        )
        .slice(0, 3); // 상위 3개만

      console.log(`최종 주차장 수: ${uniqueParkingLots.length}`);

      return {
        destination: {
          latitude: destinationLat,
          longitude: destinationLng,
        },
        parkingLots: uniqueParkingLots,
      };
    } catch (error) {
      console.error("주변 주차장 검색 에러:", error);
      throw new Error("주변 주차장 검색에 실패했습니다.");
    }
  }
}
