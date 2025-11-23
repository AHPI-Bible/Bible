import csv
import os
import psycopg2
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

print("--- 서버 시작 ---")

# --- [1] 데이터 저장소 (메모리) ---
korean_map = {}
english_map = {}
greek_map = {}
hebrew_map = {}
lexicon_map = {}
search_index = { 'kor': [], 'eng': [], 'heb': [], 'grk': [] }

base_dir = os.path.dirname(os.path.abspath(__file__))

# --- [2] 책 이름 -> 숫자 ID 매핑 ---
BOOK_TO_ID = {
    "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
    "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
    "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
    "Ezra": 15, "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19, "Proverbs": 20,
    "Ecclesiastes": 21, "Song of Songs": 22, "Isaiah": 23, "Jeremiah": 24,
    "Lamentations": 25, "Ezekiel": 26, "Daniel": 27, "Hosea": 28, "Joel": 29,
    "Amos": 30, "Obadiah": 31, "Jonah": 32, "Micah": 33, "Nahum": 34,
    "Habakkuk": 35, "Zephaniah": 36, "Haggai": 37, "Zechariah": 38, "Malachi": 39,
    "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44,
    "Romans": 45, "1 Corinthians": 46, "2 Corinthians": 47, "Galatians": 48,
    "Ephesians": 49, "Philippians": 50, "Colossians": 51, "1 Thessalonians": 52,
    "2 Thessalonians": 53, "1 Timothy": 54, "2 Timothy": 55, "Titus": 56,
    "Philemon": 57, "Hebrews": 58, "James": 59, "1 Peter": 60, "2 Peter": 61,
    "1 John": 62, "2 John": 63, "3 John": 64, "Jude": 65, "Revelation": 66
}

