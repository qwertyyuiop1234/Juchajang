import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Styles';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false);

  const settingsSections = [
    {
      id: 'account',
      title: '계정 관리',
      items: [
        { 
          text: '프로필 설정', 
          icon: 'person-outline',
          onPress: () => router.push('/profile-detail' as any),
          showArrow: true,
        },
        { 
          text: '실명 인증', 
          icon: 'shield-checkmark-outline',
          onPress: () => Alert.alert('실명 인증', '실명 인증 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
        { 
          text: '개인정보 관리', 
          icon: 'lock-closed-outline',
          onPress: () => Alert.alert('개인정보 관리', '개인정보 관리 기능은 곧 구현될 예정입니다.'),
          showArrow: true,
        },
      ],
    },
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
      id: 'parking',
      title: '주차공간 관리',
      items: [
        { 
          text: '개인 주차공간 등록', 
          icon: 'add-circle-outline',
          onPress: () => router.push('/register' as any),
          showArrow: true,
        },
        { 
          text: '등록한 주차공간 관리', 
          icon: 'car-outline',
          onPress: () => Alert.alert('주차공간 관리', '등록한 주차공간 관리 기능은 곧 구현될 예정입니다.'),
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

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말로 로그아웃하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => {
            Alert.alert('로그아웃되었습니다.');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert('계정이 삭제되었습니다.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 사용자 정보 */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color={Colors.white} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>홍길동</Text>
            <Text style={styles.userEmail}>hong@example.com</Text>
            <Text style={styles.userStatus}>일반 회원</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

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

        {/* 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          <View style={styles.sectionContent}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
                </View>
                <Text style={styles.settingText}>푸시 알림</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                thumbColor={notifications ? Colors.primary : Colors.white}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="location-outline" size={20} color={Colors.textSecondary} />
                </View>
                <Text style={styles.settingText}>위치 서비스</Text>
              </View>
              <Switch
                value={locationServices}
                onValueChange={setLocationServices}
                trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                thumbColor={locationServices ? Colors.primary : Colors.white}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="log-in-outline" size={20} color={Colors.textSecondary} />
                </View>
                <Text style={styles.settingText}>자동 로그인</Text>
              </View>
              <Switch
                value={autoLogin}
                onValueChange={setAutoLogin}
                trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                thumbColor={autoLogin ? Colors.primary : Colors.white}
              />
            </View>
          </View>
        </View>

        {/* 계정 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="log-out-outline" size={20} color={Colors.warning} />
                </View>
                <Text style={[styles.settingText, { color: Colors.warning }]}>로그아웃</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </View>
                <Text style={[styles.settingText, { color: Colors.error }]}>계정 삭제</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    ...Shadows.base,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userStatus: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  editButton: {
    padding: Spacing.sm,
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