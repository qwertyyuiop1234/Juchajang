import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile } from '../services/userAPI';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  phoneNumber?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  favorites: string[];
  preferences: {
    notifications: boolean;
    locationServices: boolean;
  };
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType>({} as UserProfileContextType);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 사용자가 로그인하면 프로필 정보를 로드
  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setProfile(null);
      setLoading(false);
      setError(null);
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const profileData = await getUserProfile();
      setProfile(profileData);
    } catch (error: any) {
      console.error('프로필 로드 실패:', error);
      setError(error.message || '프로필을 불러올 수 없습니다.');
      
      // 프로필 로드 실패 시 기본 프로필 생성
      if (user) {
        const defaultProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || null,
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          favorites: [],
          preferences: {
            notifications: true,
            locationServices: true,
          }
        };
        setProfile(defaultProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProfile = await updateUserProfile(data);
      setProfile(updatedProfile);
    } catch (error: any) {
      console.error('프로필 업데이트 실패:', error);
      setError(error.message || '프로필 업데이트에 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await loadUserProfile();
  };

  const value: UserProfileContextType = {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};