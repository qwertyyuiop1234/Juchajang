import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { Colors } from '../constants/Styles';

interface ParkingMarkerProps {
  marker: {
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    color?: string;
    available?: number;
    total?: number;
    type?: 'public' | 'private';
    hasEVCharging?: boolean;
    isSelected?: boolean;
  };
  onPress: (marker: any) => void;
}

const ParkingMarker: React.FC<ParkingMarkerProps> = React.memo(({ marker, onPress }) => {
  // useMemo로 핀 이미지 캐싱
  const pinImage = React.useMemo(() => {
    // 1순위: 선택된 상태
    if (marker.isSelected) {
      return require('../assets/icons/pin/selectionPin.png');
    }
    
    // 2순위: 공유주차장
    if (marker.type === 'private') {
      return require('../assets/icons/pin/sharePin.png');
    }
    
    // 3순위: 전기차 충전소
    if (marker.hasEVCharging) {
      return require('../assets/icons/pin/electricityPin.png');
    }
    
    // 기본: 일반 주차장
    return require('../assets/icons/pin/normalPin.png');
  }, [marker.isSelected, marker.type, marker.hasEVCharging]);

  return (
    <NaverMapMarkerOverlay
      key={marker.id}
      latitude={marker.latitude}
      longitude={marker.longitude}
      onTap={() => onPress(marker)}
      anchor={{ x: 0.5, y: 1 }}
      width={marker.isSelected ? 40 : 27}
      height={marker.isSelected ? 53 : 37}
      image={pinImage}
    />
  );
}, (prevProps, nextProps) => {
  // hasEVCharging이 변경되면 리렌더링
  return prevProps.marker.id === nextProps.marker.id &&
         prevProps.marker.hasEVCharging === nextProps.marker.hasEVCharging &&
         prevProps.marker.isSelected === nextProps.marker.isSelected &&
         prevProps.marker.type === nextProps.marker.type;
});

ParkingMarker.displayName = 'ParkingMarker';

export default ParkingMarker;
