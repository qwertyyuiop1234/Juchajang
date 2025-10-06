import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import numpy as np
import pandas as pd
import math
import torch
import torch.nn as nn
from sklearn.preprocessing import LabelEncoder
import re
from sklearn.preprocessing import MinMaxScaler
import joblib
from datetime import datetime
from typing import Dict
import json

# --- 유틸리티 함수 (제공된 그대로 사용) ---

def get_db():
    """Firebase Admin SDK를 초기화하고 Firestore 클라이언트를 반환합니다."""
    try:
        # 이미 초기화되어 있는지 확인
        firebase_admin.get_app()
    except ValueError:
        # 초기화되지 않았으면 초기화
        cred = credentials.Certificate('key.json')
        firebase_admin.initialize_app(cred)
    
    return firestore.client()


def get_df(db, collection_name):
    ref = db.collection(collection_name)
    docs = ref.stream()
    items = list(map(lambda x: {**x.to_dict(), 'id': x.id}, docs))
    return pd.DataFrame(items)


def cleaning_data(df, col_list):
    new_df = df[col_list].copy()
    return new_df


def add_information(status, lots):
    merged_df = pd.merge(status, lots, on='parking_code', how='right')
    addr_parts = merged_df['addr'].str.extract(r'^([^\(]+)(?:\(([^)]+)\))?$')
    merged_df['addr'] = addr_parts[0].str.strip()
    merged_df['addr_num'] = addr_parts[1].str.replace('-', '', regex=True)
    merged_df['addr_num'] = pd.to_numeric(merged_df['addr_num'], errors='coerce')
    return merged_df


def embedding_layer(data):
    data['addr'] = data['addr'].fillna('')
    data['addr_num'] = data['addr_num'].fillna(-1)

    loc_list = data['addr'].unique()
    encoder = LabelEncoder()
    encoder.fit(loc_list)

    addr_encoded = encoder.transform(data['addr'])
    addr_tensor = torch.tensor(addr_encoded, dtype=torch.long)

    addr_num_tensor = torch.tensor(data['addr_num'].values, dtype=torch.float32)

    return addr_tensor, addr_num_tensor


def get_X_train_raw_last_L(parking_code, lookback_length=20):
    """
    정렬된 'data.csv'에서 최신 L개 데이터를 추출하고, 부족 시 0으로 패딩하여
    모델 입력용 PyTorch 텐서 (L x 11)를 반환합니다.
    """
    # 🚨 'data.csv'에 저장된 최종 11개 특성 컬럼 목록으로 변경해야 함
    # get_data의 최종 X_combined 텐서 생성 컬럼 순서와 일치해야 합니다.
    feature_cols = [
        'occupancy_rate_scaled', 'capacity_scaled', 'add_time_rate_scaled',
        'add_rates_scaled', 'time_rate_scaled', 'rates_scaled',
        'lat_scaled', 'lon_scaled', 'hour_sin', 'hour_cos', 'day_sin'
    ]
    NUM_FEATURES = len(feature_cols)

    df = pd.read_csv('data.csv')

    df_filtered = df[df['parking_code'] == parking_code].copy()

    if df_filtered.empty:
        X_train_raw_last_L = torch.zeros(lookback_length, NUM_FEATURES, dtype=torch.float32)
        print(f"⚠️ 경고: '{parking_code}' 데이터가 없어 {lookback_length}x{NUM_FEATURES} 크기의 0 텐서로 패딩되었습니다.")
        return X_train_raw_last_L

    df_last_L = df_filtered.tail(lookback_length)
    input_numpy = df_last_L[feature_cols].values.astype(np.float32)

    current_length = input_numpy.shape[0]

    if current_length < lookback_length:
        padding_needed = lookback_length - current_length
        padding_array = np.zeros((padding_needed, NUM_FEATURES), dtype=np.float32)
        input_numpy_padded = np.concatenate([padding_array, input_numpy], axis=0)
        print(f"⚠️ 경고: 데이터 부족으로 {padding_needed}개의 0 행이 데이터 앞에 패딩되었습니다.")
    else:
        input_numpy_padded = input_numpy

    X_train_raw_last_L = torch.from_numpy(input_numpy_padded)
    return X_train_raw_last_L


