import csv
import os
import psycopg2
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

print("--- 서버 시작 ---")

# 데이터 저장소
korean_map = {}          
english_map = {}         
greek_map = {}           
hebrew_map = {}          
lexicon_map = {}         

# 검색용 인덱스
search_index = { 'kor': [], 'eng': [], 'heb': [], 'grk': [] }

base_dir = os.path.dirname(os.path.abspath(__file__))

# 책 이름 -> 숫자 ID 매핑
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

def load_csv_to_map(filename, target_map, lang_code=None, is_lexicon=False):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"⚠️ 파일 없음: {filename}")
        return
    
    try:
        # 1절 강제 로드 로직 (Header 무시, 숫자면 무조건 로드)
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

                is_valid = False
                try:
                    c_int = int(c)
                    v_int = int(v)
                    is_valid = True
                except ValueError:
                    # 숫자가 아니더라도 v가 '1'이면 강제로 읽음 (1절 누락 방지)
                    if v.strip() == '1':
                        try:
                            c_int = int(c) if c.isdigit() else 1
                            v_int = 1
                            is_valid = True
                        except: is_valid = False
                    else:
                        is_valid = False

                if is_valid:
                    key = f"{b}-{c_int}-{v_int}"
                    target_map[key] = t
                    count += 1
                    
                    if lang_code:
                        search_index[lang_code].append({
                            "book": b, "chapter": c_int, "verse": v_int, "text": t
                        })

        print(f"✅ {filename} 로드 완료: {count}건")
        
    except Exception as e:
        print(f"❌ {filename} 로드 실패: {e}")

load_csv_to_map('korean_bible.csv', korean_map, lang_code='kor')
load_csv_to_map('english_bible.csv', english_map, lang_code='eng')
load_csv_to_map('greek_bible.csv', greek_map, lang_code='grk')
load_csv_to_map('hebrew_bible.csv', hebrew_map, lang_code='heb')
load_csv_to_map('strong_lexicon.csv', lexicon_map, is_lexicon=True)

def get_db_connection():
    if 'DATABASE_URL' in os.environ:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        return conn
    return None

# api.py 파일의 init_db 함수 내부 (conn.commit() 전에 추가)
def init_db():
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            # ... (commentaries 테이블 생성 로직) ...

            # [수정] users 테이블 생성: 'role' 대신 'grade' INT 타입 사용
# [NEW] 🔑 테스트 사용자 재추가 SQL 실행 (Grade 3 = Open 주해 권한)
            cur.execute("""
                INSERT INTO users (username, password_hash, display_name, grade, is_verified)
                VALUES ('test_member', '1234', 'AHPI 검증 회원', 3, TRUE)
                ON CONFLICT (username) DO NOTHING;
            """)
            print("✅ 테스트 사용자 'test_member' (Grade 3) 재추가 시도 완료")
            
            conn.commit()
            cur.close()
            conn.close()
            print("DB 초기화 완료 및 users 테이블 추가")
    except Exception as e:
        print(f"DB 초기화 오류 발생: {e}")
        pass

with app.app_context():
    init_db()

def get_analysis_from_sdb(book, chapter, verse):
    sdb_path = os.path.join(base_dir, '원전분해.sdb')
    if not os.path.exists(sdb_path):
        return {"error": "원전분해.sdb 파일이 없습니다."}

    try:
        conn = sqlite3.connect(sdb_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row['name'] for row in cur.fetchall()]
        
        target_table = 'Bible'
        if target_table not in tables:
            conn.close()
            return {"error": f"DB 오류: '{target_table}' 테이블 없음."}

        book_id = BOOK_TO_ID.get(book)
        
        if book_id:
            query = f"SELECT * FROM {target_table} WHERE book = ? AND chapter = ? AND verse = ?"
            cur.execute(query, (book_id, chapter, verse))
        else:
            query = f"SELECT * FROM {target_table} WHERE book = ? AND chapter = ? AND verse = ?"
            cur.execute(query, (book, chapter, verse))
            
        rows = cur.fetchall()
        result = []
        for row in rows:
            result.append(dict(row))
            
        conn.close()
        return result

    except Exception as e:
        return {"error": f"DB 쿼리 오류: {str(e)}"}

@app.route('/api/get_chapter_data/<book_name>/<int:chapter_num>', methods=['GET'])
# 수정할 함수: def get_ahpi_chapter_data(book_name, chapter_num):
def get_ahpi_chapter_data(book_name, chapter_num):
    # 성경 본문 로드 로직은 그대로 유지합니다. (생략)
    korean_verses = {}
    english_verses = {}
    greek_verses = {}
    hebrew_verses = {}
    
    for i in range(1, 177):
        key = f"{book_name}-{chapter_num}-{i}"
        if key in korean_map: korean_verses[i] = korean_map[key]
        if key in english_map: english_verses[i] = english_map[key]
        if key in greek_map: greek_verses[i] = greek_map[key]
        if key in hebrew_map: hebrew_verses[i] = hebrew_map[key]

    # --- 주석 로드 로직 수정 시작 ---
    ahpi_commentaries = {} # AHPI 공식 주해
    open_commentaries = {} # Open 주해 (회원 작성)
    
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            # commentary_type 필드를 추가하여 쿼리합니다.
            cur.execute("SELECT verse, content, commentary_type FROM commentaries WHERE book = %s AND chapter = %s", (book_name, chapter_num))
            rows = cur.fetchall()
            
            for row in rows:
                verse, content, comment_type = row
                
                # 타입에 따라 주석을 분리하여 저장합니다.
                if comment_type == 'ahpi':
                    ahpi_commentaries[verse] = content
                elif comment_type == 'open':
                    open_commentaries[verse] = content
                    
            cur.close()
            conn.close()
    except Exception as e:
        print(f"주석 로드 오류: {e}")
        pass
    # --- 주석 로드 로직 수정 끝 ---

    # 최종 반환 데이터 구조를 변경합니다.
    return jsonify({
        'korean_verses': korean_verses,
        'english_verses': english_verses,
        'greek_verses': greek_verses,
        'hebrew_verses': hebrew_verses,
        'ahpi_commentaries': ahpi_commentaries,  # 새 데이터
        'open_commentaries': open_commentaries # 새 데이터
    })

