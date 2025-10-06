import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
// import { useFavorites, ParkingLot } from '../contexts/FavoritesContext';
import { externalNavigationService } from '../services/externalNavigationService';
import navigationAPI from '../services/navigationAPI';
import { reviewAPI, Review, ReviewStats, ParkingFeatures } from '../services/reviewAPI';
import ReviewCard from '../components/ReviewCard';

export default function ParkingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // const { addFavorite, removeFavorite, isFavorite, isLoading } = useFavorites();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedDay, setSelectedDay] = useState('월');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [parkingFeatures, setParkingFeatures] = useState<ParkingFeatures | null>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // 주차장 데이터베이스 (실제로는 API에서 받아올 데이터)
  const parkingData: Record<number, any> = {
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
      type: 'public' as const,
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
      type: 'public' as const,
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
      type: 'private' as const,
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
      type: 'public' as const,
    },
  };

  const initialMock = parkingData[Number(params.id) as keyof typeof parkingData];
  const [parkingInfo, setParkingInfo] = useState<any>(initialMock || parkingData[1]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const isMock = !!initialMock;
  // const currentIsFavorite = isFavorite(parkingInfo.id);

  // 기본 요일별 시간대 데이터 (예측 데이터가 없을 때 사용)
  const defaultTimeData = {
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

  // const toggleFavorite = () => {
  //   if (currentIsFavorite) {
  //     removeFavorite(parkingInfo.id);
  //   } else {
  //     addFavorite(parkingInfo);
  //   }
  // };

  // const handleReservation = () => {
  //   // 예약 로직
  //   router.push('/(tabs)/reservation' as any);
  // };


  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      
      // parking_code 사용 (params.id는 parking_code)
      const parkingCode = String(params.id || parkingInfo.id);
      console.log(`📊 리뷰 로드 시작: ${parkingCode} (${parkingInfo.name})`);
      
      const [listRes, statsRes] = await Promise.all([
        reviewAPI.getReviewsByParkingId(parkingCode, 3),
        reviewAPI.getReviewStats(parkingCode)
      ]);

      console.log(`✅ 리뷰 로드 완료:`, {
        리뷰수: listRes.data?.length || 0,
        평점: statsRes.data?.averageRating || 0
      });

      if (listRes.success && listRes.data) setReviews(listRes.data);
      if (statsRes.success && statsRes.data) setReviewStats(statsRes.data as ReviewStats);
    } catch (error) {
      console.error('❌ 리뷰 로드 실패:', error);
      // 서버 연결 실패 시 빈 배열로 설정 (에러 메시지는 표시하지 않음)
      setReviews([]);
      setReviewStats(null);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadParkingFeatures = async () => {
    try {
      // parking_code 사용
      const parkingCode = String(params.id || parkingInfo.id);
      console.log(`📊 주차장 특성 로드 시작: ${parkingCode}`);
      
      const features = await reviewAPI.getParkingFeatures(parkingCode);
      setParkingFeatures(features);
      
      console.log(`✅ 주차장 특성 로드 완료:`, {
        전기차충전: features.hasEVCharging,
        리뷰수: features.evChargingReviewCount
      });
    } catch (error) {
      console.error('❌ 특성 로드 실패:', error);
    }
  };

  // 예측 데이터를 요일별로 변환하는 함수
  const convertPredictionsToTimeData = (predictions: any[], capacity: number) => {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const timeData: { [key: string]: number[] } = {
      월: [], 화: [], 수: [], 목: [], 금: [], 토: [], 일: []
    };

    // 각 예측 데이터를 요일별로 분류
    predictions.forEach((prediction) => {
      const date = new Date(prediction.time);
      const dayOfWeek = dayNames[date.getDay()];
      const hour = date.getHours();
      
      // 가용 공간 비율 계산 (available / capacity * 100)
      const availabilityRate = Math.round((prediction.available / capacity) * 100);
      
      if (timeData[dayOfWeek]) {
        timeData[dayOfWeek].push(availabilityRate);
      }
    });

    // 각 요일별로 12개 시간대에 맞게 데이터 조정
    Object.keys(timeData).forEach(day => {
      const dayData = timeData[day];
      if (dayData.length > 0) {
        // 24시간 데이터를 12개 시간대로 압축 (2시간 간격으로 평균)
        const compressedData = [];
        for (let i = 0; i < 12; i++) {
          const startIdx = i * 2;
          const endIdx = Math.min(startIdx + 2, dayData.length);
          const avg = dayData.slice(startIdx, endIdx).reduce((sum, val) => sum + val, 0) / (endIdx - startIdx);
          compressedData.push(Math.round(avg));
        }
        timeData[day] = compressedData;
      } else {
        // 데이터가 없으면 기본값 사용
        timeData[day] = defaultTimeData[day as keyof typeof defaultTimeData];
      }
    });

    return timeData;
  };

  const loadPredictions = async () => {
    try {
      setPredictionsLoading(true);
      const parkingCode = String(params.id || parkingInfo.id);
      console.log(`📊 예측 데이터 로드 시작: ${parkingCode}`);
      
      const response = await navigationAPI.getParkingPredictions(parkingCode);
      console.log(`📦 API 응답:`, response);
      
      // response.data에 실제 예측 데이터가 들어있음
      if (response.success && response.data && response.data.predictions && response.data.capacity) {
        const { predictions, capacity } = response.data;
        console.log(`📊 예측 데이터 구조:`, {
          predictionsCount: predictions?.length,
          capacity: capacity,
          firstPrediction: predictions?.[0]
        });
        
        const convertedTimeData = convertPredictionsToTimeData(predictions, capacity);
        setPredictionData(convertedTimeData);
        console.log(`✅ 예측 데이터 로드 완료:`, convertedTimeData);
      } else {
        console.log('⚠️ 예측 데이터 없음, 기본 데이터 사용');
        console.log('🔍 응답 상세:', {
          success: response.success,
          hasData: !!response.data,
          hasPredictions: !!(response.data as any)?.predictions,
          hasCapacity: !!(response.data as any)?.capacity,
          response: response
        });
        setPredictionData(null);
      }
    } catch (error) {
      console.error('❌ 예측 데이터 로드 실패:', error);
      setPredictionData(null);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const handleViewAllReviews = () => {
    const parkingCode = String(params.id || parkingInfo.id);
    router.push(`/review-list?parkingId=${parkingCode}&parkingName=${encodeURIComponent(parkingInfo.name)}` as any);
  };

  useEffect(() => {
    // 실데이터 상세 불러오기 (목록에서 넘어온 id가 목데이터에 없을 경우)
    const loadDetail = async () => {
      try {
        if (!isMock && params.id) {
          const code = String(params.id);
          const detail: any = await navigationAPI.getParkingDetail(code);
          const d = detail?.data || detail; // 응답 래핑 호환
          if (d) {
            const mapped: any = {
              id: Number(d.parking_code),
              name: d.parking_name || `주차장 ${d.parking_code}` || '이름 없음',
              address: d.addr || '주소 정보 없음',
              distance: d.distance_km ? `${(d.distance_km * 1000).toFixed(0)}m` : '-',
              time: '-',
              rating: 0,
              totalReviews: 0,
              available: d.capacity && d.cur_parking != null ? Math.max(d.capacity - d.cur_parking, 0) : 0,
              total: d.capacity || 0,
              price: d.rates ? `${Number(d.rates).toLocaleString()}원/${d.time_rate || '60'}분` : '-',
              status: d.parking_status_name || '정보없음',
              statusColor: '#4CAF50',
              operatingHours: d.weekday_begin && d.weekday_end ? `${d.weekday_begin}-${d.weekday_end}` : '-',
              phone: d.tel || '-',
              features: [],
              description: d.description || '',
              type: 'public' as const,
            };
            setParkingInfo(mapped);
            if (d.lat_wgs84 && d.lng_wgs84) {
              setCoords({ lat: parseFloat(d.lat_wgs84), lng: parseFloat(d.lng_wgs84) });
            }
          }
        } else if (isMock) {
          // 목데이터 좌표 프리셋 사용
          const preset = {
            1: { lat: 37.4979462, lng: 127.0279958 },
            2: { lat: 37.5009451, lng: 127.0355893 },
            3: { lat: 37.5044085, lng: 127.0475235 },
            4: { lat: 37.5070822, lng: 127.0628388 },
          } as const;
          const c = preset[(parkingInfo.id as 1|2|3|4)] || preset[1];
          setCoords(c);
        }
      } catch (e) {
        console.log('주차장 상세 불러오기 실패:', e);
      }
    };
    loadDetail();
    
    // 예측 데이터 로드
    if (!isMock) {
      loadPredictions();
    }
  }, [params.id]);

  // parkingInfo가 업데이트된 후에 리뷰 로드
  useEffect(() => {
    if (parkingInfo.id) {
      loadReviews();
      loadParkingFeatures();
    }
  }, [parkingInfo.id]);

  // 화면이 포커스될 때마다 리뷰 정보 새로고침 (리뷰 작성 후 돌아왔을 때 반영)
  useFocusEffect(
    React.useCallback(() => {
      if (parkingInfo.id) {
        console.log('🔄 화면 포커스: 리뷰 정보 새로고침');
        loadReviews();
        loadParkingFeatures();
      }
    }, [parkingInfo.id])
  );

  const handleNavigation = async () => {
    // 좌표: 실데이터 우선, 없으면 목 프리셋
    const fallback = { lat: 37.4979462, lng: 127.0279958 };
    const c = coords || fallback;

    console.log('주차장 좌표:', c);

    const destination = {
      latitude: c.lat,
      longitude: c.lng,
      name: parkingInfo.name,
      address: parkingInfo.address
    };
    
    console.log('네비게이션 목적지:', destination);

    // 외부 네비게이션 앱 선택 다이얼로그 표시
    Alert.alert(
      '길찾기 방법 선택',
      '어떤 방식으로 길찾기를 하시겠습니까?',
      [
        {
          text: '외부 네비게이션 앱',
          onPress: () => externalNavigationService.showNavigationOptions(destination)
        },
        {
          text: '앱 내 네비게이션',
          onPress: () => router.push(`/navigation?destinationLat=${c.lat}&destinationLng=${c.lng}&destinationName=${encodeURIComponent(parkingInfo.name)}` as any)
        },
        {
          text: '취소',
          style: 'cancel'
        }
      ]
    );
  };

  const handleReview = () => {
    // 리뷰 페이지로 이동 (parking_code 사용)
    const parkingCode = String(params.id || parkingInfo.id);
    router.push(`/review?parkingId=${parkingCode}&parkingName=${parkingInfo.name}` as any);
  };

  const getBarColor = (value: number) => {
    if (value >= 80) return '#4CAF50';
    if (value >= 50) return '#FF9800';
    return '#F44336';
  };

  // 그래프에 사용할 데이터 결정 (예측 데이터가 있으면 사용, 없으면 기본 데이터)
  const timeData = predictionData || defaultTimeData;

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
          {/* 즐겨찾기 기능 제거됨 */}
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
                <Text style={styles.ratingText}>
                  {reviewStats?.averageRating?.toFixed(1) ?? parkingInfo.rating}
                </Text>
                <Text style={styles.reviewCount}>
                  ({reviewStats?.totalReviews ?? parkingInfo.totalReviews}개 리뷰)
                </Text>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>시간대별 현황</Text>
              {predictionsLoading && (
                <Text style={styles.predictionLoadingText}>예측 데이터 로딩 중...</Text>
              )}
              {!predictionsLoading && predictionData && (
                <Text style={styles.aiLabel}>🤖 AI 예측</Text>
              )}
            </View>
            
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
              {timeData[selectedDay as keyof typeof timeData].map((value: number, index: number) => (
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
              {parkingInfo.features?.map((feature: string, index: number) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
              {/* 리뷰 기반 특성 정보 */}
              {parkingFeatures?.hasEVCharging && (
                <View style={styles.featureItem}>
                  <Ionicons name="flash" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>
                    전기차 충전 가능 ({parkingFeatures.evChargingReviewCount}명 확인)
                  </Text>
                </View>
              )}
              {parkingFeatures?.isSpacious && (
                <View style={styles.featureItem}>
                  <Ionicons name="car" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>
                    주차 공간이 넓어요 ({parkingFeatures.allCategories.space_wide || 0}명 확인)
                  </Text>
                </View>
              )}
              {parkingFeatures?.isPriceFriendly && (
                <View style={styles.featureItem}>
                  <Ionicons name="pricetag" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>
                    요금이 저렴해요 ({parkingFeatures.allCategories.price_cheap || 0}명 확인)
                  </Text>
                </View>
              )}
              {parkingFeatures?.isSafe && (
                <View style={styles.featureItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>
                    안전해요 ({parkingFeatures.allCategories.safety_good || 0}명 확인)
                  </Text>
                </View>
              )}
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
                <Text style={styles.ratingText}>
                  {reviewStats?.averageRating?.toFixed(1) ?? parkingInfo.rating}
                </Text>
                <Text style={styles.reviewCount}>
                  ({reviewStats?.totalReviews ?? parkingInfo.totalReviews}개 리뷰)
                </Text>
              </View>
            </View>

            {/* 리뷰 목록 미리보기 */}
            {reviewsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>리뷰를 불러오는 중...</Text>
              </View>
            ) : reviews.length > 0 ? (
              <View style={styles.reviewsPreview}>
                {reviews.map((review: any) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onPress={() => handleViewAllReviews()}
                  />
                ))}
                {reviews.length >= 3 && (
                  <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllReviews}>
                    <Text style={styles.viewAllText}>모든 리뷰 보기</Text>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noReviewsContainer}>
                <Ionicons name="chatbubble-outline" size={32} color="#ccc" />
                <Text style={styles.noReviewsText}>아직 리뷰가 없습니다</Text>
                <Text style={styles.noReviewsSubtext}>첫 번째 리뷰를 작성해보세요!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 하단 액션 버튼들 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.navigationButton} onPress={handleNavigation}>
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={styles.navigationText}>길찾기</Text>
          </TouchableOpacity>
          {/* 예약 기능 제거됨 */}
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
  reviewsPreview: {
    marginTop: 15,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  noReviewsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
    marginTop: 10,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginTop: 10,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionLoadingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  aiLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
}); 