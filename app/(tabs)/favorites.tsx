import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites } from '../../contexts/FavoritesContext';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, removeFavorite, isLoading } = useFavorites();

  const navigateToDetail = (id: number) => {
    router.push(`/parking-detail?id=${id}` as any);
  };

  const handleRemoveFavorite = (id: number) => {
    removeFavorite(id);
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>즐겨찾기</Text>
          <Text style={styles.headerSubtitle}>로딩 중...</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>즐겨찾기 로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 즐겨찾기가 없을 때
  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>즐겨찾기</Text>
          <Text style={styles.headerSubtitle}>저장한 주차장 0개</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>저장된 주차장이 없습니다</Text>
          <Text style={styles.emptySubtitle}>주차장을 찾아서 즐겨찾기에 추가해보세요</Text>
          <TouchableOpacity 
            style={styles.findButton}
            onPress={() => router.push('/(tabs)/' as any)}
          >
            <Text style={styles.findButtonText}>주차장 찾기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>즐겨찾기</Text>
        <Text style={styles.headerSubtitle}>저장한 주차장 {favorites.length}개</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.parkingList}>
        {favorites.map((parkingLot) => (
          <TouchableOpacity
            key={parkingLot.id}
            style={styles.parkingCard}
            onPress={() => navigateToDetail(parkingLot.id)}
          >
            <View style={[styles.statusIndicator, { backgroundColor: parkingLot.statusColor }]} />
            
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.parkingName}>{parkingLot.name}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFavorite(parkingLot.id)}
                >
                  <Ionicons name="heart" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.address}>{parkingLot.address}</Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="location" size={14} color="#007AFF" />
                    <Text style={styles.infoText}>{parkingLot.distance}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="time" size={14} color="#4CAF50" />
                    <Text style={styles.infoText}>{parkingLot.time}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.infoText}>{parkingLot.rating}</Text>
                  </View>
                </View>
                
                <View style={styles.statusRow}>
                  <View style={[styles.statusTag, { backgroundColor: parkingLot.statusColor }]}>
                    <Text style={styles.statusText}>{parkingLot.status}</Text>
                  </View>
                  <Text style={styles.priceText}>{parkingLot.price}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  parkingList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  parkingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusIndicator: {
    width: 4,
    backgroundColor: '#4CAF50',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  parkingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardFooter: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  findButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
}); 