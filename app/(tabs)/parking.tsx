import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites, ParkingLot } from '../../contexts/FavoritesContext';

export default function ParkingScreen() {
  const router = useRouter();
  const { favorites, addFavorite, removeFavorite, isFavorite, isLoading } = useFavorites();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  const filters = [
    { id: 'all', label: '전체' },
    { id: 'nearby', label: '주변' },
    { id: 'favorite', label: '즐겨찾기' },
    { id: 'available', label: '빈자리' },
  ];

  // 주차장 데이터 (실제로는 API에서 받아올 데이터)
  const allParkingLots: ParkingLot[] = [
    {
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
    {
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
    {
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
    {
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
    {
      id: 5,
      name: '삼성역 지하주차장',
      address: '서울시 강남구 영동대로 513',
      distance: '1.3km',
      time: '15분',
      rating: 4.2,
      totalReviews: 95,
      available: 12,
      total: 90,
      price: '2,800원/h',
      status: '여유',
      statusColor: '#4CAF50',
      operatingHours: '24시간',
      phone: '02-5678-9012',
      features: ['지하주차', '24시간 운영', 'CCTV', '보안관'],
      description: '삼성역 근처에 위치한 지하주차장입니다. 안전하고 편리한 주차 환경을 제공합니다.',
    },
    {
      id: 6,
      name: '종합운동장 주차장',
      address: '서울시 송파구 올림픽로 25',
      distance: '2.1km',
      time: '25분',
      rating: 4.1,
      totalReviews: 78,
      available: 45,
      total: 200,
      price: '1,500원/h',
      status: '여유',
      statusColor: '#4CAF50',
      operatingHours: '06:00-24:00',
      phone: '02-6789-0123',
      features: ['대형 주차장', '공영주차장', 'CCTV', '무료 WiFi'],
      description: '종합운동장 근처에 위치한 대형 주차장입니다. 넓은 공간과 합리적인 요금을 제공합니다.',
    },
  ];

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

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>주차장 찾기</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="목적지를 검색하세요"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
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
          <Ionicons name="map-outline" size={48} color="#ccc" />
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
                    <Text style={styles.reviewCount}>({lot.totalReviews})</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleFavoriteToggle(lot)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={isFavorite(lot.id) ? "heart" : "heart-outline"}
                    size={20}
                    color={isFavorite(lot.id) ? "#FF6B6B" : "#666"}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.parkingAddress}>{lot.address}</Text>

              <View style={styles.parkingDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="location" size={14} color="#007AFF" />
                  <Text style={styles.detailText}>{lot.distance}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time" size={14} color="#4CAF50" />
                  <Text style={styles.detailText}>{lot.time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <View style={[styles.congestionDot, { backgroundColor: lot.statusColor }]} />
                  <Text style={styles.detailText}>{lot.status}</Text>
                </View>
              </View>

              <View style={styles.parkingFooter}>
                <Text style={styles.priceText}>{lot.price}</Text>
                <Text style={styles.availabilityText}>
                  {lot.available}자리 / {lot.total}자리
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterChip: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listCount: {
    fontSize: 14,
    color: '#666',
  },
  parkingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parkingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  parkingInfo: {
    flex: 1,
  },
  parkingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  parkingAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  parkingDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  congestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  parkingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  availabilityText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
}); 