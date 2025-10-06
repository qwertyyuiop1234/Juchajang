export interface AIRecommendationData {
  parking_code: string;
  parking_name: string;
  addr: string;
  coordinates: [number, number];
  predicted_available: number;
  congestion_level: string;
  congestion_rate: number;
  distance_km: number;
  total_score: number;
  distance_score: number;
  tel: string;
  pay_yn_name: string;
  weekday_begin: string;
  weekday_end: string;
  price_rates: number;
  // 새로 추가된 필드들
  average_rating: number;
  total_reviews: number;
  capacity: number;
  cur_parking: number;
  available_spaces: number;
}

export interface ParkingRecommendationCardProps {
  parkingLots: AIRecommendationData[];
  onCardPress: (parkingLot: AIRecommendationData) => void;
  onNavigationPress: (parkingLot: AIRecommendationData) => void;
  onNamePress: (parkingLot: AIRecommendationData) => void;
  selectedCardId: string | null;
  onSelectedCardChange: (cardId: string | null) => void;
}
