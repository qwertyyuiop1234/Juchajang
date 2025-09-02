import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';
import { reviewAPI, Review } from '../services/reviewAPI';
import ReviewCard from '../components/ReviewCard';

export default function MyReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'recent'>('all');

  const userId = 'user123'; // 실제로는 로그인된 사용자 ID

  const loadMyReviews = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await reviewAPI.getReviewsByUserId(userId, 20, 0);

      if (response.success && response.data) {
        setReviews(response.data);
      }

    } catch (error) {
      console.error('내 리뷰 로드 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEditReview = (review: Review) => {
    // 리뷰 수정 페이지로 이동 (향후 구현)
    Alert.alert(
      '리뷰 수정',
      '리뷰 수정 기능은 곧 추가될 예정입니다.',
      [{ text: '확인' }]
    );
  };

  const handleDeleteReview = (review: Review) => {
    Alert.alert(
      '리뷰 삭제',
      '이 리뷰를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await reviewAPI.deleteReview(review.id);
              if (response.success) {
                setReviews(prev => prev.filter(r => r.id !== review.id));
                Alert.alert('삭제 완료', '리뷰가 삭제되었습니다.');
              }
            } catch (error) {
              console.error('리뷰 삭제 실패:', error);
              Alert.alert('삭제 실패', '리뷰 삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const renderReviewActions = (review: Review) => {
    return (
      <View style={styles.reviewActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditReview(review)}
        >
          <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.actionText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteReview(review)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
          <Text style={[styles.actionText, { color: '#FF6B6B' }]}>삭제</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getMyStats = () => {
    if (reviews.length === 0) return null;

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    const recentReviews = reviews.filter(review => {
      const reviewDate = new Date(review.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return reviewDate > thirtyDaysAgo;
    }).length;

    return { totalReviews, averageRating, recentReviews };
  };

  const myStats = getMyStats();
  const filteredByTab = activeTab === 'recent' 
    ? reviews.filter(review => {
        const reviewDate = new Date(review.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return reviewDate > thirtyDaysAgo;
      })
    : reviews;

  useEffect(() => {
    loadMyReviews();
  }, []);

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
          <Text style={styles.headerTitle}>내 리뷰</Text>
          <View style={styles.placeholder} />
        </View>

        {/* 내 리뷰 통계 */}
        {myStats && (
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>내 리뷰 통계</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{myStats.totalReviews}</Text>
                <Text style={styles.statLabel}>총 리뷰</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{myStats.averageRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>평균 평점</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{myStats.recentReviews}</Text>
                <Text style={styles.statLabel}>최근 30일</Text>
              </View>
            </View>
          </View>
        )}

        {/* 탭 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              전체 ({reviews.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
            onPress={() => setActiveTab('recent')}
          >
            <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
              최근 ({myStats?.recentReviews || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 리뷰 목록 */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadMyReviews(true)} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>내 리뷰를 불러오는 중...</Text>
            </View>
          ) : filteredByTab.length > 0 ? (
            <View style={styles.reviewsList}>
              {filteredByTab.map((review) => (
                <View key={review.id} style={styles.myReviewCard}>
                  <ReviewCard
                    review={review}
                    showParkingName={true}
                  />
                  {renderReviewActions(review)}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'recent' ? '최근 작성한 리뷰가 없습니다' : '작성한 리뷰가 없습니다'}
              </Text>
              <Text style={styles.emptyDescription}>
                주차장을 이용하고 리뷰를 작성해보세요!
              </Text>
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
  placeholder: {
    width: 48,
  },
  statsSection: {
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  reviewsList: {
    paddingVertical: Spacing.base,
  },
  myReviewCard: {
    marginBottom: Spacing.sm,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
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
});
