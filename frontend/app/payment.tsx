import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { paymentAPI, ReservationPaymentRequest, TicketPaymentRequest } from '../services/paymentAPI';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Styles';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const parkingId = params.parkingId as string;
  const parkingName = params.parkingName as string;

  const [paymentType, setPaymentType] = useState<'reservation' | 'ticket'>('reservation');
  const [amount, setAmount] = useState('5000');
  const [customerName, setCustomerName] = useState('홍길동');
  const [customerEmail, setCustomerEmail] = useState('hong@example.com');
  const [customerPhone, setCustomerPhone] = useState('010-1234-5678');
  const [duration, setDuration] = useState('2');
  const [ticketType, setTicketType] = useState('1시간');
  const [quantity, setQuantity] = useState('1');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [isWebViewLoading, setIsWebViewLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handlePayment = async () => {
    try {
      const userId = 'user123'; // 실제로는 로그인된 사용자 ID

      if (paymentType === 'reservation') {
        const reservationData: ReservationPaymentRequest = {
          parkingId: parkingId || '1',
          parkingName: parkingName || '테스트 주차장',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString(),
          duration: parseInt(duration),
          amount: parseInt(amount),
          userId,
          customerName,
          customerEmail,
          customerPhone
        };

        // 터미널에 로깅
        paymentAPI.logPaymentRequest(reservationData, '주차장 예약 결제');

        console.log('💳 API 호출 시작...');
        const response = await paymentAPI.createReservationPayment(reservationData);
        console.log('💳 API 호출 완료!');
        
        console.log('💳 응답 받음:', response.success);
        console.log('💳 response.data:', response.data);
        console.log('💳 paymentData 존재:', !!response.data.paymentData);
        
        // 결제 위젯 표시
        if (response.data.paymentData) {
          // 실제 입력값으로 결제 URL 생성
          const paymentData = response.data.paymentData;
          const actualPaymentData = {
            ...paymentData,
            amount: parseInt(amount),
            orderName: `${parkingName || '테스트 주차장'} ${duration}시간 예약`,
            customerName: customerName,
            customerEmail: customerEmail
          };
          
          const clientKey = response.data.clientKey || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
          const orderId = response.data.orderId;
          
          const paymentUrl = `https://pay.toss.im/?clientKey=${clientKey}&orderId=${orderId}&amount=${actualPaymentData.amount}&orderName=${encodeURIComponent(actualPaymentData.orderName)}&customerName=${encodeURIComponent(actualPaymentData.customerName)}&customerEmail=${encodeURIComponent(actualPaymentData.customerEmail)}&successUrl=${encodeURIComponent(actualPaymentData.successUrl)}&failUrl=${encodeURIComponent(actualPaymentData.failUrl)}`;
          
          console.log('💳 결제 URL 생성:', paymentUrl);
          console.log('💳 결제 데이터:', actualPaymentData);
          console.log('💳 모달 상태 설정 전:', { showPaymentModal, paymentUrl });
          
          setPaymentUrl(paymentUrl);
          setShowPaymentModal(true);
          
          console.log('💳 모달 상태 설정 후:', { showPaymentModal: true, paymentUrl });
        } else {
          console.log('❌ paymentData가 없음:', response);
          Alert.alert(
            '결제 요청 성공',
            `주차장 예약 결제 요청이 생성되었습니다.\n주문 ID: ${response.data.orderId}`,
            [
              {
                text: '확인',
                onPress: () => router.back()
              }
            ]
          );
        }

      } else {
        const ticketData: TicketPaymentRequest = {
          ticketType,
          quantity: parseInt(quantity),
          amount: parseInt(amount),
          userId,
          customerName,
          customerEmail,
          customerPhone
        };

        // 터미널에 로깅
        paymentAPI.logPaymentRequest(ticketData, '주차권 구매 결제');

        console.log('💳 API 호출 시작...');
        const response = await paymentAPI.createTicketPayment(ticketData);
        console.log('💳 API 호출 완료!');
        
        console.log('💳 응답 받음:', response.success);
        console.log('💳 response.data:', response.data);
        console.log('💳 paymentData 존재:', !!response.data.paymentData);
        
        // 결제 위젯 표시
        if (response.data.paymentData) {
          // 실제 입력값으로 결제 URL 생성
          const paymentData = response.data.paymentData;
          const actualPaymentData = {
            ...paymentData,
            amount: parseInt(amount),
            orderName: `${ticketType} 주차권 ${quantity}장`,
            customerName: customerName,
            customerEmail: customerEmail
          };
          
          const clientKey = response.data.clientKey || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
          const orderId = response.data.orderId;
          
          const paymentUrl = `https://pay.toss.im/?clientKey=${clientKey}&orderId=${orderId}&amount=${actualPaymentData.amount}&orderName=${encodeURIComponent(actualPaymentData.orderName)}&customerName=${encodeURIComponent(actualPaymentData.customerName)}&customerEmail=${encodeURIComponent(actualPaymentData.customerEmail)}&successUrl=${encodeURIComponent(actualPaymentData.successUrl)}&failUrl=${encodeURIComponent(actualPaymentData.failUrl)}`;
          
          console.log('💳 결제 URL 생성:', paymentUrl);
          console.log('💳 결제 데이터:', actualPaymentData);
          console.log('💳 모달 상태 설정 전:', { showPaymentModal, paymentUrl });
          
          setPaymentUrl(paymentUrl);
          setShowPaymentModal(true);
          
          console.log('💳 모달 상태 설정 후:', { showPaymentModal: true, paymentUrl });
        } else {
          console.log('❌ paymentData가 없음:', response);
          Alert.alert(
            '결제 요청 성공',
            `주차권 구매 결제 요청이 생성되었습니다.\n주문 ID: ${response.data.orderId}`,
            [
              {
                text: '확인',
                onPress: () => router.back()
              }
            ]
          );
        }
      }

    } catch (error) {
      console.error('결제 요청 실패:', error);
      Alert.alert('결제 요청 실패', '결제 요청 중 오류가 발생했습니다.');
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
          <Text style={styles.headerTitle}>결제 테스트</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {/* 결제 타입 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제 타입 선택</Text>
            <View style={styles.paymentTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentTypeButton,
                  paymentType === 'reservation' && styles.selectedPaymentTypeButton
                ]}
                onPress={() => setPaymentType('reservation')}
              >
                <Ionicons
                  name="car"
                  size={24}
                  color={paymentType === 'reservation' ? Colors.white : Colors.textSecondary}
                />
                <Text style={[
                  styles.paymentTypeText,
                  paymentType === 'reservation' && styles.selectedPaymentTypeText
                ]}>
                  주차장 예약
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentTypeButton,
                  paymentType === 'ticket' && styles.selectedPaymentTypeButton
                ]}
                onPress={() => setPaymentType('ticket')}
              >
                <Ionicons
                  name="ticket"
                  size={24}
                  color={paymentType === 'ticket' ? Colors.white : Colors.textSecondary}
                />
                <Text style={[
                  styles.paymentTypeText,
                  paymentType === 'ticket' && styles.selectedPaymentTypeText
                ]}>
                  주차권 구매
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 결제 정보 입력 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제 정보</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>결제 금액 (원)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="5000"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>고객명</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="홍길동"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                style={styles.input}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                placeholder="hong@example.com"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>전화번호</Text>
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                placeholder="010-1234-5678"
              />
            </View>

            {paymentType === 'reservation' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>예약 시간 (시간)</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  placeholder="2"
                />
              </View>
            )}

            {paymentType === 'ticket' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>주차권 종류</Text>
                  <TextInput
                    style={styles.input}
                    value={ticketType}
                    onChangeText={setTicketType}
                    placeholder="1시간"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>수량</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
              </>
            )}
          </View>

          {/* 결제 정보 요약 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제 정보 요약</Text>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>결제 타입:</Text>
                <Text style={styles.summaryValue}>
                  {paymentType === 'reservation' ? '주차장 예약' : '주차권 구매'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>주차장:</Text>
                <Text style={styles.summaryValue}>{parkingName || '테스트 주차장'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>고객명:</Text>
                <Text style={styles.summaryValue}>{customerName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>결제 금액:</Text>
                <Text style={styles.summaryValue}>{parseInt(amount).toLocaleString()}원</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 결제 버튼 */}
        <View style={styles.paymentContainer}>
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={handlePayment}
          >
            <Ionicons name="card" size={20} color={Colors.white} />
            <Text style={styles.paymentButtonText}>
              {paymentType === 'reservation' ? '예약 결제하기' : '주차권 구매하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 토스페이먼츠 결제 웹뷰 모달 */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowPaymentModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>토스페이먼츠 결제</Text>
            <View style={styles.placeholder} />
          </View>
          
                     <WebView
             ref={webViewRef}
             source={{ uri: paymentUrl }}
             style={styles.webView}
             onLoadStart={() => setIsWebViewLoading(true)}
             onLoadEnd={() => setIsWebViewLoading(false)}
             onError={(syntheticEvent) => {
               const { nativeEvent } = syntheticEvent;
               console.error('WebView 오류:', nativeEvent);
               Alert.alert('웹뷰 오류', '결제 페이지를 불러오는 중 오류가 발생했습니다.');
             }}
             onNavigationStateChange={(navState) => {
               console.log('💳 웹뷰 네비게이션:', navState.url);
               // 결제 성공/실패 URL 감지
               if (navState.url.includes('payment/success')) {
                 setShowPaymentModal(false);
                 Alert.alert('결제 성공', '결제가 성공적으로 완료되었습니다!');
                 router.back();
               } else if (navState.url.includes('payment/fail')) {
                 setShowPaymentModal(false);
                 Alert.alert('결제 실패', '결제에 실패했습니다. 다시 시도해주세요.');
               }
             }}
           />
           {isWebViewLoading && (
             <View style={styles.loadingOverlay}>
               <Text style={styles.loadingText}>결제 페이지 로딩 중...</Text>
             </View>
           )}
        </SafeAreaView>
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
    marginBottom: Spacing.base,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  selectedPaymentTypeButton: {
    backgroundColor: Colors.primary,
  },
  paymentTypeText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  selectedPaymentTypeText: {
    color: Colors.white,
  },
  inputGroup: {
    marginBottom: Spacing.base,
  },
  inputLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  summaryContainer: {
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  paymentContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  paymentButtonText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: '500',
  },
});
