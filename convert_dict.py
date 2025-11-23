import sqlite3
import csv

# 한글 사전 파일
INPUT_DB = "HebGrkKo.dct"
OUTPUT_CSV = "strong_lexicon.csv"

print(f"🔄 사전 변환 중: {INPUT_DB} -> {OUTPUT_CSV}")

try:
    conn = sqlite3.connect(INPUT_DB)
    cursor = conn.cursor()
    
    # Lexicon 테이블에서 코드와 내용 가져오기
    cursor.execute("SELECT scode, dtext FROM Lexicon")
    rows = cursor.fetchall()
    
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["strong_code", "content"]) # 헤더
        
        count = 0
        for scode, content in rows:
            # scode 예: G1, H7225
            # content: HTML 태그가 포함된 설명
            writer.writerow([scode, content])
            count += 1
            
    print(f"🎉 대성공! {count}개 단어 사전 변환 완료.")
    conn.close()

except Exception as e:
    print(f"❌ 실패: {e}")