import { ENV } from './env.js';

export const TOSS_PAYMENTS_CONFIG = {
  // 토스페이먼츠 API 키 (실제 운영 시에는 환경변수로 관리)
  SECRET_KEY: ENV.TOSS_SECRET_KEY || 'test_sk_D5GePWvyJnrK0W0k6q8gLzN97Eoq',
  CLIENT_KEY: ENV.TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq',
  
  // API 엔드포인트
  BASE_URL: 'https://api.tosspayments.com',
  PAYMENTS_URL: 'https://api.tosspayments.com/v1/payments',
  
  // 결제 성공/실패 URL (ngrok 터널 사용)
  SUCCESS_URL: ENV.PAYMENT_SUCCESS_URL || 'https://53fb5fcb1501.ngrok-free.app/payment/success',
  FAIL_URL: ENV.PAYMENT_FAIL_URL || 'https://53fb5fcb1501.ngrok-free.app/payment/fail',
  
  // 지원하는 결제 수단
  PAYMENT_METHODS: {
    CARD: 'card',           // 신용카드
    TRANSFER: 'transfer',   // 계좌이체
    VIRTUAL_ACCOUNT: 'virtual_account', // 가상계좌
    PHONE: 'phone',         // 휴대폰 결제
    GIFT_CERTIFICATE: 'gift_certificate', // 상품권
    CULTURE_GIFT_CERTIFICATE: 'culture_gift_certificate', // 문화상품권
    BOOK_GIFT_CERTIFICATE: 'book_gift_certificate', // 도서상품권
    GAME_GIFT_CERTIFICATE: 'game_gift_certificate', // 게임상품권
  },
  
  // 결제 상태
  PAYMENT_STATUS: {
    READY: 'READY',           // 결제 준비
    IN_PROGRESS: 'IN_PROGRESS', // 결제 진행중
    DONE: 'DONE',             // 결제 완료
    CANCELED: 'CANCELED',     // 결제 취소
    PARTIAL_CANCELED: 'PARTIAL_CANCELED', // 부분 취소
    ABORTED: 'ABORTED',       // 결제 중단
    FAILED: 'FAILED',         // 결제 실패
  }
};

// 결제 상품 타입
export const PAYMENT_PRODUCT_TYPES = {
  PARKING_RESERVATION: 'parking_reservation', // 주차장 예약
  PARKING_TICKET: 'parking_ticket',           // 주차권 구매
  PREMIUM_SERVICE: 'premium_service',         // 프리미엄 서비스
  MONTHLY_SUBSCRIPTION: 'monthly_subscription', // 월 구독
};

// 결제 상품 정보
export const PAYMENT_PRODUCTS = {
  [PAYMENT_PRODUCT_TYPES.PARKING_RESERVATION]: {
    name: '주차장 예약',
    description: '주차장 예약 서비스'
  },
  [PAYMENT_PRODUCT_TYPES.PARKING_TICKET]: {
    name: '주차권',
    description: '주차권 구매'
  },
  [PAYMENT_PRODUCT_TYPES.PREMIUM_SERVICE]: {
    name: '프리미엄 서비스',
    description: '프리미엄 주차 서비스'
  },
  [PAYMENT_PRODUCT_TYPES.MONTHLY_SUBSCRIPTION]: {
    name: '월 구독',
    description: '월간 주차 서비스 구독'
  }
};
