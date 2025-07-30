import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFavorites, ParkingLot } from "../../contexts/FavoritesContext";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from "../../constants/Styles";

export default function HomeScreen() {
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite, isLoading } = useFavorites();
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useState([
    "강남역",
    "역삼역",
    "선릉역",
    "테헤란로",
  ]);

  // 주차장 데이터 (실제로는 API에서 받아올 데이터)
  const parkingLots: ParkingLot[] = [
    {
      id: 1,
      name: "강남역 지하주차장",
      address: "서울시 강남구 강남대로 396",
      distance: "0.2km",
      time: "2분",
      rating: 4.5,
      available: 15,
      total: 100,
      price: "3,000원/h",
      status: "여유",
      statusColor: Colors.success,
      type: "public",
    },
    {
      id: 2,
      name: "역삼역 공영주차장",
      address: "서울시 강남구 역삼동 123-45",
      distance: "0.5km",
      time: "5분",
      rating: 4.0,
      available: 3,
      total: 80,
      price: "2,500원/h",
      status: "보통",
      statusColor: Colors.warning,
      type: "public",
    },
    {
      id: 3,
      name: "선릉역 백화점 주차장",
      address: "서울시 강남구 선릉로 123",
      distance: "0.8km",
      time: "8분",
      rating: 4.0,
      available: 0,
      total: 120,
      price: "4,000원/h",
      status: "만차",
      statusColor: Colors.error,
      type: "private",
    },
    {
      id: 4,
      name: "테헤란로 지상주차장",
      address: "서울시 강남구 테헤란로 456",
      distance: "1.1km",
      time: "12분",
      rating: 3.9,
      available: 8,
      total: 60,
      price: "2,000원/h",
      status: "여유",
      statusColor: Colors.success,
      type: "public",
    },
  ];

  const navigateToDetail = (id: number) => {
    router.push(`/parking-detail?id=${id}` as any);
  };

  const handleFavoriteToggle = (parkingLot: ParkingLot) => {
    if (isFavorite(parkingLot.id)) {
      removeFavorite(parkingLot.id);
    } else {
      addFavorite(parkingLot);
    }
  };

  const handleSearchPress = () => {
    setIsSearchModalVisible(true);
  };

  const handleSearchItemPress = (searchTerm: string) => {
    setSearchText(searchTerm);
    setIsSearchModalVisible(false);
  };

  const handleVoiceSearch = () => {
    console.log("음성 검색 시작");
  };

  const quickSearchItems = [
    { icon: "car", label: "주차장", color: Colors.primary },
    { icon: "business", label: "백화점", color: Colors.success },
    { icon: "restaurant", label: "음식점", color: Colors.warning },
    { icon: "medical", label: "병원", color: Colors.error },
    { icon: "school", label: "학교", color: "#9C27B0" },
    { icon: "home", label: "집", color: "#607D8B" },
  ];

  return (
    <View style={styles.container}>
      {/* 지도 배경 */}
      <View style={styles.mapBackground}>
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
          <View style={[styles.mapMarker, { top: "45%", left: "75%" }]} />
          <View style={[styles.mapMarker, { top: "60%", left: "25%" }]} />
          <View style={[styles.mapMarker, { top: "30%", left: "60%" }]} />
        </View>
      </View>

      {/* 상단 UI 레이어 */}
      <SafeAreaView style={styles.safeArea}>
        {/* 검색 섹션 */}
        <View style={styles.searchSection}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={handleSearchPress}
          >
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <Text style={styles.searchPlaceholder}>
              장소, 버스, 지하철, 주소 검색
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleVoiceSearch}
          >
            <Ionicons name="mic" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 검색 드롭다운 */}
        {isSearchModalVisible && (
          <View style={styles.searchDropdown}>
            <View style={styles.searchDropdownHeader}>
              <View style={styles.searchInputContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color={Colors.textSecondary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="장소, 버스, 지하철, 주소 검색"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoFocus={true}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsSearchModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.searchDropdownContent}
              showsVerticalScrollIndicator={false}
            >
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
                      <View
                        style={[
                          styles.quickSearchIcon,
                          { backgroundColor: item.color },
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={20}
                          color="white"
                        />
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
                    <Ionicons
                      name="time"
                      size={16}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.recentSearchText}>{search}</Text>
                    <TouchableOpacity>
                      <Ionicons
                        name="close"
                        size={16}
                        color={Colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 인기 검색 */}
              <View style={styles.popularSearchSection}>
                <Text style={styles.sectionTitle}>인기 검색</Text>
                <View style={styles.popularSearchTags}>
                  {["강남역", "역삼역", "선릉역", "삼성역", "종합운동장"].map(
                    (tag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.popularSearchTag}
                        onPress={() => handleSearchItemPress(tag)}
                      >
                        <Text style={styles.popularSearchTagText}>{tag}</Text>
                      </TouchableOpacity>
                    )
                  )}
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
                    <View
                      style={[
                        styles.statusTag,
                        { backgroundColor: lot.statusColor },
                      ]}
                    >
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
                      color={
                        isFavorite(lot.id) ? Colors.error : Colors.textTertiary
                      }
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.parkingAddress}>{lot.address}</Text>

                <View style={styles.parkingDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons
                      name="location"
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={styles.detailText}>{lot.distance}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={14} color={Colors.success} />
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
    backgroundColor: Colors.background,
  },
  mapBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#e8f4f8",
  },
  mapGrid: {
    flex: 1,
    position: "relative",
  },
  mainRoad1: {
    position: "absolute",
    top: "30%",
    left: "10%",
    right: "10%",
    height: 3,
    backgroundColor: Colors.gray600,
    borderRadius: 2,
  },
  mainRoad2: {
    position: "absolute",
    top: "10%",
    bottom: "10%",
    left: "40%",
    width: 3,
    backgroundColor: Colors.gray600,
    borderRadius: 2,
  },
  mainRoad3: {
    position: "absolute",
    top: "60%",
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: Colors.gray500,
    borderRadius: 1,
  },
  building1: {
    position: "absolute",
    top: "15%",
    left: "15%",
    width: 30,
    height: 40,
    backgroundColor: "#87CEEB",
    borderRadius: BorderRadius.sm,
  },
  building2: {
    position: "absolute",
    top: "20%",
    right: "20%",
    width: 35,
    height: 50,
    backgroundColor: "#98D8E8",
    borderRadius: BorderRadius.sm,
  },
  building3: {
    position: "absolute",
    top: "45%",
    left: "25%",
    width: 25,
    height: 35,
    backgroundColor: "#B0E0E6",
    borderRadius: BorderRadius.sm,
  },
  building4: {
    position: "absolute",
    top: "50%",
    right: "15%",
    width: 40,
    height: 45,
    backgroundColor: "#87CEEB",
    borderRadius: BorderRadius.sm,
  },
  building5: {
    position: "absolute",
    top: "70%",
    left: "10%",
    width: 30,
    height: 30,
    backgroundColor: "#98D8E8",
    borderRadius: BorderRadius.sm,
  },
  building6: {
    position: "absolute",
    top: "25%",
    left: "60%",
    width: 20,
    height: 25,
    backgroundColor: "#B0E0E6",
    borderRadius: BorderRadius.sm,
  },
  building7: {
    position: "absolute",
    top: "35%",
    right: "35%",
    width: 28,
    height: 38,
    backgroundColor: "#87CEEB",
    borderRadius: BorderRadius.sm,
  },
  building8: {
    position: "absolute",
    top: "65%",
    right: "5%",
    width: 32,
    height: 42,
    backgroundColor: "#98D8E8",
    borderRadius: BorderRadius.sm,
  },
  mapMarker: {
    position: "absolute",
    top: "40%",
    left: "50%",
    width: 8,
    height: 8,
    backgroundColor: Colors.error,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.white,
    ...Shadows.lg,
  },
  safeArea: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.xl,
    ...Shadows.base,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  voiceButton: {
    padding: Spacing.sm,
  },
  parkingSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    maxHeight: "45%",
    paddingBottom: Spacing.base,
  },
  parkingListContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  parkingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    width: 280,
    marginRight: Spacing.sm,
    ...Shadows.base,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  parkingName: {
    fontSize: Typography.base,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  statusTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Typography.xs,
    color: Colors.white,
    fontWeight: "500",
  },
  favoriteButton: {
    padding: Spacing.xs,
  },
  parkingAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  parkingDetails: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
    gap: Spacing.base,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: Typography.sm,
    fontWeight: "600",
    color: Colors.error,
  },
  availabilityText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: "500",
  },
  // 검색 드롭다운 스타일
  searchDropdown: {
    position: "absolute",
    top: 75,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Shadows.lg,
    zIndex: 1000,
    maxHeight: 400,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  searchDropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  searchDropdownContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  quickSearchSection: {
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  quickSearchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickSearchItem: {
    alignItems: "center",
    width: "30%",
  },
  quickSearchIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  quickSearchLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  recentSearchSection: {
    marginBottom: Spacing.xl,
  },
  recentSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  recentSearchText: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  popularSearchSection: {
    marginBottom: Spacing.xl,
  },
  popularSearchTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  popularSearchTag: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  popularSearchTagText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
});
