import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Styles';

export default function ProfileScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false);

  // 사용자 정보 상태
  const [userInfo, setUserInfo] = useState({
    name: '홍길동',
    email: 'hong@example.com',
    phoneNumber: '010-1234-5678',
    profileImage: null,
  });

  // 차량 정보 상태
  const [vehicleInfo, setVehicleInfo] = useState({
    carNumber: '12가3456',
    carModel: '현대 아반떼',
    carYear: '2020',
  });

  // 주차공간 등록 모달 상태
  const [showAddParkingModal, setShowAddParkingModal] = useState(false);

  // 주차공간 등록 폼 데이터
  const [parkingFormData, setParkingFormData] = useState({
    name: '',
    address: '',
    description: '',
    pricePerHour: '5000',
  });

  // 이용 가능 시간
  const [availableStartTime, setAvailableStartTime] = useState('09:00');
  const [availableEndTime, setAvailableEndTime] = useState('18:00');

  // 이용 가능 요일 (0=일, 1=월, ..., 6=토)
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // 이용 규칙
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');

  // 로딩 상태
  const [loading, setLoading] = useState(false);

  // 개인 공유 주차장 정보 (예시 데이터)
  const [sharedParkingLots] = useState([
    {
      id: 1,
      name: '우리집 앞 주차공간',
      address: '서울시 강남구 테헤란로 123',
      status: '활성',
      pricePerHour: 5000,
      totalBookings: 15,
      rating: 4.5,
    },
    {
      id: 2,
      name: '회사 근처 주차공간',
      address: '서울시 강남구 역삼동 456',
      status: '비활성',
      pricePerHour: 3000,
      totalBookings: 8,
      rating: 4.2,
    },
  ]);

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

  // 요일 토글
  const toggleDay = (day: number) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day].sort());
    }
  };

  // 규칙 추가/삭제
  const addRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  // 주차공간 등록 제출
  const handleSubmitParking = async () => {
    // 유효성 검사
    if (!parkingFormData.name.trim() || !parkingFormData.address.trim()) {
      Alert.alert('입력 오류', '주차공간 이름과 주소는 필수 입력사항입니다.');
      return;
    }

    if (availableDays.length === 0) {
      Alert.alert('입력 오류', '이용 가능 요일을 최소 1개 이상 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      const parkingData = {
        name: parkingFormData.name.trim(),
        address: parkingFormData.address.trim(),
        description: parkingFormData.description.trim(),
        pricePerHour: parseInt(parkingFormData.pricePerHour) || 5000,
        rules: rules.filter(rule => rule.trim().length > 0),
        availableDays,
        availableStartTime,
        availableEndTime,
      };

      // API 호출 (personalParkingAPI.createPersonalParkingLot)
      // await createPersonalParkingLot(parkingData);

      Alert.alert(
        '등록 완료',
        '주차공간이 성공적으로 등록되었습니다!',
        [
          {
            text: '확인',
            onPress: () => {
              // 폼 초기화
              resetForm();
              setShowAddParkingModal(false);
              // 주차장 목록 새로고침
              // loadMyParkingLots();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('주차공간 등록 실패:', error);
      Alert.alert('등록 실패', error.message || '주차공간 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setParkingFormData({
      name: '',
      address: '',
      description: '',
      pricePerHour: '5000',
    });
    setAvailableStartTime('09:00');
    setAvailableEndTime('18:00');
    setAvailableDays([1, 2, 3, 4, 5]);
    setRules([]);
    setNewRule('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '활성':
        return Colors.success;
      case '비활성':
        return Colors.gray400;
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내정보</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 사용자 프로필 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필 정보</Text>
          <View style={styles.sectionContent}>
            <View style={styles.profileHeader}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={32} color={Colors.white} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userInfo.name}</Text>
                <Text style={styles.userEmail}>{userInfo.email}</Text>
                <Text style={styles.userStatus}>일반 회원</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>연락처</Text>
              <Text style={styles.infoValue}>{userInfo.phoneNumber}</Text>
            </View>
          </View>
        </View>

        {/* 차량 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>차량 정보</Text>
          <View style={styles.sectionContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>차량 번호</Text>
              <TextInput
                style={styles.input}
                value={vehicleInfo.carNumber}
                onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, carNumber: text }))}
                placeholder="12가3456"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>차량 기종</Text>
              <TextInput
                style={styles.input}
                value={vehicleInfo.carModel}
                onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, carModel: text }))}
                placeholder="현대 아반떼"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>연식</Text>
              <TextInput
                style={styles.input}
                value={vehicleInfo.carYear}
                onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, carYear: text }))}
                placeholder="2020"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* 개인 공유 주차장 정보 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>내 공유 주차장</Text>
            <TouchableOpacity
              style={styles.addParkingButton}
              onPress={() => setShowAddParkingModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
              <Text style={styles.addParkingButtonText}>등록</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            {sharedParkingLots.length > 0 ? (
              sharedParkingLots.map((lot) => (
                <View key={lot.id} style={styles.parkingLotCard}>
                  <View style={styles.parkingLotHeader}>
                    <View style={styles.parkingLotInfo}>
                      <Text style={styles.parkingLotName}>{lot.name}</Text>
                      <Text style={styles.parkingLotAddress}>{lot.address}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lot.status) }]}>
                      <Text style={styles.statusText}>{lot.status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.parkingLotDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="cash-outline" size={16} color={Colors.primary} />
                      <Text style={styles.detailText}>시간당 {lot.pricePerHour.toLocaleString()}원</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.detailText}>{lot.rating} ({lot.totalBookings}회 예약)</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>등록된 공유 주차장이 없습니다</Text>
                <Text style={styles.emptySubtext}>
                  주차공간을 등록하여 다른 사용자와 공유해보세요
                </Text>
              </View>
            )}
          </View>
        </View>

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

      {/* 주차공간 등록 모달 */}
      <Modal
        visible={showAddParkingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddParkingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 모달 헤더 */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>주차공간 등록</Text>
              <TouchableOpacity onPress={() => setShowAddParkingModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 기본 정보 */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>기본 정보</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>주차공간 이름 *</Text>
                  <TextInput
                    style={styles.input}
                    value={parkingFormData.name}
                    onChangeText={(text) => setParkingFormData(prev => ({ ...prev, name: text }))}
                    placeholder="예: 우리집 앞 주차공간"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>주소 *</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={parkingFormData.address}
                    onChangeText={(text) => setParkingFormData(prev => ({ ...prev, address: text }))}
                    placeholder="상세 주소를 입력해주세요"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>설명</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={parkingFormData.description}
                    onChangeText={(text) => setParkingFormData(prev => ({ ...prev, description: text }))}
                    placeholder="주차공간에 대한 간단한 설명"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>시간당 요금 (원)</Text>
                  <TextInput
                    style={styles.input}
                    value={parkingFormData.pricePerHour}
                    onChangeText={(text) => setParkingFormData(prev => ({ ...prev, pricePerHour: text }))}
                    placeholder="5000"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* 이용 가능 시간 */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>이용 가능 시간</Text>
                
                <View style={styles.timeRow}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.label}>시작 시간</Text>
                    <TextInput
                      style={styles.input}
                      value={availableStartTime}
                      onChangeText={setAvailableStartTime}
                      placeholder="09:00"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  
                  <Text style={styles.timeSeparator}>~</Text>
                  
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.label}>종료 시간</Text>
                    <TextInput
                      style={styles.input}
                      value={availableEndTime}
                      onChangeText={setAvailableEndTime}
                      placeholder="18:00"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </View>
              </View>

              {/* 이용 가능 요일 */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>이용 가능 요일</Text>
                <View style={styles.daysContainer}>
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        availableDays.includes(index) && styles.dayButtonActive
                      ]}
                      onPress={() => toggleDay(index)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        availableDays.includes(index) && styles.dayButtonTextActive
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 이용 규칙 */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>이용 규칙</Text>
                
                <View style={styles.ruleInputContainer}>
                  <TextInput
                    style={[styles.input, styles.ruleInput]}
                    value={newRule}
                    onChangeText={setNewRule}
                    placeholder="새 규칙 추가"
                    placeholderTextColor={Colors.textTertiary}
                    onSubmitEditing={addRule}
                  />
                  <TouchableOpacity
                    style={styles.addRuleButton}
                    onPress={addRule}
                  >
                    <Ionicons name="add" size={24} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                {rules.map((rule, index) => (
                  <View key={index} style={styles.ruleItem}>
                    <Text style={styles.ruleText}>• {rule}</Text>
                    <TouchableOpacity onPress={() => removeRule(index)}>
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* 등록 버튼 */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmitParking}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? '등록 중...' : '등록하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  editButton: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  infoLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  inputGroup: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  parkingLotCard: {
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  parkingLotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  parkingLotInfo: {
    flex: 1,
  },
  parkingLotName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  parkingLotAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Typography.xs,
    color: Colors.white,
    fontWeight: '500',
  },
  parkingLotDetails: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  // 주차공간 등록 관련 스타일
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  addParkingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addParkingButtonText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.base,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  formSectionTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  timeInputGroup: {
    flex: 1,
  },
  timeSeparator: {
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  ruleInputContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  ruleInput: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  addRuleButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.base,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    padding: Spacing.sm,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.xs,
  },
  ruleText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginTop: Spacing.base,
    ...Shadows.base,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  submitButtonText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.white,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
});
