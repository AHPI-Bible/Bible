import sqlite3
import os

# 분석할 파일 목록
FILES = [
    "개역한글S.sdb", 
    "KJV_S.sdb", 
    "HebGrkKo.dct",
    "HebGrkEn.dct"
]

print("📂 데이터베이스 파일 구조 분석 시작...\n")

for filename in FILES:
    if not os.path.exists(filename):
        print(f"⚠️ 파일 없음: {filename}")
        continue
        
    print(f"========================================")
    print(f"📄 분석 중: {filename}")
    print(f"========================================")

    try:
        conn = sqlite3.connect(filename)
        cursor = conn.cursor()

        # 1. 테이블 목록 가져오기
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        if not tables:
            print("   ❌ 테이블을 찾을 수 없습니다. (SQLite 형식이 아닐 수 있음)")
        else:
            for table in tables:
                table_name = table[0]
                print(f"   📌 테이블 이름: [{table_name}]")
                
                # 2. 각 테이블의 컬럼(열) 정보 가져오기
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                col_names = [col[1] for col in columns]
                print(f"      열(Columns): {col_names}")
                
                # 3. 데이터 샘플 1줄만 찍어보기
                try:
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
                    row = cursor.fetchone()
                    print(f"      데이터 예시: {row}")
                except:
                    print("      (데이터 읽기 실패)")
                print("-" * 40)

        conn.close()
        print("\n")

    except Exception as e:
        print(f"   ❌ 파일 열기 실패: {e}\n")