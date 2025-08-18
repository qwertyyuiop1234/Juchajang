#!/usr/bin/env python3
"""
네이버 Geocoding API를 사용해서 주차장 좌표 업데이트
"""
import sqlite3
import requests
import os
import time
import sys
from pathlib import Path

# .env 파일에서 환경변수 로드
def load_env():
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    else:
        print(f".env 파일을 찾을 수 없음: {env_path}")

# 환경변수 로드
load_env()

# 데이터베이스 경로
DB_PATH = Path(__file__).parent.parent / 'data' / 'parking.db'

def geocode_address(address):
    """네이버 Geocoding API를 사용해 주소의 좌표 가져오기"""
    try:
        client_id = os.getenv('NAVER_CLIENT_ID')
        client_secret = os.getenv('NAVER_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            print("네이버 Geocoding API 키가 설정되지 않았습니다.")
            return None
        
        # 주소 전처리
        processed_address = address.strip()
        if not processed_address.startswith('서울'):
            processed_address = f"서울특별시 {processed_address}"
        
        response = requests.get(
            "https://maps.apigw.ntruss.com/map-geocode/v2/geocode",
            params={
                "query": processed_address
            },
            headers={
                "x-ncp-apigw-api-key-id": client_id,
                "x-ncp-apigw-api-key": client_secret,
                "Accept": "application/json"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('addresses') and len(data['addresses']) > 0:
                address_info = data['addresses'][0]
                lat = float(address_info['y'])
                lng = float(address_info['x'])
                return lat, lng
        else:
            print(f"  ❌ Geocoding API 오류 {response.status_code}: {processed_address}")
            
    except Exception as e:
        print(f"  ❌ 좌표 변환 실패 ({address}): {e}")
    
    return None

def update_coordinates_with_geocoding():
    """Geocoding API로 주차장 좌표 업데이트"""
    
    # 데이터베이스 연결
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 좌표가 없는 고유 주소 목록 가져오기
        cursor.execute("""
            SELECT DISTINCT addr, COUNT(*) as count
            FROM parking_lots 
            WHERE addr IS NOT NULL 
            AND addr != ''
            AND (lat_wgs84 IS NULL OR lng_wgs84 IS NULL OR lat_wgs84 = '' OR lng_wgs84 = '')
            GROUP BY addr
            ORDER BY count DESC, addr
        """)
        
        address_list = cursor.fetchall()
        total_addresses = len(address_list)
        
        print(f"🎯 Geocoding으로 좌표 변환할 고유 주소: {total_addresses}개")
        
        if total_addresses == 0:
            print("모든 주소에 좌표가 이미 설정되어 있습니다.")
            return
        
        successful_updates = 0
        failed_updates = 0
        total_records_updated = 0
        
        for i, (address, count) in enumerate(address_list, 1):
            print(f"[{i}/{total_addresses}] 처리 중: {address} ({count}개 레코드)")
            
            # Geocoding으로 좌표 변환
            coords = geocode_address(address)
            
            if coords:
                lat, lng = coords
                print(f"  ✅ 좌표 획득: ({lat}, {lng})")
                
                # 해당 주소를 가진 모든 레코드 업데이트
                cursor.execute("""
                    UPDATE parking_lots 
                    SET lat_wgs84 = ?, lng_wgs84 = ?, updated_at = datetime('now')
                    WHERE addr = ?
                """, (lat, lng, address))
                
                updated_rows = cursor.rowcount
                print(f"  📝 {updated_rows}개 레코드 업데이트됨")
                successful_updates += 1
                total_records_updated += updated_rows
                
            else:
                print(f"  ❌ 좌표 변환 실패")
                failed_updates += 1
            
            # API 호출 제한 방지를 위한 딜레이
            if i < total_addresses:
                time.sleep(0.1)  # 100ms 대기
            
            # 10개마다 중간 저장
            if i % 10 == 0:
                conn.commit()
                print(f"  💾 중간 저장 완료 ({i}/{total_addresses})")
        
        # 최종 저장
        conn.commit()
        
        print(f"\n📊 Geocoding 좌표 업데이트 완료:")
        print(f"  성공한 주소: {successful_updates}개")
        print(f"  실패한 주소: {failed_updates}개")
        print(f"  업데이트된 레코드: {total_records_updated:,}개")
        print(f"  총 처리 주소: {total_addresses}개")
        
        # 최종 통계
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN lat_wgs84 IS NOT NULL AND lng_wgs84 IS NOT NULL 
                           AND lat_wgs84 != '' AND lng_wgs84 != '' THEN 1 END) as with_coords
            FROM parking_lots
        """)
        
        total, with_coords = cursor.fetchone()
        print(f"\n📈 최종 통계:")
        print(f"  전체 주차장: {total:,}개")
        print(f"  좌표 보유: {with_coords:,}개")
        print(f"  좌표 비율: {(with_coords/total*100):.1f}%")
        
        # 강남구 주차장 좌표 현황
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN lat_wgs84 IS NOT NULL AND lng_wgs84 IS NOT NULL 
                           AND lat_wgs84 != '' AND lng_wgs84 != '' THEN 1 END) as with_coords
            FROM parking_lots
            WHERE addr LIKE '%강남구%'
        """)
        
        gangnam_total, gangnam_with_coords = cursor.fetchone()
        if gangnam_total > 0:
            print(f"\n🎯 강남구 주차장 현황:")
            print(f"  전체: {gangnam_total:,}개")
            print(f"  좌표 보유: {gangnam_with_coords:,}개")
            print(f"  좌표 비율: {(gangnam_with_coords/gangnam_total*100):.1f}%")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        conn.rollback()
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Geocoding API로 주차장 좌표 업데이트 시작")
    update_coordinates_with_geocoding()
    print("✅ 좌표 업데이트 완료")