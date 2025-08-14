import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { useFavorites, ParkingLot } from '../contexts/FavoritesContext';

export default function ParkingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFavorite, removeFavorite, isFavorite, isLoading } = useFavorites();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedDay, setSelectedDay] = useState('월');

  // 주차장 데이터베이스 (실제로는 API에서 받아올 데이터)
  const parkingData: Record<number, ParkingLot> = {
    1: {
      id: 1,
      name: '강남역 지하주차장',
      address: '서울시 강남구 강남대로 396',
      distance: '0.2km',
      time: '2분',
      rating: 4.5,
      totalReviews: 128,
      available: 15,
      total: 100,
      price: '3,000원/h',
      status: '여유',
      statusColor: '#4CAF50',
      operatingHours: '24시간',
      phone: '02-1234-5678',
      features: ['지하주차', '24시간 운영', 'CCTV', '보안관'],
      description: '강남역 1번 출구에서 도보 2분 거리에 위치한 지하주차장입니다. 편리한 접근성과 안전한 주차 환경을 제공합니다.',
    },
    2: {
      id: 2,
      name: '역삼역 공영주차장',
      address: '서울시 강남구 역삼동 123-45',
      distance: '0.5km',
      time: '5분',
      rating: 4.0,
      totalReviews: 89,
      available: 3,
      total: 80,
      price: '2,500원/h',
      status: '보통',
      statusColor: '#FF9800',
      operatingHours: '06:00-24:00',
      phone: '02-2345-6789',
      features: ['지상주차', '공영주차장', 'CCTV', '무료 WiFi'],
      description: '역삼역 근처에 위치한 공영주차장입니다. 합리적인 요금과 안전한 주차 환경을 제공합니다.',
    },
    3: {
      id: 3,
      name: '선릉역 백화점 주차장',
      address: '서울시 강남구 선릉로 123',
      distance: '0.8km',
      time: '8분',
      rating: 4.0,
      totalReviews: 156,
      available: 0,
      total: 120,
      price: '4,000원/h',
      status: '만차',
      statusColor: '#F44336',
      operatingHours: '10:00-22:00',
      phone: '02-3456-7890',
      features: ['백화점 연계', '할인 혜택', 'CCTV', '보안관'],
      description: '선릉역 백화점과 연계된 주차장입니다. 쇼핑 시 할인 혜택을 받을 수 있습니다.',
    },
    4: {
      id: 4,
      name: '테헤란로 지상주차장',
      address: '서울시 강남구 테헤란로 456',
      distance: '1.1km',
      time: '12분',
      rating: 3.9,
      totalReviews: 67,
      available: 8,
      total: 60,
      price: '2,000원/h',
      status: '여유',
      statusColor: '#4CAF50',
      operatingHours: '24시간',
      phone: '02-4567-8901',
      features: ['지상주차', '24시간 운영', 'CCTV', '전기차 충전'],
      description: '테헤란로에 위치한 지상주차장입니다. 전기차 충전시설이 완비되어 있습니다.',
    },
  };

  const parkingInfo = parkingData[Number(params.id) as keyof typeof parkingData] || parkingData[1];
  const currentIsFavorite = isFavorite(parkingInfo.id);

  // 요일별 시간대 데이터
  const timeData = {
    월: [80, 65, 35, 15, 5, 10, 25, 45, 60, 75, 85, 90],
    화: [75, 60, 30, 10, 3, 8, 20, 40, 55, 70, 80, 85],
    수: [85, 70, 40, 20, 8, 15, 30, 50, 65, 80, 90, 95],
    목: [70, 55, 25, 8, 2, 5, 15, 35, 50, 65, 75, 80],
    금: [90, 80, 50, 25, 10, 15, 35, 55, 70, 85, 95, 100],
    토: [60, 50, 30, 20, 15, 20, 35, 50, 65, 75, 80, 85],
    일: [50, 40, 25, 15, 10, 15, 25, 40, 55, 65, 70, 75],
  };

  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const hours = ['06', '08', '10', '12', '14', '16', '18', '20', '22', '24', '02', '04'];

  const toggleFavorite = () => {
    if (currentIsFavorite) {
      removeFavorite(parkingInfo.id);
    } else {
      addFavorite(parkingInfo);
    }
  };

  const handleReservation = () => {
    // 예약 로직
    router.push('/(tabs)/reservation' as any);
  };

  const handleNavigation = () => {
    // 주차장 좌표 (실제로는 API에서 받아와야 함)
    const parkingCoordinates = {
      1: { lat: 37.4979462, lng: 127.0279958 }, // 강남역 지하주차장
      2: { lat: 37.5009451, lng: 127.0355893 }, // 역삼역 공영주차장  
      3: { lat: 37.5044085, lng: 127.0475235 }, // 선릉역 백화점 주차장
      4: { lat: 37.5070822, lng: 127.0628388 }, // 테헤란로 지상주차장
    };

    const coords = parkingCoordinates[parkingInfo.id as keyof typeof parkingCoordinates] || parkingCoordinates[1];
    
    router.push(`/navigation?destinationLat=${coords.lat}&destinationLng=${coords.lng}&destinationName=${encodeURIComponent(parkingInfo.name)}` as any);
  };

  const handleReview = () => {
    // 리뷰 페이지로 이동
    router.push(`/review?parkingId=${parkingInfo.id}&parkingName=${parkingInfo.name}` as any);
  };

  const getBarColor = (value: number) => {
    if (value >= 80) return '#4CAF50';
    if (value >= 50) return '#FF9800';
    return '#F44336';
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>주차장 상세</Text>
          <TouchableOpacity 
            onPress={toggleFavorite} 
            style={styles.favoriteButton}
            disabled={isLoading}
          >
            <Ionicons 
              name={currentIsFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={currentIsFavorite ? "#FF6B6B" : "#333"} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 주차장 기본 정보 */}
          <View style={styles.basicInfo}>
            <View style={styles.nameSection}>
              <Text style={styles.parkingName}>{parkingInfo.name}</Text>
              <View style={[styles.statusTag, { backgroundColor: parkingInfo.statusColor }]}>
                <Text style={styles.statusText}>{parkingInfo.status}</Text>
              </View>
            </View>
            
            <Text style={styles.address}>{parkingInfo.address}</Text>
            
            <View style={styles.ratingSection}>
              <View style={styles.rating}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{parkingInfo.rating}</Text>
                <Text style={styles.reviewCount}>({parkingInfo.totalReviews}개 리뷰)</Text>
              </View>
              <View style={styles.distance}>
                <Ionicons name="location" size={16} color="#007AFF" />
                <Text style={styles.distanceText}>{parkingInfo.distance}</Text>
              </View>
            </View>
          </View>

          {/* 주차 정보 */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>주차 정보</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Ionicons name="car" size={20} color="#007AFF" />
                <Text style={styles.infoLabel}>주차 가능</Text>
                <Text style={styles.infoValue}>{parkingInfo.available}자리</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time" size={20} color="#4CAF50" />
                <Text style={styles.infoLabel}>운영시간</Text>
                <Text style={styles.infoValue}>{parkingInfo.operatingHours}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="card" size={20} color="#FF9800" />
                <Text style={styles.infoLabel}>요금</Text>
                <Text style={styles.infoValue}>{parkingInfo.price}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="call" size={20} color="#9C27B0" />
                <Text style={styles.infoLabel}>연락처</Text>
                <Text style={styles.infoValue}>{parkingInfo.phone}</Text>
              </View>
            </View>
          </View>

          {/* 시간대별 현황 */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>시간대별 현황</Text>
            
            {/* 요일 선택 */}
            <View style={styles.daySelector}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayButton, selectedDay === day && styles.selectedDayButton]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayText, selectedDay === day && styles.selectedDayText]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 그래프 */}
            <View style={styles.graphContainer}>
              {timeData[selectedDay as keyof typeof timeData].map((value, index) => (
                <View key={index} style={styles.graphColumn}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: `${value}%`,
                          backgroundColor: getBarColor(value)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.hourText}>{hours[index]}</Text>
                </View>
              ))}
            </View>

            {/* 범례 */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>여유 (80%+)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.legendText}>보통 (50-79%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
                <Text style={styles.legendText}>혼잡 (50% 미만)</Text>
              </View>
            </View>
          </View>

          {/* 편의시설 */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>편의시설</Text>
            <View style={styles.featuresList}>
              {parkingInfo.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 설명 */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>주차장 소개</Text>
            <Text style={styles.description}>{parkingInfo.description}</Text>
          </View>

          {/* 알림 설정 */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>알림 설정</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={20} color="#666" />
                <Text style={styles.settingText}>혼잡도 알림</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* 리뷰 섹션 */}
          <View style={styles.infoSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>리뷰</Text>
              <TouchableOpacity style={styles.reviewButton} onPress={handleReview}>
                <Ionicons name="create-outline" size={16} color="#007AFF" />
                <Text style={styles.reviewButtonText}>리뷰 작성</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ratingSection}>
              <View style={styles.rating}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{parkingInfo.rating}</Text>
                <Text style={styles.reviewCount}>({parkingInfo.totalReviews}개 리뷰)</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 하단 액션 버튼들 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.navigationButton} onPress={handleNavigation}>
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={styles.navigationText}>길찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reservationButton} onPress={handleReservation}>
            <Ionicons name="calendar" size={20} color="white" />
            <Text style={styles.reservationText}>예약하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  favoriteButton: {
    padding: 8,
  },
  basicInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 10,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  parkingName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  infoItem: {
    width: '45%',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  daySelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedDayText: {
    color: 'white',
  },
  graphContainer: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  graphColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: 20,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderRadius: 10,
  },
  hourText: {
    fontSize: 10,
    color: '#666',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 14,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  navigationButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  navigationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  reservationButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  reservationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#e0f7fa',
    borderRadius: 20,
  },
  reviewButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
}); 