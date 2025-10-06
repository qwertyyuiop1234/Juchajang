import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import preprocessing # 외부 모듈로 가정
import numpy as np
import itertools
import copy
import joblib
from datetime import datetime
from typing import List
import json
from datetime import datetime, timedelta

CONGESTION_THRESHOLD = {
    'Normal': 0.5,      # 점유율 < 50%
    'Busy': 0.8,        # 50% <= 점유율 < 80%
    'Congested': 1.0    # 점유율 >= 80% (100%까지)
}


def get_congestion_level(occupancy_rate: float) -> str:
    """점유율에 따라 혼잡도를 분류합니다."""
    if occupancy_rate < CONGESTION_THRESHOLD['Normal']:
        return "Normal"
    elif occupancy_rate < CONGESTION_THRESHOLD['Busy']:
        return "Busy"
    else:
        return "Congested"


def format_predictions_to_json(parking_code: str, predictions_list: list, last_updated_time: datetime) -> str:
    """
    주차장 예측 결과를 요청된 JSON 형식으로 변환합니다.

    Args:
        parking_code: 예측을 수행한 주차장 코드 (예: '3187200').
        predictions_list: predict_recursive에서 반환된 168개의 예측 점유율 리스트 (0.0 ~ 1.0).
        last_updated_time: 예측을 시작한 기준 시점 (last_updated 필드에 사용).

    Returns:
        예측 결과가 담긴 JSON 문자열.
    """
    # 1. 주차장 고정 정보 로드 (parking_lots.csv 파일 사용 가정)
    try:
        parking_lots_df = pd.read_csv('parking_lots.csv')
    except FileNotFoundError:
        return json.dumps({"error": "parking_lots.csv 파일을 찾을 수 없습니다."})

    lot_info = parking_lots_df[parking_lots_df['parking_code'] == parking_code]

    if lot_info.empty:
        return json.dumps({"error": f"주차장 코드 '{parking_code}'에 대한 정보가 없습니다."})

    # capacity는 float으로 변환하여 사용 (예측 계산의 안전성을 위함)
    try:
        capacity = float(lot_info['capacity'].iloc[0])
        parking_name = lot_info['parking_name'].iloc[0]
    except ValueError:
        return json.dumps({"error": "주차장 capacity가 유효한 숫자형태가 아닙니다."})

    # 2. 예측 결과 리스트 생성
    predictions_data = []

    # 예측은 last_updated_time의 다음 시간(T+1)부터 시작합니다.
    current_time = last_updated_time

    # 168개 시점 예측 (1시간 간격)
    for i, predicted_rate in enumerate(predictions_list):
        # 다음 예측 시점 계산
        current_time += timedelta(hours=1)

        # NaN 및 1.0 초과 값 처리 (클리핑)
        if np.isnan(predicted_rate) or predicted_rate < 0:
            # NaN이거나 음수인 경우, 안전하게 0.5 (50%)로 간주합니다. (실제 운영 시에는 오류로 처리해야 함)
            occupancy_rate = 0.5
        else:
            # 최종 예측 점유율을 [0, 1]로 클리핑
            occupancy_rate = np.clip(predicted_rate, 0.0, 1.0)

        # 가용 주차 대수 계산 (Available = Capacity * (1 - Occupancy Rate))
        available_spots = round(capacity * (1.0 - occupancy_rate))

        # available spots는 음수가 될 수 없으며, capacity를 초과할 수 없습니다.
        available_spots = np.clip(available_spots, 0, capacity)

        # 예측 항목 추가
        predictions_data.append({
            "time": current_time.isoformat(),  # ISO 8601 형식 (UTC)
            "available": int(available_spots),
            "congestion": get_congestion_level(occupancy_rate), })

    # 3. 최종 JSON 구조 생성
    final_json_data = {
        "parking_code": parking_code,
        "parking_name": parking_name,
        "capacity": int(capacity),
        "last_updated": last_updated_time.isoformat(),
        "predictions": predictions_data
    }

    # 4. JSON 문자열로 변환하여 반환
    return json.dumps(final_json_data, indent=2, ensure_ascii=False)


