// 토스페이먼츠 결제 API 서비스

// API URL 자동 감지 (ngrok 우선, 실패 시 로컬 IP)
const NGROK_URL = "https://f0e9b8cc7106.ngrok-free.app/api";
const LOCAL_URL = "http://192.168.219.113:5001/api";

// ngrok이 작동하는지 확인하고 URL 결정
const API_BASE_URL = NGROK_URL; // 우선 ngrok 시도

export interface PaymentRequest {
  amount: number;
  orderName: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  productType: string;
  parkingId?: string;
  parkingName?: string;
  userId: string;
}

export interface ReservationPaymentRequest {
  parkingId: string;
  parkingName: string;
  startTime: string;
  endTime: string;
  duration: number;
  amount: number;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface TicketPaymentRequest {
  ticketType: string;
  quantity: number;
  amount: number;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface PaymentCancelRequest {
  paymentKey: string;
  cancelReason?: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data: any;
}

class PaymentAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true", // ngrok 브라우저 경고 우회
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
      console.error("Payment API 요청 실패:", error);
      throw error;
    }
  }

  /**
   * 일반 결제 요청 생성
   */
  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    return this.request<PaymentResponse>("/payment/create", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  /**
   * 주차장 예약 결제 요청
   */
  async createReservationPayment(
    reservationData: ReservationPaymentRequest
  ): Promise<PaymentResponse> {
    return this.request<PaymentResponse>("/payment/reservation", {
      method: "POST",
      body: JSON.stringify(reservationData),
    });
  }

  /**
   * 주차권 구매 결제 요청
   */
  async createTicketPayment(
    ticketData: TicketPaymentRequest
  ): Promise<PaymentResponse> {
    return this.request<PaymentResponse>("/payment/ticket", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  }

  /**
   * 결제 승인 처리
   */
  async confirmPayment(
    confirmData: PaymentConfirmRequest
  ): Promise<PaymentResponse> {
    return this.request<PaymentResponse>("/payment/confirm", {
      method: "POST",
      body: JSON.stringify(confirmData),
    });
  }

  /**
   * 결제 취소
   */
  async cancelPayment(
    cancelData: PaymentCancelRequest
  ): Promise<PaymentResponse> {
    return this.request<PaymentResponse>("/payment/cancel", {
      method: "POST",
      body: JSON.stringify(cancelData),
    });
  }

  /**
   * 결제 내역 조회
   */
  async getPaymentHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaymentResponse> {
    return this.request<PaymentResponse>(
      `/payment/history/${userId}?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * 특정 주문 조회
   */
  async getOrder(orderId: string): Promise<PaymentResponse> {
    return this.request<PaymentResponse>(`/payment/order/${orderId}`);
  }

  /**
   * 결제 서비스 상태 확인
   */
  async getHealth(): Promise<PaymentResponse> {
    return this.request<PaymentResponse>("/payment/health");
  }

  /**
   * 토스페이먼츠 결제 위젯 초기화 및 실행
   */
  async initializeTossPayments(
    clientKey: string,
    paymentData: any
  ): Promise<void> {
    try {
      // 토스페이먼츠 SDK 동적 import (React Native 환경 고려)
      const { loadTossPayments } = await import("@tosspayments/payment-sdk");

      const tossPayments = await loadTossPayments(clientKey);

      console.log("💳 토스페이먼츠 결제 위젯 초기화:", {
        clientKey,
        paymentData,
      });

      // 결제 요청 실행
      await tossPayments.requestPayment("카드", {
        amount: paymentData.amount,
        orderId: paymentData.orderId,
        orderName: paymentData.orderName,
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        successUrl: paymentData.successUrl,
        failUrl: paymentData.failUrl,
        windowTarget: "iframe",
        useInternationalCardOnly: false,
        flowMode: "DEFAULT",
        easyPay: "TOSSPAY",
      });
    } catch (error) {
      console.error("토스페이먼츠 결제 위젯 초기화 실패:", error);
      throw error;
    }
  }

  /**
   * 결제 요청 로깅 (터미널 확인용)
   */
  logPaymentRequest(paymentData: any, type: string = "일반 결제") {
    console.log(`💳 ${type} 요청:`, JSON.stringify(paymentData, null, 2));
  }
}

export const paymentAPI = new PaymentAPI();
