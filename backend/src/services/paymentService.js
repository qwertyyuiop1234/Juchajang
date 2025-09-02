import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { TOSS_PAYMENTS_CONFIG, PAYMENT_PRODUCT_TYPES } from '../config/payment.js';

export class PaymentService {
  constructor() {
    this.collections = {
      PAYMENTS: 'payments',
      ORDERS: 'orders'
    };
  }

  /**
   * 결제 요청 생성
   */
  async createPayment(paymentData) {
    try {
      const {
        amount,
        orderId,
        orderName,
        customerName,
        customerEmail,
        customerPhone,
        productType,
        parkingId,
        parkingName,
        userId
      } = paymentData;

      // 주문 정보 저장
      const orderRef = db.collection(this.collections.ORDERS).doc(orderId);
      const orderData = {
        orderId,
        orderName,
        amount,
        productType,
        parkingId,
        parkingName,
        userId,
        customerName,
        customerEmail,
        customerPhone,
        status: 'PENDING',
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      };

      await orderRef.set(orderData);

      // 토스페이먼츠 결제 요청 데이터
      const tossPaymentData = {
        amount: amount,
        orderId: orderId,
        orderName: orderName,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        successUrl: TOSS_PAYMENTS_CONFIG.SUCCESS_URL,
        failUrl: TOSS_PAYMENTS_CONFIG.FAIL_URL,
        windowTarget: 'iframe',
        useInternationalCardOnly: false,
        flowMode: 'DEFAULT',
        easyPay: 'TOSSPAY'
      };

      console.log('💳 토스페이먼츠 결제 요청:', JSON.stringify(tossPaymentData, null, 2));

      return {
        success: true,
        orderId,
        paymentData: tossPaymentData,
        clientKey: TOSS_PAYMENTS_CONFIG.CLIENT_KEY
      };

    } catch (error) {
      console.error("결제 요청 생성 실패:", error);
      throw new Error(`결제 요청 생성 실패: ${error.message}`);
    }
  }

  /**
   * 결제 승인 처리
   */
  async confirmPayment(paymentKey, orderId, amount) {
    try {
      // 토스페이먼츠 결제 승인 API 호출 (실제 구현 시)
      const confirmData = {
        paymentKey,
        orderId,
        amount
      };

      console.log('✅ 토스페이먼츠 결제 승인:', JSON.stringify(confirmData, null, 2));

      // 결제 정보 저장
      const paymentRef = db.collection(this.collections.PAYMENTS).doc();
      const paymentData = {
        id: paymentRef.id,
        paymentKey,
        orderId,
        amount,
        status: TOSS_PAYMENTS_CONFIG.PAYMENT_STATUS.DONE,
        confirmed_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp()
      };

      await paymentRef.set(paymentData);

      // 주문 상태 업데이트
      const orderRef = db.collection(this.collections.ORDERS).doc(orderId);
      await orderRef.update({
        status: 'PAID',
        paymentId: paymentRef.id,
        paid_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });

      return {
        success: true,
        paymentId: paymentRef.id,
        orderId,
        amount
      };

    } catch (error) {
      console.error("결제 승인 실패:", error);
      throw new Error(`결제 승인 실패: ${error.message}`);
    }
  }

  /**
   * 결제 취소
   */
  async cancelPayment(paymentKey, cancelReason) {
    try {
      const cancelData = {
        paymentKey,
        cancelReason: cancelReason || '사용자 요청'
      };

      console.log('❌ 토스페이먼츠 결제 취소:', JSON.stringify(cancelData, null, 2));

      // 결제 상태 업데이트
      const paymentRef = db.collection(this.collections.PAYMENTS).doc();
      await paymentRef.update({
        status: TOSS_PAYMENTS_CONFIG.PAYMENT_STATUS.CANCELED,
        cancelReason,
        canceled_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });

      return {
        success: true,
        paymentKey,
        cancelReason
      };

    } catch (error) {
      console.error("결제 취소 실패:", error);
      throw new Error(`결제 취소 실패: ${error.message}`);
    }
  }

  /**
   * 결제 내역 조회
   */
  async getPaymentHistory(userId, limit = 20, offset = 0) {
    try {
      const snapshot = await db.collection(this.collections.ORDERS)
        .where('userId', '==', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const payments = [];
      snapshot.forEach((doc) => {
        payments.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return payments;

    } catch (error) {
      console.error("결제 내역 조회 실패:", error);
      throw new Error(`결제 내역 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 주문 조회
   */
  async getOrder(orderId) {
    try {
      const orderDoc = await db.collection(this.collections.ORDERS).doc(orderId).get();
      
      if (!orderDoc.exists) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      return {
        id: orderDoc.id,
        ...orderDoc.data()
      };

    } catch (error) {
      console.error("주문 조회 실패:", error);
      throw new Error(`주문 조회 실패: ${error.message}`);
    }
  }

  /**
   * 주차장 예약 결제 요청
   */
  async createParkingReservationPayment(reservationData) {
    const {
      parkingId,
      parkingName,
      startTime,
      endTime,
      duration,
      amount,
      userId,
      customerName,
      customerEmail,
      customerPhone
    } = reservationData;

    const orderId = `reservation_${parkingId}_${Date.now()}`;
    const orderName = `${parkingName} 예약 (${duration}시간)`;

    return this.createPayment({
      amount,
      orderId,
      orderName,
      customerName,
      customerEmail,
      customerPhone,
      productType: PAYMENT_PRODUCT_TYPES.PARKING_RESERVATION,
      parkingId,
      parkingName,
      userId,
      metadata: {
        startTime,
        endTime,
        duration
      }
    });
  }

  /**
   * 주차권 구매 결제 요청
   */
  async createParkingTicketPayment(ticketData) {
    const {
      ticketType,
      quantity,
      amount,
      userId,
      customerName,
      customerEmail,
      customerPhone
    } = ticketData;

    const orderId = `ticket_${ticketType}_${Date.now()}`;
    const orderName = `주차권 ${ticketType} ${quantity}장`;

    return this.createPayment({
      amount,
      orderId,
      orderName,
      customerName,
      customerEmail,
      customerPhone,
      productType: PAYMENT_PRODUCT_TYPES.PARKING_TICKET,
      userId,
      metadata: {
        ticketType,
        quantity
      }
    });
  }
}
