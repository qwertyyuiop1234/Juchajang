import express from 'express';
import { recommendParking, recommendParkingWithAI, getParkingDetail } from '../services/parkingAI.js';

const router = express.Router();

/**
 * POST /api/parking/recommend
 * 주차장 추천 API
 * 
 * Body:
 * {
 *   "destination_lat": 37.5665,
 *   "destination_lng": 126.9780,
 *   "num_recommendations": 5 (optional)
 * }
 */
router.post('/recommend', async (req, res) => {
  try {
    const { destination_lat, destination_lng, num_recommendations = 5 } = req.body;

    // 입력값 검증
    if (!destination_lat || !destination_lng) {
      return res.status(400).json({
        success: false,
        message: "목적지 좌표(destination_lat, destination_lng)가 필요합니다."
      });
    }

    const lat = parseFloat(destination_lat);
    const lng = parseFloat(destination_lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 좌표입니다."
      });
    }

    // 한국 좌표 범위 체크 (대략적)
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      return res.status(400).json({
        success: false,
        message: "한국 내 좌표를 입력해주세요."
      });
    }

    const numRec = Math.min(Math.max(parseInt(num_recommendations) || 5, 1), 20);
    
    const result = await recommendParking([lat, lng], numRec);
    
    res.json(result);

  } catch (error) {
    console.error('주차장 추천 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/parking/detail/:parkingCode
 * 특정 주차장 상세 정보 조회
 */
router.get('/detail/:parkingCode', async (req, res) => {
  try {
    const { parkingCode } = req.params;

    if (!parkingCode) {
      return res.status(400).json({
        success: false,
        message: "주차장 코드가 필요합니다."
      });
    }

    const result = await getParkingDetail(parkingCode);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('주차장 상세 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/parking/recommend-ai
 * Prophet AI 모델을 사용한 주차장 추천 API
 * 
 * Body:
 * {
 *   "destination_lat": 37.5665,
 *   "destination_lng": 126.9780,
 *   "num_recommendations": 5 (optional),
 *   "prediction_time": "2024-08-16T14:30:00" (optional, ISO format)
 * }
 */
router.post('/recommend-ai', async (req, res) => {
  try {
    const { destination_lat, destination_lng, num_recommendations = 5, prediction_time } = req.body;

    // 입력값 검증
    if (!destination_lat || !destination_lng) {
      return res.status(400).json({
        success: false,
        message: "목적지 좌표(destination_lat, destination_lng)가 필요합니다."
      });
    }

    const lat = parseFloat(destination_lat);
    const lng = parseFloat(destination_lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 좌표입니다."
      });
    }

    // 한국 좌표 범위 체크 (대략적)
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      return res.status(400).json({
        success: false,
        message: "한국 내 좌표를 입력해주세요."
      });
    }

    const numRec = Math.min(Math.max(parseInt(num_recommendations) || 5, 1), 20);
    
    // 예측 시간 처리
    let predTime = null;
    if (prediction_time) {
      try {
        predTime = new Date(prediction_time);
        if (isNaN(predTime.getTime())) {
          predTime = null;
        }
      } catch (error) {
        predTime = null;
      }
    }
    
    const result = await recommendParkingWithAI([lat, lng], numRec, predTime);
    
    res.json(result);

  } catch (error) {
    console.error('Prophet AI 주차장 추천 오류:', error);
    res.status(500).json({
      success: false,
      message: "AI 서비스 오류가 발생했습니다. Python 환경과 Prophet 라이브러리를 확인해주세요.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/parking/health
 * 주차장 서비스 상태 확인
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: "주차장 AI 서비스가 정상 작동 중입니다.",
    timestamp: new Date().toISOString(),
    endpoints: {
      basic: "/api/parking/recommend",
      ai: "/api/parking/recommend-ai",
      detail: "/api/parking/detail/:parkingCode"
    }
  });
});

export default router;