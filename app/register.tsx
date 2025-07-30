import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    price: '',
    contactNumber: '',
  });

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const daysOfWeek = [
    { id: 0, label: '일', name: '일요일' },
    { id: 1, label: '월', name: '월요일' },
    { id: 2, label: '화', name: '화요일' },
    { id: 3, label: '수', name: '수요일' },
    { id: 4, label: '목', name: '목요일' },
    { id: 5, label: '금', name: '금요일' },
    { id: 6, label: '토', name: '토요일' },
  ];

  const handleDayToggle = (dayId: number) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.address || !formData.price || selectedDays.length === 0) {
      Alert.alert('입력 오류', '필수 항목을 모두 입력해주세요.');
      return;
    }

    Alert.alert(
      '등록 완료',
      '개인 주차공간이 성공적으로 등록되었습니다.',
      [
        {
          text: '확인',
          onPress: () => {
            // 폼 초기화
            setFormData({
              name: '',
              address: '',
              description: '',
              price: '',
              contactNumber: '',
            });
            setSelectedDays([]);
            setStartTime('09:00');
            setEndTime('18:00');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>주차공간 등록</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>주차공간 이름 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 김씨 개인주차공간"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>주소 *</Text>
            <TextInput
              style={styles.input}
              placeholder="주차공간 주소를 입력하세요"
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>설명</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="주차공간에 대한 설명을 입력하세요"
              multiline
              numberOfLines={3}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>시간당 가격 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 5000"
              keyboardType="numeric"
              value={formData.price}
              onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>연락처</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 010-1234-5678"
              keyboardType="phone-pad"
              value={formData.contactNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contactNumber: text }))}
            />
          </View>
        </View>

        {/* 이용 가능 시간 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 가능 시간</Text>
          
          <View style={styles.timeContainer}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>시작 시간</Text>
              <TextInput
                style={styles.input}
                placeholder="09:00"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.label}>종료 시간</Text>
              <TextInput
                style={styles.input}
                placeholder="18:00"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          <Text style={styles.label}>이용 가능 요일 *</Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.id) && styles.dayButtonActive,
                ]}
                onPress={() => handleDayToggle(day.id)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.id) && styles.dayButtonTextActive,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 이용 규칙 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 규칙</Text>
          <View style={styles.rulesContainer}>
            <Text style={styles.ruleText}>• 정시 입차/출차</Text>
            <Text style={styles.ruleText}>• 주차공간 청결 유지</Text>
            <Text style={styles.ruleText}>• 시끄러운 소음 금지</Text>
            <Text style={styles.ruleText}>• 흡연 금지</Text>
          </View>
        </View>

        {/* 등록 버튼 */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>주차공간 등록하기</Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  timeInput: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dayButtonTextActive: {
    color: Colors.white,
  },
  rulesContainer: {
    marginTop: Spacing.sm,
  },
  ruleText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.base,
  },
  submitButtonText: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.white,
  },
}); 