# --- [3] CSV 로드 함수 ---
def load_csv_to_map(filename, target_map, lang_code=None, is_lexicon=False):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"⚠️ 파일 없음: {filename}")
        return
    
    try:
        with open(path, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            count = 0
            for row in reader:
                if not row: continue
                if is_lexicon:
                    if len(row) >= 2:
                        target_map[row[0]] = row[1]
                        count += 1
                    continue
                if len(row) < 4: continue
                b, c, v, t = row[0], row[1], row[2], row[3]
                
                # 절 번호 보정 로직
                try:
                    c_int = int(c)
                    v_int = int(v)
                    is_valid = True
                except ValueError:
                    if v.strip() == '1':
                        try: c_int, v_int, is_valid = int(c) if c.isdigit() else 1, 1, True
                        except: is_valid = False
                    else: is_valid = False

                if is_valid:
                    key = f"{b}-{c_int}-{v_int}"
                    target_map[key] = t
                    count += 1
                    if lang_code:
                        search_index[lang_code].append({"book": b, "chapter": c_int, "verse": v_int, "text": t})
        print(f"✅ {filename} 로드 완료: {count}건")
    except Exception as e:
        print(f"❌ {filename} 로드 실패: {e}")

load_csv_to_map('korean_bible.csv', korean_map, lang_code='kor')
load_csv_to_map('english_bible.csv', english_map, lang_code='eng')
load_csv_to_map('greek_bible.csv', greek_map, lang_code='grk')
load_csv_to_map('hebrew_bible.csv', hebrew_map, lang_code='heb')
load_csv_to_map('strong_lexicon.csv', lexicon_map, is_lexicon=True)

# --- [4] 스마트 DB 연결 함수 (핵심!) ---
# 로컬이면 SQLite(파일), 서버면 Postgres를 자동으로 선택합니다.
IS_LOCAL = 'DATABASE_URL' not in os.environ

def get_db_connection():
    if IS_LOCAL:
        # 로컬: 내 컴퓨터에 'ahpi_local.db' 파일을 만듭니다.
        conn = sqlite3.connect(os.path.join(base_dir, 'ahpi_local.db'))
        # SQLite는 딕셔너리 형태로 결과를 받기 위해 설정 필요
        conn.row_factory = sqlite3.Row 
        return conn
    else:
        # 서버: Render 데이터베이스 연결
        return psycopg2.connect(os.environ['DATABASE_URL'])

# SQL 쿼리 호환성을 위한 헬퍼 함수
# Postgres는 %s, SQLite는 ? 를 사용하므로 자동으로 바꿔줍니다.
def execute_query(cursor, query, params=None):
    if IS_LOCAL:
        # SQLite 문법으로 변환 (%s -> ?)
        query = query.replace('%s', '?')
        # TIMESTAMP 타입 호환성 처리 (간단화)
        query = query.replace('TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        query = query.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    
    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)

# --- [5] DB 초기화 함수 ---
def init_db():
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            print(f"⚠️ DB 초기화 시작 ({'로컬 SQLite' if IS_LOCAL else '서버 Postgres'})...")

            # 기존 테이블 삭제 (구조 변경 반영을 위해)
            if IS_LOCAL:
                cur.execute("DROP TABLE IF EXISTS commentaries")
                cur.execute("DROP TABLE IF EXISTS users")
            else:
                cur.execute("DROP TABLE IF EXISTS commentaries CASCADE")
                cur.execute("DROP TABLE IF EXISTS users CASCADE")

            # 1. Commentaries 테이블 생성
            execute_query(cur, """
                CREATE TABLE commentaries (
                    id SERIAL PRIMARY KEY,
                    book VARCHAR(50) NOT NULL,
                    chapter INT NOT NULL,
                    verse INT NOT NULL,
                    content TEXT,
                    author_id INT,
                    commentary_type VARCHAR(10) NOT NULL DEFAULT 'open',
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    UNIQUE(book, chapter, verse, commentary_type)
                );
            """)

            # 2. Users 테이블 생성
            execute_query(cur, """
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL, 
                    display_name VARCHAR(100) NOT NULL,
                    grade INT NOT NULL DEFAULT 1, 
                    is_verified BOOLEAN DEFAULT FALSE
                );
            """)

            # 3. 테스트 사용자 데이터 복구
            print("🔑 테스트 사용자 생성 중...")
            
            # Grade 3: Open 주해 작성 가능
            execute_query(cur, """
                INSERT INTO users (username, password_hash, display_name, grade, is_verified)
                VALUES ('test_member', '1234', 'AHPI 검증 회원', 3, TRUE);
            """)
            
            # Grade 5: 관리자 (AHPI 주해 작성 가능)
            execute_query(cur, """
                INSERT INTO users (username, password_hash, display_name, grade, is_verified)
                VALUES ('admin', '1234', 'AHPI 관리자', 5, TRUE);
            """)
            
            conn.commit()
            cur.close()
            conn.close()
            print("✅ DB 초기화 및 테이블 재생성 완료!")
    except Exception as e:
        print(f"❌ DB 초기화 오류 발생: {e}")

# 앱 시작 시 DB 초기화 실행
with app.app_context():
    init_db()

# --- [6] 원전 분해 DB 함수 ---
def get_analysis_from_sdb(book, chapter, verse):
    sdb_path = os.path.join(base_dir, '원전분해.sdb')
    if not os.path.exists(sdb_path): return {"error": "원전분해.sdb 파일 없음"}
    try:
        conn = sqlite3.connect(sdb_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row['name'] for row in cur.fetchall()]
        target_table = 'Bible' if 'Bible' in tables else None
        if not target_table: 
            conn.close()
            return {"error": "DB 테이블 없음"}

        book_id = BOOK_TO_ID.get(book)
        query = f"SELECT * FROM {target_table} WHERE book = ? AND chapter = ? AND verse = ?"
        cur.execute(query, (book_id if book_id else book, chapter, verse))
        
        rows = cur.fetchall()
        result = [dict(row) for row in rows]
        conn.close()
        return result
    except Exception as e: return {"error": str(e)}

# --- [7] API 엔드포인트 ---

@app.route('/api/get_chapter_data/<book_name>/<int:chapter_num>', methods=['GET'])
def get_ahpi_chapter_data(book_name, chapter_num):
    # 메모리 데이터 로드
    kv, ev, gv, hv = {}, {}, {}, {}
    for i in range(1, 177):
        key = f"{book_name}-{chapter_num}-{i}"
        if key in korean_map: kv[i] = korean_map[key]
        if key in english_map: ev[i] = english_map[key]
        if key in greek_map: gv[i] = greek_map[key]
        if key in hebrew_map: hv[i] = hebrew_map[key]

    # DB 주해 로드
    ahpi_comm = {}
    open_comm = {}
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            execute_query(cur, "SELECT verse, content, commentary_type FROM commentaries WHERE book = %s AND chapter = %s", (book_name, chapter_num))
            rows = cur.fetchall()
            for row in rows:
                # SQLite는 인덱스/키 접근 혼용, Postgres는 튜플
                verse = row['verse'] if IS_LOCAL else row[0]
                content = row['content'] if IS_LOCAL else row[1]
                c_type = row['commentary_type'] if IS_LOCAL else row[2]
                
                if c_type == 'ahpi': ahpi_comm[verse] = content
                elif c_type == 'open': open_comm[verse] = content
            cur.close()
            conn.close()
    except Exception as e:
        print(f"주해 로드 오류: {e}")

    return jsonify({
        'korean_verses': kv, 'english_verses': ev,
        'greek_verses': gv, 'hebrew_verses': hv,
        'ahpi_commentaries': ahpi_comm, 'open_commentaries': open_comm
    })

@app.route('/api/lexicon/<code>', methods=['GET'])
def get_lexicon(code):
    return jsonify({"code": code, "content": lexicon_map.get(code, "사전 데이터가 없습니다.")})

@app.route('/api/analysis/<book>/<int:chapter>/<int:verse>', methods=['GET'])
def get_verse_analysis(book, chapter, verse):
    return jsonify(get_analysis_from_sdb(book, chapter, verse))

@app.route('/api/save_commentary', methods=['POST'])
def save_commentary():
    data = request.json
    try:
        conn = get_db_connection()
        if not conn: return jsonify({"error": "DB 연결 오류"}), 500
        cur = conn.cursor()

        # 1. 인증 확인
        if not data.get('user_id'):
            return jsonify({"error": "로그인 필요"}), 401
        
        # 2. Grade 조회
        execute_query(cur, "SELECT grade FROM users WHERE id = %s", (data['user_id'],))
        user_row = cur.fetchone()
        if not user_row: return jsonify({"error": "사용자 정보 없음"}), 403
        
        user_grade = user_row['grade'] if IS_LOCAL else user_row[0]
        
        # 3. 권한 확인
        ctype = data.get('commentary_type', 'open')
        req_grade = 3 if ctype == 'open' else 4
        if ctype not in ['open', 'ahpi']: return jsonify({"error": "잘못된 타입"}), 400
        if user_grade < req_grade: return jsonify({"error": "권한 부족"}), 403

        # 4. 저장
        execute_query(cur, """
            INSERT INTO commentaries (book, chapter, verse, content, commentary_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (book, chapter, verse, commentary_type) 
            DO UPDATE SET content = excluded.content;
        """ if IS_LOCAL else """
            INSERT INTO commentaries (book, chapter, verse, content, commentary_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (book, chapter, verse, commentary_type) 
            DO UPDATE SET content = EXCLUDED.content;
        """, (data['book'], data['chapter'], data['verse'], data['content'], ctype))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "저장 성공"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search_bible():
    q = request.args.get('q', '')
    lang = request.args.get('lang', 'kor')
    if len(q) < 2: return jsonify({"results": [], "message": "2글자 이상"})
    results = []
    count = 0
    for item in search_index.get(lang, []):
        if q in item['text']:
            results.append(item)
            count += 1
            if count >= 100: break
    return jsonify({"results": results, "count": count})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            execute_query(cur, "SELECT id, password_hash, grade, display_name FROM users WHERE username = %s AND is_verified = TRUE", (data.get('username'),))
            user = cur.fetchone()
            cur.close()
            conn.close()

            if user:
                # DB 결과 가져오기 (튜플 vs 딕셔너리 호환)
                uid = user['id'] if IS_LOCAL else user[0]
                pwd = user['password_hash'] if IS_LOCAL else user[1]
                grd = user['grade'] if IS_LOCAL else user[2]
                dname = user['display_name'] if IS_LOCAL else user[3]

                if data.get('password') == pwd:
                    return jsonify({"message": "성공", "user_id": uid, "grade": grd, "display_name": dname, "is_authenticated": True}), 200
                else: return jsonify({"message": "비번 불일치"}), 401
            else: return jsonify({"message": "사용자 없음"}), 401
    except Exception as e: return jsonify({"error": str(e)}), 500
    return jsonify({"error": "DB 연결 실패"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)