import sqlite3

# 파일 이름 (대소문자 정확해야 함)
DB_FILE = "BHSSBL.bdb"

print(f"📂 '{DB_FILE}' 파일 내부 구조 분석 중...\n")

try:
    # 1. 데이터베이스 연결 시도
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 2. 테이블 목록 가져오기
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    if not tables:
        print("❌ 테이블을 찾을 수 없습니다. SQLite 파일이 아닐 수 있습니다.")
    else:
        print(f"✅ 발견된 테이블 목록: {tables}")
        
        # 3. 첫 번째 테이블의 내용 살짝 보기 (최대 3줄)
        for table in tables:
            table_name = table[0]
            print(f"\n--- [테이블: {table_name}] 데이터 샘플 ---")
            
            # 컬럼 이름 확인
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [info[1] for info in cursor.fetchall()]
            print(f"열(Columns): {columns}")
            
            # 데이터 3줄 출력
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            for row in rows:
                print(row)

    conn.close()

except sqlite3.DatabaseError:
    print("❌ 에러: 이 파일은 SQLite 데이터베이스가 아니거나 암호화되어 있습니다.")
except Exception as e:
    print(f"❌ 오류 발생: {e}")