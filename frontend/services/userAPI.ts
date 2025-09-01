import { auth } from '../config/firebase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// 인증된 요청을 위한 헤더 가져오기
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// 사용자 프로필 조회
export const getUserProfile = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('프로필 조회에 실패했습니다.');
    }

    return await response.json();
  } catch (error) {
    console.error('프로필 조회 에러:', error);
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
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error('프로필 업데이트에 실패했습니다.');
    }

    return await response.json();
  } catch (error) {
    console.error('프로필 업데이트 에러:', error);
    throw error;
  }
};

// 즐겨찾기 추가
export const addToFavorites = async (parkingLotId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/users/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ parkingLotId }),
    });

    if (!response.ok) {
      throw new Error('즐겨찾기 추가에 실패했습니다.');
    }

    return await response.json();
  } catch (error) {
    console.error('즐겨찾기 추가 에러:', error);
    throw error;
  }
};

// 즐겨찾기 제거
export const removeFromFavorites = async (parkingLotId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/users/favorites/${parkingLotId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('즐겨찾기 제거에 실패했습니다.');
    }

    return await response.json();
  } catch (error) {
    console.error('즐겨찾기 제거 에러:', error);
    throw error;
  }
};

// 예약 내역 조회
export const getUserReservations = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/users/reservations`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('예약 내역 조회에 실패했습니다.');
    }

    return await response.json();
  } catch (error) {
    console.error('예약 내역 조회 에러:', error);
    throw error;
  }
};

// 계정 삭제
export const deleteUserAccount = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/users/account`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('계정 삭제에 실패했습니다.');
    }

    return await response.json();
  } catch (error) {
    console.error('계정 삭제 에러:', error);
    throw error;
  }
};