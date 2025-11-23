import csv
import os
import psycopg2
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

print("--- 서버 시작: 데이터 로드 중 ---")

# 데이터 저장소
korean_map = {}          
english_map = {}         
greek_map = {}           
hebrew_map = {}          
lexicon_map = {}         

# 검색용 인덱스
search_index = { 'kor': [], 'eng': [], 'heb': [], 'grk': [] }

base_dir = os.path.dirname(os.path.abspath(__file__))

def load_csv_to_map(filename, target_map, lang_code=None, is_lexicon=False):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"⚠️ 파일 없음: {filename}")
        return
    
    try:
        # [강력해진 1절 로직] utf-8-sig로 BOM 처리 + 헤더 정밀 감지
        with open(path, 'r', encoding='utf-8-sig') as f:
            # 먼저 리스트 형태로 모든 줄을 읽어버림 (안전함)
            rows = list(csv.reader(f))
            
            if not rows:
                return

            # 첫 줄 분석
            first_row = rows[0]
            # 헤더인지 판별: 첫 줄에 'Book', 'Chapter' 같은 단어가 있고, 숫자가 없으면 헤더라고 판단
            is_header = False
            if len(first_row) >= 3:
                # 만약 첫 줄의 2번째(장), 3번째(절) 컬럼이 숫자가 아니라면 제목줄일 확률 높음
                if not first_row[1].isdigit() or not first_row[2].isdigit():
                     # 단, 사전(Lexicon) 파일은 구조가 다르므로 예외
                    if not is_lexicon:
                        is_header = True

            start_idx = 1 if is_header else 0 # 헤더면 1번부터, 아니면 0번(1절)부터 시작
            
            # 사전 파일용 별도 처리
            if is_lexicon:
                for i in range(start_idx, len(rows)):
                    row = rows[i]
                    if len(row) < 2: continue
                    target_map[row[0]] = row[1]
            else:
                # 성경 파일 처리
                for i in range(start_idx, len(rows)):
                    row = rows[i]
                    if len(row) < 4: continue # 최소 4개 컬럼 (책,장,절,본문)
                    
                    b, c, v, t = row[0], row[1], row[2], row[3]
                    
                    # 데이터 유효성 검사
                    if not b or not c or not v: continue
                    
                    try:
                        key = f"{b}-{int(c)}-{int(v)}"
                        target_map[key] = t
                        
                        if lang_code:
                            search_index[lang_code].append({
                                "book": b, "chapter": int(c), "verse": int(v), "text": t
                            })
                    except ValueError:
                        continue # 숫자가 아닌 값이 들어있으면 패스

        print(f"✅ {filename} 로드 완료: {len(target_map)}건 (1절 강제 로드 적용됨)")
        
    except Exception as e:
        print(f"❌ {filename} 로드 실패: {e}")

# 파일 로드 실행
load_csv_to_map('korean_bible.csv', korean_map, lang_code='kor')
load_csv_to_map('english_bible.csv', english_map, lang_code='eng')
load_csv_to_map('greek_bible.csv', greek_map, lang_code='grk')
load_csv_to_map('hebrew_bible.csv', hebrew_map, lang_code='heb')
load_csv_to_map('strong_lexicon.csv', lexicon_map, is_lexicon=True)

# DB 연결
def get_db_connection():
    if 'DATABASE_URL' in os.environ:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        return conn
    # 로컬 테스트용은 예외처리
    return None

def init_db():
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS commentaries (
                    id SERIAL PRIMARY KEY,
                    book VARCHAR(50) NOT NULL,
                    chapter INT NOT NULL,
                    verse INT NOT NULL,
                    content TEXT,
                    UNIQUE(book, chapter, verse)
                );
            """)
            conn.commit()
            cur.close()
            conn.close()
            print("DB 초기화 완료")
    except Exception as e:
        print(f"DB 초기화 실패 (로컬 테스트 중이면 무시): {e}")

with app.app_context():
    init_db()

# [수정됨] 원전분해: 'Bible' 테이블 자동 분석
def get_analysis_from_sdb(book, chapter, verse):
    sdb_path = os.path.join(base_dir, '원전분해.sdb')
    
    if not os.path.exists(sdb_path):
        return {"error": "원전분해.sdb 파일이 없습니다."}

    try:
        conn = sqlite3.connect(sdb_path)
        conn.row_factory = sqlite3.Row # 컬럼명으로 접근 가능
        cur = conn.cursor()

        # 1. 테이블 확인
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row['name'] for row in cur.fetchall()]
        
        target_table = 'Bible' # 사용자 이미지에서 확인된 테이블명
        if target_table not in tables:
            conn.close()
            return {"error": f"DB 오류: '{target_table}' 테이블이 없습니다. 발견된 목록: {tables}"}

        # 2. 모든 컬럼 가져오기 (컬럼명을 모르므로 *)
        # 주의: book 이름이 파일마다 다를 수 있음 (영어/한글/숫자). 
        # 일단 파라미터로 넘어온 book(영어)을 시도해보고, 안되면 매핑이 필요할 수 있음.
        
        query = f"SELECT * FROM {target_table} WHERE book = ? AND chapter = ? AND verse = ?"
        
        # 만약 SDB 파일이 책 이름을 숫자로 관리한다면 여기서 변환 로직이 필요함.
        # 일단은 문자열 그대로 시도.
        cur.execute(query, (book, chapter, verse))
        rows = cur.fetchall()
        
        # 3. 결과 딕셔너리 변환 (컬럼명을 동적으로 가져옴)
        result = []
        for row in rows:
            # sqlite3.Row 객체를 딕셔너리로 변환
            row_dict = dict(row)
            result.append(row_dict)
            
        conn.close()
        return result

    except Exception as e:
        return {"error": f"DB 쿼리 오류: {str(e)}"}

# --- API 라우트 ---

@app.route('/api/get_chapter_data/<book_name>/<int:chapter_num>', methods=['GET'])
def get_ahpi_chapter_data(book_name, chapter_num):
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

    commentaries = {}
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT verse, content FROM commentaries WHERE book = %s AND chapter = %s", (book_name, chapter_num))
            rows = cur.fetchall()
            for row in rows:
                commentaries[row[0]] = row[1]
            cur.close()
            conn.close()
    except:
        pass

    return jsonify({
        'korean_verses': korean_verses,
        'english_verses': english_verses,
        'greek_verses': greek_verses,
        'hebrew_verses': hebrew_verses,
        'commentaries': commentaries
    })

@app.route('/api/lexicon/<code>', methods=['GET'])
def get_lexicon(code):
    if code in lexicon_map:
        return jsonify({"code": code, "content": lexicon_map[code]})
    return jsonify({"code": code, "content": "사전 데이터가 없습니다."})

@app.route('/api/analysis/<book>/<int:chapter>/<int:verse>', methods=['GET'])
def get_verse_analysis(book, chapter, verse):
    # sdb 조회
    data = get_analysis_from_sdb(book, chapter, verse)
    return jsonify(data)

@app.route('/api/save_commentary', methods=['POST'])
def save_commentary():
    data = request.json
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO commentaries (book, chapter, verse, content)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (book, chapter, verse) 
                DO UPDATE SET content = EXCLUDED.content;
            """, (data['book'], data['chapter'], data['verse'], data['content']))
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"message": "저장 성공"}), 200
        else:
             return jsonify({"error": "DB 연결 불가"}), 500
    except Exception as e:
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
            # 검색 결과 미리보기 텍스트 생성 (앞뒤 자르기 등은 프론트에서 해도 됨)
            results.append(item)
            count += 1
            if count >= 100: break
            
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)