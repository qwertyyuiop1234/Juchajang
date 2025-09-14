import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFavorites, ParkingLot } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import { createReservation, getAvailableTimeSlots } from '../../services/reservationAPI';
import { getAllPersonalParkingLots } from '../../services/personalParkingAPI';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Styles';

export default function ParkingScreen() {
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
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [privateParkingLots, setPrivateParkingLots] = useState<any[]>([]);

  const filters = [
    { id: 'all', label: '전체' },
    { id: 'public', label: '공영주차장' },
    { id: 'private', label: '개인주차공간' },
    { id: 'nearby', label: '주변' },
    { id: 'favorite', label: '즐겨찾기' },
    { id: 'available', label: '빈자리' },
  ];

  // 개인 주차장 데이터 로드 (화면 포커스 시마다)
  useFocusEffect(
    React.useCallback(() => {
      loadPrivateParkingLots();
    }, [])
  );

  const loadPrivateParkingLots = async () => {
    try {
      console.log('🔄 개인 주차장 목록 로드 시작...');
      const lots = await getAllPersonalParkingLots();
      console.log('✅ 개인 주차장 로드 성공:', lots.length, '개');
      console.log('📍 로드된 개인 주차장:', lots);
      setPrivateParkingLots(lots);
    } catch (error) {
      console.error('❌ 개인 주차장 목록 로드 실패:', error);
    }
  };

  // 주차장 데이터 (공영주차장 + 개인주차장)
  const publicParkingLots: ParkingLot[] = [
    {
      id: 1,
      name: '강남역 지하주차장',
      address: '서울시 강남구 강남대로 396',
      distance: '0.2km',
      time: '2분',
      rating: 4.5,
      available: 15,
      total: 100,
      price: '3,000원/h',
      status: '여유',
      statusColor: Colors.success,
      type: 'public',
    },
    {
      id: 2,
      name: '역삼역 공영주차장',
      address: '서울시 강남구 역삼동 123-45',
      distance: '0.5km',
      time: '5분',
      rating: 4.0,
      available: 3,
      total: 80,
      price: '2,500원/h',
      status: '보통',
      statusColor: Colors.warning,
      type: 'public',
    },
    {
      id: 3,
      name: '선릉역 백화점 주차장',
      address: '서울시 강남구 선릉로 123',
      distance: '0.8km',
      time: '8분',
      rating: 4.0,
      available: 0,
      total: 120,
      price: '4,000원/h',
      status: '만차',
      statusColor: Colors.error,
      type: 'public',
    },
    {
      id: 4,
      name: '테헤란로 지상주차장',
      address: '서울시 강남구 테헤란로 456',
      distance: '1.1km',
      time: '12분',
      rating: 3.9,
      available: 8,
      total: 60,
      price: '2,000원/h',
      status: '여유',
      statusColor: Colors.success,
      type: 'public',
    },
    {
      id: 5,
      name: '삼성역 지하주차장',
      address: '서울시 강남구 영동대로 513',
      distance: '1.3km',
      time: '15분',
      rating: 4.2,
      available: 12,
      total: 90,
      price: '2,800원/h',
      status: '여유',
      statusColor: Colors.success,
      type: 'public',
    },
    {
      id: 6,
      name: '종합운동장 주차장',
      address: '서울시 송파구 올림픽로 25',
      distance: '2.1km',
      time: '25분',
      rating: 4.1,
      available: 45,
      total: 200,
      price: '1,500원/h',
      status: '여유',
      statusColor: Colors.success,
      type: 'public',
    },
  ];

  // 개인 주차장 데이터를 ParkingLot 형식으로 변환
  const convertedPrivateParkingLots: ParkingLot[] = privateParkingLots.map((lot, index) => {
    // 디버깅: lot.id 확인
    if (!lot.id && lot.id !== 0) {
      console.warn('⚠️ lot.id가 정의되지 않음:', lot);
    }
    console.log(`🔄 변환 중: ${lot.name} (ID: ${lot.id}, Index: ${index})`);
    return {
      id: `private_${lot.id || 'unknown'}_${index}`, // 고유한 ID를 위해 접두어와 인덱스 추가
    name: lot.name,
    address: lot.address,
    distance: '계산 중...', // TODO: 거리 계산 로직 추가
    time: '계산 중...', // TODO: 시간 계산 로직 추가
    rating: lot.rating || 0,
    available: lot.status === 'available' ? 1 : 0,
    total: 1,
    price: `${lot.pricePerHour?.toLocaleString() || '5,000'}원/h`,
    status: lot.status === 'available' ? '예약가능' : '사용중',
    statusColor: lot.status === 'available' ? Colors.success : Colors.error,
    type: 'private',
    ownerName: lot.ownerName || '익명',
    contactNumber: lot.ownerContact,
    description: lot.description || '',
    availableTimeSlots: [
      {
        id: 1,
        dayOfWeek: 1,
        startTime: lot.availableStartTime || '09:00',
        endTime: lot.availableEndTime || '18:00',
        price: lot.pricePerHour || 5000,
        isAvailable: lot.status === 'available',
      },
    ],
    rules: lot.rules || [],
    };
  });

  // 전체 주차장 목록 (공영 + 개인)
  const allParkingLots: ParkingLot[] = [
    ...publicParkingLots,
    ...convertedPrivateParkingLots,
  ];
  
  // 디버깅: 전체 주차장 목록 로그
  React.useEffect(() => {
    console.log('📊 전체 주차장 목록:', allParkingLots.length, '개');
    console.log('  - 공영주차장:', publicParkingLots.length, '개');
    console.log('  - 개인주차장:', convertedPrivateParkingLots.length, '개');
  }, [allParkingLots.length]);

  // 필터링된 주차장 목록
  const getFilteredParkingLots = () => {
    let filtered = allParkingLots;

    // 검색 필터
    if (searchText) {
      filtered = filtered.filter(lot => 
        lot.name.toLowerCase().includes(searchText.toLowerCase()) ||
        lot.address.toLowerCase().includes(searchText.toLowerCase())
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
        filtered = filtered.filter(lot => parseFloat(lot.distance.replace('km', '')) <= 1.0);
        break;
      default:
        break;
    }

    return filtered;
  };

  const parkingLots = getFilteredParkingLots();
  
  // 디버깅: ID 중복 확인
  React.useEffect(() => {
    const ids = parkingLots.map(lot => lot.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.error('중복된 주차장 ID 발견:', ids);
      console.error('중복된 ID들:', ids.filter((id, index) => ids.indexOf(id) !== index));
    }
  }, [parkingLots]);

  const handleFavoriteToggle = (parkingLot: ParkingLot) => {
    if (isFavorite(parkingLot.id)) {
      removeFavorite(parkingLot.id);
    } else {
      addFavorite(parkingLot);
    }
  };

  const navigateToDetail = (id: number | string) => {
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
    
    const firstDate = availableDates[0];
    setSelectedDate(firstDate);
    setSelectedTimeSlots([]);
    setDuration(0);
    
    // 첫 번째 날짜의 예약 가능 시간대 로드
    const actualId = parkingLot.id.toString().startsWith('private_') 
      ? parkingLot.id.toString().replace(/^private_(\d+)_\d+$/, '$1')
      : parkingLot.id.toString();
    loadAvailableTimeSlots(actualId, firstDate);
    
    setShowReservationModal(true);
  };
  
  // 예약 가능 시간대 로드 함수
  const loadAvailableTimeSlots = async (parkingLotId: string, date: string) => {
    try {
      setIsLoadingTimeSlots(true);
      const timeSlotData = await getAvailableTimeSlots(parkingLotId, date);
      
      // 기본 시간대 생성 (9시부터 18시까지)
      const allTimeSlots = [];
      for (let hour = 9; hour <= 18; hour++) {
        allTimeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      
      setAvailableTimeSlots(allTimeSlots);
      setUnavailableTimeSlots(timeSlotData.reserved || []);
    } catch (error) {
      console.error('시간대 로드 실패:', error);
      // 에러 발생 시 기본 시간대만 표시
      const timeSlots = [];
      for (let hour = 9; hour <= 18; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      setAvailableTimeSlots(timeSlots);
      setUnavailableTimeSlots([]);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  const handleReservationConfirm = async () => {
    if (!selectedParkingLot) {
      Alert.alert('오류', '주차장 정보가 없습니다.');
      return;
    }

    if (!user) {
      Alert.alert('로그인 필요', '예약하려면 로그인이 필요합니다.');
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

    const pricePerHour = selectedParkingLot.availableTimeSlots?.[0]?.price || 5000;
    const totalPrice = duration * pricePerHour;
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
          onPress: () => confirmReservation(),
        },
      ]
    );
  };
  
  const confirmReservation = async () => {
    if (!selectedParkingLot || !user) return;
    
    try {
      setReservationLoading(true);
      
      const pricePerHour = selectedParkingLot.availableTimeSlots?.[0]?.price || 5000;
      const totalPrice = duration * pricePerHour;
      const startTime = selectedTimeSlots[0];
      const endTime = getEndTime();
      
      // 현재 사용자 정보 활용
      // private_ 접두어가 있으면 제거하여 실제 ID 사용
      const actualParkingLotId = selectedParkingLot.id.toString().startsWith('private_') 
        ? selectedParkingLot.id.toString().replace(/^private_(\d+)_\d+$/, '$1')
        : selectedParkingLot.id.toString();
        
      const reservationData = {
        parkingLotId: actualParkingLotId,
        parkingLotName: selectedParkingLot.name,
        parkingLotAddress: selectedParkingLot.address,
        ownerName: selectedParkingLot.ownerName,
        ownerContact: selectedParkingLot.contactNumber,
        reservationDate: selectedDate,
        timeSlots: selectedTimeSlots,
        startTime,
        endTime,
        duration,
        totalPrice,
        pricePerHour,
        paymentMethod: 'card',
        // 사용자 정보 추가
        userDisplayName: profile?.displayName || user?.displayName || '익명',
        userEmail: user?.email || '',
        userPhone: profile?.phoneNumber || '',
      };
      
      await createReservation(reservationData);
      
      Alert.alert(
        '예약 완료',
        '예약이 성공적으로 완료되었습니다!',
        [
          {
            text: '확인',
            onPress: () => {
              setShowReservationModal(false);
              resetReservationModal();
              // 예약 내역 페이지로 이동
              router.push('/reservation' as any);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('예약 생성 실패:', error);
      Alert.alert(
        '예약 실패',
        error.message || '예약 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    } finally {
      setReservationLoading(false);
    }
  };
  
  const resetReservationModal = () => {
    setSelectedParkingLot(null);
    setSelectedDate('');
    setSelectedTimeSlots([]);
    setDuration(0);
    setAvailableDates([]);
    setAvailableTimeSlots([]);
    setUnavailableTimeSlots([]);
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
  
  // 날짜 변경 시 예약 상황 새로고침
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTimeSlots([]); // 선택된 시간 초기화
    setDuration(0);
    
    if (selectedParkingLot) {
      const actualId = selectedParkingLot.id.toString().startsWith('private_') 
        ? selectedParkingLot.id.toString().replace(/^private_(\d+)_\d+$/, '$1')
        : selectedParkingLot.id.toString();
      loadAvailableTimeSlots(actualId, date);
    }
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
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => router.push('/add-parking')}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.shareButtonText}>공간 공유</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="목적지를 검색하세요"
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

      {/* 지도 영역 (친구가 구현할 예정) */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.mapPlaceholderText}>지도 영역</Text>
          <Text style={styles.mapPlaceholderSubtext}>네이버 지도 API 연결 예정</Text>
        </View>
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
          {parkingLots.map((lot) => (
            <TouchableOpacity 
              key={lot.id} 
              style={styles.parkingItem}
              onPress={() => navigateToDetail(lot.id)}
            >
              <View style={styles.parkingItemHeader}>
                <View style={styles.parkingInfo}>
                  <Text style={styles.parkingName}>{lot.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{lot.rating}</Text>
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
                               onPress={() => handleDateChange(date)}
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
                           {isLoadingTimeSlots ? '예약 상황을 로드 중입니다...' :
                            selectedTimeSlots.length === 0 ? 
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
                    (selectedTimeSlots.length === 0 || reservationLoading) && styles.confirmReservationButtonDisabled
                  ]}
                  onPress={handleReservationConfirm}
                  disabled={selectedTimeSlots.length === 0 || reservationLoading}
                >
                  <Text style={[
                    styles.confirmReservationText,
                    (selectedTimeSlots.length === 0 || reservationLoading) && styles.confirmReservationTextDisabled
                  ]}>
                    {reservationLoading ? '예약 중...' : '예약하기'}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight || '#E8F4F8',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  shareButtonText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.xs,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
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