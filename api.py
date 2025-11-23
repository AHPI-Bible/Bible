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
search_index = {
    'kor': [], 'eng': [], 'heb': [], 'grk': []
}

base_dir = os.path.dirname(os.path.abspath(__file__))

def load_csv_to_map(filename, target_map, lang_code=None, is_lexicon=False):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"⚠️ 파일 없음: {filename}")
        return
    
    try:
        # [핵심 수정] 1절이 안 보이는 문제 해결을 위한 강력한 헤더 감지 로직
        with open(path, 'r', encoding='utf-8-sig') as f:
            # 첫 줄을 읽어서 확인
            first_line = f.readline().strip()
            f.seek(0) # 다시 처음으로 되돌림

            # 첫 줄에 'book'이나 'chapter' 같은 단어가 있으면 헤더가 있는 것
            # 없으면(즉, Genesis, Matthew 등으로 시작하면) 데이터로 간주
            has_header = any(keyword in first_line.lower() for keyword in ['book', 'chapter', 'verse', 'text', 'strong_code', 'content'])
            
            # 예외: 만약 첫 줄이 'Genesis'나 'Matthew' 등으로 시작하면 무조건 헤더 없음으로 처리
            if "genesis" in first_line.lower() or "matthew" in first_line.lower() or "창세기" in first_line:
                has_header = False

            reader = None
            if has_header:
                reader = csv.DictReader(f)
            else:
                # 헤더가 없으면 우리가 직접 컬럼명을 부여해서 1절부터 읽게 함
                if is_lexicon:
                    reader = csv.DictReader(f, fieldnames=['strong_code', 'content'])
                else:
                    reader = csv.DictReader(f, fieldnames=['book', 'chapter', 'verse', 'text'])

            # 공백 제거
            if reader.fieldnames:
                reader.fieldnames = [name.strip() for name in reader.fieldnames]

            count = 0
            for row in reader:
                if is_lexicon:
                    code = row.get('strong_code')
                    content = row.get('content')
                    if code and content:
                        target_map[code] = content
                        count += 1
                else:
                    b = row.get('book_name') or row.get('book')
                    c = row.get('chapter_num') or row.get('chapter')
                    v = row.get('verse_num') or row.get('verse')
                    t = row.get('korean_text') or row.get('text') or row.get('content')
                    
                    if not b or not c or not v: continue

                    try:
                        key = f"{b}-{int(c)}-{int(v)}"
                        target_map[key] = t
                        count += 1
                        
                        if lang_code:
                            search_index[lang_code].append({
                                "book": b, "chapter": int(c), "verse": int(v), "text": t
                            })
                    except ValueError:
                        continue
                        
        print(f"✅ {filename} 로드 완료: {count}건 (헤더: {'있음' if has_header else '없음 -> 1절 강제 로드'})")
    except Exception as e:
        print(f"❌ {filename} 로드 실패: {e}")

# 파일 로드 실행
load_csv_to_map('korean_bible.csv', korean_map, lang_code='kor')
load_csv_to_map('english_bible.csv', english_map, lang_code='eng')
load_csv_to_map('greek_bible.csv', greek_map, lang_code='grk')
load_csv_to_map('hebrew_bible.csv', hebrew_map, lang_code='heb')
load_csv_to_map('strong_lexicon.csv', lexicon_map, is_lexicon=True)

# DB 연결 (주석 처리 또는 환경변수 사용)
def get_db_connection():
    if 'DATABASE_URL' in os.environ:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        return conn
    # 로컬 테스트용 (없으면 에러)
    raise Exception("DATABASE_URL 환경변수가 설정되지 않았습니다.")

def init_db():
    try:
        conn = get_db_connection()
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

# [수정됨] 원전분해 DB 연결 및 테이블 확인 로직 추가
def get_analysis_from_sdb(book, chapter, verse):
    sdb_path = os.path.join(base_dir, '원전분해.sdb')
    
    if not os.path.exists(sdb_path):
        return {"error": "원전분해.sdb 파일이 없습니다."}

    try:
        conn = sqlite3.connect(sdb_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # 1. 테이블 이름 확인 (디버깅용)
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row['name'] for row in cur.fetchall()]
        
        # 2. 'words' 테이블이 있는지 확인
        target_table = 'words'
        if target_table not in tables:
            # words가 없으면, 혹시 다른 이름이 있는지 확인해서 에러 메시지로 알려줌
            conn.close()
            return {"error": f"DB 오류: 'words' 테이블이 없습니다. 발견된 테이블 목록: {tables}"}

        # 3. 쿼리 실행 (테이블 이름이 맞다면)
        query = f"""
            SELECT original_word, pronunciation, strong_code, grammar_desc, meaning
            FROM {target_table}
            WHERE book = ? AND chapter = ? AND verse = ?
            ORDER BY word_order
        """
        cur.execute(query, (book, chapter, verse))
        rows = cur.fetchall()
        
        result = []
        for row in rows:
            result.append({
                "word": row["original_word"],
                "pron": row["pronunciation"],
                "code": row["strong_code"],
                "grammar": row["grammar_desc"],
                "meaning": row["meaning"]
            })
            
        conn.close()
        return result
    except Exception as e:
        return {"error": f"DB 오류: {str(e)}"}

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
    data = get_analysis_from_sdb(book, chapter, verse)
    return jsonify(data)

@app.route('/api/save_commentary', methods=['POST'])
def save_commentary():
    data = request.json
    try:
        conn = get_db_connection()
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
            results.append(item)
            count += 1
            if count >= 100: break
            
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)