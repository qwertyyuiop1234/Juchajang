import express from "express";
import { NaverMapService } from "../services/naverMap.js";

const router = express.Router();
const naverMapService = new NaverMapService();

router.post("/directions", async (req, res) => {
  try {
    const { start, goal, option = "trafast" } = req.body;

    if (!start || !goal) {
      return res.status(400).json({
        success: false,
        message: "출발지와 목적지 정보가 필요합니다.",
      });
    }

    if (
      !start.latitude ||
      !start.longitude ||
      !goal.latitude ||
      !goal.longitude
    ) {
      return res.status(400).json({
        success: false,
        message: "위도와 경도 정보가 필요합니다.",
      });
    }

    const directions = await naverMapService.getDirections(start, goal, option);

    res.status(200).json({
      success: true,
      data: directions,
    });
  } catch (error) {
    console.error("경로 검색 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "경로 검색에 실패했습니다.",
    });
  }
});

router.post("/directions/multiple", async (req, res) => {
  try {
    const { start, goal } = req.body;

    if (!start || !goal) {
      return res.status(400).json({
        success: false,
        message: "출발지와 목적지 정보가 필요합니다.",
      });
    }

    if (
      !start.latitude ||
      !start.longitude ||
      !goal.latitude ||
      !goal.longitude
    ) {
      return res.status(400).json({
        success: false,
        message: "위도와 경도 정보가 필요합니다.",
      });
    }

    const routes = await naverMapService.getMultipleRoutes(start, goal);

    res.status(200).json({
      success: true,
      data: routes,
    });
  } catch (error) {
    console.error("다중 경로 검색 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "다중 경로 검색에 실패했습니다.",
    });
  }
});

router.post("/directions/waypoints", async (req, res) => {
  try {
    const { start, goal, waypoints = [], option = "trafast" } = req.body;

    if (!start || !goal) {
      return res.status(400).json({
        success: false,
        message: "출발지와 목적지 정보가 필요합니다.",
      });
    }

    const directions = await naverMapService.getDirectionsWithWaypoints(
      start,
      goal,
      waypoints,
      option
    );

    res.status(200).json({
      success: true,
      data: directions,
    });
  } catch (error) {
    console.error("경유지 포함 경로 검색 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "경로 검색에 실패했습니다.",
    });
  }
});

router.post("/route/deviation-check", async (req, res) => {
  try {
    const { currentLocation, path, threshold = 50 } = req.body;

    if (!currentLocation || !path) {
      return res.status(400).json({
        success: false,
        message: "현재 위치와 경로 정보가 필요합니다.",
      });
    }

    const isDeviated = naverMapService.checkRouteDeviation(
      currentLocation,
      path,
      threshold
    );

    const nearestPoint = naverMapService.findNearestPoint(
      currentLocation,
      path
    );

    res.status(200).json({
      success: true,
      data: {
        isDeviated,
        nearestPoint,
        threshold,
      },
    });
  } catch (error) {
    console.error("경로 이탈 검사 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "경로 이탈 검사에 실패했습니다.",
    });
  }
});

router.post("/route/reroute", async (req, res) => {
  try {
    const { currentLocation, originalGoal, option = "trafast" } = req.body;

    if (!currentLocation || !originalGoal) {
      return res.status(400).json({
        success: false,
        message: "현재 위치와 목적지 정보가 필요합니다.",
      });
    }

    const newRoute = await naverMapService.getDirections(
      currentLocation,
      originalGoal,
      option
    );

    res.status(200).json({
      success: true,
      data: {
        ...newRoute,
        rerouted: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("경로 재탐색 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "경로 재탐색에 실패했습니다.",
    });
  }
});

router.get("/search/place", async (req, res) => {
  try {
    const { query, display = 5, start = 1, sort = "random" } = req.query;

    console.log(
      `🔍 검색 요청: query=${query}, display=${display}, start=${start}, sort=${sort}`
    );

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "검색어가 필요합니다.",
      });
    }

    try {
      const searchResults = await naverMapService.searchPlace(
        query,
        parseInt(display),
        parseInt(start),
        sort
      );

      console.log(`✅ 검색 성공: ${searchResults.items?.length || 0}개 결과`);
      res.status(200).json({
        success: true,
        data: searchResults,
      });
    } catch (apiError) {
      console.error("네이버 API 호출 실패:", apiError);
      // API 실패 시 더미 데이터 반환
      const requestedDisplay = parseInt(display);
      const dummyItems = [];
      
      // 요청된 개수만큼 더미 데이터 생성
      for (let i = 1; i <= requestedDisplay; i++) {
        dummyItems.push({
          title: `${query}`,
          link: "",
          category: i % 3 === 1 ? "음식점>한식" : i % 3 === 2 ? "카페>커피전문점" : "기타>상점",
          description: `${query}에서 찾은 장소 ${i}`,
          telephone: `02-123${i}-567${i}`,
          address: `서울시 강남구 ${query}동 ${100 + i * 10}`,
          roadAddress: `서울시 강남구 ${query}로 ${100 + i * 10}`,
          mapx: 127.02761 + (i * 0.001),
          mapy: 37.497952 + (i * 0.001),
        });
      }
      
      const dummyResults = {
        total: requestedDisplay,
        display: requestedDisplay,
        items: dummyItems,
      };

      console.log(`⚠️ 더미 데이터 반환: ${dummyResults.items.length}개`);
      res.status(200).json({
        success: true,
        data: dummyResults,
      });
    }
  } catch (error) {
    console.error("장소 검색 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "장소 검색에 실패했습니다.",
    });
  }
});

router.post("/search/nearby-parking", async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "목적지의 위도와 경도가 필요합니다.",
      });
    }

    const nearbyParkingResults = await naverMapService.searchNearbyParkingLots(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius)
    );

    res.status(200).json({
      success: true,
      data: nearbyParkingResults,
    });
  } catch (error) {
    console.error("주변 주차장 검색 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "주변 주차장 검색에 실패했습니다.",
    });
  }
});

router.get("/test/naver", async (req, res) => {
  try {
    // 서울 시청 → 강남역 (확실히 경로가 있는 좌표)
    const testStart = { latitude: 37.5663, longitude: 126.9779 }; // 서울시청
    const testGoal = { latitude: 37.4979, longitude: 127.0276 }; // 강남역

    console.log("🧪 Naver Directions 5 API 테스트 시작");
    const result = await naverMapService.getDirections(testStart, testGoal, "trafast");
    
    res.status(200).json({
      success: true,
      message: "Naver Directions 5 API 테스트 성공",
      data: result,
    });
  } catch (error) {
    console.error("Naver Directions 5 API 테스트 실패:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
