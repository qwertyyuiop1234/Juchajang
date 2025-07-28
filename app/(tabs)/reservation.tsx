import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ReservationScreen() {
  const [activeTab, setActiveTab] = useState('current');

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
      parkingName: '역삼역 지하주차장',
      address: '서울 강남구 테헤란로 456',
      date: '2024-01-16',
      time: '09:00 - 12:00',
      duration: '3시간',
      price: '3,600원',
      status: 'active',
      qrCode: 'DEF456',
    },
  ];

  const pastReservations = [
    {
      id: 3,
      parkingName: '선릉역 주차장',
      address: '서울 강남구 영동대로 789',
      date: '2024-01-10',
      time: '15:00 - 17:00',
      duration: '2시간',
      price: '1,600원',
      status: 'completed',
    },
    {
      id: 4,
      parkingName: '강남역 주차장',
      address: '서울 강남구 강남대로 123',
      date: '2024-01-08',
      time: '10:00 - 14:00',
      duration: '4시간',
      price: '4,000원',
      status: 'completed',
    },
  ];

  const handleCancelReservation = (id: number) => {
    Alert.alert(
      '예약 취소',
      '정말로 이 예약을 취소하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '확인', style: 'destructive', onPress: () => console.log('예약 취소:', id) },
      ]
    );
  };

  const renderReservationCard = (reservation: any, isCurrent: boolean = false) => (
    <View key={reservation.id} style={styles.reservationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.parkingInfo}>
          <Text style={styles.parkingName}>{reservation.parkingName}</Text>
          <Text style={styles.parkingAddress}>{reservation.address}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isCurrent ? '#4CAF50' : '#666' }]}>
          <Text style={styles.statusText}>{isCurrent ? '진행중' : '완료'}</Text>
        </View>
      </View>

      <View style={styles.reservationDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{reservation.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{reservation.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{reservation.duration}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{reservation.price}</Text>
        </View>
      </View>

      {isCurrent && reservation.qrCode && (
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            <Ionicons name="qr-code-outline" size={32} color="#007AFF" />
            <Text style={styles.qrText}>{reservation.qrCode}</Text>
          </View>
          <Text style={styles.qrDescription}>입차 시 QR 코드를 제시하세요</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        {isCurrent ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelReservation(reservation.id)}
          >
            <Text style={styles.cancelButtonText}>예약 취소</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>리뷰 작성</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>예약 관리</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            현재 예약 ({currentReservations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            예약 내역 ({pastReservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 예약 목록 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'current' ? (
          currentReservations.length > 0 ? (
            currentReservations.map((reservation) => renderReservationCard(reservation, true))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>현재 예약이 없습니다</Text>
              <Text style={styles.emptySubtitle}>새로운 주차장을 예약해보세요</Text>
            </View>
          )
        ) : (
          pastReservations.length > 0 ? (
            pastReservations.map((reservation) => renderReservationCard(reservation, false))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>예약 내역이 없습니다</Text>
              <Text style={styles.emptySubtitle}>주차장을 이용해보세요</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reservationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  parkingInfo: {
    flex: 1,
  },
  parkingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  parkingAddress: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  reservationDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  qrSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 8,
  },
  qrDescription: {
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
}); 