# ====================================================================
# [1] 전역 상수 설정
# ====================================================================

# 예측할 특성의 인덱스 (occupancy_rate_scaled는 첫 번째 특성, 인덱스 0)
TARGET_INDEX = 0
# 하이퍼파라미터
LOOKBACK = 10  # Lookback 길이 (이전 코드의 10 대신 20으로 통일)
LEARNING_RATE = 0.0001
EPOCHS = 100
BATCH_SIZE = 32
HIDDEN_SIZE = 64
NUM_LAYERS = 2
TEST_SIZE_RATIO = 0.2


# ====================================================================
# [2] 시퀀스 생성 함수 (Target 분리)
# ====================================================================

def create_sequences(input_data: torch.Tensor, lookback: int, target_col_index: int):
    """
    입력 텐서를 LSTM 학습을 위한 시퀀스(X)와 다음 시점의 특정 예측값(y)으로 나눕니다.
    """
    X, y = [], []
    num_samples = input_data.size(0)

    for i in range(num_samples - lookback):
        # 입력 시퀀스 X: 과거 lookback 길이만큼의 모든 특성 (N, L, F)
        seq = input_data[i: i + lookback]
        X.append(seq)

        # 목표값 y: 다음 시점의 오직 target_col_index 특성만 (N, 1)
        target = input_data[i + lookback, target_col_index].unsqueeze(0)
        y.append(target)

    # X_seq: (샘플 수, LOOKBACK, 전체 특성 수), y_seq: (샘플 수, 1)
    return torch.stack(X), torch.stack(y)


# ====================================================================
# [3] LSTM 모델 정의
# ====================================================================

class ParkingLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers):
        super(ParkingLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)

        # 선형 레이어 (Hidden Size -> 1)
        self.fc = nn.Linear(hidden_size, 1)

        # 🚨 최종 출력에 Sigmoid 활성화 함수 추가: 출력을 [0, 1] 범위로 제한
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)

        out, _ = self.lstm(x, (h0, c0))

        # 1. 선형 변환
        out = self.fc(out[:, -1, :])

        # 2. Sigmoid를 적용하여 출력 값을 [0, 1] 범위로 강제
        out = self.sigmoid(out)

        return out


# ====================================================================
# [4] 모델 훈련 및 그리드 탐색
# ====================================================================

def grid_search_and_train(save_path='best_lstm_model.pth'):
    best_params = None
    min_test_loss = float('inf')
    best_model_state = None

    print("1. 데이터 로드 및 시퀀스 생성...")
    # 🚨 주의: 이 줄은 외부 모듈 'preprocessing'이 정의되어 있고,
    #         get_data()가 X_combined 텐서를 반환한다고 가정합니다.
    raw_data_tensor = preprocessing.get_data()
    INPUT_SIZE = raw_data_tensor.size(1)

    for lookback, hidden_size in itertools.product([20], [64]):
        print(f"\n=======================================================")
        print(f"  테스트 시작: LOOKBACK={lookback}, HIDDEN_SIZE={hidden_size}")
        print(f"=======================================================")

        X_seq, y_seq = create_sequences(raw_data_tensor, lookback, TARGET_INDEX)

        total_samples = X_seq.size(0)
        test_size = int(total_samples * TEST_SIZE_RATIO)
        train_size = total_samples - test_size

        X_train = X_seq[:train_size]
        y_train = y_seq[:train_size]
        X_test = X_seq[train_size:]
        y_test = y_seq[train_size:]

        model = ParkingLSTM(INPUT_SIZE, hidden_size, NUM_LAYERS)
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

        train_dataset = TensorDataset(X_train, y_train)
        train_dataloader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)

        for epoch in range(EPOCHS):
            model.train()
            for sequences, targets in train_dataloader:
                optimizer.zero_grad()
                outputs = model(sequences)
                loss = criterion(outputs, targets)
                loss.backward()
                optimizer.step()

        model.eval()
        with torch.no_grad():
            test_outputs = model(X_test)
            test_loss = criterion(test_outputs, y_test).item()

        print(f"  >>> 최종 테스트 Loss: {test_loss:.6f}")

        if test_loss < min_test_loss:
            min_test_loss = test_loss
            best_params = {'lookback': lookback, 'hidden_size': hidden_size}
            best_model_state = copy.deepcopy(model.state_dict())
            print("  [✅] 새로운 최적 모델 가중치 업데이트됨!")

    print("\n=======================================================")
    print(f"그리드 탐색 완료. 최적 하이퍼파라미터: {best_params}, 최저 Loss: {min_test_loss:.6f}")
    print("=======================================================")

    if best_model_state:
        torch.save(best_model_state, save_path)
        print(f"[💾] 최적 모델 가중치가 '{save_path}'에 저장되었습니다.")

    final_model = ParkingLSTM(INPUT_SIZE, best_params['hidden_size'], NUM_LAYERS)
    final_model.load_state_dict(best_model_state)
    return final_model


