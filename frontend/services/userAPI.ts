import { auth } from "../config/firebase";
import type { Auth, User } from "firebase/auth";

const API_BASE_URL = "https://bb8ce69870ae.ngrok-free.app/api";

// 인증된 요청을 위한 헤더 가져오기
const getAuthHeaders = async () => {
  const user: User | null = auth.currentUser;
  if (!user) {
    console.error("❌ 현재 로그인된 사용자가 없습니다.");
    throw new Error("로그인이 필요합니다.");
  }

  try {
    const token = await user.getIdToken();
    console.log("🔑 인증 토큰 획득 성공");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  } catch (error) {
    console.error("❌ 토큰 획득 실패:", error);
    throw new Error("인증 토큰을 가져올 수 없습니다.");
  }
};

// 사용자 프로필 조회
export const getUserProfile = async () => {
  try {
    const headers = await getAuthHeaders();
    console.log("🔍 프로필 조회 요청 시작:", `${API_BASE_URL}/users/profile`);
    
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: {
        ...headers,
        "ngrok-skip-browser-warning": "true", // ngrok 브라우저 경고 우회
      },
    });

    console.log("📡 프로필 조회 응답 상태:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ 프로필 조회 실패:", response.status, errorText);
      throw new Error(`프로필 조회에 실패했습니다. (${response.status})`);
    }

    const data = await response.json();
    console.log("✅ 프로필 조회 성공:", data);
    return data;
  } catch (error) {
    console.error("프로필 조회 에러:", error);
    throw error;
  }
};

// 사용자 프로필 업데이트
export const updateUserProfile = async (profileData: {
  displayName?: string;
  phoneNumber?: string;
  preferences?: {
    notifications?: boolean;
    locationServices?: boolean;
  };
}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error("프로필 업데이트에 실패했습니다.");
    }

    return await response.json();
  } catch (error) {
    console.error("프로필 업데이트 에러:", error);
    throw error;
  }
};

// 즐겨찾기 추가
export const addToFavorites = async (parkingLotId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/favorites`, {
      method: "POST",
      headers,
      body: JSON.stringify({ parkingLotId }),
    });

    if (!response.ok) {
      throw new Error("즐겨찾기 추가에 실패했습니다.");
    }

    return await response.json();
  } catch (error) {
    console.error("즐겨찾기 추가 에러:", error);
    throw error;
  }
};

// 즐겨찾기 제거
export const removeFromFavorites = async (parkingLotId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/users/favorites/${parkingLotId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error("즐겨찾기 제거에 실패했습니다.");
    }

    return await response.json();
  } catch (error) {
    console.error("즐겨찾기 제거 에러:", error);
    throw error;
  }
};

// 예약 내역 조회
export const getUserReservations = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/reservations`, {
      headers,
    });

    if (!response.ok) {
      throw new Error("예약 내역 조회에 실패했습니다.");
    }

    return await response.json();
  } catch (error) {
    console.error("예약 내역 조회 에러:", error);
    throw error;
  }
};

// 계정 삭제
export const deleteUserAccount = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/account`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error("계정 삭제에 실패했습니다.");
    }

    return await response.json();
  } catch (error) {
    console.error("계정 삭제 에러:", error);
    throw error;
  }
};