def save_scale_lots(parking_lots_df):
    """
    parking_lots DF의 고정 특성들을 스케일링하고 joblib 파일을 저장하는 함수
    (predict_recursive에서 사용되는 고정 특성 스케일러를 생성합니다.)
    """

    # 1. 'coordinates'를 'lat'과 'lon'으로 분리
    parking_lots_df[['lat', 'lon']] = parking_lots_df['coordinates'].str.split(',', expand=True)

    # 2. 숫자(float)로 변환 및 NaN 처리
    parking_lots_df['lat'] = pd.to_numeric(parking_lots_df['lat'], errors='coerce')
    parking_lots_df['lon'] = pd.to_numeric(parking_lots_df['lon'], errors='coerce')

    # 스케일링할 특성 목록
    cols_to_scale = [
        'capacity', 'add_time_rate', 'add_rates', 'time_rate', 'rates',
        'lat', 'lon'
    ]

    # 스케일링 전 NaN이 포함된 행 제거
    parking_lots_df = parking_lots_df.dropna(subset=cols_to_scale)

    # 3. 각 컬럼에 대해 스케일링 적용 및 스케일러 저장
    for col in cols_to_scale:
        scaler = MinMaxScaler()

        # 'rates' 컬럼의 경우 문자열이 섞여있을 수 있으므로 변환 필요
        data_to_fit = pd.to_numeric(parking_lots_df[col], errors='coerce').values.reshape(-1, 1)

        # NaN이 발생했다면, 해당 컬럼의 모든 행을 제거합니다. (이미 dropna 했으므로 안전함)
        data_to_fit = data_to_fit[~np.isnan(data_to_fit).any(axis=1)]

        if data_to_fit.size == 0:
            print(f"경고: {col} 특성 학습 데이터가 없어 스케일러 저장에 실패했습니다.")
            continue

        scaler.fit(data_to_fit)

        # 스케일러 파일 저장
        joblib.dump(scaler, f'{col}_scaler.joblib')

    print("✅ parking_lots 고정 특성 스케일러가 성공적으로 저장되었습니다.")


