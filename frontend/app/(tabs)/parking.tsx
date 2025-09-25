import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites, ParkingLot } from '../../contexts/FavoritesContext';
import navigationAPI from '../../services/navigationAPI';
import * as Location from 'expo-location';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Styles';

export default function ParkingScreen() {
  const [usingMockData, setUsingMockData] = useState(true);
  const router = useRouter();
  const { favorites, addFavorite, removeFavorite, isFavorite, isLoading } = useFavorites();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedParkingLot, setSelectedParkingLot] = useState<ParkingLot | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [unavailableTimeSlots, setUnavailableTimeSlots] = useState<string[]>([]);

  const filters = [
    { id: 'all', label: '전체' },
    { id: 'public', label: '공영주차장' },
    { id: 'private', label: '개인주차공간' },
    { id: 'nearby', label: '주변' },
    { id: 'favorite', label: '즐겨찾기' },
    { id: 'available', label: '빈자리' },
  ];

  // 실제 API 데이터를 사용하므로 하드코딩된 데이터 제거

  // 실제 주차장 데이터 필터링 함수
  const getFilteredParkingLots = (lots: ParkingLot[]) => {
    let filtered = lots;

    // 검색 필터
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(lot => 
        lot.name.toLowerCase().includes(searchLower) ||
        lot.address.toLowerCase().includes(searchLower)
      );
    }

    // 카테고리 필터
    switch (selectedFilter) {
      case 'public':
        filtered = filtered.filter(lot => lot.type === 'public');
        break;
      case 'private':
        filtered = filtered.filter(lot => lot.type === 'private');
        break;
      case 'favorite':
        filtered = filtered.filter(lot => isFavorite(lot.id));
        break;
      case 'available':
        filtered = filtered.filter(lot => lot.available > 0);
        break;
      case 'nearby':
        // 거리가 1km 이하인 주차장 (거리 문자열에서 숫자 추출)
        filtered = filtered.filter(lot => {
          const distance = lot.distance.replace(/[^\d.]/g, ''); // 숫자와 점만 추출
          const distanceNum = parseFloat(distance);
          return !isNaN(distanceNum) && distanceNum <= 1000; // 1000m = 1km
        });
        break;
      default:
        break;
    }

    return filtered;
  };

  const [allParkingLots, setAllParkingLots] = useState<ParkingLot[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNearbyRealParking = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '가까운 주차장을 표시하려면 위치 권한이 필요합니다.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // 상태에 따른 색상 결정
      const getStatusColor = (statusName: string) => {
        switch (statusName) {
          case '여유':
            return Colors.success;
          case '보통':
            return Colors.warning;
          case '혼잡':
          case '만차':
            return Colors.error;
          default:
            return Colors.gray500;
        }
      };

      // 타임아웃 컨트롤러로 무한 로딩 방지
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const result = await navigationAPI.getNearbyParkingTopN(lat, lng, 10).finally(() => clearTimeout(timeout));
      console.log('🔍 프론트엔드에서 받은 API 응답:', result);
      console.log('🔍 응답 데이터 개수:', result?.length || 0);
      
      // 화양동 주차장 확인
      const hwayangData = result?.find((l: any) => l.addr && l.addr.includes('화양동'));
      if (hwayangData) {
        console.log('🎯 프론트에서 화양동 주차장 발견:', {
          parking_code: hwayangData.parking_code,
          parking_name: hwayangData.parking_name,
          addr: hwayangData.addr
        });
      }
      
      const lots = (result as any[]).map((l) => ({
        id: Number(l.parking_code),
        name: l.parking_name || l.addr || `주차장 ${l.parking_code}` || '이름 없음',
        address: l.addr || '주소 정보 없음',
        distance: `${(l.distance_km * 1000).toFixed(0)}m`,
        time: '-',
        rating: l.average_rating || 0, // 실제 평점 사용
        totalReviews: l.total_reviews || 0, // 총 리뷰 수 추가
        available: l.capacity && l.cur_parking != null ? Math.max(l.capacity - l.cur_parking, 0) : 0,
        total: l.capacity || 0,
        price: l.rates ? `${Number(l.rates).toLocaleString()}원/${l.time_rate || '60'}분` : '-',
        status: l.parking_status_name || '정보없음',
        statusColor: getStatusColor(l.parking_status_name),
        type: 'public' as const,
      }));
      setAllParkingLots(lots); // 전체 데이터 저장
      setParkingLots(getFilteredParkingLots(lots)); // 필터링된 데이터 저장
      setUsingMockData(false);
    } catch (e) {
      console.log('가까운 주차장 로드 실패:', e);
      Alert.alert('오류', '가까운 주차장을 불러오지 못했습니다. 네트워크 연결 또는 서버 상태를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  React.useEffect(() => {
    loadNearbyRealParking();
  }, []);

  // 검색 함수
  const performSearch = async (query: string) => {
    console.log('🔍 performSearch 호출됨:', { query, queryLength: query.length });
    
    if (!query.trim()) {
      console.log('🔍 검색어 없음 - 기본 근처 주차장 표시');
      // 검색어가 없으면 기본 근처 주차장 표시
      if (allParkingLots.length > 0) {
        const filtered = getFilteredParkingLots(allParkingLots);
        setParkingLots(filtered);
        console.log('🔍 기본 필터링 완료:', filtered.length);
      }
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 전체 주차장 검색 API 호출 시작:', query);
      
      const searchResult = await navigationAPI.searchParkingLots(query, 50);
      console.log('🔍 검색 API 응답:', searchResult);
      
      if (searchResult.success && searchResult.data) {
        console.log(`🎯 검색 결과: ${searchResult.total_found}개 발견`);
        console.log('🔍 검색 데이터 샘플:', searchResult.data.slice(0, 2));
        
        // 상태에 따른 색상 결정
        const getStatusColor = (statusName: string) => {
          switch (statusName) {
            case '여유':
              return Colors.success;
            case '보통':
              return Colors.warning;
            case '혼잡':
            case '만차':
              return Colors.error;
            default:
              return Colors.gray500;
          }
        };

        const searchLots = searchResult.data.map((l: any) => ({
          id: Number(l.parking_code),
          name: l.parking_name || l.addr || `주차장 ${l.parking_code}` || '이름 없음',
          address: l.addr || '주소 정보 없음',
          distance: '검색 결과', // 검색 결과는 거리 표시 안 함
          time: '-',
          rating: l.average_rating || 0,
          totalReviews: l.total_reviews || 0,
          available: l.capacity && l.cur_parking != null ? Math.max(l.capacity - l.cur_parking, 0) : 0,
          total: l.capacity || 0,
          price: l.rates ? `${Number(l.rates).toLocaleString()}원/${l.time_rate || '60'}분` : '-',
          status: l.parking_status_name || '정보없음',
          statusColor: getStatusColor(l.parking_status_name),
          type: 'public' as const,
        }));

        console.log('🔍 매핑된 검색 결과:', searchLots.length);
        
        // 검색 결과에 필터 적용
        const filtered = getFilteredParkingLots(searchLots);
        console.log('🔍 필터링 후 최종 결과:', filtered.length);
        setParkingLots(filtered);
      } else {
        console.log('❌ 검색 API 실패 또는 데이터 없음:', searchResult);
        setParkingLots([]);
      }
    } catch (error) {
      console.error('❌ 검색 실패:', error);
      Alert.alert('검색 오류', '주차장 검색 중 오류가 발생했습니다.');
      setParkingLots([]);
    } finally {
      setLoading(false);
    }
  };

  // 검색어 변경 시 디바운스 적용
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchText);
    }, 300); // 300ms 디바운스 (더 빠르게)

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // 필터 변경 시 현재 데이터에서 필터링
  React.useEffect(() => {
    if (!searchText.trim() && allParkingLots.length > 0) {
      const filtered = getFilteredParkingLots(allParkingLots);
      setParkingLots(filtered);
    }
  }, [selectedFilter, favorites]);

  const handleFavoriteToggle = (parkingLot: ParkingLot) => {
    if (isFavorite(parkingLot.id)) {
      removeFavorite(parkingLot.id);
    } else {
      addFavorite(parkingLot);
    }
  };

  const navigateToDetail = (id: number) => {
    router.push(`/parking-detail?id=${id}` as any);
  };

  const handleReserve = (parkingLot: ParkingLot) => {
    setSelectedParkingLot(parkingLot);
    
    // 기본값 설정
    const today = new Date();
    const availableDates = [];
    
    // 다음 7일간 날짜 생성
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      availableDates.push(date.toISOString().split('T')[0]);
    }
    setAvailableDates(availableDates);
    
    // 기본 시간대 생성 (9시부터 18시까지)
    const timeSlots = [];
    for (let hour = 9; hour <= 18; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    setAvailableTimeSlots(timeSlots);
    
    // 예약 불가능한 시간대 (예시: 12시-13시, 15시-16시)
    const unavailable = ['12:00', '15:00'];
    setUnavailableTimeSlots(unavailable);
    
    setSelectedDate(availableDates[0]);
    setSelectedTimeSlots([]);
    setDuration(0);
    
    setShowReservationModal(true);
  };

  const handleReservationConfirm = () => {
    if (!selectedParkingLot) {
      Alert.alert('오류', '주차장 정보가 없습니다.');
      return;
    }

    if (!selectedDate) {
      Alert.alert('입력 오류', '날짜를 선택해주세요.');
      return;
    }

    if (selectedTimeSlots.length === 0) {
      Alert.alert('입력 오류', '예약할 시간대를 선택해주세요.');
      return;
    }

    const totalPrice = duration * (selectedParkingLot.availableTimeSlots?.[0]?.price || 5000);
    const startTime = selectedTimeSlots[0];
    const endTime = getEndTime();
    
    Alert.alert(
      '예약 확인',
      `예약 정보를 확인해주세요.\n\n📍 ${selectedParkingLot.name}\n📅 날짜: ${formatDate(selectedDate)}\n⏰ 시간: ${startTime} - ${endTime} (${duration}시간)\n💰 총 요금: ${totalPrice.toLocaleString()}원\n\n예약하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '예약하기',
          onPress: () => {
            // 예약 완료 처리
            Alert.alert(
              '예약 완료',
              '예약이 성공적으로 완료되었습니다!',
              [
                {
                  text: '확인',
                  onPress: () => {
                    setShowReservationModal(false);
                    setSelectedParkingLot(null);
                    setSelectedDate('');
                    setSelectedTimeSlots([]);
                    setDuration(0);
                    setAvailableDates([]);
                    setAvailableTimeSlots([]);
                    setUnavailableTimeSlots([]);
                    // 예약 내역 페이지로 이동
                    router.push('/reservation' as any);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const calculateDuration = (start: string, end: string) => {
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    const calculated = endHour - startHour;
    setDuration(calculated > 0 ? calculated : 1);
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getEndTime = (): string => {
    if (selectedTimeSlots.length === 0) return '';
    const lastSlot = selectedTimeSlots[selectedTimeSlots.length - 1];
    const lastHour = parseInt(lastSlot.split(':')[0]);
    return `${(lastHour + 1).toString().padStart(2, '0')}:00`;
  };

  const handleTimeSlotSelect = (time: string) => {
    // 예약 불가능한 시간대는 클릭 불가
    if (unavailableTimeSlots.includes(time)) {
      return;
    }

    const newSelectedSlots = [...selectedTimeSlots];
    
    if (newSelectedSlots.includes(time)) {
      // 이미 선택된 시간대 클릭 시 해제
      const index = newSelectedSlots.indexOf(time);
      newSelectedSlots.splice(index, 1);
    } else {
      // 새로운 시간대 선택
      newSelectedSlots.push(time);
      // 시간 순서대로 정렬
      newSelectedSlots.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    }

    setSelectedTimeSlots(newSelectedSlots);
    setDuration(newSelectedSlots.length);
  };

  const isTimeSlotSelected = (time: string) => {
    return selectedTimeSlots.includes(time);
  };

  const isTimeSlotSelectable = (time: string) => {
    return !unavailableTimeSlots.includes(time);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return '오늘';
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return '내일';
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      return `${month}/${day}(${dayOfWeek})`;
    }
  };

  const getReservationButtonStyle = (parkingLot: ParkingLot) => {
    if (parkingLot.type === 'private') {
      return styles.reserveButton;
    } else {
      return styles.publicButton;
    }
  };

  const getReservationButtonText = (parkingLot: ParkingLot) => {
    if (parkingLot.type === 'private') {
      return '예약하기';
    } else {
      return '즉시이용';
    }
  };

  const canReserve = (parkingLot: ParkingLot) => {
    return parkingLot.type === 'private' && parkingLot.available > 0;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>주차장 찾기</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="주차장 이름이나 주소를 검색하세요"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 필터 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 주차장 목록 */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {selectedFilter === 'favorite' ? '즐겨찾기' : 
             selectedFilter === 'available' ? '빈자리' :
             selectedFilter === 'nearby' ? '주변 주차장' : '전체 주차장'}
          </Text>
          <Text style={styles.listCount}>{parkingLots.length}개</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={{ padding: Spacing.base, alignItems: 'center' }}>
              <Text style={{ color: Colors.textSecondary }}>가까운 주차장을 불러오는 중...</Text>
            </View>
          )}
          {parkingLots.map((lot) => (
            <TouchableOpacity 
              key={lot.id} 
              style={styles.parkingItem}
              onPress={() => navigateToDetail(lot.id)}
            >
              <View style={styles.parkingItemHeader}>
                <View style={styles.parkingInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.parkingName}>{lot.name}</Text>
                    {usingMockData && (
                      <View style={styles.mockBadge}>
                        <Text style={styles.mockBadgeText}>샘플</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {lot.rating > 0 ? lot.rating.toFixed(1) : '평점없음'}
                    </Text>
                    {(lot.totalReviews || 0) > 0 && (
                      <Text style={styles.reviewCountText}>({lot.totalReviews})</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleFavoriteToggle(lot)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={isFavorite(lot.id) ? "heart" : "heart-outline"}
                    size={20}
                    color={isFavorite(lot.id) ? Colors.error : Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.parkingAddress}>{lot.address}</Text>

              <View style={styles.parkingDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="location" size={14} color={Colors.primary} />
                  <Text style={styles.detailText}>{lot.distance}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time" size={14} color={Colors.success} />
                  <Text style={styles.detailText}>{lot.time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <View style={[styles.congestionDot, { backgroundColor: lot.statusColor }]} />
                  <Text style={styles.detailText}>{lot.status}</Text>
                </View>
              </View>

              <View style={styles.parkingFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.priceText}>{lot.price}</Text>
                  <Text style={styles.availabilityText}>
                    {lot.available}자리 / {lot.total}자리
                  </Text>
                </View>
                                 {lot.type === 'private' && (
                   <TouchableOpacity
                     style={[
                       styles.reserveButton,
                       getReservationButtonStyle(lot)
                     ]}
                     onPress={() => handleReserve(lot)}
                     disabled={!canReserve(lot)}
                   >
                     <Text style={styles.reserveButtonText}>
                       {getReservationButtonText(lot)}
                     </Text>
                   </TouchableOpacity>
                 )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 예약 모달 */}
      <Modal
        visible={showReservationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReservationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>예약하기</Text>
              <TouchableOpacity
                onPress={() => setShowReservationModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
                                                   {selectedParkingLot && (
                <View style={styles.reservationInfo}>
                  <Text style={styles.reservationParkingName}>
                    {selectedParkingLot.name}
                  </Text>
                  <Text style={styles.reservationAddress}>
                    {selectedParkingLot.address}
                  </Text>
                  
                  {selectedParkingLot.type === 'private' && (
                    <View style={styles.ownerInfo}>
                      <Text style={styles.ownerName}>
                        소유자: {selectedParkingLot.ownerName}
                      </Text>
                      <Text style={styles.ownerContact}>
                        연락처: {selectedParkingLot.contactNumber}
                      </Text>
                      {selectedParkingLot.description && (
                        <Text style={styles.description}>
                          {selectedParkingLot.description}
                        </Text>
                      )}
                    </View>
                  )}

                                     {/* 예약 시간 선택 */}
                   <View style={styles.timeSelectionContainer}>
                     <Text style={styles.timeSelectionTitle}>예약 시간 선택</Text>
                     
                     {/* 날짜 선택 */}
                     <View style={styles.dateSelectionSection}>
                       <Text style={styles.inputLabel}>날짜 선택</Text>
                       <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                         <View style={styles.dateButtonsContainer}>
                           {availableDates.map((date) => (
                             <TouchableOpacity
                               key={date}
                               style={[
                                 styles.dateButton,
                                 selectedDate === date && styles.dateButtonSelected
                               ]}
                               onPress={() => setSelectedDate(date)}
                             >
                               <Text style={[
                                 styles.dateButtonText,
                                 selectedDate === date && styles.dateButtonTextSelected
                               ]}>
                                 {formatDate(date)}
                               </Text>
                               <Text style={[
                                 styles.dateButtonSubText,
                                 selectedDate === date && styles.dateButtonSubTextSelected
                               ]}>
                                 {date.slice(5)}
                               </Text>
                             </TouchableOpacity>
                           ))}
                         </View>
                       </ScrollView>
                     </View>

                                                                 {/* 시간대 선택 */}
                       <View style={styles.timeSlotSection}>
                         <Text style={styles.inputLabel}>
                           시간대 선택 
                           {selectedTimeSlots.length > 0 && (
                             <Text style={styles.selectedTimeRange}>
                               {` (${selectedTimeSlots[0]} - ${getEndTime()})`}
                             </Text>
                           )}
                         </Text>
                         <Text style={styles.timeSlotInstruction}>
                           {selectedTimeSlots.length === 0 ? 
                             '원하는 시간대를 클릭하여 선택하세요' : 
                             `${selectedTimeSlots.length}시간 선택됨 · 추가 시간대를 클릭하거나 선택 해제할 수 있습니다`
                           }
                         </Text>
                       <View style={styles.timeSlotGrid}>
                         {availableTimeSlots.map((time) => (
                                                        <TouchableOpacity
                               key={time}
                               style={[
                                 styles.timeSlotButton,
                                 isTimeSlotSelected(time) && styles.timeSlotButtonSelected,
                                 !isTimeSlotSelectable(time) && styles.timeSlotButtonDisabled
                               ]}
                               onPress={() => handleTimeSlotSelect(time)}
                               disabled={!isTimeSlotSelectable(time)}
                             >
                               <Text style={[
                                 styles.timeSlotButtonText,
                                 isTimeSlotSelected(time) && styles.timeSlotButtonTextSelected,
                                 !isTimeSlotSelectable(time) && styles.timeSlotButtonTextDisabled
                               ]}>
                                 {time}
                               </Text>
                             </TouchableOpacity>
                         ))}
                       </View>
                     </View>

                                           {/* 선택 초기화 버튼 */}
                      {selectedTimeSlots.length > 0 && (
                        <TouchableOpacity 
                          style={styles.resetButton}
                          onPress={() => {
                            setSelectedTimeSlots([]);
                            setDuration(0);
                          }}
                        >
                          <Text style={styles.resetButtonText}>시간 선택 초기화</Text>
                        </TouchableOpacity>
                      )}

                      {/* 가격 계산 */}
                      {selectedTimeSlots.length > 0 && (
                        <View style={styles.priceCalculation}>
                          <Text style={styles.durationText}>
                            이용 시간: {duration}시간
                          </Text>
                          <Text style={styles.totalPriceText}>
                            총 요금: {(duration * (selectedParkingLot.availableTimeSlots?.[0]?.price || 5000)).toLocaleString()}원
                          </Text>
                        </View>
                      )}
                   </View>
                </View>
              )}

                         <View style={styles.reservationActions}>
               <TouchableOpacity
                 style={styles.cancelReservationButton}
                 onPress={() => setShowReservationModal(false)}
               >
                 <Text style={styles.cancelReservationText}>취소</Text>
               </TouchableOpacity>
                               <TouchableOpacity
                  style={[
                    styles.confirmReservationButton,
                    selectedTimeSlots.length === 0 && styles.confirmReservationButtonDisabled
                  ]}
                  onPress={handleReservationConfirm}
                  disabled={selectedTimeSlots.length === 0}
                >
                  <Text style={[
                    styles.confirmReservationText,
                    selectedTimeSlots.length === 0 && styles.confirmReservationTextDisabled
                  ]}>
                    예약하기
                  </Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  filterButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  filterContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    ...Shadows.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  mapContainer: {
    height: 200,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.base,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  mapPlaceholderText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  mapPlaceholderSubtext: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  listTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  listCount: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  parkingItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  parkingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  parkingInfo: {
    flex: 1,
  },
  parkingName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  mockBadge: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  mockBadgeText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  reviewCountText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  parkingAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  parkingDetails: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  detailText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  congestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  parkingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.error,
  },
  availabilityText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  footerLeft: {
    flex: 1,
  },
  reserveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  publicButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  reserveButtonText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '600',
  },
  publicButtonText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    margin: Spacing.base,
    width: '90%',
    maxWidth: 400,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  reservationInfo: {
    marginBottom: Spacing.base,
  },
  reservationParkingName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  reservationAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  reservationPrice: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.error,
  },
  ownerInfo: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  ownerName: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  ownerContact: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  reservationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.base,
  },
  cancelReservationButton: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  confirmReservationButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  cancelReservationText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  confirmReservationText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
  },
  timeSelectionContainer: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  timeSelectionTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  dateInputGroup: {
    marginBottom: Spacing.base,
  },
  inputLabel: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  timeInputGroup: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  priceCalculation: {
    backgroundColor: Colors.gray50,
    padding: Spacing.base,
    borderRadius: BorderRadius.base,
    marginTop: Spacing.sm,
  },
  durationText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  totalPriceText: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.primary,
  },
  dateSelectionSection: {
    marginBottom: Spacing.base,
  },
  dateButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xs,
  },
  dateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 70,
  },
  dateButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateButtonText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  dateButtonTextSelected: {
    color: Colors.white,
  },
  dateButtonSubText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  dateButtonSubTextSelected: {
    color: Colors.white,
  },
  timeSlotSection: {
    marginBottom: Spacing.base,
  },
  timeSlotInstruction: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  timeSlotButton: {
    width: '23%',
    aspectRatio: 2.5,
    margin: Spacing.xs,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeSlotButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeSlotButtonDisabled: {
    backgroundColor: Colors.gray200,
    borderColor: Colors.gray300,
  },
  timeSlotButtonText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  timeSlotButtonTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  timeSlotButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  resetButton: {
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  resetButtonText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  selectedTimeRange: {
    color: Colors.primary,
    fontWeight: '600',
  },
  confirmReservationButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  confirmReservationTextDisabled: {
    color: Colors.textTertiary,
  },
}); 