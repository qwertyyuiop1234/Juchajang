import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Styles';

export default function ReservationScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('current');

  // 예약 데이터 (실제로는 API에서 받아올 데이터)
  const currentReservations = [
    {
      id: 1,
      parkingName: '강남역 주차장',
      address: '서울 강남구 강남대로 123',
      date: '2024-01-15',
      time: '14:00 - 18:00',
      duration: '4시간',
      price: '4,000원',
      status: 'active',
      qrCode: 'ABC123',
    },
    {
      id: 2,
      parkingName: '역삼역 공영주차장',
      address: '서울 강남구 역삼동 456',
      date: '2024-01-16',
      time: '09:00 - 12:00',
      duration: '3시간',
      price: '3,000원',
      status: 'active',
      qrCode: 'DEF456',
    },
  ];

  const pastReservations = [
    {
      id: 3,
      parkingName: '선릉역 백화점 주차장',
      address: '서울 강남구 선릉로 789',
      date: '2024-01-10',
      time: '15:00 - 19:00',
      duration: '4시간',
      price: '5,000원',
      status: 'completed',
      qrCode: 'GHI789',
    },
    {
      id: 4,
      parkingName: '테헤란로 지상주차장',
      address: '서울 강남구 테헤란로 012',
      date: '2024-01-08',
      time: '10:00 - 14:00',
      duration: '4시간',
      price: '3,500원',
      status: 'completed',
      qrCode: 'JKL012',
    },
  ];

  const handleCancelReservation = (id: number) => {
    Alert.alert(
      '예약 취소',
      '정말로 이 예약을 취소하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '확인',
          style: 'destructive',
          onPress: () => {
            console.log('예약 취소:', id);
            Alert.alert('예약이 취소되었습니다.');
          },
        },
      ]
    );
  };

  const handleShowQRCode = (qrCode: string) => {
    Alert.alert('QR 코드', `QR 코드: ${qrCode}`);
  };

  const handleWriteReview = (id: number) => {
    router.push(`/review?parkingId=${id}&parkingName=주차장명` as any);
  };

  const renderReservationCard = (reservation: any, isCurrent: boolean) => (
    <View key={reservation.id} style={styles.reservationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.parkingInfo}>
          <Text style={styles.parkingName}>{reservation.parkingName}</Text>
          <Text style={styles.parkingAddress}>{reservation.address}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isCurrent ? Colors.primary : Colors.success }
        ]}>
          <Text style={styles.statusText}>
            {isCurrent ? '진행중' : '완료'}
          </Text>
        </View>
      </View>

      <View style={styles.reservationDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{reservation.date}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="time" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{reservation.time}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="hourglass" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{reservation.duration}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="card" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{reservation.price}</Text>
          </View>
        </View>
      </View>

      {isCurrent && (
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            <View style={styles.qrCode}>
              <Ionicons name="qr-code" size={48} color={Colors.primary} />
            </View>
            <View style={styles.qrInfo}>
              <Text style={styles.qrTitle}>QR 코드</Text>
              <Text style={styles.qrCodeText}>{reservation.qrCode}</Text>
              <Text style={styles.qrDescription}>
                주차장 입구에서 QR 코드를 스캔하세요
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.cardActions}>
        {isCurrent ? (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShowQRCode(reservation.qrCode)}
            >
              <Ionicons name="qr-code" size={16} color={Colors.primary} />
              <Text style={styles.actionButtonText}>QR 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelReservation(reservation.id)}
            >
              <Ionicons name="close-circle" size={16} color={Colors.error} />
              <Text style={[styles.actionButtonText, { color: Colors.error }]}>
                예약 취소
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleWriteReview(reservation.id)}
            >
              <Ionicons name="create" size={16} color={Colors.primary} />
              <Text style={styles.actionButtonText}>리뷰 작성</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/parking-detail?id=${reservation.id}` as any)}
            >
              <Ionicons name="information-circle" size={16} color={Colors.info} />
              <Text style={[styles.actionButtonText, { color: Colors.info }]}>
                주차장 정보
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>예약 내역</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            현재 예약
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            예약 내역
          </Text>
        </TouchableOpacity>
      </View>

      {/* 예약 목록 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'current' ? (
          currentReservations.length > 0 ? (
            currentReservations.map(reservation => 
              renderReservationCard(reservation, true)
            )
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>현재 예약이 없습니다</Text>
              <Text style={styles.emptyDescription}>
                새로운 주차장을 예약해보세요
              </Text>
              <TouchableOpacity style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>주차장 찾기</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          pastReservations.length > 0 ? (
            pastReservations.map(reservation => 
              renderReservationCard(reservation, false)
            )
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>예약 내역이 없습니다</Text>
              <Text style={styles.emptyDescription}>
                주차장을 이용하면 여기에 기록됩니다
              </Text>
            </View>
          )
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
  addButton: {
    padding: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  activeTab: {
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
    paddingHorizontal: Spacing.base,
  },
  reservationCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.base,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  parkingInfo: {
    flex: 1,
  },
  parkingName: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  parkingAddress: {
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
  reservationDetails: {
    marginBottom: Spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  detailText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  qrSection: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrCode: {
    width: 80,
    height: 80,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
    ...Shadows.sm,
  },
  qrInfo: {
    flex: 1,
  },
  qrTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  qrCodeText: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  qrDescription: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.base,
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
  cancelButton: {
    // 스타일은 인라인으로 적용
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
  },
}); 