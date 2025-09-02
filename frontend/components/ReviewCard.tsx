import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';
import { Review } from '../services/reviewAPI';

interface ReviewCardProps {
  review: Review;
  onPress?: () => void;
  showParkingName?: boolean;
}

export default function ReviewCard({ review, onPress, showParkingName = false }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryLabel = (categoryId: string) => {
    const categoryMap: Record<string, string> = {
      'cleanliness': '청결도',
      'safety': '안전성',
      'accessibility': '접근성',
      'price': '가격',
      'service': '서비스',
      'facility': '시설'
    };
    return categoryMap[categoryId] || categoryId;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? "star" : "star-outline"}
        size={14}
        color={index < rating ? "#FFD700" : Colors.gray400}
      />
    ));
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={16} color={Colors.textSecondary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {review.user_id === 'anonymous' ? '익명' : `사용자 ${review.user_id.slice(-4)}`}
            </Text>
            <Text style={styles.reviewDate}>
              {formatDate(review.created_at)}
            </Text>
          </View>
        </View>
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {renderStars(review.rating)}
          </View>
          <Text style={styles.ratingText}>{review.rating}.0</Text>
        </View>
      </View>

      {/* 주차장 이름 (선택적) */}
      {showParkingName && (
        <View style={styles.parkingNameContainer}>
          <Ionicons name="location" size={14} color={Colors.textSecondary} />
          <Text style={styles.parkingName}>{review.parking_name}</Text>
        </View>
      )}

      {/* 리뷰 내용 */}
      <Text style={styles.reviewText} numberOfLines={3}>
        {review.review_text}
      </Text>

      {/* 카테고리 태그 */}
      {review.categories && review.categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          {review.categories.slice(0, 3).map((category, index) => (
            <View key={index} style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {getCategoryLabel(category)}
              </Text>
            </View>
          ))}
          {review.categories.length > 3 && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                +{review.categories.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 더보기 인디케이터 */}
      {onPress && (
        <View style={styles.moreIndicator}>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  parkingNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  parkingName: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  reviewText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.base * 1.4,
    marginBottom: Spacing.sm,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  categoryTag: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  moreIndicator: {
    position: 'absolute',
    top: Spacing.base,
    right: Spacing.base,
  },
});
