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

// 개인 주차장 등록
export const createPersonalParkingLot = async (parkingData: {
  name: string;
  address: string;
  description?: string;
  lat?: number;
  lng?: number;
  pricePerHour?: number;
  rules?: string[];
  availableDays?: number[]; // 0=일, 1=월, 2=화, ... 6=토
  availableStartTime?: string; // "09:00"
  availableEndTime?: string; // "18:00"
}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/personal-parking`, {
      method: "POST",
      headers,
      body: JSON.stringify(parkingData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "개인 주차장 등록에 실패했습니다.");
    }

    return result;
  } catch (error) {
    console.error("개인 주차장 등록 에러:", error);
    throw error;
  }
};

// 모든 활성 개인 주차장 조회 (공개용)
export const getAllPersonalParkingLots = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/personal-parking`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "개인 주차장 목록 조회에 실패했습니다."
      );
    }

    return result.data;
  } catch (error) {
    console.error("개인 주차장 목록 조회 에러:", error);
    throw error;
  }
};

// 내 개인 주차장 목록 조회
export const getMyPersonalParkingLots = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/personal-parking/my`, {
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "내 주차장 목록 조회에 실패했습니다.");
    }

    return result.data;
  } catch (error) {
    console.error("내 주차장 목록 조회 에러:", error);
    throw error;
  }
};

// 특정 개인 주차장 조회
export const getPersonalParkingLot = async (parkingLotId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/personal-parking/${parkingLotId}`,
      {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "주차장 조회에 실패했습니다.");
    }

    return result.data;
  } catch (error) {
    console.error("주차장 조회 에러:", error);
    throw error;
  }
};

// 개인 주차장 정보 수정
export const updatePersonalParkingLot = async (
  parkingLotId: string,
  updateData: {
    name?: string;
    address?: string;
    description?: string;
    pricePerHour?: number;
    rules?: string[];
    availableDays?: number[];
    availableStartTime?: string;
    availableEndTime?: string;
    status?: "available" | "occupied" | "inactive";
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/personal-parking/${parkingLotId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(updateData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "주차장 정보 수정에 실패했습니다.");
    }

    return result;
  } catch (error) {
    console.error("주차장 정보 수정 에러:", error);
    throw error;
  }
};

// 개인 주차장 비활성화 (삭제)
export const deletePersonalParkingLot = async (parkingLotId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/personal-parking/${parkingLotId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "주차장 삭제에 실패했습니다.");
    }

    return result;
  } catch (error) {
    console.error("주차장 삭제 에러:", error);
    throw error;
  }
};

// 개인 주차장 데이터 타입 정의
export interface PersonalParkingLot {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  description: string;
  lat?: number;
  lng?: number;
  pricePerHour: number;
  rules: string[];
  availableDays: number[];
  availableStartTime: string;
  availableEndTime: string;
  isActive: boolean;
  status: "available" | "occupied" | "inactive";
  rating: number;
  reviewCount: number;
  totalBookings: number;
  created_at: any;
  updated_at: any;
  // 소유자 정보 (조회 시에만)
  ownerName?: string;
  ownerContact?: string;
  ownerEmail?: string;
}
