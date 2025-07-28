import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites } from '../../contexts/FavoritesContext';

export default function HomeScreen() {
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite, isLoading } = useFavorites();
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState([
    '강남역',
    '역삼역',
    '선릉역',
    '테헤란로',
  ]);

  // 주차장 데이터 (실제로는 API에서 받아올 데이터)
  const parkingLots = [
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
      statusColor: '#4CAF50',
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
      statusColor: '#FF9800',
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
      statusColor: '#F44336',
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
      statusColor: '#4CAF50',
    },
  ];

  const navigateToDetail = (id: number) => {
    router.push(`/parking-detail?id=${id}` as any);
  };

  const handleFavoriteToggle = (parkingLot: any) => {
    if (isFavorite(parkingLot.id)) {
      removeFavorite(parkingLot.id);
    } else {
      addFavorite(parkingLot);
    }
  };

  const handleSearchPress = () => {
    setIsSearchModalVisible(true);
  };

  const handleNavigationPress = () => {
    // 길찾기 기능 - 현재 위치에서 주변 주차장으로 안내
    router.push('/(tabs)/parking' as any);
  };

  const handleSearchItemPress = (searchTerm: string) => {
    setSearchText(searchTerm);
    setIsSearchModalVisible(false);
    // 여기에 실제 검색 로직 추가
  };

  const handleVoiceSearch = () => {
    // 음성 검색 기능
    console.log('음성 검색 시작');
  };

  const quickSearchItems = [
    { icon: 'car', label: '주차장', color: '#007AFF' },
    { icon: 'business', label: '백화점', color: '#4CAF50' },
    { icon: 'restaurant', label: '음식점', color: '#FF9800' },
    { icon: 'medical', label: '병원', color: '#F44336' },
    { icon: 'school', label: '학교', color: '#9C27B0' },
    { icon: 'home', label: '집', color: '#607D8B' },
  ];

  return (
    <View style={styles.container}>
      {/* 지도 배경 */}
      <View style={styles.mapBackground}>
        {/* 지도 그리드 */}
        <View style={styles.mapGrid}>
          {/* 주요 도로 */}
          <View style={styles.mainRoad1} />
          <View style={styles.mainRoad2} />
          <View style={styles.mainRoad3} />
          
          {/* 건물들 */}
          <View style={styles.building1} />
          <View style={styles.building2} />
          <View style={styles.building3} />
          <View style={styles.building4} />
          <View style={styles.building5} />
          <View style={styles.building6} />
          <View style={styles.building7} />
          <View style={styles.building8} />
          
          {/* 지도 마커들 */}
          <View style={styles.mapMarker} />
          <View style={[styles.mapMarker, { top: '45%', left: '75%' }]} />
          <View style={[styles.mapMarker, { top: '60%', left: '25%' }]} />
          <View style={[styles.mapMarker, { top: '30%', left: '60%' }]} />
        </View>
      </View>

      {/* 상단 UI 레이어 */}
      <SafeAreaView style={styles.safeArea}>
        {/* 검색 섹션 */}
        <View style={styles.searchSection}>
          <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress}>
            <Ionicons name="search" size={20} color="#666" />
            <Text style={styles.searchPlaceholder}>장소, 버스, 지하철, 주소 검색</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceSearch}>
            <Ionicons name="mic" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* 검색 드롭다운 */}
        {isSearchModalVisible && (
          <View style={styles.searchDropdown}>
            <View style={styles.searchDropdownHeader}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
                  placeholder="장소, 버스, 지하철, 주소 검색"
              value={searchText}
              onChangeText={setSearchText}
                  autoFocus={true}
            />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
          </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsSearchModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.searchDropdownContent} showsVerticalScrollIndicator={false}>
              {/* 빠른 검색 */}
              <View style={styles.quickSearchSection}>
                <Text style={styles.sectionTitle}>빠른 검색</Text>
                <View style={styles.quickSearchGrid}>
                  {quickSearchItems.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickSearchItem}
                      onPress={() => handleSearchItemPress(item.label)}
                    >
                      <View style={[styles.quickSearchIcon, { backgroundColor: item.color }]}>
                        <Ionicons name={item.icon as any} size={20} color="white" />
                      </View>
                      <Text style={styles.quickSearchLabel}>{item.label}</Text>
            </TouchableOpacity>
                  ))}
          </View>
        </View>

              {/* 최근 검색 */}
              <View style={styles.recentSearchSection}>
                <Text style={styles.sectionTitle}>최근 검색</Text>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => handleSearchItemPress(search)}
                  >
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.recentSearchText}>{search}</Text>
                    <TouchableOpacity>
                      <Ionicons name="close" size={16} color="#999" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 인기 검색 */}
              <View style={styles.popularSearchSection}>
                <Text style={styles.sectionTitle}>인기 검색</Text>
                <View style={styles.popularSearchTags}>
                  {['강남역', '역삼역', '선릉역', '삼성역', '종합운동장'].map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.popularSearchTag}
                      onPress={() => handleSearchItemPress(tag)}
                    >
                      <Text style={styles.popularSearchTagText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
            </View>
            </ScrollView>
          </View>
        )}

        {/* 주차장 목록 - 하단에 고정 */}
        <View style={styles.parkingSection}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.parkingListContent}
          >
            {parkingLots.map((lot) => (
              <TouchableOpacity 
                key={lot.id} 
                style={styles.parkingCard}
                onPress={() => navigateToDetail(lot.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                  <Text style={styles.parkingName}>{lot.name}</Text>
                  <View style={[styles.statusTag, { backgroundColor: lot.statusColor }]}>
                    <Text style={styles.statusText}>{lot.status}</Text>
                  </View>
                  </View>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => handleFavoriteToggle(lot)}
                    disabled={isLoading}
                  >
                    <Ionicons 
                      name={isFavorite(lot.id) ? "heart" : "heart-outline"} 
                      size={20} 
                      color={isFavorite(lot.id) ? "#FF6B6B" : "#ccc"} 
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
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.detailText}>{lot.rating}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e8f4f8',
  },
  mapGrid: {
    flex: 1,
    position: 'relative',
  },
  mainRoad1: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  mainRoad2: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    left: '40%',
    width: 3,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  mainRoad3: {
    position: 'absolute',
    top: '60%',
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#999',
    borderRadius: 1,
  },
  building1: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    width: 30,
    height: 40,
    backgroundColor: '#87CEEB',
    borderRadius: 4,
  },
  building2: {
    position: 'absolute',
    top: '20%',
    right: '20%',
    width: 35,
    height: 50,
    backgroundColor: '#98D8E8',
    borderRadius: 4,
  },
  building3: {
    position: 'absolute',
    top: '45%',
    left: '25%',
    width: 25,
    height: 35,
    backgroundColor: '#B0E0E6',
    borderRadius: 4,
  },
  building4: {
    position: 'absolute',
    top: '50%',
    right: '15%',
    width: 40,
    height: 45,
    backgroundColor: '#87CEEB',
    borderRadius: 4,
  },
  building5: {
    position: 'absolute',
    top: '70%',
    left: '10%',
    width: 30,
    height: 30,
    backgroundColor: '#98D8E8',
    borderRadius: 4,
  },
  building6: {
    position: 'absolute',
    top: '25%',
    left: '60%',
    width: 20,
    height: 25,
    backgroundColor: '#B0E0E6',
    borderRadius: 4,
  },
  building7: {
    position: 'absolute',
    top: '35%',
    right: '35%',
    width: 28,
    height: 38,
    backgroundColor: '#87CEEB',
    borderRadius: 4,
  },
  building8: {
    position: 'absolute',
    top: '65%',
    right: '5%',
    width: 32,
    height: 42,
    backgroundColor: '#98D8E8',
    borderRadius: 4,
  },
  mapMarker: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 8,
    height: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 6,
  },
  safeArea: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directionButton: {
    padding: 8,
    marginRight: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  voiceButton: {
    padding: 8,
  },
  parkingSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    maxHeight: '45%',
    paddingBottom: 20,
  },
  parkingListContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  parkingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: 280,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parkingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 4,
  },
  parkingAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  parkingDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  availabilityText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  // 검색 드롭다운 스타일
  searchDropdown: {
    position: 'absolute',
    top: 75, // 검색창 바로 아래
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    maxHeight: 400,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  searchDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  searchDropdownContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quickSearchSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickSearchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  quickSearchItem: {
    alignItems: 'center',
    width: '30%',
  },
  quickSearchIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickSearchLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recentSearchSection: {
    marginBottom: 30,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentSearchText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  popularSearchSection: {
    marginBottom: 30,
  },
  popularSearchTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  popularSearchTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  popularSearchTagText: {
    fontSize: 14,
    color: '#666',
  },
});
