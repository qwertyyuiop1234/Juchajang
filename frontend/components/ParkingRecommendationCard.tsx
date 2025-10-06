import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';
import { AIRecommendationData, ParkingRecommendationCardProps } from '../types/parking';

const { width: screenWidth } = Dimensions.get('window');
const BAR_WIDTH = screenWidth * 0.9;

/**
 * 개별 주차장 카드 컴포넌트 (홈_목적지 입력 완료.png와 동일한 디자인)
 */
const ParkingCard: React.FC<{
  parkingLot: AIRecommendationData;
  isSelected: boolean;
  onPress: () => void;
  onNavigationPress: () => void;
  onNamePress?: () => void; // 주차장 이름 클릭 시 호출할 함수
}> = ({ parkingLot, isSelected, onPress, onNavigationPress, onNamePress }) => {
  const getStatusText = (congestionLevel: string) => {
    switch (congestionLevel) {
      case 'Normal':
        return '여유';
      case 'Busy':
        return '보통';
      case 'Congested':
        return '혼잡';
      default:
        return '여유';
    }
  };

  const formatPrice = (priceRates: number) => {
    if (!priceRates || priceRates === 0) return '정보 없음';
    // add_rates를 그대로 시간당 가격으로 표시
    return `${priceRates.toLocaleString()}원/h`;
  };

  const getParkingTypeDisplay = (payYnName: string, parkingName: string) => {
    const type = payYnName === '유료' ? '민영' : '공영';
    return `${parkingName}(${type})`;
  };

  // 추가 헬퍼 함수들
  const formatDistance = (distanceKm: number) => {
    if (!distanceKm) return '정보 없음';
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  };

  const formatOperatingHours = (begin: string, end: string) => {
    if (!begin || !end) return '정보 없음';
    if (begin === '00:00' && end === '23:59') return '24시간 운영';
    return `${begin} ~ ${end}`;
  };

  const isCurrentlyOpen = (begin: string, end: string) => {
    if (!begin || !end) return { isOpen: false, closingTime: null };
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [beginHour, beginMin] = begin.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const beginTime = beginHour * 60 + beginMin;
    const endTime = endHour * 60 + endMin;
    
    let isOpen = false;
    if (beginTime < endTime) {
      // 일반적인 경우 (09:00 ~ 18:00)
      isOpen = currentTime >= beginTime && currentTime < endTime;
    } else {
      // 24시간 운영 (00:00 ~ 23:59)
      isOpen = true;
    }
    
    return { isOpen, closingTime: end };
  };

  const formatAvailableSpaces = (available: number, capacity: number) => {
    if (!capacity || capacity === 0) return '정보 없음';
    return `${available}/${capacity} 자리`;
  };

  return (
    <View style={styles.cardContainer}>
      {/* 통합된 흰색 카드 */}
      <TouchableOpacity
        style={isSelected ? styles.expandedWhiteCard : styles.whiteCard}
        onPress={(e) => {
          e.stopPropagation(); // 이벤트 전파 방지
          console.log('카드 전체 클릭:', parkingLot.parking_name); // 디버그 로그
          onPress();
        }}
        activeOpacity={0.8}
      >
        {/* 상단: 주차장 이름 + 초록색 배지 */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Ionicons name="location" size={16} color={Colors.primary} style={styles.locationIcon} />
            {isSelected ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation(); // 이벤트 전파 방지
                  console.log('주차장 이름 클릭:', parkingLot.parking_name); // 디버그 로그
                  if (onNamePress) {
                    onNamePress(); // 주차장 상세 정보로 이동
                  }
                }}
                activeOpacity={0.7}
                style={styles.parkingNameContainer}
              >
                <Text 
                  style={[styles.parkingName, styles.clickableParkingName]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {getParkingTypeDisplay(parkingLot.pay_yn_name, parkingLot.parking_name)}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text 
                style={styles.parkingName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {getParkingTypeDisplay(parkingLot.pay_yn_name, parkingLot.parking_name)}
              </Text>
            )}
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{getStatusText(parkingLot.congestion_level)}</Text>
          </View>
        </View>

        {/* 중간: 상세 정보 (선택 시에만 표시, 회색 박스 없이) */}
        {isSelected && (
          <View style={styles.detailInfoContainer}>
            {/* 첫 번째 줄: 공영주차장, 거리, 별점 */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {parkingLot.pay_yn_name === '유료' ? '민영주차장' : '공영주차장'}
              </Text>
              <Text style={styles.detailLabel}>거리: {formatDistance(parkingLot.distance_km)}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{parkingLot.average_rating.toFixed(1)}</Text>
              </View>
            </View>

            {/* 두 번째 줄: 영업시간 */}
            {(() => {
              const { isOpen, closingTime } = isCurrentlyOpen(parkingLot.weekday_begin, parkingLot.weekday_end);
              return (
                <Text style={[styles.detailText, isOpen ? styles.openText : styles.closedText]}>
                  {isOpen ? `영업중 ${closingTime} 종료` : '영업종료'}
                </Text>
              );
            })()}
          </View>
        )}

        {/* 하단: 가격 정보와 남은 자리 */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.priceText}>{formatPrice(parkingLot.price_rates)}</Text>
            <Text style={styles.availableSpaces}>
              {formatAvailableSpaces(parkingLot.available_spaces, parkingLot.capacity)}
            </Text>
          </View>
          {isSelected && (
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={(e) => {
                e.stopPropagation(); // 이벤트 전파 방지
                onNavigationPress();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.navigationButtonText}>길찾기</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 주차장 추천 카드 목록 컴포넌트 (홈_목적지 입력 완료.png와 동일한 디자인)
 */
const ParkingRecommendationCard: React.FC<ParkingRecommendationCardProps> = ({
  parkingLots,
  onCardPress,
  onNavigationPress,
  onNamePress,
  selectedCardId,
  onSelectedCardChange,
}) => {

  const handleCardPress = (parkingLot: AIRecommendationData) => {
    onCardPress(parkingLot); // 부모 컴포넌트에서 선택 상태 관리
  };

  const handleContainerPress = () => {
    // 컨테이너 영역을 탭하면 모든 카드 선택 해제
    onSelectedCardChange(null);
  };

  const handleNavigationPress = (parkingLot: AIRecommendationData) => {
    // 길찾기 확인 다이얼로그 표시
    Alert.alert(
      parkingLot.parking_name,
      '길 안내를 시작할까요?',
      [
        {
          text: '아니요',
          style: 'cancel',
        },
        {
          text: '예',
          onPress: () => {
            onNavigationPress(parkingLot);
          },
        },
      ]
    );
  };

  const handleNamePress = (parkingLot: AIRecommendationData) => {
    console.log('주차장 상세 정보로 이동:', parkingLot.parking_name);
    onNamePress(parkingLot); // 부모 컴포넌트의 onNamePress 호출
  };

  if (!parkingLots || parkingLots.length === 0) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleContainerPress}
      activeOpacity={1}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={BAR_WIDTH * 0.8 * 0.75 + Spacing.lg * 0.75}
        snapToAlignment="start"
      >
        {parkingLots.map((parkingLot) => (
                <ParkingCard
                  key={parkingLot.parking_code}
                  parkingLot={parkingLot}
                  isSelected={selectedCardId === parkingLot.parking_code}
                  onPress={() => handleCardPress(parkingLot)}
                  onNavigationPress={() => handleNavigationPress(parkingLot)}
                  onNamePress={() => handleNamePress(parkingLot)}
                />
        ))}
      </ScrollView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10, // 네비게이션 바와 더 가깝게 배치
    left: 0,
    right: 0,
    height: 200, // 컨테이너 높이 증가
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  cardContainer: {
    width: BAR_WIDTH * 0.8 * 0.75, // 카드 가로 길이를 3/4로 더 줄임
    marginRight: Spacing.lg * 0.75, // 좌우 간격을 3/4로 줄임
    alignSelf: 'flex-end', // 카드를 아래쪽에 정렬
  },
  whiteCard: {
    backgroundColor: 'white',
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
    minHeight: 80, // 최소 높이
    justifyContent: 'space-between',
  },
  expandedWhiteCard: {
    backgroundColor: 'white',
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
    minHeight: 140, // 선택 시 최소 높이 (내용에 맞춰 조정)
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  locationIcon: {
    marginRight: Spacing.xs,
  },
  parkingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  clickableParkingName: {
    textDecorationLine: 'underline',
    color: Colors.primary,
  },
  parkingNameContainer: {
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#4CAF50', // 초록색 배지
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  navigationButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // 상세 정보 컨테이너 (회색 박스 없이)
  detailInfoContainer: {
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginLeft: 4,
  },
  openText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  closedText: {
    color: '#F44336',
    fontWeight: '600',
  },
  footerLeft: {
    flex: 1,
  },
  availableSpaces: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default ParkingRecommendationCard;
