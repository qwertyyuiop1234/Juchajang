#!/usr/bin/env python3
"""
Firestore 연동을 위한 Python 헬퍼 모듈
SQLite3 대신 Firestore를 사용하여 주차장 데이터를 조회
"""
import sys
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# 환경 변수 로드
try:
    from dotenv import load_dotenv
    # .env 파일 경로 찾기 (backend/.env)
    env_path = Path(__file__).parent.parent / '.env'
    load_dotenv(dotenv_path=env_path)
except ImportError:
    print("python-dotenv가 설치되지 않음. 환경 변수가 시스템에 설정되어 있다고 가정합니다.", file=sys.stderr)

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    from google.cloud.firestore_v1.base_query import FieldFilter
    FIREBASE_AVAILABLE = True
except ImportError as e:
    print(f"Firebase SDK가 설치되지 않음: {e}", file=sys.stderr)
    print("다음 명령으로 설치하세요: pip install firebase-admin", file=sys.stderr)
    FIREBASE_AVAILABLE = False

class FirestoreHelper:
    """Firestore 데이터베이스 헬퍼 클래스"""
    
    def __init__(self):
        self.db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Firebase Admin SDK 초기화"""
        if not FIREBASE_AVAILABLE:
            raise ImportError("Firebase Admin SDK가 필요합니다")
        
        try:
            # 환경 변수에서 서비스 계정 키 가져오기
            service_account_key = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
            
            if not service_account_key:
                raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다")
            
            # JSON 문자열을 파싱
            service_account_dict = json.loads(service_account_key)
            
            # Firebase 앱이 이미 초기화되어 있지 않은 경우에만 초기화
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_dict)
                firebase_admin.initialize_app(cred)
            
            # Firestore 클라이언트 생성
            self.db = firestore.client()
            print("✅ Firestore 연결 성공", file=sys.stderr)
            
        except Exception as e:
            print(f"❌ Firebase 초기화 실패: {e}", file=sys.stderr)
            raise
    
    def get_all_parking_lots(self):
        """모든 주차장 기본 정보 조회"""
        try:
            docs = self.db.collection('parking_lots').stream()
            
            parking_lots = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                parking_lots.append(data)
            
            return parking_lots
            
        except Exception as e:
            print(f"❌ 주차장 목록 조회 실패: {e}", file=sys.stderr)
            return []
    
    def get_parking_status_history(self, parking_code=None, days_back=30, limit=1000):
        """주차장 상태 히스토리 조회 (AI 모델 학습용)"""
        try:
            # 기준 시간 계산
            end_time = datetime.now()
            start_time = end_time - timedelta(days=days_back)
            
            # 쿼리 구성
            query = self.db.collection('parking_status')
            
            # 특정 주차장 코드가 있는 경우 필터링
            if parking_code:
                query = query.where(filter=FieldFilter('parking_code', '==', parking_code))
            
            # 시간 범위 필터링
            query = query.where(filter=FieldFilter('collected_at', '>=', start_time))
            query = query.where(filter=FieldFilter('collected_at', '<=', end_time))
            
            # 정렬 및 제한
            query = query.order_by('collected_at', direction=firestore.Query.DESCENDING).limit(limit)
            
            docs = query.stream()
            
            history = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Timestamp 객체를 datetime으로 변환
                if 'collected_at' in data and data['collected_at']:
                    data['collected_at'] = data['collected_at'].replace(tzinfo=None)
                
                history.append(data)
            
            return history
            
        except Exception as e:
            print(f"❌ 주차장 히스토리 조회 실패: {e}", file=sys.stderr)
            return []
    
    def get_all_parking_status_for_training(self, days_back=30, limit=10000):
        """AI 모델 학습을 위한 모든 주차장 상태 데이터 조회"""
        try:
            print(f"📊 최근 {days_back}일간의 주차장 상태 데이터를 조회합니다...", file=sys.stderr)
            
            # 기준 시간 계산
            end_time = datetime.now()
            start_time = end_time - timedelta(days=days_back)
            
            # 쿼리 구성
            query = self.db.collection('parking_status')
            query = query.where(filter=FieldFilter('collected_at', '>=', start_time))
            query = query.where(filter=FieldFilter('collected_at', '<=', end_time))
            query = query.order_by('collected_at', direction=firestore.Query.DESCENDING)
            query = query.limit(limit)
            
            docs = query.stream()
            
            all_data = []
            count = 0
            
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Timestamp 객체를 datetime으로 변환
                if 'collected_at' in data and data['collected_at']:
                    data['collected_at'] = data['collected_at'].replace(tzinfo=None)
                
                all_data.append(data)
                count += 1
                
                # 진행률 출력
                if count % 1000 == 0:
                    print(f"⏳ {count}개 데이터 로드됨...", file=sys.stderr)
            
            print(f"✅ 총 {len(all_data)}개 데이터 로드 완료", file=sys.stderr)
            return all_data
            
        except Exception as e:
            print(f"❌ 학습 데이터 조회 실패: {e}", file=sys.stderr)
            return []
    
    def convert_to_dataframe(self, data_list):
        """Firestore 데이터를 pandas DataFrame으로 변환"""
        if not data_list:
            return pd.DataFrame()
        
        try:
            df = pd.DataFrame(data_list)
            
            # collected_at을 pandas datetime으로 변환
            if 'collected_at' in df.columns:
                df['collected_at'] = pd.to_datetime(df['collected_at'], errors='coerce')
            
            return df
            
        except Exception as e:
            print(f"❌ DataFrame 변환 실패: {e}", file=sys.stderr)
            return pd.DataFrame()
    
    def get_dataframes_for_prophet(self, days_back=30):
        """Prophet 모델 학습을 위한 DataFrame 반환"""
        try:
            # 모든 주차장 상태 데이터 조회
            all_status_data = self.get_all_parking_status_for_training(days_back)
            
            if not all_status_data:
                print("❌ 학습 데이터가 없습니다", file=sys.stderr)
                return None, None
            
            # DataFrame 변환
            df_status = self.convert_to_dataframe(all_status_data)
            
            if df_status.empty:
                print("❌ DataFrame 변환에 실패했습니다", file=sys.stderr)
                return None, None
            
            print(f"📊 Status DataFrame: {len(df_status)} rows", file=sys.stderr)
            
            # 주차장 기본 정보도 조회 (필요시)
            parking_lots_data = self.get_all_parking_lots()
            df_lots = self.convert_to_dataframe(parking_lots_data)
            
            print(f"📊 Parking Lots DataFrame: {len(df_lots)} rows", file=sys.stderr)
            
            return df_status, df_lots
            
        except Exception as e:
            print(f"❌ Prophet 데이터 준비 실패: {e}", file=sys.stderr)
            return None, None
    
    def test_connection(self):
        """Firestore 연결 테스트"""
        try:
            # 테스트 컬렉션에서 1개 문서 조회
            docs = self.db.collection('parking_lots').limit(1).stream()
            count = sum(1 for _ in docs)
            
            return {
                'success': True,
                'message': f'Firestore 연결 성공 (주차장 {count}개 이상 존재)'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Firestore 연결 실패: {str(e)}'
            }

# 전역 헬퍼 인스턴스 (싱글톤)
_firestore_helper = None

def get_firestore_helper():
    """Firestore 헬퍼 싱글톤 인스턴스 반환"""
    global _firestore_helper
    if _firestore_helper is None:
        _firestore_helper = FirestoreHelper()
    return _firestore_helper

def main():
    """테스트 및 디버그용 메인 함수"""
    try:
        print("🔍 Firestore 연결 테스트를 시작합니다...", file=sys.stderr)
        
        helper = get_firestore_helper()
        result = helper.test_connection()
        
        if result['success']:
            print(f"✅ {result['message']}", file=sys.stderr)
            
            # 샘플 데이터 조회
            print("\n📊 샘플 데이터를 조회합니다...", file=sys.stderr)
            
            lots = helper.get_all_parking_lots()
            print(f"주차장 개수: {len(lots)}", file=sys.stderr)
            
            if lots:
                sample_lot = lots[0]
                print(f"샘플 주차장: {sample_lot.get('parking_name', 'N/A')}", file=sys.stderr)
            
            # Prophet 데이터 준비 테스트
            print("\n🤖 Prophet 학습 데이터 준비 테스트...", file=sys.stderr)
            df_status, df_lots = helper.get_dataframes_for_prophet(days_back=7)
            
            if df_status is not None and not df_status.empty:
                print(f"✅ Status 데이터: {len(df_status)} rows", file=sys.stderr)
                print(f"   컬럼: {list(df_status.columns)}", file=sys.stderr)
            else:
                print("❌ Status 데이터가 없습니다", file=sys.stderr)
            
        else:
            print(f"❌ {result['message']}", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"💥 테스트 실패: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()