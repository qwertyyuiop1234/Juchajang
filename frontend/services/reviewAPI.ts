// 리뷰 API 서비스

// API URL 자동 감지 (ngrok 우선, 실패 시 로컬 IP)
const NGROK_URL = 'https://10e981896508.ngrok-free.app/api';
const LOCAL_URL = 'http://192.168.219.113:5001/api';

// ngrok이 작동하는지 확인하고 URL 결정
const API_BASE_URL = NGROK_URL; // 우선 ngrok 시도

export interface ReviewRequest {
  parkingId: string;
  parkingName: string;
  userId?: string;
  rating: number;
  reviewText: string;
  categories?: string[];
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface Review {
  id: string;
  parking_id: string;
  parking_name: string;
  user_id: string;
  rating: number;
  review_text: string;
  categories: string[];
  created_at: any;
  updated_at: any;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  categoryStats: Record<string, number>;
  ratingDistribution: Record<number, number>;
}

class ReviewAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // ngrok 브라우저 경고 우회
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Review API 요청 실패:', error);
      throw error;
    }
  }



  /**
   * 리뷰 작성
   */
  async createReview(reviewData: ReviewRequest): Promise<ReviewResponse> {
    return this.request<ReviewResponse>('/review', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  /**
   * 특정 주차장의 리뷰 목록 조회
   */
  async getReviewsByParkingId(parkingId: string, limit: number = 20, offset: number = 0): Promise<ReviewResponse> {
    return this.request<ReviewResponse>(`/review/parking/${parkingId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * 특정 주차장의 리뷰 통계 조회
   */
  async getReviewStats(parkingId: string): Promise<ReviewResponse> {
    return this.request<ReviewResponse>(`/review/parking/${parkingId}/stats`);
  }

  /**
   * 특정 사용자의 리뷰 목록 조회
   */
  async getReviewsByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<ReviewResponse> {
    return this.request<ReviewResponse>(`/review/user/${userId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * 리뷰 수정
   */
  async updateReview(reviewId: string, updateData: Partial<ReviewRequest>): Promise<ReviewResponse> {
    return this.request<ReviewResponse>(`/review/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * 리뷰 삭제
   */
  async deleteReview(reviewId: string): Promise<ReviewResponse> {
    return this.request<ReviewResponse>(`/review/${reviewId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 리뷰 서비스 상태 확인
   */
  async getHealth(): Promise<ReviewResponse> {
    return this.request<ReviewResponse>('/review/health');
  }

  /**
   * 리뷰 요청 로깅 (터미널 확인용)
   */
  logReviewRequest(reviewData: any, type: string = '리뷰 작성') {
    console.log(`📝 ${type} 요청:`, JSON.stringify(reviewData, null, 2));
  }
}

export const reviewAPI = new ReviewAPI();
