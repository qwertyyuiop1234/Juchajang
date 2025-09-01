import express from 'express';
import { ReviewService } from '../services/reviewService.js';

const router = express.Router();
const reviewService = new ReviewService();

/**
 * POST /api/review
 * 리뷰 작성 API
 * 
 * Body:
 * {
 *   "parkingId": "123",
 *   "parkingName": "강남역 지하주차장",
 *   "userId": "user123" (optional),
 *   "rating": 5,
 *   "reviewText": "매우 좋은 주차장입니다.",
 *   "categories": ["cleanliness", "safety"]
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { parkingId, parkingName, userId, rating, reviewText, categories } = req.body;

    // 입력값 검증
    if (!parkingId || !parkingName) {
      return res.status(400).json({
        success: false,
        message: "주차장 ID와 이름이 필요합니다."
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "평점은 1-5 사이의 값이어야 합니다."
      });
    }

    if (!reviewText || reviewText.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "리뷰 내용은 최소 10자 이상이어야 합니다."
      });
    }

    if (reviewText.length > 500) {
      return res.status(400).json({
        success: false,
        message: "리뷰 내용은 최대 500자까지 작성 가능합니다."
      });
    }

    const reviewData = {
      parkingId,
      parkingName,
      userId,
      rating: parseInt(rating),
      reviewText: reviewText.trim(),
      categories: categories || []
    };

    const result = await reviewService.saveReview(reviewData);
    
    res.status(201).json({
      success: true,
      message: "리뷰가 성공적으로 저장되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('리뷰 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/review/parking/:parkingId
 * 특정 주차장의 리뷰 목록 조회
 * 
 * Query Parameters:
 * - limit: 페이지당 리뷰 수 (기본값: 20)
 * - offset: 건너뛸 리뷰 수 (기본값: 0)
 */
router.get('/parking/:parkingId', async (req, res) => {
  try {
    const { parkingId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!parkingId) {
      return res.status(400).json({
        success: false,
        message: "주차장 ID가 필요합니다."
      });
    }

    const reviews = await reviewService.getReviewsByParkingId(
      parkingId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: reviews,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: reviews.length
      }
    });

  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/review/parking/:parkingId/stats
 * 특정 주차장의 리뷰 통계 조회
 */
router.get('/parking/:parkingId/stats', async (req, res) => {
  try {
    const { parkingId } = req.params;

    if (!parkingId) {
      return res.status(400).json({
        success: false,
        message: "주차장 ID가 필요합니다."
      });
    }

    const stats = await reviewService.getReviewStats(parkingId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('리뷰 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/review/user/:userId
 * 특정 사용자의 리뷰 목록 조회
 * 
 * Query Parameters:
 * - limit: 페이지당 리뷰 수 (기본값: 20)
 * - offset: 건너뛸 리뷰 수 (기본값: 0)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "사용자 ID가 필요합니다."
      });
    }

    const reviews = await reviewService.getReviewsByUserId(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: reviews,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: reviews.length
      }
    });

  } catch (error) {
    console.error('사용자 리뷰 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/review/:reviewId
 * 리뷰 수정
 * 
 * Body:
 * {
 *   "rating": 4,
 *   "reviewText": "수정된 리뷰 내용",
 *   "categories": ["cleanliness", "price"]
 * }
 */
router.put('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, reviewText, categories } = req.body;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "리뷰 ID가 필요합니다."
      });
    }

    const updateData = {};

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "평점은 1-5 사이의 값이어야 합니다."
        });
      }
      updateData.rating = parseInt(rating);
    }

    if (reviewText !== undefined) {
      if (reviewText.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: "리뷰 내용은 최소 10자 이상이어야 합니다."
        });
      }
      if (reviewText.length > 500) {
        return res.status(400).json({
          success: false,
          message: "리뷰 내용은 최대 500자까지 작성 가능합니다."
        });
      }
      updateData.review_text = reviewText.trim();
    }

    if (categories !== undefined) {
      updateData.categories = categories;
    }

    const result = await reviewService.updateReview(reviewId, updateData);

    res.json({
      success: true,
      message: "리뷰가 성공적으로 수정되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('리뷰 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/review/:reviewId
 * 리뷰 삭제
 */
router.delete('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "리뷰 ID가 필요합니다."
      });
    }

    const result = await reviewService.deleteReview(reviewId);

    res.json({
      success: true,
      message: "리뷰가 성공적으로 삭제되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/review/health
 * 리뷰 서비스 상태 확인
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "리뷰 서비스가 정상 작동 중입니다.",
    timestamp: new Date().toISOString(),
    endpoints: {
      create: "POST /api/review",
      getByParking: "GET /api/review/parking/:parkingId",
      getStats: "GET /api/review/parking/:parkingId/stats",
      getByUser: "GET /api/review/user/:userId",
      update: "PUT /api/review/:reviewId",
      delete: "DELETE /api/review/:reviewId"
    }
  });
});

export default router;
