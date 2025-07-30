import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites } from '../../contexts/FavoritesContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Styles';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, removeFavorite, isLoading } = useFavorites();

  const handleRemoveFavorite = (id: number, name: string) => {
    Alert.alert(
      '즐겨찾기 삭제',
      `"${name}"을(를) 즐겨찾기에서 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            removeFavorite(id);
            Alert.alert('삭제되었습니다.');
          },
        },
      ]
    );
  };

  const navigateToDetail = (id: number) => {
    router.push(`/parking-detail?id=${id}` as any);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color={Colors.primary} />
          <Text style={styles.loadingText}>즐겨찾기를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>즐겨찾기</Text>
        <TouchableOpacity style={styles.sortButton}>
          <Ionicons name="funnel-outline" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 즐겨찾기 목록 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {favorites.length > 0 ? (
          favorites.map((parking) => (
            <View key={parking.id} style={styles.favoriteCard}>
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => navigateToDetail(parking.id)}
              >
                <View style={styles.parkingInfo}>
                  <View style={styles.parkingHeader}>
                    <Text style={styles.parkingName}>{parking.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: parking.statusColor }]}>
                      <Text style={styles.statusText}>{parking.status}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.parkingAddress}>{parking.address}</Text>
                  
                  <View style={styles.parkingDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="location" size={14} color={Colors.primary} />
                      <Text style={styles.detailText}>{parking.distance}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time" size={14} color={Colors.success} />
                      <Text style={styles.detailText}>{parking.time}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.detailText}>{parking.rating}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.parkingFooter}>
                    <Text style={styles.priceText}>{parking.price}</Text>
                    <Text style={styles.availabilityText}>
                      {parking.available}자리 / {parking.total}자리
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigateToDetail(parking.id)}
                >
                  <Ionicons name="information-circle" size={16} color={Colors.info} />
                  <Text style={[styles.actionButtonText, { color: Colors.info }]}>
                    상세보기
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // 예약 기능 (향후 구현)
                    Alert.alert('예약 기능', '예약 기능은 곧 구현될 예정입니다.');
                  }}
                >
                  <Ionicons name="calendar" size={16} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>예약하기</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRemoveFavorite(parking.id, parking.name)}
                >
                  <Ionicons name="trash" size={16} color={Colors.error} />
                  <Text style={[styles.actionButtonText, { color: Colors.error }]}>
                    삭제
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={64} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>즐겨찾기가 없습니다</Text>
            <Text style={styles.emptyDescription}>
              주차장을 찾아서 하트를 눌러보세요
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/parking' as any)}
            >
              <Ionicons name="search" size={16} color={Colors.white} />
              <Text style={styles.emptyButtonText}>주차장 찾기</Text>
            </TouchableOpacity>
          </View>
        )}
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
  sortButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  favoriteCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Shadows.base,
  },
  cardContent: {
    padding: Spacing.base,
  },
  parkingInfo: {
    flex: 1,
  },
  parkingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  parkingName: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
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
  parkingAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  parkingDetails: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  detailText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  parkingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.error,
  },
  availabilityText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  actionButtonText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
  },
  emptyIcon: {
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
}); 