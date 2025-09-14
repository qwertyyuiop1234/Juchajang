import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getMyPersonalParkingLots, deletePersonalParkingLot, PersonalParkingLot } from '../services/personalParkingAPI';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';

export default function MyParkingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [parkingLots, setParkingLots] = useState<PersonalParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyParkingLots = useCallback(async () => {
    if (!user) return;

    try {
      const lots = await getMyPersonalParkingLots();
      setParkingLots(lots);
    } catch (error: any) {
      console.error('내 주차공간 로드 실패:', error);
      Alert.alert('오류', error.message || '주차공간 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyParkingLots();
  }, [loadMyParkingLots]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMyParkingLots();
    setRefreshing(false);
  }, [loadMyParkingLots]);

  const handleDeleteParkingLot = (lot: PersonalParkingLot) => {
    Alert.alert(
      '주차공간 삭제',
      `"${lot.name}" 주차공간을 삭제하시겠습니까?\n삭제된 주차공간은 더 이상 다른 사용자에게 표시되지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePersonalParkingLot(lot.id);
              Alert.alert('삭제 완료', '주차공간이 삭제되었습니다.');
              loadMyParkingLots(); // 목록 새로고침
            } catch (error: any) {
              Alert.alert('삭제 실패', error.message || '주차공간 삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return Colors.success;
      case 'occupied':
        return Colors.warning;
      case 'inactive':
        return Colors.gray400;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return '예약 가능';
      case 'occupied':
        return '사용 중';
      case 'inactive':
        return '비활성화';
      default:
        return '알 수 없음';
    }
  };

  const formatDays = (days: number[]) => {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return days.map(day => dayNames[day]).join(', ');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>로그인이 필요합니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>내 주차공간</Text>
        <TouchableOpacity 
          onPress={() => router.push('/add-parking')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        ) : parkingLots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>등록된 주차공간이 없습니다.</Text>
            <Text style={styles.emptySubtext}>
              주차공간을 등록하여 다른 사용자와 공유해보세요!
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => router.push('/add-parking')}
            >
              <Text style={styles.addFirstButtonText}>첫 주차공간 등록하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          parkingLots.map((lot) => (
            <View key={lot.id} style={styles.parkingCard}>
              <View style={styles.cardHeader}>
                <View style={styles.parkingInfo}>
                  <Text style={styles.parkingName}>{lot.name}</Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(lot.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(lot.status) }]}>
                      {getStatusText(lot.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      // TODO: 수정 화면으로 이동
                      Alert.alert('알림', '수정 기능은 준비 중입니다.');
                    }}
                  >
                    <Ionicons name="pencil" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteParkingLot(lot)}
                  >
                    <Ionicons name="trash" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.parkingAddress}>{lot.address}</Text>
              
              {lot.description ? (
                <Text style={styles.parkingDescription}>{lot.description}</Text>
              ) : null}

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>
                    시간당 {lot.pricePerHour?.toLocaleString()}원
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>
                    {lot.availableStartTime} - {lot.availableEndTime}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>
                    {formatDays(lot.availableDays)}
                  </Text>
                </View>

                {lot.rating > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.detailText}>
                      {lot.rating} ({lot.reviewCount}개 리뷰)
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="bookmark-outline" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>
                    총 {lot.totalBookings}회 예약
                  </Text>
                </View>
              </View>

              {lot.rules && lot.rules.length > 0 && (
                <View style={styles.rulesContainer}>
                  <Text style={styles.rulesTitle}>이용 규칙</Text>
                  {lot.rules.map((rule, index) => (
                    <Text key={index} style={styles.ruleText}>• {rule}</Text>
                  ))}
                </View>
              )}
            </View>
          ))
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
  addButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.base,
  },
  emptySubtext: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  addFirstButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
  },
  addFirstButtonText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.white,
  },
  parkingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginVertical: Spacing.sm,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  parkingInfo: {
    flex: 1,
  },
  parkingName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.xs,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  parkingAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  parkingDescription: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  detailsContainer: {
    marginVertical: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  rulesContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rulesTitle: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  ruleText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
});