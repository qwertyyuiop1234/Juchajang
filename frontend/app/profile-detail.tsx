import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

export default function ProfileDetailScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);

  const menuItems = [
    {
      id: 'vehicle',
      title: '내 차량 관리',
      subtitle: '등록된 차량 1대',
      icon: 'car-outline',
      color: '#007AFF',
    },
    {
      id: 'payment',
      title: '결제 수단',
      subtitle: '카드 2개 등록됨',
      icon: 'card-outline',
      color: '#4CAF50',
    },
    {
      id: 'favorites',
      title: '즐겨찾기',
      subtitle: '저장된 주차장 3개',
      icon: 'heart-outline',
      color: '#FF6B6B',
    },
    {
      id: 'shared',
      title: '공유 주차장',
      subtitle: '내 주차장 공유하기',
      icon: 'share-outline',
      color: '#FF9800',
    },
    {
      id: 'reviews',
      title: '내 리뷰',
      subtitle: '작성한 리뷰 5개',
      icon: 'star-outline',
      color: '#FFD700',
    },
    {
      id: 'receipts',
      title: '전자영수증',
      subtitle: '주차 내역 및 영수증',
      icon: 'receipt-outline',
      color: '#9C27B0',
    },
  ];

  const settingsItems = [
    {
      id: 'notifications',
      title: '알림 설정',
      subtitle: '예약 알림, 혼잡도 알림',
      icon: 'notifications-outline',
      type: 'switch',
      value: notificationsEnabled,
      onValueChange: setNotificationsEnabled,
    },
    {
      id: 'location',
      title: '위치 서비스',
      subtitle: '주변 주차장 검색',
      icon: 'location-outline',
      type: 'switch',
      value: locationEnabled,
      onValueChange: setLocationEnabled,
    },
    {
      id: 'privacy',
      title: '개인정보 설정',
      subtitle: '정보 수집 및 이용',
      icon: 'shield-outline',
      type: 'arrow',
    },
    {
      id: 'help',
      title: '고객센터',
      subtitle: '문의 및 도움말',
      icon: 'help-circle-outline',
      type: 'arrow',
    },
    {
      id: 'about',
      title: '앱 정보',
      subtitle: '버전 1.0.0',
      icon: 'information-circle-outline',
      type: 'arrow',
    },
  ];

  const renderMenuItem = (item: any) => (
    <TouchableOpacity key={item.id} style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderSettingItem = (item: any) => (
    <View key={item.id} style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: '#666' + '20' }]}>
          <Ionicons name={item.icon} size={20} color="#666" />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      {item.type === 'switch' ? (
        <Switch
          value={item.value}
          onValueChange={item.onValueChange}
          trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
          thumbColor={item.value ? '#fff' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필 설정</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 프로필 헤더 */}
          <View style={styles.profileHeader}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>김주찾</Text>
              <Text style={styles.profileEmail}>user@example.com</Text>
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>12</Text>
                  <Text style={styles.statLabel}>이용 횟수</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>4.8</Text>
                  <Text style={styles.statLabel}>평점</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>3</Text>
                  <Text style={styles.statLabel}>즐겨찾기</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* 메뉴 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주차 서비스</Text>
            <View style={styles.menuContainer}>
              {menuItems.map(renderMenuItem)}
            </View>
          </View>

          {/* 설정 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>설정</Text>
            <View style={styles.menuContainer}>
              {settingsItems.map(renderSettingItem)}
            </View>
          </View>

          {/* 로그아웃 버튼 */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  profileHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
  editButton: {
    padding: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  menuContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF6B6B',
    marginLeft: 8,
  },
}); 