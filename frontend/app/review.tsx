import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';
import { reviewAPI, ReviewRequest } from '../services/reviewAPI';

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const parkingId = params.parkingId as string;
  const parkingName = params.parkingName as string;

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    { id: 'cleanliness', label: '청결도', icon: 'sparkles' },
    { id: 'safety', label: '안전성', icon: 'shield-checkmark' },
    { id: 'accessibility', label: '접근성', icon: 'accessibility' },
    { id: 'price', label: '가격', icon: 'card' },
    { id: 'service', label: '서비스', icon: 'people' },
    { id: 'facility', label: '시설', icon: 'construct' },
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

    if (reviewText.trim().length < 10) {
      Alert.alert('리뷰를 작성해주세요', '최소 10자 이상 작성해주세요.');
      return;
    }

    try {
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
        Alert.alert(
          '리뷰 제출 성공',
          response.message,
          [
            {
              text: '확인',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('리뷰 제출 실패', response.message || '리뷰 제출 중 오류가 발생했습니다.');
      }

    } catch (error) {
      console.error('리뷰 제출 실패:', error);
      Alert.alert('리뷰 제출 실패', '리뷰 제출 중 오류가 발생했습니다.');
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
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategories.includes(category.id) && styles.selectedCategoryButton
                  ]}
                  onPress={() => toggleCategory(category.id)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={selectedCategories.includes(category.id) ? Colors.white : Colors.textSecondary}
                  />
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
              <Text style={styles.tipText}>• 주차 공간의 넓이와 접근성</Text>
              <Text style={styles.tipText}>• 보안과 안전성에 대한 평가</Text>
              <Text style={styles.tipText}>• 요금의 합리성</Text>
              <Text style={styles.tipText}>• 청결도와 관리 상태</Text>
              <Text style={styles.tipText}>• 직원의 서비스 품질</Text>
            </View>
          </View>
        </ScrollView>

        {/* 제출 버튼 */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || reviewText.trim().length < 10) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitReview}
            disabled={rating === 0 || reviewText.trim().length < 10}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.submitButtonText}>리뷰 제출</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 100,
    justifyContent: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: Colors.white,
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
}); 