@app.route('/api/lexicon/<code>', methods=['GET'])
def get_lexicon(code):
    if code in lexicon_map:
        return jsonify({"code": code, "content": lexicon_map[code]})
    return jsonify({"code": code, "content": "사전 데이터가 없습니다."})

@app.route('/api/analysis/<book>/<int:chapter>/<int:verse>', methods=['GET'])
def get_verse_analysis(book, chapter, verse):
    data = get_analysis_from_sdb(book, chapter, verse)
    return jsonify(data)

# [수정] save_commentary 함수

@app.route('/api/save_commentary', methods=['POST'])
def save_commentary():
    data = request.json
    book = data.get('book')
    chapter = data.get('chapter')
    verse = data.get('verse')
    content = data.get('content')
    commentary_type = data.get('commentary_type', 'open')
    user_id = data.get('user_id') # 프론트엔드에서 보낸 user_id 추출
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "데이터베이스 연결 오류"}), 500

    try:
        cur = conn.cursor()
        
        # --- [NEW] 서버 측 권한 검증 로직 ---
        if not user_id:
            cur.close()
            conn.close()
            return jsonify({"error": "인증 정보(user_id)가 없습니다. 로그인해주세요."}), 401
        
        # 1. user_id로 사용자의 grade를 조회합니다.
        cur.execute("SELECT grade FROM users WHERE id = %s", (user_id,))
        user_grade_row = cur.fetchone()
        
        if not user_grade_row:
            cur.close()
            conn.close()
            return jsonify({"error": "유효하지 않은 사용자 정보입니다."}), 403
            
        user_grade = user_grade_row[0]
        
        # 2. Grade 3 미만은 Open 주해 작성 불가 (Open 주해의 권한 기준: 3)
        if commentary_type == 'open' and user_grade < 3:
            cur.close()
            conn.close()
            return jsonify({"error": f"권한 부족 (현재 Grade: {user_grade}). Open 주해는 Grade 3 이상만 작성 가능합니다."}), 403

        # ------------------------------------
        
        # 권한 확인 후 저장 로직 실행
        cur.execute("""
            INSERT INTO commentaries (book, chapter, verse, content, commentary_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (book, chapter, verse, commentary_type) 
            DO UPDATE SET content = EXCLUDED.content;
        """, (book, chapter, verse, content, commentary_type))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "저장 성공"}), 200
        
    except Exception as e:
        print(f"저장 중 서버 오류 발생: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search_bible():
    query = request.args.get('q', '')
    lang = request.args.get('lang', 'kor')
    if not query or len(query) < 2:
        return jsonify({"results": [], "message": "2글자 이상 입력"})
    results = []
    count = 0
    target_data = search_index.get(lang, [])
    for item in target_data:
        if query in item['text']:
            results.append(item)
            count += 1
            if count >= 100: break
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

# api.py 파일의 가장 아래 (if __name__ == '__main__': 위에 추가)

# [NEW] 로그인 엔드포인트 구현
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password') # 실제 구현에서는 비밀번호 해시(hash)를 받아야 합니다.
    
    if not username or not password:
        return jsonify({"message": "사용자 이름과 비밀번호를 입력해주세요."}), 400

    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            
            # [수정] SQL: role 대신 grade를 조회합니다.
            cur.execute("SELECT id, password_hash, grade, display_name FROM users WHERE username = %s AND is_verified = TRUE", (username,))
            user = cur.fetchone()
            cur.close()
            conn.close()

            if user:
                # [수정] grade 변수 사용
                user_id, stored_hash, grade, display_name = user 
                
                # 2. 비밀번호 확인 (⚠️ 주의: 실제 서비스에서는 안전한 비밀번호 해시 비교 로직을 사용해야 합니다.)
                if password == stored_hash: 
                    # 로그인 성공
                    return jsonify({
                        "message": "로그인 성공",
                        "user_id": user_id,
                        "username": username,
                        "display_name": display_name,
                        "grade": grade, # grade 값 반환 (1~5)
                        "is_authenticated": True
                    }), 200
                else:
                    # 비밀번호 불일치
                    return jsonify({"message": "비밀번호가 일치하지 않습니다."}), 401
            else:
                # 사용자 이름이 없거나 검증되지 않음
                return jsonify({"message": "사용자를 찾을 수 없거나 검증되지 않은 계정입니다."}), 401
                
        except Exception as e:
            return jsonify({"error": f"로그인 서버 오류: {str(e)}"}), 500
    else:
        return jsonify({"error": "데이터베이스 연결 오류"}), 500