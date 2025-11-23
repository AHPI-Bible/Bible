import sqlite3
import csv
import re

# 변환할 파일 목록
# (입력 파일명, 출력 파일명)
CONVERSIONS = [
    ("개역한글S.sdb", "korean_bible.csv"),
    ("KJV_S.sdb", "english_bible.csv")
]

# 구약 39권, 신약 27권 책 이름 매핑 (ID -> 영어 이름)
# (1번 Genesis ~ 66번 Revelation)
BOOK_MAP = {
    1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
    6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
    11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles",
    15: "Ezra", 16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms", 20: "Proverbs",
    21: "Ecclesiastes", 22: "Song of Songs", 23: "Isaiah", 24: "Jeremiah",
    25: "Lamentations", 26: "Ezekiel", 27: "Daniel", 28: "Hosea", 29: "Joel",
    30: "Amos", 31: "Obadiah", 32: "Jonah", 33: "Micah", 34: "Nahum",
    35: "Habakkuk", 36: "Zephaniah", 37: "Haggai", 38: "Zechariah", 39: "Malachi",
    40: "Matthew", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts",
    45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians", 48: "Galatians", 49: "Ephesians",
    50: "Philippians", 51: "Colossians", 52: "1 Thessalonians", 53: "2 Thessalonians",
    54: "1 Timothy", 55: "2 Timothy", 56: "Titus", 57: "Philemon",
    58: "Hebrews", 59: "James", 60: "1 Peter", 61: "2 Peter",
    62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude", 66: "Revelation"
}

print("🚀 성경 데이터베이스 변환 시작...\n")

for input_db, output_csv in CONVERSIONS:
    print(f"🔄 변환 중: {input_db} -> {output_csv}")
    
    try:
        conn = sqlite3.connect(input_db)
        cursor = conn.cursor()
        
        # Bible 테이블에서 데이터 가져오기
        cursor.execute("SELECT book, chapter, verse, btext FROM Bible")
        rows = cursor.fetchall()
        
        with open(output_csv, 'w', encoding='utf-8', newline='') as csvfile:
            writer = csv.writer(csvfile)
            # CSV 헤더 (우리 시스템 표준)
            writer.writerow(["book", "chapter", "verse", "text"])
            
            count = 0
            for book_id, chapter, verse, text in rows:
                if book_id in BOOK_MAP:
                    book_name = BOOK_MAP[book_id]
                    
                    # 스트롱 코드 정제 (선택 사항: 일단 원본 그대로 저장)
                    # <WH7225> 같은 태그는 프론트엔드에서 처리하거나 여기서 바꿀 수 있음.
                    # 여기서는 원본 그대로 저장합니다.
                    
                    writer.writerow([book_name, chapter, verse, text])
                    count += 1
                    
        print(f"   ✅ 성공! {count}절 저장 완료.")
        conn.close()
        
    except Exception as e:
        print(f"   ❌ 실패: {e}")

print("\n🎉 모든 성경 변환 완료!")