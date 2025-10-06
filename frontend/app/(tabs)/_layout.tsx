import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Image } from 'react-native';

import { HapticTab } from '../../components/HapticTab';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 10,
            height: 102, // 85 * 1.2 = 102
            paddingBottom: 24, // 20 * 1.2 = 24
            paddingTop: 10, // 8 * 1.2 = 10
          },
          default: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 10,
            height: 78, // 65 * 1.2 = 78
            paddingBottom: 12, // 10 * 1.2 = 12
            paddingTop: 10, // 8 * 1.2 = 10
          },
        }),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/icons/home-active.png')
                  : require('../../assets/icons/home.png')
              }
              style={{ width: 48, height: 48, marginTop: 15 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내정보',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/icons/profile-active.png')
                  : require('../../assets/icons/profile.png')
              }
              style={{ width: 48, height: 48, marginTop: 15 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: '더보기',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/icons/more-active.png')
                  : require('../../assets/icons/more.png')
              }
              style={{ width: 48, height: 48, marginTop: 15 }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
