import express from 'express';
import { recommendParking, recommendParkingWithAI, getParkingDetail } from '../services/parkingAI.js';
import { firestoreService } from '../services/firestoreService.js';
import { ReviewService } from '../services/reviewService.js';

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
 * POST /api/parking/nearby
 * 현재 위치 기준 가까운 주차장 Top N (기본 10)
 * Body: { latitude: number, longitude: number, limit?: number, radiusKm?: number }
 */
router.post('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, limit = 10, radiusKm = 20 } = req.body || {};

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'latitude, longitude가 필요합니다.' });
    }

    const centerLat = parseFloat(latitude);
    const centerLng = parseFloat(longitude);
    const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const radius = Math.min(Math.max(parseFloat(radiusKm) || 20, 1), 100);

    // Firestore에서 모든 주차장 + 최신 상태 불러와 거리 계산 후 상위 N 추출
    const lots = await firestoreService.getAllLatestParkingStatus();
    console.log(`🔍 Firestore에서 가져온 주차장 수: ${lots.length}`);
    
    // 화양동 주차장 특별 확인
    const hwayangLot = lots.find(l => l.addr && l.addr.includes('화양동'));
    if (hwayangLot) {
      console.log('🎯 화양동 주차장 발견:', {
        parking_code: hwayangLot.parking_code,
        parking_name: hwayangLot.parking_name,
        addr: hwayangLot.addr,
        lat_wgs84: hwayangLot.lat_wgs84,
        lng_wgs84: hwayangLot.lng_wgs84
      });
    } else {
      console.log('❌ 화양동 주차장을 찾을 수 없음');
    }

    const withDistance = lots
      .filter(l => l.lat_wgs84 && l.lng_wgs84)
      .map(l => {
        const lat = parseFloat(l.lat_wgs84);
        const lng = parseFloat(l.lng_wgs84);
        const distanceKm = firestoreService.calculateDistance(centerLat, centerLng, lat, lng);
        return { ...l, distanceKm };
      })
      .filter(l => isFinite(l.distanceKm) && l.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, lim);

    // 리뷰 통계를 안전하게 추가 (오류 발생 시 기본값 사용)
    const withRatings = await Promise.all(
      withDistance.map(async (l) => {
        let average_rating = 0;
        let total_reviews = 0;
        
        try {
          const reviewService = new ReviewService();
          const stats = await reviewService.getReviewStats(l.parking_code);
          if (stats && typeof stats.averageRating === 'number') {
            average_rating = stats.averageRating;
          }
          if (stats && typeof stats.totalReviews === 'number') {
            total_reviews = stats.totalReviews;
          }
        } catch (error) {
          console.log(`⚠️ 리뷰 통계 로드 실패 (${l.parking_code}):`, error.message);
          // 오류 발생 시 기본값 유지 (average_rating = 0, total_reviews = 0)
        }

        return {
          parking_code: l.parking_code,
          parking_name: l.parking_name,
          addr: l.addr,
          lat_wgs84: l.lat_wgs84,
          lng_wgs84: l.lng_wgs84,
          pay_yn_name: l.pay_yn_name,
          weekday_begin: l.weekday_begin,
          weekday_end: l.weekday_end,
          capacity: l.capacity,
          cur_parking: l.cur_parking,
          parking_status_name: l.parking_status_name,
          distance_km: Number(l.distanceKm.toFixed(3)),
          // 요금 요약(있을 경우):
          rates: l.rates,
          time_rate: l.time_rate,
          add_rates: l.add_rates,
          add_time_rate: l.add_time_rate,
          // 안전하게 가져온 리뷰 통계
          average_rating,
          total_reviews,
        };
      })
    );

    res.json({ success: true, data: withRatings });
  } catch (error) {
    console.error('가까운 주차장 조회 오류:', error);
    res.status(500).json({ success: false, message: '가까운 주차장 조회 실패', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * POST /api/parking/search
 * 전체 주차장에서 이름/주소로 검색
 * Body: { query: string, limit?: number }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 50 } = req.body || {};
    if (!query || query.trim().length < 1) {
      return res.status(400).json({ success: false, message: '검색어를 입력해주세요.' });
    }

    const searchTerm = query.trim().toLowerCase();
    const searchLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);

    // 전체 주차장 데이터 가져오기
    const allLots = await firestoreService.getAllLatestParkingStatus();
    
    // 이름과 주소로 검색 필터링
    const searchResults = allLots
      .filter(lot => {
        const name = (lot.parking_name || '').toLowerCase();
        const addr = (lot.addr || '').toLowerCase();
        return name.includes(searchTerm) || addr.includes(searchTerm);
      })
      .slice(0, searchLimit);

    // 리뷰 통계를 안전하게 추가
    const withRatings = await Promise.all(
      searchResults.map(async (l) => {
        let average_rating = 0;
        let total_reviews = 0;
        
        try {
          const reviewService = new ReviewService();
          const stats = await reviewService.getReviewStats(l.parking_code);
          if (stats && typeof stats.averageRating === 'number') {
            average_rating = stats.averageRating;
          }
          if (stats && typeof stats.totalReviews === 'number') {
            total_reviews = stats.totalReviews;
          }
        } catch (error) {
          console.log(`⚠️ 검색 결과 리뷰 통계 로드 실패 (${l.parking_code}):`, error.message);
        }

        return {
          parking_code: l.parking_code,
          parking_name: l.parking_name,
          addr: l.addr,
          lat_wgs84: l.lat_wgs84,
          lng_wgs84: l.lng_wgs84,
          pay_yn_name: l.pay_yn_name,
          weekday_begin: l.weekday_begin,
          weekday_end: l.weekday_end,
          capacity: l.capacity,
          cur_parking: l.cur_parking,
          parking_status_name: l.parking_status_name,
          rates: l.rates,
          time_rate: l.time_rate,
          add_rates: l.add_rates,
          add_time_rate: l.add_time_rate,
          average_rating,
          total_reviews,
          distance_km: 0, // 검색 결과에서는 거리 계산 안 함
        };
      })
    );

    res.json({ 
      success: true, 
      data: withRatings,
      total_found: withRatings.length,
      query: searchTerm
    });
  } catch (error) {
    console.error('주차장 검색 오류:', error);
    res.status(500).json({ success: false, message: '주차장 검색 실패', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * POST /api/parking/status/report
 * 사용자 제보 기반 현재 주차장 상태 저장
 * Body: { parkingCode: string|number, statusName: '여유'|'보통'|'혼잡' }
 */
router.post('/status/report', async (req, res) => {
  try {
    const { parkingCode, statusName } = req.body || {};
    if (!parkingCode || !statusName) {
      return res.status(400).json({ success: false, message: 'parkingCode와 statusName이 필요합니다.' });
    }

    const allowed = ['여유', '보통', '혼잡'];
    if (!allowed.includes(statusName)) {
      return res.status(400).json({ success: false, message: 'statusName은 여유/보통/혼잡 중 하나여야 합니다.' });
    }

    const statusYnMap = { '여유': 'Y', '보통': 'M', '혼잡': 'N' };

    await firestoreService.saveParkingStatus({
      parking_code: String(parkingCode),
      parking_status_name: statusName,
      parking_status_yn: statusYnMap[statusName],
      collected_at: new Date(),
    });

    // click_reveiw에도 저장
    await firestoreService.saveClickReview({
      parking_code: String(parkingCode),
      status_name: statusName,
      source: 'user_review',
    });

    return res.json({ success: true, message: '주차장 상태 제보가 저장되었습니다.' });
  } catch (error) {
    console.error('주차장 상태 제보 저장 오류:', error);
    return res.status(500).json({ success: false, message: '상태 제보 저장 중 서버 오류가 발생했습니다.' });
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