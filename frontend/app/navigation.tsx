import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapPolylineOverlay,
} from "@mj-studio/react-native-naver-map";
import { navigationAPI, DirectionResponse } from "../services/navigationAPI";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/Styles";
import { Icons } from "../constants/Icon";
import TurnByTurnGuide from "../components/TurnByTurnGuide";

export default function NavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const mapRef = useRef<any>(null);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const routeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [currentRoute, setCurrentRoute] = useState<DirectionResponse | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [currentInstruction, setCurrentInstruction] = useState<string>("경로를 계산하는 중...");
  const [currentGuideStep, setCurrentGuideStep] = useState<any>(null);
  const [nextGuideStep, setNextGuideStep] = useState<any>(null);

  const destination = {
    latitude: parseFloat(params.destinationLat as string || "0"),
    longitude: parseFloat(params.destinationLng as string || "0"),
    name: params.destinationName as string || "목적지",
  };

  const INITIAL_CAMERA = {
    latitude: destination.latitude,
    longitude: destination.longitude,
    zoom: 15,
  };

  useEffect(() => {
    initializeNavigation();
    return cleanup;
  }, []);

  const cleanup = () => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
    }
    if (routeCheckIntervalRef.current) {
      clearInterval(routeCheckIntervalRef.current);
    }
  };

  const initializeNavigation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("위치 권한 필요", "네비게이션을 사용하려면 위치 권한을 허용해 주세요.");
        router.back();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setCurrentLocation(location);

      await calculateRoute(location.coords);
      startLocationTracking();
      setIsLoading(false);
    } catch (error) {
      console.error("네비게이션 초기화 실패:", error);
      Alert.alert("오류", "네비게이션을 시작할 수 없습니다.");
      router.back();
    }
  };

  const calculateRoute = async (startCoords: { latitude: number; longitude: number }) => {
    try {
      const route = await navigationAPI.getDirections({
        start: {
          latitude: startCoords.latitude,
          longitude: startCoords.longitude,
        },
        goal: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        option: "trafast",
      });

      setCurrentRoute(route);
      setRemainingDistance(route.distance);
      setRemainingTime(route.duration);
      setCurrentInstruction("네비게이션을 시작합니다");
      
      // 가이드 단계 설정
      if (route.guide && route.guide.length > 0) {
        setCurrentGuideStep(route.guide[0]);
        setNextGuideStep(route.guide[1] || null);
      }
    } catch (error) {
      console.error("경로 계산 실패:", error);
      Alert.alert("오류", "경로를 찾을 수 없습니다.");
    }
  };

  const startLocationTracking = async () => {
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 1000,
        },
        (newLocation) => {
          setCurrentLocation(newLocation);
          updateNavigationInfo(newLocation);
        }
      );
      locationWatcherRef.current = subscription;

      routeCheckIntervalRef.current = setInterval(() => {
        if (currentLocation && currentRoute) {
          checkRouteDeviation();
        }
      }, 10000);
    } catch (error) {
      console.error("위치 추적 실패:", error);
    }
  };

  const updateNavigationInfo = (location: Location.LocationObject) => {
    if (!currentRoute) return;

    if (mapRef.current) {
      mapRef.current.animateCameraTo({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        zoom: 17,
        bearing: location.coords.heading || 0,
      });
    }

    const distanceToDestination = calculateDistance(
      location.coords,
      { latitude: destination.latitude, longitude: destination.longitude }
    );

    if (distanceToDestination < 50) {
      handleArrival();
    }
  };

  const checkRouteDeviation = async () => {
    if (!currentLocation || !currentRoute) return;

    try {
      const deviationCheck = await navigationAPI.checkRouteDeviation({
        currentLocation: currentLocation.coords,
        path: currentRoute.path,
        threshold: 100,
      });

      if (deviationCheck.isDeviated) {
        Vibration.vibrate(500);
        await handleReroute();
      }
    } catch (error) {
      console.error("경로 이탈 검사 실패:", error);
    }
  };

  const handleReroute = async () => {
    if (!currentLocation) return;

    try {
      const recalculatingMessage = "경로를 재계산하는 중입니다";
      setCurrentInstruction(recalculatingMessage);
      speakInstruction(recalculatingMessage);
      
      const newRoute = await navigationAPI.getReroute({
        currentLocation: currentLocation.coords,
        originalGoal: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        option: "trafast",
      });

      setCurrentRoute(newRoute);
      setRemainingDistance(newRoute.distance);
      setRemainingTime(newRoute.duration);
      
      const newRouteMessage = "새로운 경로로 안내합니다";
      setCurrentInstruction(newRouteMessage);
      speakInstruction(newRouteMessage);
    } catch (error) {
      console.error("경로 재탐색 실패:", error);
    }
  };

  const handleArrival = () => {
    cleanup();
    setIsNavigating(false);
    
    const arrivalMessage = `${destination.name}에 도착했습니다`;
    speakInstruction(arrivalMessage);
    
    Alert.alert(
      "도착 완료",
      arrivalMessage,
      [
        {
          text: "확인",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const calculateDistance = (
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number => {
    const R = 6371e3;
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const speakInstruction = (message: string) => {
    if (isVoiceEnabled) {
      Speech.speak(message, {
        language: "ko",
        pitch: 1.0,
        rate: 0.8,
      });
    }
  };

  const handleStartNavigation = () => {
    setIsNavigating(true);
    const startMessage = "네비게이션을 시작합니다";
    setCurrentInstruction(startMessage);
    speakInstruction(startMessage);
  };

  const handleStopNavigation = () => {
    Alert.alert(
      "네비게이션 종료",
      "네비게이션을 종료하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "종료", 
          onPress: () => {
            cleanup();
            router.back();
          }
        },
      ]
    );
  };

  const toggleVoiceGuidance = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>네비게이션을 준비하는 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <NaverMapView
        ref={mapRef}
        style={styles.map}
        initialCamera={INITIAL_CAMERA}
        mapType="Navi"
        isNightModeEnabled={false}
        isScrollGesturesEnabled={false}
        isZoomGesturesEnabled={false}
        isRotateGesturesEnabled={false}
        isTiltGesturesEnabled={false}
        isShowLocationButton={false}
      >
        {currentLocation && (
          <NaverMapMarkerOverlay
            latitude={currentLocation.coords.latitude}
            longitude={currentLocation.coords.longitude}
            image={Icons.reactLogo}
            width={20}
            height={20}
          />
        )}
        
        <NaverMapMarkerOverlay
          latitude={destination.latitude}
          longitude={destination.longitude}
          image={Icons.reactLogo}
          width={30}
          height={30}
        />

        {currentRoute && currentRoute.polyline && (
          <NaverMapPolylineOverlay
            coords={currentRoute.polyline.map(point => ({
              latitude: point.latitude,
              longitude: point.longitude,
            }))}
            width={8}
            color="#007AFF"
          />
        )}
      </NaverMapView>

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topPanel}>
          <View style={styles.navigationInfo}>
            <Text style={styles.destinationText}>{destination.name}</Text>
            <View style={styles.routeInfo}>
              <Text style={styles.distanceText}>{formatDistance(remainingDistance)}</Text>
              <Text style={styles.timeText}>{formatTime(remainingTime)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleStopNavigation}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <TurnByTurnGuide
          currentStep={currentGuideStep}
          nextStep={nextGuideStep}
          remainingDistance={remainingDistance}
        />

        <View style={styles.bottomPanel}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleVoiceGuidance}
          >
            <Ionicons
              name={isVoiceEnabled ? "volume-high" : "volume-mute"}
              size={24}
              color={isVoiceEnabled ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>

          {!isNavigating ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartNavigation}
            >
              <Text style={styles.startButtonText}>네비게이션 시작</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.rerouteButton}
              onPress={handleReroute}
            >
              <Ionicons name="refresh" size={20} color={Colors.white} />
              <Text style={styles.rerouteButtonText}>재탐색</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.black,
  },
  loadingText: {
    color: Colors.white,
    fontSize: Typography.lg,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: "box-none",
  },
  topPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 0,
  },
  navigationInfo: {
    flex: 1,
  },
  destinationText: {
    color: Colors.white,
    fontSize: Typography.lg,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.base,
  },
  distanceText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: "500",
  },
  timeText: {
    color: Colors.gray300,
    fontSize: Typography.base,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  instructionPanel: {
    backgroundColor: "rgba(0, 122, 255, 0.95)",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  instructionText: {
    color: Colors.white,
    fontSize: Typography.xl,
    fontWeight: "600",
    textAlign: "center",
  },
  nextTurnText: {
    color: Colors.white,
    fontSize: Typography.base,
    marginTop: Spacing.xs,
    opacity: 0.9,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  controlButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: BorderRadius.full,
    padding: Spacing.base,
  },
  startButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    marginLeft: Spacing.base,
    alignItems: "center",
  },
  startButtonText: {
    color: Colors.white,
    fontSize: Typography.lg,
    fontWeight: "600",
  },
  rerouteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    marginLeft: Spacing.base,
    gap: Spacing.sm,
  },
  rerouteButtonText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: "500",
  },
});