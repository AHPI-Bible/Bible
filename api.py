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
            results.append(item)
            count += 1
            if count >= 100: break
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)