import { auth } from "../config/firebase";

const API_BASE_URL = "https://477995459e77.ngrok-free.app";

// 인증된 요청을 위한 헤더 가져오기
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true",
  };
};

// 예약 생성
export const createReservation = async (reservationData: {
  parkingLotId: string;
  parkingLotName: string;
  parkingLotAddress: string;
  ownerName?: string;
  ownerContact?: string;
  reservationDate: string; // YYYY-MM-DD 형식
  timeSlots: string[]; // ['09:00', '10:00'] 배열
  startTime: string;
  endTime: string;
  duration: number;
  totalPrice: number;
  pricePerHour: number;
  paymentMethod?: string;
  specialRequests?: string;
}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/reservations`, {
      method: "POST",
      headers,
      body: JSON.stringify(reservationData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "예약 생성에 실패했습니다.");
    }

    return result;
  } catch (error) {
    console.error("예약 생성 에러:", error);
    throw error;
  }
};

// 사용자 예약 목록 조회
export const getUserReservations = async (limit: number = 50) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/reservations/my?limit=${limit}`,
      {
        headers,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "예약 목록 조회에 실패했습니다.");
    }

    return result.data;
  } catch (error) {
    console.error("예약 목록 조회 에러:", error);
    throw error;
  }
};

// 특정 예약 상세 조회
export const getReservation = async (reservationId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/reservations/${reservationId}`,
      {
        headers,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "예약 조회에 실패했습니다.");
    }

    return result.data;
  } catch (error) {
    console.error("예약 조회 에러:", error);
    throw error;
  }
};

// 예약 취소
export const cancelReservation = async (reservationId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/reservations/${reservationId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "예약 취소에 실패했습니다.");
    }

    return result;
  } catch (error) {
    console.error("예약 취소 에러:", error);
    throw error;
  }
};

// 특정 주차장의 예약 가능 시간대 조회
export const getAvailableTimeSlots = async (
  parkingLotId: string,
  date: string
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/reservations/available-slots/${parkingLotId}?date=${date}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "예약 가능 시간대 조회에 실패했습니다."
      );
    }

    return result.data;
  } catch (error) {
    console.error("예약 가능 시간대 조회 에러:", error);
    throw error;
  }
};

// 예약된 시간대 조회
export const getReservedTimeSlots = async (
  parkingLotId: string,
  date: string
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/reservations/reserved-slots/${parkingLotId}?date=${date}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "예약된 시간대 조회에 실패했습니다.");
    }

    return result.data;
  } catch (error) {
    console.error("예약된 시간대 조회 에러:", error);
    throw error;
  }
};

// 예약 상태 업데이트 (관리자용)
export const updateReservationStatus = async (
  reservationId: string,
  status: string,
  paymentStatus?: string
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/reservations/${reservationId}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status, paymentStatus }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "예약 상태 업데이트에 실패했습니다.");
    }

    return result;
  } catch (error) {
    console.error("예약 상태 업데이트 에러:", error);
    throw error;
  }
};

// 예약 통계 조회 (관리자용)
export const getReservationStats = async (
  startDate?: string,
  endDate?: string
) => {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/api/reservations/stats/summary`;

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, { headers });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "예약 통계 조회에 실패했습니다.");
    }

    return result.data;
  } catch (error) {
    console.error("예약 통계 조회 에러:", error);
    throw error;
  }
};

// 예약 데이터 타입 정의
export interface Reservation {
  id: string;
  userId: string;
  parkingLotId: string;
  parkingLotName: string;
  parkingLotAddress: string;
  ownerName?: string;
  ownerContact?: string;
  reservationDate: string;
  timeSlots: string[];
  startTime: string;
  endTime: string;
  duration: number;
  totalPrice: number;
  pricePerHour: number;
  status: "confirmed" | "cancelled" | "completed";
  paymentStatus: "pending" | "paid" | "refunded";
  paymentMethod?: string;
  specialRequests?: string;
  created_at: any;
  updated_at: any;
}

export interface TimeSlotAvailability {
  available: string[];
  reserved: string[];
}

export interface ReservationStats {
  totalReservations: number;
  totalRevenue: number;
  statusCounts: {
    confirmed: number;
    cancelled: number;
    completed: number;
  };
}
