import threading
import time
import requests
from datetime import datetime
import pytz
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai.firestore_helper import get_firestore_helper

def collectData():
    # Initialize Firestore helper
    try:
        firestore_helper = get_firestore_helper()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Firestore 연결 성공")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Firestore 연결 실패: {e}")
        return
    
    seoul_tz = pytz.timezone('Asia/Seoul')
    last_status_log = datetime.now(seoul_tz)
    
    while True:
        try:
            # Seoul Public Parking Lots API
            url = "http://openapi.seoul.go.kr:8088/55574f4658646c7436354d554b7744/json/GetParkingInfo/1/178"
            
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] API 호출 시작")
            response = requests.get(url, timeout=30)

            # check successful response
            if response.status_code == 200:
                data = response.json()
                parking_info = data.get('GetParkingInfo', {})
                parking_list = parking_info.get('row', [])
                
                if parking_list:
                    # Save to Firestore
                    saved_count = 0
                    current_time = datetime.now(seoul_tz)
                    
                    for parking_data in parking_list:
                        try:
                            # Prepare data for Firestore (matching JS format with correct field names)
                            parking_status = {
                                'parking_code': parking_data.get('PKLT_CD'),
                                'parking_name': parking_data.get('PKLT_NM') or '',
                                'capacity': int(parking_data.get('TPKCT', 0)) if parking_data.get('TPKCT') else 0,
                                'cur_parking': int(parking_data.get('NOW_PRK_VHCL_CNT', 0)) if parking_data.get('NOW_PRK_VHCL_CNT') else 0,
                                'cur_parking_time': parking_data.get('NOW_PRK_VHCL_UPDT_TM'),
                                'parking_status_yn': parking_data.get('PRK_STTS_YN', ''),
                                'parking_status_name': parking_data.get('PRK_STTS_NM', ''),
                                'collected_at': current_time
                            }
                            
                            # Save to parking_status collection
                            firestore_helper.db.collection('parking_status').add(parking_status)
                            saved_count += 1
                            
                        except Exception as e:
                            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 개별 주차장 데이터 저장 실패: {e}")
                            continue
                    
                    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 데이터 수집 성공: 총 {len(parking_list)}개, 저장 {saved_count}개")
                else:
                    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] API 응답에 주차장 데이터가 없습니다")
                    
            else:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] API 호출 실패: {response.status_code}")

        except Exception as e:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR: {e}")
        
        # Check if 10 minutes have passed for status logging
        current_time = datetime.now(seoul_tz)
        if (current_time - last_status_log).total_seconds() >= 600:  # 600 seconds = 10 minutes
            print(f"[{current_time.strftime('%Y-%m-%d %H:%M:%S')}] ✅ 프로그램이 정상 작동 중입니다")
            last_status_log = current_time
            
        # Also save parking lot basic info if needed
        try:
            parking_lots_saved = 0
            if parking_list:
                for parking_data in parking_list:
                    # Check if parking lot info already exists
                    parking_code = parking_data.get('PKLT_CD')
                    if parking_code:
                        lot_doc = firestore_helper.db.collection('parking_lots').document(parking_code).get()
                        if not lot_doc.exists:
                            # Save basic parking lot info with correct field names
                            parking_lot_data = {
                                'parking_code': parking_code,
                                'parking_name': parking_data.get('PKLT_NM') or '',
                                'addr': parking_data.get('ADDR') or '',
                                'tel': parking_data.get('TELNO') or '',
                                'coordinates': None,  # No coordinates in this API
                                'lat_wgs84': None,    # No lat/lng in this API response
                                'lng_wgs84': None,
                                'pay_yn_name': parking_data.get('PAY_YN_NM', ''),
                                'weekday_begin': parking_data.get('WD_OPER_BGNG_TM', ''),
                                'weekday_end': parking_data.get('WD_OPER_END_TM', ''),
                                'updated_at': current_time,
                                'created_at': current_time
                            }
                            firestore_helper.db.collection('parking_lots').document(parking_code).set(parking_lot_data)
                            parking_lots_saved += 1
            
            if parking_lots_saved > 0:
                print(f"[{current_time.strftime('%Y-%m-%d %H:%M:%S')}] 새로운 주차장 기본정보 {parking_lots_saved}개 저장")
                
        except Exception as e:
            print(f"[{current_time.strftime('%Y-%m-%d %H:%M:%S')}] 주차장 기본정보 저장 중 오류: {e}")
        
        # Wait for 1 hour (3600 seconds)
        print(f"[{datetime.now(seoul_tz).strftime('%Y-%m-%d %H:%M:%S')}] 1시간 대기 중...")
        time.sleep(3600)

def start_status_monitor():
    """10분마다 프로그램 상태를 로그로 출력하는 별도 스레드"""
    seoul_tz = pytz.timezone('Asia/Seoul')
    while True:
        time.sleep(600)  # 10 minutes
        print(f"[{datetime.now(seoul_tz).strftime('%Y-%m-%d %H:%M:%S')}] 🔄 모니터링: 데이터 수집 프로그램이 백그라운드에서 실행 중입니다")

if __name__ == "__main__":
    seoul_tz = pytz.timezone('Asia/Seoul')
    print(f"[{datetime.now(seoul_tz).strftime('%Y-%m-%d %H:%M:%S')}] 🚀 주차장 데이터 수집 프로그램 시작 (Seoul Time)")
    
    # Start monitoring thread
    monitor_thread = threading.Thread(target=start_status_monitor, daemon=True)
    monitor_thread.start()
    
    # Start data collection
    collectData()




