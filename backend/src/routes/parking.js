import express from 'express';
import { ReviewService } from '../services/reviewService.js';
import { firestoreService } from '../services/firestoreService.js';
import cacheService from '../services/cacheService.js';
import * as parkingAI from '../services/parkingAI.js';

const router = express.Router();

/**
 * 주차장 상태 색상 결정 함수
 */
function getStatusColor(statusName) {
  if (!statusName) return '#9E9E9E';
  
  const status = statusName.toLowerCase().trim();
  
  // 여유 - 초록색
  if (status.includes('여유') || status.includes('available')) {
    return '#4CAF50';
  }
  
  // 보통 - 노란색
  if (status.includes('보통') || status.includes('moderate')) {
    return '#FF9800';
  }
  
  // 혼잡/만차 - 빨간색
  if (status.includes('혼잡') || status.includes('만차') || status.includes('full')) {
    return '#F44336';
  }
  
  // 기타 - 회색
  return '#9E9E9E';
}

/**
 * GET /api/parking/:parkingCode/predictions
 * 특정 주차장의 예측 데이터 조회
 */
router.get('/:parkingCode/predictions', async (req, res) => {
  try {
    const { parkingCode } = req.params;
    
    if (!parkingCode) {
      return res.status(400).json({ success: false, message: 'parkingCode가 필요합니다.' });
    }

    // 캐시 키 생성
    const cacheKey = cacheService.generateKey('predictions', parkingCode);
    
    // 캐시 확인
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Firestore에서 예측 데이터 조회
    const predictionData = await firestoreService.getParkingPrediction(parkingCode);
    
    if (!predictionData) {
      return res.status(404).json({ 
        success: false, 
        message: '예측 데이터를 찾을 수 없습니다.' 
      });
    }

    // 캐시에 저장 (예측 데이터는 1시간 캐시)
    cacheService.set(cacheKey, predictionData, 3600);
    
    res.json({ success: true, data: predictionData });
  } catch (error) {
    console.error('주차장 예측 데이터 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '예측 데이터 조회 실패',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/parking/:parkingCode
 * 특정 주차장 상세 정보 조회
 */
router.get('/:parkingCode', async (req, res) => {
  try {
    const { parkingCode } = req.params;
    
    if (!parkingCode) {
      return res.status(400).json({ success: false, message: 'parkingCode가 필요합니다.' });
    }

    // 캐시 키 생성
    const cacheKey = cacheService.generateKey('detail', parkingCode);
    
    // 캐시 확인
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Firestore에서 주차장 정보 조회
    const parkingLot = await firestoreService.getParkingLot(parkingCode);
    
    if (!parkingLot) {
      return res.status(404).json({ 
        success: false, 
        message: '주차장을 찾을 수 없습니다.' 
      });
    }

    // 리뷰 통계 조회
    let reviewStats = null;
    try {
      const reviewService = new ReviewService();
      reviewStats = await reviewService.getReviewStats(parkingCode);
    } catch (error) {
      // 리뷰 통계 로드 실패 시 무시
    }

    const result = {
      ...parkingLot,
      reviews: reviewStats || { averageRating: 0, totalReviews: 0 }
    };

    // 캐시에 저장
    cacheService.set(cacheKey, result);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('주차장 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '주차장 조회 실패',
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

    // 캐시 키 생성 (소수점 6자리로 반올림)
    const roundedLat = Math.round(centerLat * 1000000) / 1000000;
    const roundedLng = Math.round(centerLng * 1000000) / 1000000;
    const cacheKey = cacheService.generateKey('nearby', roundedLat, roundedLng, lim, radius);
    
    // 캐시 확인
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Geohash를 사용한 근처 주차장 조회 (최적화)
    const lots = await firestoreService.getLatestParkingStatusNearby(centerLat, centerLng, radius);

    const withDistance = lots
      .filter(l => l.lat_wgs84 && l.lng_wgs84)
      .map(l => {
        const lat = parseFloat(l.lat_wgs84);
        const lng = parseFloat(l.lng_wgs84);
        const distanceKm = firestoreService.calculateDistance(centerLat, centerLng, lat, lng);
        
        // 서버에서 파생값 계산
        const available = Math.max(0, (l.capacity || 0) - (l.cur_parking || 0));
        const statusColor = getStatusColor(l.parking_status_name);
        
        return { 
          ...l, 
          distanceKm,
          available,
          statusColor
        };
      })
      .filter(l => isFinite(l.distanceKm) && l.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, lim);

    // 리뷰 통계는 상세 조회 시에만 로드 (목록에서는 기본값 사용)
    const withRatings = withDistance.map((l) => {
      return {
        parking_code: l.parking_code,
        parking_name: l.parking_name,
        addr: l.addr,
        lat_wgs84: l.lat_wgs84,
        lng_wgs84: l.lng_wgs84,
        parking_status_name: l.parking_status_name,
        distance_km: Number(l.distanceKm.toFixed(3)),
        // 서버에서 계산된 파생값
        available: l.available,
        statusColor: l.statusColor,
        // 목록 조회에서는 리뷰 통계 기본값
        average_rating: 0,
        total_reviews: 0,
      };
    });

    // 캐시에 저장
    cacheService.set(cacheKey, withRatings);

    res.json({ success: true, data: withRatings });
  } catch (error) {
    console.error('가까운 주차장 조회 오류:', error);
    res.status(500).json({ success: false, message: '가까운 주차장 조회 실패', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * POST /api/parking/in-bounds
 * 바운딩 박스 내 주차장 조회 (타일 기반)
 * Body: { minLat: number, minLng: number, maxLat: number, maxLng: number, limit?: number }
 */
const handleInBoundsRequest = async (req, res) => {
  try {
    const { minLat, minLng, maxLat, maxLng, limit = 100 } = req.body || {};

    if (minLat == null || minLng == null || maxLat == null || maxLng == null) {
      return res.status(400).json({ 
        success: false, 
        message: 'minLat, minLng, maxLat, maxLng가 필요합니다.' 
      });
    }

    const lim = Math.min(Math.max(parseInt(limit) || 100, 1), 200);

    // 캐시 키 생성
    const cacheKey = cacheService.generateKey('bounds', minLat, minLng, maxLat, maxLng, lim);
    
    // 캐시 확인
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`🚀 바운딩 박스 캐시 적중: ${cacheKey}`);
      return res.json({ success: true, data: cached });
    }

    // Firestore에서 모든 주차장 조회
    const lots = await firestoreService.getAllLatestParkingStatus();
    console.log(`🔍 바운딩 박스 조회 - 전체 주차장 수: ${lots.length}`);

    // 바운딩 박스 내 필터링
    const inBounds = lots
      .filter(l => {
        if (!l.lat_wgs84 || !l.lng_wgs84) return false;
        const lat = parseFloat(l.lat_wgs84);
        const lng = parseFloat(l.lng_wgs84);
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      })
      .slice(0, lim)
      .map(l => {
        const available = Math.max(0, (l.capacity || 0) - (l.cur_parking || 0));
        const statusColor = getStatusColor(l.parking_status_name);
        return {
          ...l,
          available,
          statusColor
        };
      });

    console.log(`📍 바운딩 박스 내 주차장: ${inBounds.length}개`);

    // 캐시에 저장
    cacheService.set(cacheKey, inBounds);

    res.json({ success: true, data: inBounds });
  } catch (error) {
    console.error('바운딩 박스 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '바운딩 박스 조회 실패',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

router.post('/in-bounds', handleInBoundsRequest);

/**
 * POST /api/parking/search
 * 주차장 검색 (이름 또는 주소)
 * Body: { query: string, limit?: number }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 20 } = req.body || {};

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'query가 필요합니다.' });
    }

    const searchTerm = query.trim().toLowerCase();
    const searchLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

    const lots = await firestoreService.getAllLatestParkingStatus();
    
    const searchResults = lots.filter(lot => {
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
      return res.status(400).json({ 
        success: false, 
        message: 'parkingCode와 statusName이 필요합니다.' 
      });
    }

    // 허용된 상태값 검증
    const validStatuses = ['여유', '보통', '혼잡'];
    if (!validStatuses.includes(statusName)) {
      return res.status(400).json({ 
        success: false, 
        message: `statusName은 ${validStatuses.join(', ')} 중 하나여야 합니다.` 
      });
    }

    // Firestore에 사용자 제보 상태 저장
    await firestoreService.saveUserReportedStatus(parkingCode, statusName);
    
    // 관련 캐시 무효화
    cacheService.clearParkingCache(parkingCode);
    
    res.json({ 
      success: true, 
      message: '주차장 상태가 성공적으로 제보되었습니다.',
      data: { parkingCode, statusName }
    });
  } catch (error) {
    console.error('주차장 상태 제보 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '주차장 상태 제보 실패',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * POST /api/parking/recommend-ai
 * LSTM AI 기반 주차장 추천
 */
router.post('/recommend-ai', async (req, res) => {
  try {
    const { destination_lat, destination_lng, num_recommendations = 5 } = req.body;
    
    // 좌표 검증
    if (!destination_lat || !destination_lng) {
      return res.status(400).json({
        success: false,
        message: 'destination_lat과 destination_lng가 필요합니다.'
      });
    }

    console.log('🤖 AI 추천 요청:', { destination_lat, destination_lng, num_recommendations });
    
    const result = await parkingAI.recommendParkingWithAI(
      [destination_lat, destination_lng],
      num_recommendations
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ AI 추천 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 주차장 추천 실패',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
