import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createPersonalParkingLot } from '../services/personalParkingAPI';
import { updateUserProfile } from '../services/userAPI';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';

export default function AddParkingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  
  // 연락처 등록 모달
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  // 주차공간 정보
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerHour, setPricePerHour] = useState('5000');
  
  // 이용 규칙
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  
  // 이용 가능 시간
  const [availableStartTime, setAvailableStartTime] = useState('09:00');
  const [availableEndTime, setAvailableEndTime] = useState('18:00');
  
  // 이용 가능 요일 (0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토)
  const [availableDays, setAvailableDays] = useState([1, 2, 3, 4, 5]); // 기본: 월-금
  
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('로그인 필요', '주차공간 등록을 위해서는 로그인이 필요합니다.');
      return;
    }

    if (!name.trim() || !address.trim()) {
      Alert.alert('입력 오류', '주차공간 이름과 주소는 필수 입력사항입니다.');
      return;
    }

    if (!profile?.phoneNumber) {
      Alert.alert(
        '연락처 필요', 
        '주차공간을 공유하려면 연락처가 등록되어야 합니다. 지금 등록하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '연락처 등록', 
            onPress: () => {
              setPhoneNumber('');
              setShowPhoneModal(true);
            }
          }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      
      const parkingData = {
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
        pricePerHour: parseInt(pricePerHour) || 5000,
        rules: rules.filter(rule => rule.trim().length > 0),
        availableDays,
        availableStartTime,
        availableEndTime,
      };

      await createPersonalParkingLot(parkingData);

      Alert.alert(
        '등록 완료',
        '주차공간이 성공적으로 등록되었습니다!',
        [
          {
            text: '확인',
            onPress: () => {
              router.back();
              // 또는 내 주차공간 관리 화면으로 이동
              // router.push('/my-parking');
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

  const addRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const toggleDay = (day: number) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day].sort());
    }
  };

  const formatPhoneNumber = (text: string) => {
    // 숫자만 추출
    const numbers = text.replace(/[^\d]/g, '');
    
    // 11자리 초과 시 자름
    if (numbers.length > 11) return phoneNumber;
    
    // 자동 하이픈 추가
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }
  };

  const handlePhoneRegistration = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('오류', '연락처를 입력해주세요.');
      return;
    }
    
    // 숫자만 추출하여 검증
    const numbers = phoneNumber.replace(/[^\d]/g, '');
    if (numbers.length !== 11 || !numbers.startsWith('010')) {
      Alert.alert('오류', '올바른 전화번호를 입력해주세요. (010으로 시작하는 11자리)');
      return;
    }
    
    try {
      await updateProfile({ phoneNumber: phoneNumber.trim() });
      setShowPhoneModal(false);
      Alert.alert(
        '등록 완료', 
        '연락처가 성공적으로 등록되었습니다. 이제 주차공간을 등록하실 수 있습니다.',
        [
          {
            text: '확인',
            onPress: () => {
              // 연락처 등록 완료 후 자동으로 주차공간 등록 진행
              handleSubmit();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('오류', error.message || '연락처 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주차공간 등록</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>주차공간 이름 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="예: 우리집 앞 주차공간"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>주소 *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={address}
              onChangeText={setAddress}
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
              value={description}
              onChangeText={setDescription}
              placeholder="주차공간에 대한 간단한 설명을 입력해주세요"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>시간당 요금 (원)</Text>
            <TextInput
              style={styles.input}
              value={pricePerHour}
              onChangeText={setPricePerHour}
              placeholder="5000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* 이용 가능 시간 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 가능 시간</Text>
          
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 가능 요일</Text>
          <View style={styles.daysContainer}>
            {dayNames.map((day, index) => (
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 규칙</Text>
          
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
              <TouchableOpacity
                onPress={() => removeRule(index)}
                style={styles.removeRuleButton}
              >
                <Ionicons name="close-circle" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 등록 버튼 */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? '등록 중...' : '주차공간 등록하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 연락처 등록 모달 */}
      <Modal
        visible={showPhoneModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.phoneModalContent}>
            <View style={styles.phoneModalHeader}>
              <Text style={styles.phoneModalTitle}>연락처 등록</Text>
              <TouchableOpacity
                onPress={() => setShowPhoneModal(false)}
                style={styles.phoneModalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.phoneModalDescription}>
              주차공간을 공유하기 위해 연락처가 필요합니다.{'\n'}
              예약자들이 연락할 수 있도록 전화번호를 입력해주세요.
            </Text>
            
            <View style={styles.phoneInputGroup}>
              <Text style={styles.phoneInputLabel}>연락처</Text>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                placeholder="010-1234-5678"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                maxLength={13}
                autoFocus
              />
            </View>
            
            <View style={styles.phoneModalActions}>
              <TouchableOpacity
                style={styles.phoneModalCancelButton}
                onPress={() => setShowPhoneModal(false)}
              >
                <Text style={styles.phoneModalCancelText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.phoneModalConfirmButton}
                onPress={handlePhoneRegistration}
              >
                <Text style={styles.phoneModalConfirmText}>등록하기</Text>
              </TouchableOpacity>
            </View>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  section: {
    marginVertical: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  inputGroup: {
    marginBottom: Spacing.base,
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
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
  removeRuleButton: {
    padding: Spacing.xs,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginVertical: Spacing.xl,
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
  // 연락처 등록 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    margin: Spacing.base,
    width: '90%',
    maxWidth: 400,
    ...Shadows.lg,
  },
  phoneModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  phoneModalTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  phoneModalCloseButton: {
    padding: Spacing.sm,
  },
  phoneModalDescription: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.sm * 1.5,
    marginBottom: Spacing.xl,
  },
  phoneInputGroup: {
    marginBottom: Spacing.xl,
  },
  phoneInputLabel: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  phoneModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phoneModalCancelButton: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  phoneModalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  phoneModalCancelText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  phoneModalConfirmText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
  },
});