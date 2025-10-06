import pandas as pd

# CSV 파일 로드
df = pd.read_csv('parking_lots.csv')

# 더존을지타워 찾기
douzun = df[df['parking_name'].str.contains('더존', na=False)]
print("더존을지타워 데이터:")
if len(douzun) > 0:
    for _, row in douzun.iterrows():
        print(f"주차장명: {row['parking_name']}")
        print(f"add_rates: {row['add_rates']}")
        print(f"time_rate: {row['time_rate']}")
        print(f"rates: {row['rates']}")
        print(f"계산된 가격 (add_rates * time_rate): {row['add_rates'] * row['time_rate']}")
        print("---")

# 다른 주차장들도 확인
print("\n다른 주차장 샘플:")
sample = df[['parking_name', 'add_rates', 'time_rate', 'rates']].head(10)
for _, row in sample.iterrows():
    calculated = row['add_rates'] * row['time_rate']
    print(f"{row['parking_name']}: add_rates={row['add_rates']}, time_rate={row['time_rate']}, 계산값={calculated}")
