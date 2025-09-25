import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';
import { reviewAPI, ReviewRequest } from '../services/reviewAPI';
import navigationAPI from '../services/navigationAPI';

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const parkingId = params.parkingId as string;
  const parkingName = params.parkingName as string;

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    // 긍정적 카테고리
    { id: 'price_cheap', label: '💵 요금이 저렴해요', icon: 'card', type: 'positive' },
    { id: 'space_wide', label: '🚗 주차 공간이 넓어요', icon: 'car', type: 'positive' },
    { id: 'congestion_low', label: '✅ 자리가 넉넉해요', icon: 'checkmark-circle', type: 'positive' },
    { id: 'accessibility_good', label: '🚶‍♀️ 목적지와 가까워요', icon: 'walk', type: 'positive' },
    { id: 'safety_good', label: '✨ 밝고 안전해요', icon: 'sunny', type: 'positive' },
    { id: 'convenience_good', label: '🅿️ 입/출차가 편해요', icon: 'arrow-forward', type: 'positive' },
    { id: 'ev_charging', label: '🔌 전기차 충전 가능해요', icon: 'flash', type: 'positive' },
    { id: 'facilities_good', label: '👩‍🦽 편의시설이 잘 돼있어요', icon: 'accessibility', type: 'positive' },
    
    // 부정적 카테고리
    { id: 'price_expensive', label: '💰 요금이 비싸요', icon: 'card', type: 'negative' },
    { id: 'space_narrow', label: '🚗 주차 공간이 좁아요', icon: 'car', type: 'negative' },
    { id: 'congestion_high', label: '🈵 자리가 항상 부족해요', icon: 'close-circle', type: 'negative' },
    { id: 'accessibility_bad', label: '🗺️ 찾아가기 어려워요', icon: 'map', type: 'negative' },
    { id: 'safety_bad', label: '🌙 어둡고 무서워요', icon: 'moon', type: 'negative' },
    { id: 'convenience_bad', label: '🚧 입/출차가 불편해요', icon: 'construct', type: 'negative' },
    { id: 'maintenance_bad', label: '🧹 시설이 낡았어요', icon: 'trash', type: 'negative' },
  ];

  const handleStarPress = (starIndex: number) => {
    setRating(starIndex + 1);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('평점을 선택해주세요', '별점을 매겨주세요.');
      return;
    }

    if (reviewText.trim().length < 2) {
      Alert.alert('리뷰를 작성해주세요', '최소 2자 이상 작성해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const userId = 'user123'; // 실제로는 로그인된 사용자 ID

      const reviewData: ReviewRequest = {
        parkingId: parkingId || '1',
        parkingName: parkingName || '테스트 주차장',
        userId,
        rating,
        reviewText: reviewText.trim(),
        categories: selectedCategories
      };

      // 터미널에 로깅
      reviewAPI.logReviewRequest(reviewData, '리뷰 작성');

      console.log('📝 API 호출 시작...');
      const response = await reviewAPI.createReview(reviewData);
      console.log('📝 API 호출 완료!');
      
      console.log('📝 응답 받음:', response.success);
      console.log('📝 response.message:', response.message);

      if (response.success) {
        // 리뷰 성공 후 상태 선택 모달 표시
        setStatusModalVisible(true);
      } else {
        Alert.alert('리뷰 제출 실패', response.message || '리뷰 제출 중 오류가 발생했습니다.');
      }

    } catch (error) {
      console.error('리뷰 제출 실패:', error);
      Alert.alert('리뷰 제출 실패', '리뷰 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const reportStatus = async (statusName: '여유' | '보통' | '혼잡') => {
    try {
      await navigationAPI.reportParkingStatus(parkingId || '1', statusName);
    } catch (e) {
      console.log('상태 보고 실패 (무시 가능):', e);
    } finally {
      setStatusModalVisible(false);
      Alert.alert('감사합니다!', '제보가 반영되었습니다.');
      router.back();
    }
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return '매우 나쁨';
      case 2: return '나쁨';
      case 3: return '보통';
      case 4: return '좋음';
      case 5: return '매우 좋음';
      default: return '평점을 선택해주세요';
    }
  };

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
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>리뷰 작성</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {/* 주차장 정보 */}
          <View style={styles.parkingInfo}>
            <Text style={styles.parkingName}>{parkingName}</Text>
            <Text style={styles.parkingSubtitle}>이 주차장에 대한 리뷰를 작성해주세요</Text>
          </View>

          {/* 평점 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>전체 평점</Text>
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleStarPress(index)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={index < rating ? "star" : "star-outline"}
                      size={32}
                      color={index < rating ? "#FFD700" : Colors.gray400}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingText}>{getRatingText()}</Text>
            </View>
          </View>

          {/* 카테고리 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>세부 평가</Text>
            <Text style={styles.sectionSubtitle}>해당하는 항목을 선택해주세요 (복수 선택 가능)</Text>
            
            {/* 긍정적 카테고리 */}
            <View style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>👍 좋았던 점</Text>
              <View style={styles.categoriesGrid}>
                {categories.filter(cat => cat.type === 'positive').map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      styles.positiveCategoryButton,
                      selectedCategories.includes(category.id) && styles.selectedPositiveCategoryButton
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedCategories.includes(category.id) && styles.selectedCategoryText
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 부정적 카테고리 */}
            <View style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>👎 아쉬웠던 점</Text>
              <View style={styles.categoriesGrid}>
                {categories.filter(cat => cat.type === 'negative').map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      styles.negativeCategoryButton,
                      selectedCategories.includes(category.id) && styles.selectedNegativeCategoryButton
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedCategories.includes(category.id) && styles.selectedCategoryText
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 리뷰 작성 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>리뷰 작성</Text>
            <Text style={styles.sectionSubtitle}>이 주차장에 대한 경험을 공유해주세요</Text>
            <View style={styles.reviewInputContainer}>
              <TextInput
                style={styles.reviewInput}
                placeholder="주차장 이용 경험을 자세히 작성해주세요..."
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {reviewText.length}/500자
              </Text>
            </View>
          </View>

          {/* 작성 팁 */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 리뷰 작성 팁</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipText}>• 주차 공간의 넓이와 편의성</Text>
              <Text style={styles.tipText}>• 조명과 안전성에 대한 평가</Text>
              <Text style={styles.tipText}>• 요금의 합리성과 가성비</Text>
              <Text style={styles.tipText}>• 목적지까지의 접근성</Text>
              <Text style={styles.tipText}>• 입/출차의 편의성</Text>
              <Text style={styles.tipText}>• 전기차 충전 시설 유무</Text>
              <Text style={styles.tipText}>• 장애인 편의시설 등 특별 시설</Text>
            </View>
          </View>
        </ScrollView>

        {/* 제출 버튼 */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || reviewText.trim().length < 2) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitReview}
            disabled={rating === 0 || reviewText.trim().length < 2}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.submitButtonText}>{submitting ? '제출 중...' : '리뷰 제출'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 상태 선택 모달 */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>현재 주차장 상태는?</Text>
            <View style={styles.statusRow}>
              <TouchableOpacity style={[styles.statusChip, styles.statusEasy]} onPress={() => reportStatus('여유')}>
                <Text style={styles.statusChipText}>여유</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statusChip, styles.statusNormal]} onPress={() => reportStatus('보통')}>
                <Text style={styles.statusChipText}>보통</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statusChip, styles.statusBusy]} onPress={() => reportStatus('혼잡')}>
                <Text style={styles.statusChipText}>혼잡</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  parkingInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.base,
  },
  parkingName: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  parkingSubtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  categorySection: {
    marginBottom: Spacing.lg,
  },
  categorySectionTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positiveCategoryButton: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.success + '20',
  },
  negativeCategoryButton: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.error + '20',
  },
  selectedPositiveCategoryButton: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  selectedNegativeCategoryButton: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  categoryText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: Colors.white,
    fontWeight: '600',
  },
  reviewInputContainer: {
    position: 'relative',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.base,
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
  tipsSection: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  tipsTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  tipsList: {
    gap: Spacing.xs,
  },
  tipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.normal * Typography.sm,
  },
  submitContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  submitButtonText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  statusChip: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  statusChipText: {
    color: Colors.white,
    fontWeight: '600',
  },
  statusEasy: {
    backgroundColor: '#4CAF50',
  },
  statusNormal: {
    backgroundColor: '#FF9800',
  },
  statusBusy: {
    backgroundColor: '#F44336',
  },
}); 