def load_model(input_size=11):
    # 1. 모델 객체 생성 (input_size는 11, hidden_size는 64로 가정)
    loaded_model = ParkingLSTM(input_size, HIDDEN_SIZE, NUM_LAYERS)
    MODEL_PATH = 'best_lstm_model.pth'

    try:
        loaded_model.load_state_dict(torch.load(MODEL_PATH))
        print(f"✅ 모델 가중치 로드 성공: {MODEL_PATH}")
    except FileNotFoundError:
        print(f"❌ '{MODEL_PATH}' 파일이 없어 그리드 탐색을 시작합니다.")
        return grid_search_and_train(save_path=MODEL_PATH)

    loaded_model.eval()
    return loaded_model


# ====================================================================
# [5] 재귀적 예측 함수
# ====================================================================

def predict_recursive(parking_code, model, lookback_length=LOOKBACK):
    """
    주어진 주차장 코드와 모델을 사용하여 168시간을 재귀적으로 예측합니다.
    """
    print(parking_code)
    # 0. 과거 데이터 로드 (L x 11 텐서)
    # 💡 수정: lookback_length를 파라미터로 사용
    X_train_raw_last_L = preprocessing.get_X_train_raw_last_L(parking_code, lookback_length=lookback_length)

    # --- 1. 고정 특성 (7개) 스케일링 및 텐서화 (1 x 7) ---

    parking_lots_df = pd.read_csv('parking_lots.csv')
    input_data_df = parking_lots_df[parking_lots_df['parking_code'] == parking_code]

    if input_data_df.empty:
        raise ValueError(f"주차장 코드 '{parking_code}'에 대한 고정 정보가 'parking_lots.csv'에 없습니다.")

    input_series = input_data_df.iloc[0]

    # 고정 특성 컬럼 정의 (7개)
    FIXED_COLS = ['capacity', 'add_time_rate', 'add_rates', 'time_rate', 'rates']

    # 스케일러 딕셔너리에 로드 (파일 명칭을 {col}_scaler.joblib로 통일하여 사용)
    scalers_dict = {}
    for col in FIXED_COLS:
        scalers_dict[col] = joblib.load(f'{col}_scaler.joblib')
    scalers_dict['lat'] = joblib.load('lat_scaler.joblib')
    scalers_dict['lon'] = joblib.load('lon_scaler.joblib')

    X_scaled = []

    # 5개의 연속 특성 스케일링
    for col in FIXED_COLS:
        data_to_scale = np.array([[float(input_series[col])]])
        X_scaled.append(scalers_dict[col].transform(data_to_scale).item())

    # 좌표 분리 및 스케일링 (2개)
    coordinates = input_series['coordinates']
    c = coordinates.split(',')
    lat = float(c[0])
    lon = float(c[1])

    X_scaled.append(scalers_dict['lat'].transform(np.array([[lat]]).astype(np.float32)).item())
    X_scaled.append(scalers_dict['lon'].transform(np.array([[lon]]).astype(np.float32)).item())

    # 7개의 스케일링된 특성을 1 x 7 텐서로 변환
    fixed_features_tensor = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(0)

    # fixed_features_tensor 크기: torch.Size([1, 7])

    # --- 2. 미래 시간 시퀀스 (169개 시점) 생성 및 3개 특성 추출 ---
    start_time = datetime.now()
    # 168시간 예측을 위해, 168개의 미래 시점 + 1개의 현재 시점 특성 (재귀 시작 시점)을 포함하는 169개 시퀀스 필요
    time_sequence = pd.date_range(start=start_time, periods=169, freq='H', name='collected_at')
    df_forecast = pd.DataFrame({'collected_at': time_sequence})

    # 3개의 주기 함수 특성 생성
    df_forecast['hour_sin'] = np.sin(2 * np.pi * df_forecast['collected_at'].dt.hour / 24.0)
    df_forecast['hour_cos'] = np.cos(2 * np.pi * df_forecast['collected_at'].dt.hour / 24.0)
    df_forecast['day_sin'] = np.sin(2 * np.pi * df_forecast['collected_at'].dt.dayofweek / 7.0)

    time_feature_cols = ['hour_sin', 'hour_cos', 'day_sin']  # 총 3개 (모델 입력 11개에 맞춤)

    # 3. 미래 고정/시간 특성 결합 (169 x 10) - Exogenous Features
    num_periods = 169
    repeated_fixed_tensor = fixed_features_tensor.repeat(num_periods, 1)  # 169 x 7

    time_numpy_array = df_forecast[time_feature_cols].values.astype(np.float32)
    time_tensor = torch.from_numpy(time_numpy_array)

    # 10개의 Exogenous Features (고정 7 + 시간 3)
    X_future_exogenous = torch.cat([repeated_fixed_tensor, time_tensor], dim=1)
    # X_future_exogenous 크기: torch.Size([169, 10])

    # --- 3. 재귀 예측 루프 실행 (168회) ---

    predictions_scaled_list = []
    known_data_tensor = X_train_raw_last_L.clone()

    occupancy_scaler = joblib.load('occupancy_scaler.joblib')

    model.eval()
    with torch.no_grad():
        # 168시간 예측 (i=1은 t+1 시점의 예측에 사용될 특성 행을 가져옴)
        for i in range(1, 169):
            # 1. 현재 예측에 사용될 입력 시퀀스 준비 (L x 11)
            # 💡 수정: lookback_length를 변수로 사용
            current_input_sequence = known_data_tensor[-lookback_length:, :]

            # 2. 배치 차원 추가 (1 x L x 11)
            current_input_batch = current_input_sequence.unsqueeze(0)

            # 3. 예측 실행 (결과 크기: 1 x 1)
            predictions_scaled = model(current_input_batch)

            # 4. 예측 결과 저장
            predictions_scaled_list.append(predictions_scaled.item())

            # 5. 다음 루프를 위한 새로운 행(t=i) 생성

            # Exogenous Features 추출 (t=i 시간의 특성)
            # i번째 행은 t+i 시점에 대한 Exogenous Features
            next_exogenous_features = X_future_exogenous[i]  # 크기: [10]

            # 새 행 (1 x 11) 생성: [Predicted Occupancy (Scaled), Exogenous Features...]
            # 🚨 Occupancy Rate가 첫 번째 컬럼(인덱스 0)이라고 가정
            new_row_features = torch.cat([predictions_scaled.squeeze(0), next_exogenous_features], dim=0)

            # 6. Known Data 텐서 업데이트
            known_data_tensor = torch.cat([
                known_data_tensor,
                new_row_features.unsqueeze(0)
            ], dim=0)

    # --- 4. 최종 결과 역변환 및 반환 ---

    predictions_scaled_numpy = np.array(predictions_scaled_list).reshape(-1, 1)
    target_numpy = occupancy_scaler.inverse_transform(predictions_scaled_numpy)
    target_numpy = np.clip(target_numpy, 0.0, 1.0)
    print(f"✅ 168개 시점의 재귀적 예측이 완료되었습니다. 결과 크기: {len(target_numpy)} 시간")
    return target_numpy.flatten().tolist()