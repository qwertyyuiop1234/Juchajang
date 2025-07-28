import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ParkingLot {
  id: number;
  name: string;
  address: string;
  distance: string;
  time: string;
  rating: number;
  totalReviews: number;
  available: number;
  total: number;
  price: string;
  status: string;
  statusColor: string;
  operatingHours: string;
  phone: string;
  features: string[];
  description: string;
}

interface FavoritesContextType {
  favorites: ParkingLot[];
  addFavorite: (parkingLot: ParkingLot) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

const FAVORITES_STORAGE_KEY = '@parking_favorites';

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<ParkingLot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 즐겨찾기 로드
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites);
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error('즐겨찾기 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: ParkingLot[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('즐겨찾기 저장 중 오류:', error);
    }
  };

  const addFavorite = async (parkingLot: ParkingLot) => {
    setFavorites(prev => {
      const exists = prev.find(fav => fav.id === parkingLot.id);
      if (!exists) {
        const newFavorites = [...prev, parkingLot];
        saveFavorites(newFavorites);
        return newFavorites;
      }
      return prev;
    });
  };

  const removeFavorite = async (id: number) => {
    setFavorites(prev => {
      const newFavorites = prev.filter(fav => fav.id !== id);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };

  const isFavorite = (id: number) => {
    return favorites.some(fav => fav.id === id);
  };

  return (
    <FavoritesContext.Provider value={{ 
      favorites, 
      addFavorite, 
      removeFavorite, 
      isFavorite, 
      isLoading 
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}; 