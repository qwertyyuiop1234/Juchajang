import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Linking,
} from "react-native";
import * as Location from "expo-location";
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
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapPolylineOverlay,
} from "@mj-studio/react-native-naver-map";
import { Icons } from "../../constants/Icon";
import navigationAPI from "../../services/navigationAPI";

export default function HomeScreen() {
  // Initial camera
  const INITIAL_CAMERA = {
    latitude: 37.5666102, // 서울 중심부 위도
    longitude: 126.9783881, // 서울 중심부 경도
    zoom: 12, // 줌 레벨
  };
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite, isLoading } = useFavorites();
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [recentSearches] = useState(["강남역", "역삼역", "선릉역", "테헤란로"]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMarkers, setSearchMarkers] = useState<any[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<any>(null);
  const [nearbyParkingLots, setNearbyParkingLots] = useState<any[]>([]);
  const [destinationMarker, setDestinationMarker] = useState<any>(null);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [routePolyline, setRoutePolyline] = useState<{latitude: number, longitude: number}[]>([]);
  const [showRouteOptions, setShowRouteOptions] = useState(false);

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

  // variables for location, errormsg
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapCamera, setMapCamera] = useState(INITIAL_CAMERA);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [zoom, setZoom] = useState(15); // 초기 줌
  const mapRef = useRef<any>(null);

  /**
   * This function is for checking permission of getting current location information of users.
   *
   * @param showLoading
   * @returns
   */
  const isPermissionOfCurrentLocationOn = async (showLoading = true) => {
    if (showLoading) setIsGettingLocation(true);

    //Location permission
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setErrorMsg("위치 정보 접근 권한이 필요합니다.");
      Alert.alert(
        "위치 권한 필요",
        "현재 위치를 사용하려면 위치 권한을 허용해 주세요.",
        [
          { text: "취소", style: "cancel" },
          { text: "설정으로 이동", onPress: () => Linking.openSettings() },
        ]
      );
      return null;
    }

    return true;
  };

  const getCurrentLocation = async (showLoading = true) => {
    try {
      if (showLoading) setIsGettingLocation(true);
      //1. Check loaction
      const permission = await isPermissionOfCurrentLocationOn();
      if (permission === null) return null;

      //2. Take current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      setErrorMsg(null);
      return currentLocation;
    } catch (error) {
      console.log("위치 가져오기 실패: ", error);
      setErrorMsg("위치 정보를 가져올 수 없습니다.");
      Alert.alert("오류", "위치 정보를 가져올 수 없습니다. 다시 시도해주세요.");
      return null;
    } finally {
      if (showLoading) setIsGettingLocation(false);
    }
  };

  // Location Tracking
  const startLocationTracking = async () => {
    try {
      //1. Check permission
      const permission = await isPermissionOfCurrentLocationOn();
      if (permission === null) return null;

      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      if (locationWatcher) {
        locationWatcher.remove();
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,
          timeInterval: 1000,
        },
        (newLocation) => {
          console.log(
            "새로운 위치:",
            JSON.stringify(newLocation.coords, null, 2)
          );
          setLocation(newLocation);
        }
      );
      setLocationWatcher(subscription);
    } catch (error) {
      console.error("위치 추적 실패: ", error);
    }
  };

  useEffect(() => {
    startLocationTracking();
    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, []);

  /**
   * This function is move to specific location.
   * This also move camera to specific location.
   *
   * @param latitude
   * @param longitude
   * @param zoom
   */
  const moveToLocation = (
    latitude: number,
    longitude: number,
    zoom: number = 15
  ) => {
    console.log("이동할 위치:", latitude, longitude, zoom);
    if (mapRef.current) {
      // 네이버 맵 카메라 이동
      mapRef.current.animateCameraTo({
        latitude,
        longitude,
        zoom,
        duration: 1000, // 1초 애니메이션
      });
    }

    // 상태도 업데이트
    setMapCamera({
      latitude,
      longitude,
      zoom,
    });
  };

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

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await navigationAPI.searchPlace(query, 10);
      setSearchResults(results.items);
    } catch (error) {
      console.error("검색 에러:", error);
      Alert.alert("검색 실패", "검색 중 오류가 발생했습니다.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchItemPress = (searchTerm: string) => {
    setSearchText(searchTerm);
    performSearch(searchTerm);
  };

  const handleSearchResultPress = async (result: any) => {
    try {
      // 목적지 설정
      setSelectedDestination(result);

      // 검색 결과 위치로 지도 이동
      moveToLocation(result.mapy, result.mapx, 15);

      // 목적지 마커 설정
      const newDestinationMarker = {
        id: `destination_${Date.now()}`,
        latitude: result.mapy,
        longitude: result.mapx,
        title: result.title,
        address: result.roadAddress || result.address,
        type: "destination",
      };

      console.log("🎯 목적지 마커:", newDestinationMarker);
      setDestinationMarker(newDestinationMarker);
      
      // 현재 위치에서 목적지까지의 경로 계산
      await calculateRouteToDestination(result);

      try {
        // 실제 주변 주차장 검색
        console.log("🔍 실제 주변 주차장 검색 중...", result.mapy, result.mapx);
        const nearbyParking = await navigationAPI.searchNearbyParkingLots(
          result.mapy,
          result.mapx,
          2000 // 2km 반경으로 증가
        );

        console.log("🅿️ 찾은 주차장:", nearbyParking);

        if (nearbyParking.parkingLots && nearbyParking.parkingLots.length > 0) {
          // 실제 API 결과 사용 - 최대 3개만
          const limitedParkingLots = nearbyParking.parkingLots.slice(0, 3);
          setNearbyParkingLots(limitedParkingLots);

          // 주차장 마커들만 설정 (목적지 마커는 별도 관리)
          const parkingMarkers = limitedParkingLots.map((lot, index) => ({
            id: `parking_${Date.now()}_${index}`,
            latitude: lot.mapy,
            longitude: lot.mapx,
            title: lot.title,
            address: lot.roadAddress || lot.address,
            distance: lot.distance,
            type: "parking",
          }));

          console.log("📍 주차장 마커들:", parkingMarkers);
          setSearchMarkers(parkingMarkers);
        } else {
          // API 결과가 없으면 더미 데이터 사용 - 3개
          console.log("⚠️ API 결과 없음, 더미 데이터 사용");
          const dummyParkingLots = [
            {
              title: "근처 주차장 1",
              address: "검색된 위치 근처",
              roadAddress: "검색된 위치 근처",
              mapy: result.mapy + 0.001,
              mapx: result.mapx + 0.001,
              distance: 100,
              category: "주차장",
            },
            {
              title: "근처 주차장 2",
              address: "검색된 위치 근처",
              roadAddress: "검색된 위치 근처",
              mapy: result.mapy - 0.001,
              mapx: result.mapx - 0.001,
              distance: 200,
              category: "주차장",
            },
            {
              title: "근처 주차장 3",
              address: "검색된 위치 근처",
              roadAddress: "검색된 위치 근처",
              mapy: result.mapy + 0.0005,
              mapx: result.mapx - 0.0015,
              distance: 150,
              category: "주차장",
            },
          ];

          setNearbyParkingLots(dummyParkingLots);

          // 주차장 마커들만 설정
          const parkingMarkers = dummyParkingLots.map((lot, index) => ({
            id: `parking_${Date.now()}_${index}`,
            latitude: lot.mapy,
            longitude: lot.mapx,
            title: lot.title,
            address: lot.roadAddress || lot.address,
            distance: lot.distance,
            type: "parking",
          }));

          setSearchMarkers(parkingMarkers);
        }
      } catch (apiError) {
        console.error("API 호출 실패, 더미 데이터 사용:", apiError);
        // API 실패 시 더미 데이터로 폴백 - 3개
        const dummyParkingLots = [
          {
            title: "근처 주차장 1 (더미)",
            address: "API 연결 실패",
            roadAddress: "API 연결 실패",
            mapy: result.mapy + 0.001,
            mapx: result.mapx + 0.001,
            distance: 100,
            category: "주차장",
          },
          {
            title: "근처 주차장 2 (더미)",
            address: "API 연결 실패",
            roadAddress: "API 연결 실패",
            mapy: result.mapy - 0.001,
            mapx: result.mapx + 0.0005,
            distance: 150,
            category: "주차장",
          },
          {
            title: "근처 주차장 3 (더미)",
            address: "API 연결 실패",
            roadAddress: "API 연결 실패",
            mapy: result.mapy + 0.0005,
            mapx: result.mapx - 0.001,
            distance: 120,
            category: "주차장",
          },
        ];

        setNearbyParkingLots(dummyParkingLots);

        // 주차장 마커들만 설정
        const parkingMarkers = dummyParkingLots.map((lot, index) => ({
          id: `parking_${Date.now()}_${index}`,
          latitude: lot.mapy,
          longitude: lot.mapx,
          title: lot.title,
          address: lot.roadAddress || lot.address,
          distance: lot.distance,
          type: "parking",
        }));

        setSearchMarkers(parkingMarkers);
      }

      setIsSearchModalVisible(false);
      setSearchText(result.title);
      
      // 경로 옵션 표시
      setShowRouteOptions(true);
    } catch (error) {
      console.error("주변 주차장 검색 에러:", error);
      Alert.alert("오류", "주변 주차장을 찾는 중 오류가 발생했습니다.");
    }
  };

  const handleVoiceSearch = () => {
    console.log("음성 검색 시작");
  };

  // 목적지까지 경로 계산 함수
  const calculateRouteToDestination = async (destination: any) => {
    try {
      if (!location) {
        Alert.alert("오류", "현재 위치를 찾을 수 없습니다.");
        return;
      }

      console.log("🗺️ 경로 계산 시작:", {
        start: { latitude: location.coords.latitude, longitude: location.coords.longitude },
        goal: { latitude: destination.mapy, longitude: destination.mapx }
      });

      const routeData = await navigationAPI.getDirections({
        start: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        goal: {
          latitude: destination.mapy,
          longitude: destination.mapx,
        },
        option: "trafast",
      });

      console.log("✅ 경로 계산 성공:", routeData);
      setCurrentRoute(routeData);
      
      // 폴리라인 데이터 설정 및 변환
      if (routeData.polyline && routeData.polyline.length > 0) {
        // 백엔드에서 받은 잘못된 구조를 올바르게 변환
        const convertedPolyline = routeData.polyline.map((point: any) => {
          // 현재 구조: { longitude: [lng, lat], latitude: [lng, lat] }
          // 필요한 구조: { longitude: lng, latitude: lat }
          if (point.longitude && Array.isArray(point.longitude) && point.longitude.length >= 2) {
            return {
              longitude: point.longitude[0],
              latitude: point.longitude[1], // 실제로는 첫 번째가 경도, 두 번째가 위도
            };
          }
          // 이미 올바른 구조인 경우
          return point;
        });
        
        setRoutePolyline(convertedPolyline);
        console.log("📋 폴리라인 변환 완료:", convertedPolyline.length, "개 포인트");
        console.log("🔍 첫 번째 포인트:", convertedPolyline[0]);
      } else if (routeData.path && routeData.path.length > 0) {
        // path 데이터를 직접 사용
        const pathPolyline = [];
        for (let i = 0; i < routeData.path.length; i++) {
          const point = routeData.path[i];
          if (Array.isArray(point) && point.length >= 2) {
            pathPolyline.push({
              longitude: point[0],
              latitude: point[1],
            });
          }
        }
        setRoutePolyline(pathPolyline);
        console.log("📋 path에서 폴리라인 생성 완료:", pathPolyline.length, "개 포인트");
      }
    } catch (error) {
      console.error("❌ 경로 계산 전체 실패:", error);
      Alert.alert("오류", "경로를 계산할 수 없습니다.");
    }
  };


  // 네비게이션 시작 함수
  const handleStartNavigation = () => {
    if (!selectedDestination || !currentRoute) {
      Alert.alert("오류", "대상지와 경로 정보가 필요합니다.");
      return;
    }

    // 네비게이션 화면으로 이동
    router.push(`/navigation?destinationLat=${selectedDestination.mapy}&destinationLng=${selectedDestination.mapx}&destinationName=${encodeURIComponent(selectedDestination.title)}` as any);
  };

  // 경로 삭제 함수
  const handleClearRoute = () => {
    setSelectedDestination(null);
    setDestinationMarker(null);
    setCurrentRoute(null);
    setRoutePolyline([]);
    setShowRouteOptions(false);
    setSearchMarkers([]);
    setNearbyParkingLots([]);
  };

  // 현재 위치로 이동 (개선된 버전)
  const handleLocationPress = async () => {
    try {
      console.log("현재 위치 버튼 클릭");

      //1. Check permission
      const permission = await isPermissionOfCurrentLocationOn();
      if (permission === null) return null;

      // 이미 위치 정보가 있으면 바로 이동
      if (location && !isGettingLocation) {
        console.log("기존 위치 사용:", location.coords);
        moveToLocation(location.coords.latitude, location.coords.longitude, 16);
        return;
      }

      // 위치 정보가 없으면 새로 가져오기
      const currentLocation = await getCurrentLocation(true);
      if (currentLocation) {
        console.log("새로운 위치:", currentLocation.coords);
        moveToLocation(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          16
        );
      }
    } catch (error) {
      console.error("현재 위치로 이동 실패:", error);
      Alert.alert("오류", "현재 위치로 이동할 수 없습니다.");
    }
  };

  // 초기 위치 설정 (앱 시작 시 한 번만)
  const setInitialLocation = async () => {
    const currentLocation = await getCurrentLocation(false);
    if (currentLocation) {
      setMapCamera({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        zoom: 14,
      });
    }
  };

  // 앱 시작 시 초기 위치 설정
  useEffect(() => {
    setInitialLocation();
  }, []);

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
      {/* naver map - 배경 */}
      <NaverMapView
        ref={mapRef}
        style={styles.map}
        initialCamera={INITIAL_CAMERA}
        onCameraChanged={(event) => {
          setZoom(event.zoom ?? 15); // 카메라 줌 레벨 업데이트
          // console.log(event.zoom);
        }}
        mapType="Navi"
        isNightModeEnabled={false}
        isScrollGesturesEnabled={true}
        isShowLocationButton={false}
      >
        {location && (
          <NaverMapMarkerOverlay
            latitude={location.coords.latitude}
            longitude={location.coords.longitude}
            image={Icons.reactLogo}
            width={zoom * 3} // 줌 비율에 맞춘 크기
            height={zoom * 3}
          />
        )}

        {/* 목적지 마커 */}
        {destinationMarker && (
          <NaverMapMarkerOverlay
            latitude={destinationMarker.latitude}
            longitude={destinationMarker.longitude}
            width={50}
            height={50}
            anchor={{ x: 0.5, y: 1 }}
          />
        )}

        {/* 검색 결과 마커들 (주차장) */}
        {searchMarkers.map((marker) => {
          console.log(
            `🗺️ 마커 렌더링: ${marker.type} - ${marker.title} (${marker.latitude}, ${marker.longitude})`
          );
          return (
            <NaverMapMarkerOverlay
              key={marker.id}
              latitude={marker.latitude}
              longitude={marker.longitude}
              width={40}
              height={40}
              anchor={{ x: 0.5, y: 1 }}
            />
          );
        })}

        {/* 경로 폴리라인 */}
        {routePolyline.length > 0 && (
          <NaverMapPolylineOverlay
            coords={routePolyline}
            width={8}
            color="#007AFF"
          />
        )}
      </NaverMapView>

      {/* UI 레이어 - 맵 위에 오버레이 */}
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
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
                  onChangeText={(text) => {
                    setSearchText(text);
                    performSearch(text);
                  }}
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
              {/* 검색어가 있을 때: 검색 결과만 표시 */}
              {searchText.length > 0 ? (
                <View style={styles.searchResultsSection}>
                  <Text style={styles.sectionTitle}>
                    검색 결과 {isSearching && "(검색 중...)"}
                  </Text>
                  {searchResults.length > 0
                    ? searchResults.map((result, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.searchResultItem}
                          onPress={() => handleSearchResultPress(result)}
                        >
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultTitle}>
                              {result.title}
                            </Text>
                            <Text style={styles.searchResultAddress}>
                              {result.roadAddress || result.address}
                            </Text>
                            <Text style={styles.searchResultCategory}>
                              {result.category}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    : !isSearching && (
                        <Text style={styles.noResultsText}>
                          검색 결과가 없습니다.
                        </Text>
                      )}
                </View>
              ) : (
                /* 검색어가 없을 때: 빠른검색, 최근검색, 인기검색 표시 */
                <>
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
                          <Text style={styles.quickSearchLabel}>
                            {item.label}
                          </Text>
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
                      {[
                        "강남역",
                        "역삼역",
                        "선릉역",
                        "삼성역",
                        "종합운동장",
                      ].map((tag, index) => (
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
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* 현재 위치 버튼 */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleLocationPress}
        >
          <Ionicons name="location" size={24} color={Colors.primary} />
        </TouchableOpacity>

        {/* 경로 옵션 패널 */}
        {showRouteOptions && selectedDestination && (
          <View style={styles.routeOptionsPanel}>
            <View style={styles.routeInfo}>
              <View style={styles.routeDestination}>
                <Ionicons name="location" size={16} color={Colors.primary} />
                <Text style={styles.destinationName}>{selectedDestination.title}</Text>
              </View>
              {currentRoute && (
                <View style={styles.routeStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={14} color={Colors.success} />
                    <Text style={styles.statText}>
                      {Math.round(currentRoute.duration / 60)}분
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="car" size={14} color={Colors.warning} />
                    <Text style={styles.statText}>
                      {(currentRoute.distance / 1000).toFixed(1)}km
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.routeActions}>
              <TouchableOpacity 
                style={styles.clearRouteButton}
                onPress={handleClearRoute}
              >
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.startNavigationButton}
                onPress={handleStartNavigation}
              >
                <Ionicons name="navigate" size={18} color={Colors.white} />
                <Text style={styles.startNavigationText}>네비게이션 시작</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 주차장 목록 - 하단에 고정 */}
        <View style={styles.parkingSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.parkingListContent}
          >
            {/* 선택된 목적지가 있을 때는 주변 주차장 표시, 없으면 기본 주차장 표시 */}
            {selectedDestination
              ? nearbyParkingLots.map((lot, index) => (
                  <TouchableOpacity
                    key={`nearby_${index}`}
                    style={styles.parkingCard}
                    onPress={() => console.log("주차장 선택:", lot.title)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitle}>
                        <Text style={styles.parkingName}>{lot.title}</Text>
                        <View
                          style={[
                            styles.statusTag,
                            { backgroundColor: Colors.success },
                          ]}
                        >
                          <Text style={styles.statusText}>검색됨</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.parkingAddress}>
                      {lot.roadAddress || lot.address}
                    </Text>

                    <View style={styles.parkingDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons
                          name="location"
                          size={14}
                          color={Colors.primary}
                        />
                        <Text style={styles.detailText}>
                          {Math.round(lot.distance)}m
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons
                          name="business"
                          size={14}
                          color={Colors.warning}
                        />
                        <Text style={styles.detailText}>{lot.category}</Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.priceText}>주차 가능</Text>
                      <Text style={styles.availabilityText}>
                        목적지에서 {Math.round(lot.distance)}m
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              : parkingLots.map((lot) => (
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
                            isFavorite(lot.id)
                              ? Colors.error
                              : Colors.textTertiary
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
                        <Ionicons
                          name="time"
                          size={14}
                          color={Colors.success}
                        />
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
    position: "relative",
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
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
    zIndex: 1000,
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
    paddingBottom: 80,
    gap: Spacing.sm,
  },
  parkingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    width: 280,
    marginRight: Spacing.sm,
    ...Shadows.base,
    opacity: 0.8,
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

  // 검색 결과 스타일
  searchResultsSection: {
    marginBottom: Spacing.xl,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: Typography.base,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  searchResultAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  searchResultCategory: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: "500",
  },
  noResultsText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },

  //map
  map: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  locationButton: {
    position: "absolute",
    left: Spacing.base,
    bottom: "28%",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
    ...Shadows.base,
    zIndex: 100,
  },
  
  // 경로 옵션 패널 스타일
  routeOptionsPanel: {
    position: "absolute",
    top: 140,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.lg,
    zIndex: 500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeInfo: {
    flex: 1,
  },
  routeDestination: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  destinationName: {
    fontSize: Typography.base,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  routeStats: {
    flexDirection: "row",
    gap: Spacing.base,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  routeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  clearRouteButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  startNavigationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  startNavigationText: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: "600",
  },
});
