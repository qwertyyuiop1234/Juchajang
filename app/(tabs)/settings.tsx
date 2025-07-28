import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  const settingsSections = [
    {
      id: 'account',
      title: '계정 관리',
      icon: 'person',
      emoji: '👤',
      items: [
        { text: '프로필 설정', emoji: '📝', onPress: () => router.push('/profile-detail' as any) },
        { text: '실명 인증', emoji: '✅' },
        { text: '개인정보 관리', emoji: '🔒' },
      ],
    },
    {
      id: 'payment',
      title: '결제 관리',
      icon: 'card',
      emoji: '💳',
      items: [
        { text: '결제 수단 등록', emoji: '💳' },
        { text: '자동 결제 설정', emoji: '🔄' },
        { text: '정기권 관리', emoji: '🎫' },
      ],
    },
    {
      id: 'sharing',
      title: '개인 공간 공유',
      icon: 'share',
      emoji: '🏠',
      items: [
        { text: '주차공간 등록', emoji: '🚗' },
        { text: '공유 시간 설정', emoji: '⏰' },
        { text: '수익 관리', emoji: '💰' },
      ],
    },
    {
      id: 'notification',
      title: '알림 설정',
      icon: 'notifications',
      emoji: '🔔',
      items: [
        { text: '푸시 알림', emoji: '📱' },
        { text: '예약 알림', emoji: '⏰' },
        { text: '결제 알림', emoji: '💳' },
      ],
    },
    {
      id: 'support',
      title: '고객 지원',
      icon: 'help-circle',
      emoji: '🆘',
      items: [
        { text: '자주 묻는 질문', emoji: '❓' },
        { text: '1:1 문의', emoji: '💬' },
        { text: '앱 버전 정보', emoji: 'ℹ️' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>⚙️</Text>
          </View>
          <Text style={styles.headerTitle}>설정 및 프로필</Text>
          <Text style={styles.headerSubtitle}>
            개인화된 주차 서비스를 위한{'\n'}다양한 설정을 관리합니다 ✨
          </Text>
        </View>

        {/* 설정 섹션들 */}
        {settingsSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuEmoji}>{item.emoji}</Text>
                    <Text style={styles.menuText}>{item.text}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* 앱 정보 */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>🚗 주차장 앱 v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>더 나은 주차 경험을 제공합니다 🎯</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
  },
  headerIcon: {
    marginBottom: 15,
  },
  headerEmoji: {
    fontSize: 48,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuEmoji: {
    fontSize: 16,
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#999',
  },
}); 