def get_data():
    db = get_db()
    parking_status_df = get_df(db, "parking_status")
    parking_lots_df = get_df(db, "parking_lots")

    # 1. 원본 parking_lots.csv 저장 (predict_recursive의 참조 파일)
    try:
        parking_lots_df.to_csv('parking_lots.csv', encoding='utf-8-sig', index=False)
        print("✅ DataFrame이 'parking_lots.csv'으로 성공적으로 저장되었습니다.")
    except Exception as e:
        print(f"❌ 파일 저장 중 오류가 발생했습니다: {e}")

    private_parking_df = get_df(db, "private_parking_lot")
    private_parking_df = private_parking_df[
        ['cur_parking', 'parking_code', 'collected_at', 'capacity', 'cur_parking_time']]

    clean_status_df = cleaning_data(parking_status_df,
                                    col_list=['cur_parking', 'parking_code', 'collected_at', 'capacity'])
    clean_lots_df = cleaning_data(parking_lots_df,
                                  ['coordinates', 'addr', 'parking_name', 'parking_code', 'add_time_rate', 'add_rates',
                                   'time_rate', 'rates'])

    clean_status_df = clean_status_df.dropna(axis=0, how='any')
    clean_lots_df = clean_lots_df.dropna(axis=0, how='any')

    private_parking_df['collected_at'] = private_parking_df['collected_at'].fillna(
        private_parking_df['cur_parking_time'])
    private_parking_df = private_parking_df.drop(labels='cur_parking_time', axis=1)
    private_parking_df = private_parking_df.dropna(subset=['collected_at'])

    all_status_df = pd.concat([clean_status_df, private_parking_df])
    data = add_information(all_status_df, clean_lots_df)

    # 2. 임베딩 레이어 처리 및 결과 할당
    addr_t, addr_num_t = embedding_layer(data)
    # 텐서 자체를 DF 컬럼으로 할당하는 것은 비효율적, 여기서는 임베딩 결과를 사용하지 않으므로 제거

    data['collected_at'] = pd.to_datetime(data['collected_at'], errors='coerce', utc=True)
    data.sort_values(by='collected_at', ascending=True, inplace=True)
    data = data.dropna(subset=['collected_at'])

    # 3. 시간 특성 공학 (6개 sin/cos 모두 생성)
    data['hour_sin'] = np.sin(2 * np.pi * data['collected_at'].dt.hour / 24.0)
    data['hour_cos'] = np.cos(2 * np.pi * data['collected_at'].dt.hour / 24.0)
    data['day_sin'] = np.sin(2 * np.pi * data['collected_at'].dt.dayofweek / 7.0)
    data['day_cos'] = np.cos(2 * np.pi * data['collected_at'].dt.dayofweek / 7.0)
    data['month_sin'] = np.sin(2 * np.pi * data['collected_at'].dt.month / 12.0)
    data['month_cos'] = np.cos(2 * np.pi * data['collected_at'].dt.month / 12.0)

    EPSILON = 1e-6
    data['occupancy_rate'] = data['cur_parking'] / (data['capacity'] + EPSILON)

    # 4. Occupancy Rate 스케일링 및 스케일러 저장
    occupancy_scaler = MinMaxScaler()
    data['occupancy_rate_scaled'] = occupancy_scaler.fit_transform(data[['occupancy_rate']])
    joblib.dump(occupancy_scaler, 'occupancy_scaler.joblib')

    # 5. 좌표 분리 및 스케일링 (원본 컬럼 덮어쓰기 수정)
    # 💡 수정: 좌표를 분리하여 lat, lon 컬럼 생성
    data[['lat_raw', 'lon_raw']] = data['coordinates'].str.split(',', expand=True)

    # 💡 수정: to_numeric으로 변환 및 NaN 처리
    data['lat_raw'] = pd.to_numeric(data['lat_raw'], errors='coerce')
    data['lon_raw'] = pd.to_numeric(data['lon_raw'], errors='coerce')
    data = data.dropna(subset=['lat_raw', 'lon_raw'])

    lat_scaler = MinMaxScaler()
    lon_scaler = MinMaxScaler()
    # 💡 수정: 스케일링 결과를 새로운 컬럼에 저장
    data['lat_scaled'] = lat_scaler.fit_transform(data[['lat_raw']])
    data['lon_scaled'] = lon_scaler.fit_transform(data[['lon_raw']])

    joblib.dump(lat_scaler, 'lat_scaler.joblib')
    joblib.dump(lon_scaler, 'lon_scaler.joblib')

    # 6. Rates 및 Capacity 스케일링 (원본 컬럼 덮어쓰기 수정)
    rate_cols = ['add_time_rate', 'add_rates', 'time_rate', 'rates']

    # Capacity 스케일링
    capacity_scaler = MinMaxScaler()
    data['capacity'] = pd.to_numeric(data['capacity'], errors='coerce')  # 타입 변환
    data['capacity'] = data['capacity'].fillna(0)  # NaN 처리
    # 💡 수정: 스케일링 결과를 새로운 컬럼에 저장
    data['capacity_scaled'] = capacity_scaler.fit_transform(data[['capacity']])
    joblib.dump(capacity_scaler, 'capacity_scaler.joblib')

    # Rates 스케일링
    for col in rate_cols:
        data[col] = pd.to_numeric(data[col], errors='coerce')
        min_max_scaler = MinMaxScaler()
        data[col] = data[col].fillna(0)
        # 💡 수정: 스케일링 결과를 새로운 컬럼에 저장
        data[f'{col}_scaled'] = min_max_scaler.fit_transform(data[[col]])
        joblib.dump(min_max_scaler, col + '_scaler.joblib')

    # 7. parking_lots DF 스케일러도 저장 (predict_recursive를 위한 필수 작업)
    save_scale_lots(parking_lots_df.copy())

    # 8. 최종 DF 정리 및 저장
    # final_feature_cols는 최종 텐서에 포함되는 모든 컬럼과, filtering/sorting에 필요한 컬럼입니다.
    final_feature_cols = [
        'parking_code', 'collected_at',
        'occupancy_rate_scaled', 'capacity_scaled',
        'add_time_rate_scaled', 'add_rates_scaled', 'time_rate_scaled',
        'rates_scaled', 'lat_scaled', 'lon_scaled',
        'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'month_sin', 'month_cos'
    ]

    # 텐서에 필요한 컬럼만 선택하여 저장합니다. (필요 없는 원본 컬럼 제거)
    data = data[final_feature_cols]

    # data.csv는 오름차순(가장 오래된 것이 위)이 예측 함수에서 더 효율적이므로, 이전에 한 정렬을 그대로 유지합니다.
    try:
        data.to_csv('data.csv', encoding='utf-8-sig', index=False)
        print("✅ DataFrame이 'data.csv'으로 성공적으로 저장되었습니다.")
    except Exception as e:
        print(f"❌ 파일 저장 중 오류가 발생했습니다: {e}")

    # 9. 최종 PyTorch 텐서 (N, 11) 생성

    # 연속형/스케일링 특성 (8개)
    float_cols = [
        'occupancy_rate_scaled', 'capacity_scaled', 'add_time_rate_scaled',
        'add_rates_scaled', 'time_rate_scaled', 'rates_scaled',
        'lat_scaled', 'lon_scaled'
    ]

    # 시간 특성 (3개 - 이전에 11개에 맞추기 위해 선택한 특성으로 가정)
    time_cols = [
        'hour_sin',
        'day_sin' ,
        'month_sin'# 모델이 11개 특성(8+3)으로 학습되었다고 가정
    ]

    # DataFrame에서 해당 컬럼만 추출하여 NumPy 배열로 변환 후 텐서로 변환
    X_cont = torch.tensor(data[float_cols].values, dtype=torch.float32)
    X_time = torch.tensor(data[time_cols].values, dtype=torch.float32)

    # 최종 텐서 결합 (N, 11)
    X_combined = torch.cat([
        X_cont,  # (N, 8)
        X_time  # (N, 3)
    ], dim=1)

    print(f"✅ 최종 텐서 (X_combined) 생성 완료. 크기: {X_combined.size()}")
    return X_combined


