import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export class ReviewService {
  constructor() {
    this.collections = {
      REVIEWS: 'reviews',
      PARKING_LOTS: 'parking_lots'
    };
  }

  /**
   * 리뷰 저장
   */
  async saveReview(reviewData) {
    try {
      const docRef = db.collection(this.collections.REVIEWS).doc();

      const data = {
        id: docRef.id,
        parking_id: reviewData.parkingId,
        parking_name: reviewData.parkingName,
        user_id: reviewData.userId || 'anonymous',
        rating: reviewData.rating,
        review_text: reviewData.reviewText,
        categories: reviewData.categories || [],
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      await docRef.set(data);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("리뷰 저장 실패:", error);
      throw new Error(`리뷰 저장 실패: ${error.message}`);
    }
  }

  /**
   * 특정 주차장의 리뷰 목록 조회
   */
  async getReviewsByParkingId(parkingId, limit = 20, offset = 0) {
    try {
      // Firestore 복합 인덱스 문제를 피하기 위해 단계별로 처리
      const snapshot = await db.collection(this.collections.REVIEWS)
        .where('parking_id', '==', parkingId)
        .get();

      const reviews = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          ...data,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        });
      });

      // 메모리에서 정렬 및 페이지네이션 처리
      reviews.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime(); // 최신순
      });

      const startIndex = offset;
      const endIndex = startIndex + limit;
      const paginatedReviews = reviews.slice(startIndex, endIndex);

      return paginatedReviews;
    } catch (error) {
      console.error("리뷰 목록 조회 실패:", error);
      throw new Error(`리뷰 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 주차장의 리뷰 통계 조회
   */
  async getReviewStats(parkingId) {
    try {
      const snapshot = await db.collection(this.collections.REVIEWS)
        .where('parking_id', '==', parkingId)
        .get();

      let totalReviews = 0;
      let totalRating = 0;
      const categoryStats = {};

      snapshot.forEach((doc) => {
        const review = doc.data();
        totalReviews++;
        totalRating += review.rating;

        // 카테고리별 통계
        if (review.categories && Array.isArray(review.categories)) {
          review.categories.forEach(category => {
            categoryStats[category] = (categoryStats[category] || 0) + 1;
          });
        }
      });

      const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

      return {
        totalReviews,
        averageRating: parseFloat(averageRating),
        categoryStats,
        ratingDistribution: this.calculateRatingDistribution(snapshot.docs)
      };
    } catch (error) {
      console.error("리뷰 통계 조회 실패:", error);
      throw new Error(`리뷰 통계 조회 실패: ${error.message}`);
    }
  }

  /**
   * 평점 분포 계산
   */
  calculateRatingDistribution(reviews) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(doc => {
      const rating = doc.data().rating;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });

    return distribution;
  }

  /**
   * 사용자별 리뷰 목록 조회
   */
  async getReviewsByUserId(userId, limit = 20, offset = 0) {
    try {
      // Firestore 복합 인덱스 문제를 피하기 위해 단계별로 처리
      const snapshot = await db.collection(this.collections.REVIEWS)
        .where('user_id', '==', userId)
        .get();

      const reviews = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          ...data,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        });
      });

      // 메모리에서 정렬 및 페이지네이션 처리
      reviews.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime(); // 최신순
      });

      const startIndex = offset;
      const endIndex = startIndex + limit;
      const paginatedReviews = reviews.slice(startIndex, endIndex);

      return paginatedReviews;
    } catch (error) {
      console.error("사용자 리뷰 목록 조회 실패:", error);
      throw new Error(`사용자 리뷰 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 리뷰 수정
   */
  async updateReview(reviewId, updateData) {
    try {
      const docRef = db.collection(this.collections.REVIEWS).doc(reviewId);
      
      const data = {
        ...updateData,
        updated_at: FieldValue.serverTimestamp(),
      };

      await docRef.update(data);
      return { success: true, id: reviewId };
    } catch (error) {
      console.error("리뷰 수정 실패:", error);
      throw new Error(`리뷰 수정 실패: ${error.message}`);
    }
  }

  /**
   * 리뷰 삭제
   */
  async deleteReview(reviewId) {
    try {
      const docRef = db.collection(this.collections.REVIEWS).doc(reviewId);
      await docRef.delete();
      return { success: true, id: reviewId };
    } catch (error) {
      console.error("리뷰 삭제 실패:", error);
      throw new Error(`리뷰 삭제 실패: ${error.message}`);
    }
  }
}


