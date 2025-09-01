import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';
import { reviewAPI, Review, ReviewStats } from '../services/reviewAPI';
import ReviewCard from '../components/ReviewCard';

export default function ReviewListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const parkingId = params.parkingId as string;
  const parkingName = params.parkingName as string;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'rating' | 'helpful'>('latest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const loadReviews = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [reviewsResponse, statsResponse] = await Promise.all([
        reviewAPI.getReviewsByParkingId(parkingId, 20, 0),
        reviewAPI.getReviewStats(parkingId)
      ]);

      if (reviewsResponse.success && reviewsResponse.data) {
        setReviews(reviewsResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

    } catch (error) {
      console.error('리뷰 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleWriteReview = () => {
    router.push(`/review?parkingId=${parkingId}&parkingName=${parkingName}` as any);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? "star" : "star-outline"}
        size={16}
        color={index < rating ? "#FFD700" : Colors.gray400}
      />
    ));
  };

  const renderRatingFilter = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterRating === null && styles.activeFilterButton]}
          onPress={() => setFilterRating(null)}
        >
          <Text style={[styles.filterText, filterRating === null && styles.activeFilterText]}>
            전체
          </Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[styles.filterButton, filterRating === rating && styles.activeFilterButton]}
            onPress={() => setFilterRating(rating)}
          >
            <View style={styles.filterStarContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[styles.filterText, filterRating === rating && styles.activeFilterText]}>
                {rating}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  useEffect(() => {
    loadReviews();
  }, [parkingId]);

  const filteredReviews = filterRating 
    ? reviews.filter(review => review.rating === filterRating)
    : reviews;

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
          <Text style={styles.headerTitle}>리뷰</Text>
          <TouchableOpacity onPress={handleWriteReview} style={styles.writeButton}>
            <Ionicons name="create" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 주차장 정보 */}
        <View style={styles.parkingInfo}>
          <Text style={styles.parkingName}>{parkingName}</Text>
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.averageRating}>
                <View style={styles.starsContainer}>
                  {renderStars(Math.round(stats.averageRating))}
                </View>
                <Text style={styles.averageRatingText}>{stats.averageRating}</Text>
                <Text style={styles.totalReviewsText}>({stats.totalReviews}개 리뷰)</Text>
              </View>
            </View>
          )}
        </View>

        {/* 필터 */}
        {renderRatingFilter()}

        {/* 리뷰 목록 */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadReviews(true)} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>리뷰를 불러오는 중...</Text>
            </View>
          ) : filteredReviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                {filterRating ? `${filterRating}점 리뷰가 없습니다` : '리뷰가 없습니다'}
              </Text>
              <Text style={styles.emptyDescription}>
                첫 번째 리뷰를 작성해보세요!
              </Text>
              <TouchableOpacity style={styles.writeReviewButton} onPress={handleWriteReview}>
                <Ionicons name="create" size={20} color={Colors.white} />
                <Text style={styles.writeReviewButtonText}>리뷰 작성하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  writeButton: {
    padding: Spacing.sm,
  },
  parkingInfo: {
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  parkingName: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  statsContainer: {
    alignItems: 'center',
  },
  averageRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  averageRatingText: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalReviewsText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  filterContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    marginRight: Spacing.sm,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: Colors.white,
  },
  filterStarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  reviewsList: {
    paddingVertical: Spacing.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: Typography.base,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    ...Shadows.sm,
  },
  writeReviewButtonText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
});