def get_clean_parking_codes(file_path='parking_lots.csv'):
    """
    'parking_lots.csv' 파일에서 필요한 고정 특성(7개)에 결측치나
    유효하지 않은 데이터가 없는 parking_code 리스트를 반환합니다.
    """

    # 1. 파일 로드
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print("오류: 'parking_lots.csv' 파일을 찾을 수 없습니다. 파일 경로를 확인해 주세요.")
        return []

    # 2. 필수 고정 특성 컬럼 정의
    required_cols = [
        'parking_code',
        'capacity',
        'add_time_rate',
        'add_rates',
        'time_rate',
        'rates',
        'coordinates'
    ]

    # 필수 컬럼이 모두 있는지 확인
    if not all(col in df.columns for col in required_cols):
        missing_cols = [col for col in required_cols if col not in df.columns]
        print(f"오류: DataFrame에 다음 필수 컬럼이 누락되었습니다: {missing_cols}")
        return []

    clean_df = df[required_cols].copy()

    # 3. 일반적인 결측치 처리 (capacity, rates, coordinates)
    # 이 컬럼들 중 하나라도 NaN이면 해당 행을 제거합니다.
    clean_df.dropna(subset=required_cols[1:], inplace=True)

    # 4. 숫자형 컬럼의 유효성 처리 (문자열이 섞인 경우)
    rate_and_capacity_cols = ['capacity', 'add_time_rate', 'add_rates', 'time_rate', 'rates']

    # to_numeric으로 변환 시 실패하는 값은 NaN으로 만듭니다.
    for col in rate_and_capacity_cols:
        clean_df[col] = pd.to_numeric(clean_df[col], errors='coerce')

    # 변환 후 다시 발생한 NaN 행을 제거합니다. (predict_recursive의 NaN 원인 방지)
    clean_df.dropna(subset=rate_and_capacity_cols, inplace=True)

    # 5. 좌표(coordinates) 유효성 처리
    try:
        # 'lat,lon' 형태의 문자열을 분리합니다.
        clean_df[['lat_str', 'lon_str']] = clean_df['coordinates'].str.split(',', expand=True)

        # 숫자형으로 변환 후, 변환에 실패하여 NaN이 된 행을 제거합니다.
        clean_df['lat'] = pd.to_numeric(clean_df['lat_str'], errors='coerce')
        clean_df['lon'] = pd.to_numeric(clean_df['lon_str'], errors='coerce')

        clean_df.dropna(subset=['lat', 'lon'], inplace=True)

    except Exception as e:
        print(f"경고: 좌표 처리 중 오류가 발생했습니다. 일부 데이터가 누락될 수 있습니다. 오류: {e}")

    # 6. 최종적으로 유효한 parking_code 리스트 추출
    clean_parking_codes = clean_df['parking_code'].unique().tolist()

    return clean_parking_codes




def save_to_firebase(json_data: Dict) -> bool:
    """
    Python 딕셔너리 형태의 예측 결과를 Cloud Firestore에 저장합니다.

    Args:
        json_data: format_predictions_to_json에서 생성된 Python 딕셔너리 데이터.

    Returns:
        저장 성공 여부 (True/False).
    """

    try:
        # Firebase Admin SDK 초기화 (이미 초기화되어 있으면 재사용)
        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate('key.json')
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        print("✅ Firebase Admin SDK가 성공적으로 초기화되었습니다.")
    except Exception as e:
        print(f"❌ Firebase 초기화 오류: {e}")
        db = None
    
    if db is None:
        print("❌ Firebase 데이터베이스 연결 실패. 데이터를 저장할 수 없습니다.")
        return False

    try:
        parking_code = str(json_data['parking_code'])
        print(parking_code)
        # 저장 경로 설정
        collection_ref = db.collection('parking_predictions')

        # 주차장 코드를 문서 ID로 사용하여 덮어쓰기 (set)
        collection_ref.document(parking_code).set(json_data)

        print(f"✅ 주차장 코드 {parking_code}의 예측 결과가 Firestore에 성공적으로 저장되었습니다.")

        return True

    except Exception as e:
        print(f"❌ Firestore 저장 중 오류 발생: {e}")
        return False