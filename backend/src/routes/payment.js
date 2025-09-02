import express from 'express';
import { PaymentService } from '../services/paymentService.js';

const router = express.Router();
const paymentService = new PaymentService();

/**
 * POST /api/payment/create
 * 결제 요청 생성
 * 
 * Body:
 * {
 *   "amount": 5000,
 *   "orderName": "주차장 예약",
 *   "customerName": "홍길동",
 *   "customerEmail": "hong@example.com",
 *   "customerPhone": "010-1234-5678",
 *   "productType": "parking_reservation",
 *   "parkingId": "123",
 *   "parkingName": "강남역 지하주차장",
 *   "userId": "user123"
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const {
      amount,
      orderName,
      customerName,
      customerEmail,
      customerPhone,
      productType,
      parkingId,
      parkingName,
      userId
    } = req.body;

    // 입력값 검증
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "유효한 결제 금액을 입력해주세요."
      });
    }

    if (!orderName || !customerName) {
      return res.status(400).json({
        success: false,
        message: "주문명과 고객명은 필수입니다."
      });
    }

    if (!customerEmail && !customerPhone) {
      return res.status(400).json({
        success: false,
        message: "이메일 또는 전화번호 중 하나는 필수입니다."
      });
    }

    const paymentData = {
      amount: parseInt(amount),
      orderName,
      customerName,
      customerEmail,
      customerPhone,
      productType,
      parkingId,
      parkingName,
      userId
    };

    const result = await paymentService.createPayment(paymentData);
    
    res.status(201).json({
      success: true,
      message: "결제 요청이 생성되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('결제 요청 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/payment/confirm
 * 결제 승인 처리
 * 
 * Body:
 * {
 *   "paymentKey": "payment_key_here",
 *   "orderId": "order_id_here",
 *   "amount": 5000
 * }
 */
router.post('/confirm', async (req, res) => {
  try {
    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "결제 키, 주문 ID, 금액이 모두 필요합니다."
      });
    }

    const result = await paymentService.confirmPayment(paymentKey, orderId, parseInt(amount));
    
    res.json({
      success: true,
      message: "결제가 성공적으로 완료되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('결제 승인 오류:', error);
    res.status(500).json({
      success: false,
      message: "결제 승인 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/payment/cancel
 * 결제 취소
 * 
 * Body:
 * {
 *   "paymentKey": "payment_key_here",
 *   "cancelReason": "사용자 요청"
 * }
 */
router.post('/cancel', async (req, res) => {
  try {
    const { paymentKey, cancelReason } = req.body;

    if (!paymentKey) {
      return res.status(400).json({
        success: false,
        message: "결제 키가 필요합니다."
      });
    }

    const result = await paymentService.cancelPayment(paymentKey, cancelReason);
    
    res.json({
      success: true,
      message: "결제가 성공적으로 취소되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('결제 취소 오류:', error);
    res.status(500).json({
      success: false,
      message: "결제 취소 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/payment/history/:userId
 * 사용자별 결제 내역 조회
 * 
 * Query Parameters:
 * - limit: 페이지당 결제 수 (기본값: 20)
 * - offset: 건너뛸 결제 수 (기본값: 0)
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "사용자 ID가 필요합니다."
      });
    }

    const payments = await paymentService.getPaymentHistory(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: payments,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: payments.length
      }
    });

  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: "결제 내역 조회 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/payment/order/:orderId
 * 특정 주문 조회
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "주문 ID가 필요합니다."
      });
    }

    const order = await paymentService.getOrder(orderId);

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('주문 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: "주문 조회 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/payment/reservation
 * 주차장 예약 결제 요청
 * 
 * Body:
 * {
 *   "parkingId": "123",
 *   "parkingName": "강남역 지하주차장",
 *   "startTime": "2024-01-15T10:00:00Z",
 *   "endTime": "2024-01-15T12:00:00Z",
 *   "duration": 2,
 *   "amount": 6000,
 *   "userId": "user123",
 *   "customerName": "홍길동",
 *   "customerEmail": "hong@example.com",
 *   "customerPhone": "010-1234-5678"
 * }
 */
router.post('/reservation', async (req, res) => {
  try {
    const reservationData = req.body;

    // 필수 필드 검증
    const requiredFields = ['parkingId', 'parkingName', 'startTime', 'endTime', 'duration', 'amount', 'userId', 'customerName'];
    for (const field of requiredFields) {
      if (!reservationData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} 필드는 필수입니다.`
        });
      }
    }

    const result = await paymentService.createParkingReservationPayment(reservationData);
    
    res.status(201).json({
      success: true,
      message: "주차장 예약 결제 요청이 생성되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('주차장 예약 결제 요청 오류:', error);
    res.status(500).json({
      success: false,
      message: "주차장 예약 결제 요청 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/payment/ticket
 * 주차권 구매 결제 요청
 * 
 * Body:
 * {
 *   "ticketType": "1시간",
 *   "quantity": 5,
 *   "amount": 15000,
 *   "userId": "user123",
 *   "customerName": "홍길동",
 *   "customerEmail": "hong@example.com",
 *   "customerPhone": "010-1234-5678"
 * }
 */
router.post('/ticket', async (req, res) => {
  try {
    const ticketData = req.body;

    // 필수 필드 검증
    const requiredFields = ['ticketType', 'quantity', 'amount', 'userId', 'customerName'];
    for (const field of requiredFields) {
      if (!ticketData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} 필드는 필수입니다.`
        });
      }
    }

    const result = await paymentService.createParkingTicketPayment(ticketData);
    
    res.status(201).json({
      success: true,
      message: "주차권 구매 결제 요청이 생성되었습니다.",
      data: result
    });

  } catch (error) {
    console.error('주차권 구매 결제 요청 오류:', error);
    res.status(500).json({
      success: false,
      message: "주차권 구매 결제 요청 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/payment/health
 * 결제 서비스 상태 확인
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "토스페이먼츠 결제 서비스가 정상 작동 중입니다.",
    timestamp: new Date().toISOString(),
    endpoints: {
      create: "POST /api/payment/create",
      confirm: "POST /api/payment/confirm",
      cancel: "POST /api/payment/cancel",
      history: "GET /api/payment/history/:userId",
      order: "GET /api/payment/order/:orderId",
      reservation: "POST /api/payment/reservation",
      ticket: "POST /api/payment/ticket"
    }
  });
});

export default router;
