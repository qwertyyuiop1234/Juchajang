import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Styles';

export default function MoreScreen() {
  const router = useRouter();

  const settingsSections = [
    {
      id: 'payment',
      title: '결제 관리',
      items: [
        { 
          text: '결제 수단 관리', 
          icon: 'card-outline',
          onPress: () => Alert.alert('결제 수단 관리', '결제 수단 관리 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
        { 
          text: '결제 내역', 
          icon: 'receipt-outline',
          onPress: () => Alert.alert('결제 내역', '결제 내역 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
        { 
          text: '자동 결제 설정', 
          icon: 'refresh-outline',
          onPress: () => Alert.alert('자동 결제 설정', '자동 결제 설정 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
      ],
    },
    {
      id: 'privacy',
      title: '개인 공간 공유',
      items: [
        { 
          text: '위치 정보 공유', 
          icon: 'location-outline',
          onPress: () => Alert.alert('위치 정보 공유', '위치 정보 공유 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
        { 
          text: '주차 기록 공유', 
          icon: 'share-social-outline',
          onPress: () => Alert.alert('주차 기록 공유', '주차 기록 공유 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
      ],
    },
    {
      id: 'support',
      title: '고객 지원',
      items: [
        { 
          text: '고객센터', 
          icon: 'call-outline',
          onPress: () => Alert.alert('고객센터', '고객센터 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
        { 
          text: '자주 묻는 질문', 
          icon: 'help-circle-outline',
          onPress: () => Alert.alert('자주 묻는 질문', '자주 묻는 질문 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
        { 
          text: '앱 버전', 
          icon: 'information-circle-outline',
          onPress: () => Alert.alert('앱 버전', '현재 버전: 1.0.0'),
          showArrow: false,
          value: '1.0.0',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더보기</Text>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 설정 섹션들 */}
        {settingsSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.settingItem}
                  onPress={item.onPress}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                      <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.settingText}>{item.text}</Text>
                  </View>
                  <View style={styles.settingRight}>
                    {item.value && (
                      <Text style={styles.settingValue}>{item.value}</Text>
                    )}
                    {item.showArrow && (
                      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* 앱 정보 */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>주찾앙</Text>
          <Text style={styles.appVersion}>버전 1.0.0</Text>
          <Text style={styles.appDescription}>
            주차장 찾기와 예약을 한 번에
          </Text>
        </View>
      </ScrollView>
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
  helpButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  settingText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    marginTop: Spacing.base,
  },
  appName: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  appVersion: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  appDescription: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.normal * Typography.base,
  },
});
