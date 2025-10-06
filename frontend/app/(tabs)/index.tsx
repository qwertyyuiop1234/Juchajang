import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Image,
} from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
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
import navigationAPI from "../../services/navigationAPI";
import { externalNavigationService } from "../../services/externalNavigationService";
import { debounce } from "../../utils/debounce";
import ParkingMarker from "../../components/ParkingMarker";
import { featureFlags, isFeatureEnabled } from "../../config/flags";
import { reviewAPI } from "../../services/reviewAPI";
import ParkingRecommendationCard from "../../components/ParkingRecommendationCard";
import { AIRecommendationData } from "../../types/parking";

export default function HomeScreen() {
  // Initial camera
  const INITIAL_CAMERA = {
    latitude: 37.5666102, // 서울 중심부 위도
    longitude: 126.9783881, // 서울 중심부 경도
    zoom: 12, // 줌 레벨
  };
  const router = useRouter();
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [recentSearches] = useState(["강남역", "역삼역", "선릉역", "테헤란로"]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMarkers, setSearchMarkers] = useState<any[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<any>(null);
  const [, setNearbyParkingLots] = useState<any[]>([]);
  const [destinationMarker, setDestinationMarker] = useState<any>(null);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [routePolyline, setRoutePolyline] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  
  // AI 기능 토글 상태 (기본값: true = AI 켜짐)
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  
  // 전기차 충전소 필터 상태 (기본값: false = 자동 로드 안함)
  const [showEVCharging, setShowEVCharging] = useState(false);
  
  // 주차장 마커 관련 상태
  const [allParkingMarkers, setAllParkingMarkers] = useState<any[]>([]);
  const [selectedParkingLot, setSelectedParkingLot] = useState<any>(null);
  const [showParkingDetail, setShowParkingDetail] = useState(false);
  const [currentMapRegion, setCurrentMapRegion] = useState(INITIAL_CAMERA);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedPosition = useRef<{latitude: number, longitude: number} | null>(null);
  
  // AI 추천 주차장 카드 관련 상태
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendationData[]>([]);
  const [showRecommendationCards, setShowRecommendationCards] = useState(false);
  const [selectedRecommendationCard, setSelectedRecommendationCard] = useState<string | null>(null);

  // 주차장 데이터 (실제로는 API에서 받아올 데이터) - 현재 사용하지 않음
  /* const parkingLots: ParkingLot[] = [
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
  ]; */

  // variables for location, errormsg
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [, setErrorMsg] = useState<string | null>(null);
  const [, setMapCamera] = useState(INITIAL_CAMERA);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
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
    // 맵 초기화 준비
    const initializeApp = async () => {
      try {
        // 위치 권한 확인 및 위치 추적 시작
        await startLocationTracking();
        
        // 캐시 초기화 (기능 플래그 확인)
        if (isFeatureEnabled('enableDiskCache')) {
          navigationAPI.initializeCache();
        }
        
        // 맵 렌더링 준비 완료
        setTimeout(() => {
          setIsMapReady(true);
        }, 100);
      } catch (error) {
        console.error('앱 초기화 실패:', error);
        // 에러가 발생해도 맵은 표시
        setIsMapReady(true);
      }
    };

    initializeApp();
    
    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
      // 디바운스 타이머 정리
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, []);

  // 화면이 포커스될 때 전기차 충전 정보 새로고침 - 제거됨 (데이터 전송량 최적화)
  // useFocusEffect(
  //   React.useCallback(() => {
  //     if (allParkingMarkers.length > 0) {
  //       console.log('🔄 메인 화면 포커스: 전기차 충전 정보 새로고침');
  //       // 현재 표시된 마커들의 전기차 충전 정보 업데이트
  //       loadEVChargingInfoBatch(allParkingMarkers, setAllParkingMarkers);
  //     }
  //   }, [allParkingMarkers.length]) // 마커 개수가 변경될 때만 의존성 업데이트
  // );

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

  // 전기차 충전 정보 배치 로드 함수 (API 한도 초과 방지)
  const loadEVChargingInfoBatch = useCallback(async (markers: any[], updateFunc: Function) => {
    try {
      // 20개씩 배치 처리 (속도 개선)
      const batchSize = 20;
      const delay = 300; // 300ms 대기 (속도 개선)
      
      // 동시 요청 수 제한 (3개씩 병렬 처리)
      const maxConcurrent = 3;
      
      for (let i = 0; i < markers.length; i += batchSize) {
        const batch = markers.slice(i, i + batchSize);
        
        // 3개씩 나누어 병렬 처리
        const chunks = [];
        for (let j = 0; j < batch.length; j += maxConcurrent) {
          chunks.push(batch.slice(j, j + maxConcurrent));
        }
        
        const updatedBatch: any[] = [];
        for (const chunk of chunks) {
          const chunkResults = await Promise.all(
            chunk.map(async (marker) => {
            try {
              const features = await reviewAPI.getParkingFeatures(marker.parking_code);
              return { ...marker, hasEVCharging: features.hasEVCharging };
            } catch (error) {
              console.debug(`전기차 충전 정보 로드 실패 (${marker.title}):`, error);
              return marker;
            }
            })
          );
          updatedBatch.push(...chunkResults);
        }
        
        // 마커 상태 업데이트 (전달받은 업데이트 함수 사용)
        updateFunc((prev: any[]) => {
          const updated = prev.map(m => {
            const updatedMarker = updatedBatch.find(u => u.id === m.id);
            return updatedMarker || m;
          });
          return updated;
        });
        
        // 배치 간 대기
        if (i + batchSize < markers.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('전기차 충전 정보 배치 로드 실패:', error);
    }
  }, []);

  // 두 지점 간 거리 계산 (km 단위, Haversine 공식)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 지구 반경 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // 주차장 마커 로드 함수
  const loadParkingMarkersInView = useCallback(async (latitude: number, longitude: number, zoom: number) => {
    try {
      // 마지막 로드 위치와의 거리 계산
      if (lastLoadedPosition.current) {
        const distance = calculateDistance(
          lastLoadedPosition.current.latitude,
          lastLoadedPosition.current.longitude,
          latitude,
          longitude
        );
        
        // 1km 미만 이동 시 재로드 스킵
        if (distance < 1) {
          console.log('이동 거리 짧음, 재로드 스킵');
          return;
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log("주차장 마커 로드:", latitude, longitude, `zoom: ${zoom}`);
      }
      
      const parkingLots = await navigationAPI.getAllParkingLotsInBounds(
        latitude, 
        longitude, 
        2.5, // 2.5km 반경으로 조정
        zoom // 줌레벨 전달
      );
      
      // 기본 마커 생성 (전기차 정보 없이 먼저 표시)
      const allMarkers = parkingLots.map((lot, index) => {
        const lat = parseFloat(lot.lat_wgs84);
        const lng = parseFloat(lot.lng_wgs84);
        
        if (isNaN(lat) || isNaN(lng)) return null;
        
        // 거리 미리 계산 (제곱근 생략으로 더 빠름)
        const distanceSquared = Math.pow(lat - latitude, 2) + Math.pow(lng - longitude, 2);
        
        return {
          id: `parking_${lot.parking_code}_${index}`,
          latitude: lat,
          longitude: lng,
          distanceSquared, // 미리 계산된 거리
          parking_code: lot.parking_code,
          title: lot.parking_name,
          address: lot.addr,
          status: lot.parking_status_name || '정보없음',
          available: lot.available || 0, // 서버에서 계산된 값 사용
          total: lot.capacity || 0,
          color: lot.statusColor || '#9E9E9E', // 서버에서 계산된 색상 사용
          type: 'parking_lot',
          hasEVCharging: false // 기본값, 필터 켰을 때만 업데이트
        };
      }).filter(m => m !== null);

      // 거리순 정렬하여 상위 45개만 선택 (미리 계산된 거리 사용)
      const markers = allMarkers
        .sort((a, b) => a.distanceSquared - b.distanceSquared) // 단순 숫자 비교
        .slice(0, 30); // 상위 30개로 조정
      
      setAllParkingMarkers(markers);
      
      // 로드 성공 후 위치 저장
      lastLoadedPosition.current = { latitude, longitude };
      
      if (isFeatureEnabled('enableDebugMode')) {
        console.log(`주차장 마커 ${markers.length}개 로드 완료`);
      }
      
      // 전기차 필터가 켜져있을 때만 전기차 충전 정보 로드
      if (showEVCharging && markers.length > 0) {
        loadEVChargingInfoBatch(markers, setAllParkingMarkers);
      }
    } catch (error) {
      // AbortError는 무해화 처리 (이미 navigationAPI에서 처리됨)
      if (error instanceof Error && error.name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.debug("주차장 마커 로드 취소됨");
        }
        return;
      }
      console.error("주차장 마커 로드 실패:", error);
      // 심각한 오류가 아닌 경우 빈 배열로 설정
      setAllParkingMarkers([]);
    }
  }, [loadEVChargingInfoBatch]);

  // 디바운스된 주차장 마커 로드 함수
  const debouncedLoadParkingMarkers = useCallback(
    debounce((latitude: number, longitude: number, zoom: number) => {
      loadParkingMarkersInView(latitude, longitude, zoom);
    }, 400), // 400ms 디바운스로 단축 (핀 로드 속도 최적화)
    [loadParkingMarkersInView]
  );

  // 지도 카메라 이동 핸들러
  const handleCameraChange = useCallback((event: any) => {
    const { latitude, longitude, zoom } = event;
    
    // AI가 꺼져있을 때만 주차장 마커 로드
    if (!isAIEnabled) {
      // 줌 레벨 8 이상일 때 주차장 표시 (사용자 요청에 따라 낮춤)
      if (zoom >= 8) {
        setCurrentMapRegion({ latitude, longitude, zoom });
        
        // 기존 타임아웃 취소
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        
        // 디바운스된 로드 함수 호출
        debouncedLoadParkingMarkers(latitude, longitude, zoom);
      } else {
        // 줌 아웃 시 마커 제거
        setAllParkingMarkers([]);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
      }
    } else {
      // AI 켜짐 - 주차장 마커 표시하지 않음
      setAllParkingMarkers([]);
    }
  }, [debouncedLoadParkingMarkers, isAIEnabled]);

  // 주차장 마커 클릭 핸들러
  const handleParkingMarkerPress = (marker: any) => {
    console.log("주차장 마커 클릭:", marker.title);
    setSelectedParkingLot(marker);
    setShowParkingDetail(true);
  };

  // 카드 컴포넌트 이벤트 핸들러
  const handleCardPress = (parkingLot: AIRecommendationData) => {
    console.log('🎯 카드 선택:', parkingLot.parking_name);
    
    // 카드 선택 상태 토글
    if (selectedRecommendationCard === parkingLot.parking_code) {
      setSelectedRecommendationCard(null); // 선택 해제
    } else {
      setSelectedRecommendationCard(parkingLot.parking_code); // 선택
    }
    
    // 카드 선택 시 해당 주차장으로 지도 이동
    moveToLocation(parkingLot.coordinates[0], parkingLot.coordinates[1], 16);
  };

  // 주차장 이름 클릭 시 상세 페이지로 이동
  const handleNamePress = (parkingLot: AIRecommendationData) => {
    console.log('📄 주차장 상세 페이지로 이동:', parkingLot.parking_name);
    router.push(`/parking-detail?id=${parkingLot.parking_code}` as any);
  };

  const handleNavigationPress = async (parkingLot: AIRecommendationData) => {
    try {
      console.log('🧭 길찾기 시작:', parkingLot.parking_name);
      
      // 현재 위치와 주차장 위치로 네이버 지도 외부 앱 연결
      const currentLocation = await Location.getCurrentPositionAsync({});
      const currentCoords = [currentLocation.coords.latitude, currentLocation.coords.longitude];
      
      await externalNavigationService.navigateWithApp(
        'naver',
        {
          latitude: parkingLot.coordinates[0],
          longitude: parkingLot.coordinates[1],
          name: parkingLot.parking_name
        }
      );
    } catch (error) {
      console.error('❌ 길찾기 실패:', error);
      Alert.alert('오류', '길찾기를 시작할 수 없습니다.');
    }
  };

  // 메모이제이션된 마커
  const memoizedParkingMarkers = useMemo(() => {
    // AI가 꺼져있을 때만 마커 표시
    if (!isAIEnabled) {
      return allParkingMarkers.map((marker) => (
        <ParkingMarker
          key={marker.id}
          marker={{
            ...marker,
            isSelected: selectedMarkerId === marker.id,
            hasEVCharging: marker.hasEVCharging || false,
            type: marker.type === 'private' ? 'private' : 'public'
          }}
          onPress={(m) => {
            setSelectedMarkerId(m.id);
            handleParkingMarkerPress(m);
          }}
        />
      ));
    }
    return []; // AI 켜짐 - 빈 배열 반환
  }, [allParkingMarkers, handleParkingMarkerPress, isAIEnabled, selectedMarkerId]);

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

      // 경로 계산 제거 - 목적지 핀만 표시
      // await calculateRouteToDestination(result);

      try {
        // AI 주차장 추천과 거리순 추천을 동시에 요청
        console.log("🤖 AI 주차장 추천 요청 중...", result.mapy, result.mapx);
        console.log(
          "📍 거리순 주차장 추천 요청 중...",
          result.mapy,
          result.mapx
        );
        console.log("🔍 요청 파라미터:", {
          lat: result.mapy,
          lng: result.mapx,
          num: 3,
        });

        // AI 추천 호출
        const aiRecommendation = await navigationAPI.getAIParkingRecommendations(
          result.mapy,
          result.mapx,
          5 // 상위 5개 추천
        );

        // 결과 처리
        const aiResult = aiRecommendation;

        console.log("🎯 AI 추천 결과:", aiResult);
        console.log("🎯 AI 추천 성공 여부:", aiResult?.success);
        console.log("🎯 AI 추천 데이터 길이:", aiResult?.data?.length);

        if (!aiResult?.success) {
          console.error("❌ AI 추천 실패:", aiResult);
        }

        // AI 추천 로그 출력
        if (aiResult?.success) {
          console.log("🤖 AI 추천 결과:");
          aiResult.data.forEach((lot: any, index: number) => {
            console.log(
              `  ${index + 1}. ${lot.parking_name} - ${
                lot.distance_km
              }km (점수: ${lot.total_score?.toFixed(1)})`
            );
          });
        }

        // AI 추천 결과 처리 및 카드 상태 업데이트
        let allParkingLots: any[] = [];
        let allMarkers: any[] = [];
        
        if (aiResult?.success && aiResult.data && aiResult.data.length > 0) {
          // AI 추천 데이터를 카드 컴포넌트용으로 저장 (타입 호환성 확보)
          const compatibleData: AIRecommendationData[] = aiResult.data.map((lot: any) => ({
            parking_code: lot.parking_code,
            parking_name: lot.parking_name,
            addr: lot.addr,
            coordinates: lot.coordinates,
            predicted_available: lot.predicted_available,
            congestion_level: lot.congestion_level,
            congestion_rate: lot.congestion_rate,
            distance_km: lot.distance_km,
            total_score: lot.total_score,
            distance_score: lot.distance_score || lot.total_score, // fallback
            tel: lot.tel,
            pay_yn_name: lot.pay_yn_name,
            weekday_begin: lot.weekday_begin,
            weekday_end: lot.weekday_end,
            price_rates: lot.price_rates,
            average_rating: lot.average_rating || 0,
            total_reviews: lot.total_reviews || 0,
            capacity: lot.capacity || 0,
            cur_parking: lot.cur_parking || 0,
            available_spaces: lot.available_spaces || 0
          }));
          
          setAiRecommendations(compatibleData);
          setShowRecommendationCards(true);
          
          allParkingLots = aiResult.data.map((lot: any) => ({
            title: lot.parking_name,
            address: lot.addr,
            roadAddress: lot.addr,
            mapy: lot.coordinates[0], // 위도
            mapx: lot.coordinates[1], // 경도
            distance: Math.round(lot.distance_km * 1000), // km를 m로 변환
            category: "AI 추천 주차장",
            predicted_available: lot.predicted_available,
            congestion_level: lot.congestion_level,
            congestion_rate: lot.congestion_rate,
            total_score: lot.total_score,
            parking_code: lot.parking_code,
            tel: lot.tel,
            pay_yn_name: lot.pay_yn_name,
            recommendation_type: "ai",
          }));
        } else {
          // AI 추천 실패 시 카드 숨기기
          setShowRecommendationCards(false);
          setAiRecommendations([]);
        }

        // 마커 생성 - 고유 ID와 위치 정보 보장
        const timestamp = Date.now();
        
        if (allParkingLots.length > 0) {
          const aiMarkers = allParkingLots.map((lot: any, index: number) => {
            // 좌표 유효성 검사
            const latitude = parseFloat(lot.mapy);
            const longitude = parseFloat(lot.mapx);
            
            if (isNaN(latitude) || isNaN(longitude)) {
              console.warn(`⚠️ 잘못된 좌표 - ${lot.title}: lat=${lot.mapy}, lng=${lot.mapx}`);
              return null;
            }
            
            return {
              id: `ai_parking_${timestamp}_${index}_${lot.parking_code}`,
              latitude: latitude,
              longitude: longitude,
              title: lot.title,
              address: lot.address,
              distance: lot.distance,
              type: "ai_parking",
              congestion_level: lot.congestion_level,
              predicted_available: lot.predicted_available,
              color: "#007AFF", // AI 추천은 파란색
              recommendation_type: "ai",
              parking_code: lot.parking_code,
            };
          }).filter(marker => marker !== null); // null 제거

          console.log(`🤖 AI 마커 생성: ${aiMarkers.length}개`, aiMarkers.map(m => ({ 
            id: m.id, 
            title: m.title, 
            lat: m.latitude, 
            lng: m.longitude,
            type: m.type 
          })));

          allMarkers = [...aiMarkers];
        }


        console.log("🎯 전체 주차장 데이터 설정:", allParkingLots);
        console.log("🎯 전체 마커 설정:", allMarkers);
        setNearbyParkingLots(allParkingLots);
        setSearchMarkers(allMarkers);
        
        // 검색 결과 마커에도 전기차 충전 정보 로드
        if (allMarkers.length > 0) {
          console.log(`📋 검색 결과 마커 전기차 충전 정보 배치 로드 시작 (총 ${allMarkers.length}개)`);
          loadEVChargingInfoBatch(allMarkers, setSearchMarkers);
        }

        // 목적지와 주차장들이 모두 보이도록 지도 범위 조정
        if (allMarkers.length > 0) {
          const allCoords = [
            { latitude: result.mapy, longitude: result.mapx }, // 목적지
            ...allMarkers.map((marker: any) => ({
              latitude: marker.latitude,
              longitude: marker.longitude,
            })),
          ];

          // 최소/최대 좌표 계산
          const minLat = Math.min(...allCoords.map((c) => c.latitude));
          const maxLat = Math.max(...allCoords.map((c) => c.latitude));
          const minLng = Math.min(...allCoords.map((c) => c.longitude));
          const maxLng = Math.max(...allCoords.map((c) => c.longitude));

          // 중심점 계산
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;

          console.log("🗺️ 지도 중심 조정:", { centerLat, centerLng });
          moveToLocation(centerLat, centerLng, 13); // 조금 더 줌 아웃
        } else {
          // 추천 실패 시 빈 배열 설정
          console.log("⚠️ 추천 실패, 주차장 목록 숨김");
          setNearbyParkingLots([]);
          setSearchMarkers([]);
        }
      } catch (apiError) {
        console.error("AI 추천 API 호출 실패:", apiError);
        // API 실패 시 빈 배열 설정
        setNearbyParkingLots([]);
        setSearchMarkers([]);
      }

      setIsSearchModalVisible(false);
      setSearchText(result.title);

      // 경로 옵션 표시 제거 - 목적지 핀만 표시
      // setShowRouteOptions(true);
    } catch (error) {
      console.error("주변 주차장 검색 에러:", error);
      Alert.alert("오류", "주변 주차장을 찾는 중 오류가 발생했습니다.");
    }
  };

  const handleVoiceSearch = () => {
    console.log("음성 검색 시작");
  };

  // AI 토글 핸들러
  const handleAIToggle = () => {
    const newState = !isAIEnabled;
    setIsAIEnabled(newState);
    
    // 사용자에게 피드백 제공
    if (newState) {
      // AI 켜짐
      Alert.alert('AI 모드 활성화', '주차장 마커가 숨겨집니다.');
    } else {
      // AI 꺼짐
      Alert.alert('일반 모드 활성화', '모든 주차장 마커가 표시됩니다.');
    }
  };

  // 전기차 충전소 필터 토글 핸들러
  const handleEVToggle = async () => {
    const newState = !showEVCharging;
    setShowEVCharging(newState);
    
    if (newState) {
      // 전기차 필터 켜짐 - 현재 마커들의 전기차 충전 정보 로드
      if (allParkingMarkers.length > 0) {
        console.log('⚡ 전기차 필터 활성화: 충전 정보 로드 시작');
        await loadEVChargingInfoBatch(allParkingMarkers, setAllParkingMarkers);
        Alert.alert('전기차 충전소 필터', '전기차 충전 가능한 주차장이 표시됩니다.');
      } else {
        Alert.alert('전기차 충전소 필터', '주차장 마커가 없습니다. 지도를 이동해주세요.');
      }
    } else {
      // 전기차 필터 꺼짐 - 모든 마커의 전기차 정보 초기화
      console.log('⚡ 전기차 필터 비활성화: 충전 정보 초기화');
      setAllParkingMarkers(prev => 
        prev.map(marker => ({ ...marker, hasEVCharging: false }))
      );
      Alert.alert('전기차 충전소 필터', '필터가 해제되었습니다.');
    }
  };

  // 목적지까지 경로 계산 함수
  const calculateRouteToDestination = async (destination: any) => {
    try {
      if (!location) {
        Alert.alert("오류", "현재 위치를 찾을 수 없습니다.");
        return;
      }

      console.log("🗺️ 경로 계산 시작:", {
        start: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        goal: { latitude: destination.mapy, longitude: destination.mapx },
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
          if (
            point.longitude &&
            Array.isArray(point.longitude) &&
            point.longitude.length >= 2
          ) {
            return {
              longitude: point.longitude[0],
              latitude: point.longitude[1], // 실제로는 첫 번째가 경도, 두 번째가 위도
            };
          }
          // 이미 올바른 구조인 경우
          return point;
        });

        setRoutePolyline(convertedPolyline);
        console.log(
          "📋 폴리라인 변환 완료:",
          convertedPolyline.length,
          "개 포인트"
        );
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
        console.log(
          "📋 path에서 폴리라인 생성 완료:",
          pathPolyline.length,
          "개 포인트"
        );
      }
    } catch (error) {
      console.error("❌ 경로 계산 전체 실패:", error);
      Alert.alert("오류", "경로를 계산할 수 없습니다.");
    }
  };

  // 네비게이션 시작 함수
  const handleStartNavigation = async () => {
    if (!selectedDestination || !currentRoute) {
      Alert.alert("오류", "대상지와 경로 정보가 필요합니다.");
      return;
    }

    console.log('선택된 목적지 전체:', selectedDestination);
    console.log('원본 좌표:', { mapy: selectedDestination.mapy, mapx: selectedDestination.mapx });
    console.log('원본 좌표 타입:', typeof selectedDestination.mapy, typeof selectedDestination.mapx);
    
    // 네이버 API 좌표 처리
    let latitude, longitude;
    
    // 좌표값이 정수형 큰 값인지 확인 (10^7 단위)
    if (selectedDestination.mapy > 1000000) {
      latitude = parseFloat(selectedDestination.mapy) / 10000000;
      longitude = parseFloat(selectedDestination.mapx) / 10000000;
      console.log('좌표를 10^7으로 나누어 변환');
    } else {
      latitude = parseFloat(selectedDestination.mapy);
      longitude = parseFloat(selectedDestination.mapx);
      console.log('좌표를 그대로 사용');
    }
    
    console.log('최종 변환된 좌표:', { latitude, longitude });
    
    const destination = {
      latitude,
      longitude,
      name: selectedDestination.title,
      address: selectedDestination.address || selectedDestination.roadAddress
    };

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
          onPress: () => router.push(
            `/navigation?destinationLat=${selectedDestination.mapy}&destinationLng=${
              selectedDestination.mapx
            }&destinationName=${encodeURIComponent(selectedDestination.title)}` as any
          )
        },
        {
          text: '취소',
          style: 'cancel'
        }
      ]
    );
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

  // 주차장 마커 클릭 핸들러
  const handleParkingMarkerClick = async (marker: any) => {
    try {
      console.log("주차장 마커 클릭:", marker.title);

      // 현재 위치 확인
      if (!location) {
        Alert.alert("위치 오류", "현재 위치를 확인할 수 없습니다. 위치 서비스를 활성화해주세요.");
        return;
      }

      // 주차장을 새로운 목적지로 설정
      const parkingDestination = {
        title: marker.title,
        address: marker.address || `위도: ${marker.latitude}, 경도: ${marker.longitude}`,
        category: "AI 추천 주차장",
        roadAddress: marker.address || "",
        mapy: marker.latitude,
        mapx: marker.longitude,
      };

      setSelectedDestination(parkingDestination);

      // 목적지 마커 업데이트 (주차장으로)
      const newDestinationMarker = {
        id: `destination_${Date.now()}`,
        latitude: marker.latitude,
        longitude: marker.longitude,
        title: marker.title,
        address: marker.address || "",
        type: "destination",
      };
      setDestinationMarker(newDestinationMarker);

      // 현재 위치에서 주차장으로의 경로 계산
      console.log("경로 계산 시작:", {
        start: `${location.coords.latitude}, ${location.coords.longitude}`,
        goal: `${marker.latitude}, ${marker.longitude}`,
      });

      const routeData = await navigationAPI.getDirections({
        start: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        goal: {
          latitude: marker.latitude,
          longitude: marker.longitude,
        },
        option: "trafast",
      });

      setCurrentRoute(routeData);
      setRoutePolyline(routeData.polyline || []);

      // 경로가 모두 보이도록 지도 범위 조정
      const allCoords = [
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: marker.latitude, longitude: marker.longitude },
        ...(routeData.polyline || []),
      ];

      const latitudes = allCoords.map(coord => coord.latitude);
      const longitudes = allCoords.map(coord => coord.longitude);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      moveToLocation(centerLat, centerLng, 13);

      console.log("✅ 주차장 경로 계산 완료");

    } catch (error) {
      console.error("주차장 마커 클릭 처리 오류:", error);
      Alert.alert("오류", "해당 주차장으로의 경로를 찾을 수 없습니다.");
    }
  };

  // 초기 로드: AI 상태에 따라 주차장 마커 로드
  useEffect(() => {
    // AI가 꺼져있을 때만 주차장 마커 로드
    if (!isAIEnabled) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            loadParkingMarkersInView(
              location.coords.latitude, 
              location.coords.longitude,
              INITIAL_CAMERA.zoom
            );
          } else {
            // 권한 없으면 기본 위치로 로드
            loadParkingMarkersInView(
              INITIAL_CAMERA.latitude, 
              INITIAL_CAMERA.longitude,
              INITIAL_CAMERA.zoom
            );
          }
        } catch (error) {
          console.error("초기 주차장 로드 실패:", error);
        }
      })();
    } else {
      // AI 켜짐 - 주차장 마커 제거
      setAllParkingMarkers([]);
    }
  }, [isAIEnabled]);

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
      {isMapReady ? (
        <NaverMapView
          ref={mapRef}
          style={styles.map}
          initialCamera={INITIAL_CAMERA}
          onCameraChanged={(event) => {
            setZoom(event.zoom ?? 15); // 카메라 줌 레벨 업데이트
            handleCameraChange(event); // 주차장 마커 로드
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
            width={zoom * 3} // 줌 비율에 맞춘 크기
            height={zoom * 3}
          />
        )}

        {/* 목적지 마커 */}
        {destinationMarker && (
          <NaverMapMarkerOverlay
            latitude={destinationMarker.latitude}
            longitude={destinationMarker.longitude}
            width={33}
            height={43}
            anchor={{ x: 0.5, y: 1 }}
            image={require('../../assets/icons/pin/destinationPin.png')}
          />
        )}

        {/* 검색 결과 마커들 (주차장) */}
        {searchMarkers.map((marker, index) => {
          // 좌표 유효성 재검사
          if (!marker.latitude || !marker.longitude || 
              isNaN(marker.latitude) || isNaN(marker.longitude)) {
            console.warn(`⚠️ 마커 렌더링 스킵 - 잘못된 좌표: ${marker.title}`);
            return null;
          }

          // AI 추천 카드에서 선택된 주차장인지 확인
          const isSelectedFromCard = selectedRecommendationCard === marker.parking_code;

          return (
            <ParkingMarker
              key={marker.id}
              marker={{
                ...marker,
                isSelected: selectedMarkerId === marker.id || isSelectedFromCard,
                hasEVCharging: marker.hasEVCharging || false,
                type: marker.type === 'private' ? 'private' : 'public'
              }}
              onPress={(m) => {
                setSelectedMarkerId(m.id);
                handleParkingMarkerClick(m);
              }}
            />
          );
        }).filter(component => component !== null)}

        {/* 주차장 마커들 */}
        {memoizedParkingMarkers}

        {/* 경로 폴리라인 - 제거됨 (목적지 핀만 표시) */}
      </NaverMapView>
      ) : (
        <View style={[styles.map, { backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: Colors.textSecondary }}>지도를 불러오는 중...</Text>
        </View>
      )}

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

        {/* AI 토글 버튼 */}
        <TouchableOpacity
          style={styles.aiToggleButton}
          onPress={handleAIToggle}
        >
          <Image
            source={
              isAIEnabled
                ? require('../../assets/icons/ai-active.png')
                : require('../../assets/icons/ai.png')
            }
            style={{ width: 55, height: 55 }}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* 전기차 충전소 필터 토글 버튼 */}
        <TouchableOpacity
          style={styles.evToggleButton}
          onPress={handleEVToggle}
        >
          <View style={[
            styles.evToggleCircle,
            showEVCharging && styles.evToggleActive
          ]}>
            <Ionicons 
              name="flash" 
              size={24} 
              color={showEVCharging ? Colors.white : Colors.textSecondary} 
            />
          </View>
        </TouchableOpacity>

        {/* 현재 위치 버튼 */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleLocationPress}
        >
          <Ionicons name="location" size={24} color={Colors.primary} />
        </TouchableOpacity>

        {/* 경로 옵션 패널 - 제거됨 (목적지 핀만 표시) */}

      </SafeAreaView>

      {/* AI 추천 주차장 카드 목록 */}
            {showRecommendationCards && aiRecommendations.length > 0 && (
              <ParkingRecommendationCard
                parkingLots={aiRecommendations}
                onCardPress={handleCardPress}
                onNavigationPress={handleNavigationPress}
                onNamePress={handleNamePress}
                selectedCardId={selectedRecommendationCard}
                onSelectedCardChange={setSelectedRecommendationCard}
              />
            )}

      {/* 주차장 상세 하단 모달 */}
      {showParkingDetail && selectedParkingLot && (
        <View style={styles.parkingDetailModal}>
          <View style={styles.parkingDetailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.parkingDetailTitle}>
                {selectedParkingLot.title}
              </Text>
              <Text style={styles.parkingDetailAddress}>
                {selectedParkingLot.address}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowParkingDetail(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.parkingDetailInfo}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: selectedParkingLot.color }]} />
              <Text style={styles.parkingStatusText}>{selectedParkingLot.status}</Text>
            </View>
            <Text style={styles.parkingAvailabilityText}>
              {selectedParkingLot.available}/{selectedParkingLot.total} 대 이용가능
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => {
              setShowParkingDetail(false);
              router.push(`/parking-detail?id=${selectedParkingLot.parking_code}` as any);
            }}
          >
            <Text style={styles.detailButtonText}>상세 정보 보기</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}
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
  aiToggleButton: {
    position: "absolute",
    top: 150, // 검색창 아래 더 내림
    left: Spacing.base,
    zIndex: 100,
  },
  evToggleButton: {
    position: "absolute",
    top: 220, // AI 토글 버튼 아래
    left: Spacing.base,
    zIndex: 100,
  },
  evToggleCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.base,
    borderWidth: 2,
    borderColor: Colors.gray300,
  },
  evToggleActive: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  aiToggleCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.base,
    borderWidth: 2,
    borderColor: Colors.gray300,
  },
  aiToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  aiToggleText: {
    fontSize: Typography.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  aiToggleTextActive: {
    color: Colors.white,
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
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  startNavigationText: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: "600",
  },


  // 말풍선 마커 스타일
  markerBubble: {
    borderRadius: BorderRadius.lg,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.7,
    paddingVertical: 3,
    ...Shadows.lg,
  },
  markerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    color: Colors.black,
  },
  markerTitle: {
    fontSize: Typography.xs,
    fontWeight: "600",
    color: Colors.white,
    textAlign: "center",
    marginBottom: 2,
  },
  markerType: {
    fontSize: Typography.xs - 1,
    color: Colors.white,
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 1,
  },
  markerAvailable: {
    fontSize: Typography.xs - 1,
    color: Colors.white,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 1,
  },
  markerDistance: {
    fontSize: Typography.xs - 1,
    color: Colors.white,
    textAlign: "center",
    opacity: 0.9,
  },
  markerTail: {
    position: "absolute",
    bottom: -18,
    left: "50%",
    marginLeft: -18,
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderTopWidth: 18,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    // borderTopColor will be set dynamically in component
  },

  // 주차장 상세 모달 스타일
  parkingDetailModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...Shadows.lg,
  },
  parkingDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  parkingDetailTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    marginBottom: 4,
  },
  parkingDetailAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  parkingDetailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  parkingStatusText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  parkingAvailabilityText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 12,
  },
  detailButtonText: {
    fontSize: Typography.base,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
});
