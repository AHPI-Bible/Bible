// AHPI 서버 주소 (Render 클라우드)
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api/get_data";

document.addEventListener("DOMContentLoaded", function() {
    // 팝업 닫기 버튼 설정
    document.getElementById("modal-close-button").addEventListener("click", function() {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    // 시작 시 창세기 1장 1절 데이터 로드
    fetchHybridText("Genesis", 1, 1);
});

async function fetchHybridText(book, chapter, verse) {
    const reference = `${book}.${chapter}.${verse}`;
    const displayArea = document.querySelector(".bible-text-container");
    
    // 로딩 메시지 표시
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;

    try {
        // AHPI 서버(한글/주석)와 Sefaria API(원어/영어) 동시 요청
        const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/${book}/${chapter}/${verse}`).then(res => res.json());
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${reference}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        // 데이터 유효성 검사
        if (ahpiData.error || !sefariaData.text) throw new Error("데이터 오류");

        // 화면에 본문 출력
        displayArea.innerHTML = `
            <div class="verse">
                <p class="korean-text">${ahpiData.korean_text}</p>
                <p class="english-text">${sefariaData.text}</p>
                <p class="hebrew-text" dir="rtl">${sefariaData.he}</p> 
            </div>
        `;
        
        // 주석 출력
        document.getElementById('commentary-display').innerHTML = `<p>${ahpiData.ahpi_commentary}</p>`;
        
        // 히브리어 단어 클릭 기능 활성화
        makeHebrewWordsClickable(); 

    } catch (error) {
        console.error("실패:", error);
        displayArea.innerHTML = `<p>데이터 로드 실패. (서버 연결 상태를 확인하세요)</p>`;
    }
}

function makeHebrewWordsClickable() {
    const hebrewElement = document.querySelector(".hebrew-text");
    if (!hebrewElement) return;
    
    // 공백 기준으로 단어 쪼개기
    const words = hebrewElement.textContent.split(/\s+/).filter(w => w.length > 0);
    let htmlContent = '';
    
    words.forEach(word => {
        // 히브리어 문자가 포함된 경우만 클릭 가능한 span으로 감싸기
        if (/[\u0590-\u05FF]/.test(word)) {
            htmlContent += `<span class="hebrew-word" data-word="${word}">${word}</span> `;
        } else {
            htmlContent += `${word} `;
        }
    });
    hebrewElement.innerHTML = htmlContent;
    
    // 생성된 단어들에 클릭 이벤트 추가
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', handleWordClick);
    });
}

async function handleWordClick(event) {
    const word = event.target.dataset.word;
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    
    // 팝업 열기 및 로딩 표시
    modalBody.innerHTML = `<p>검색 중...</p>`;
    modal.style.display = "flex"; 

    try {
        // Sefaria 사전 API 호출
        const res = await fetch(`https://www.sefaria.org/api/words/${word}`);
        const data = await res.json();
        
        // 결과 표시
        let content = `<h3 dir="rtl">${data.entry}</h3>`;
        if (data.senses) {
            content += "<ol>" + data.senses.map(s => `<li>${s.definition.en}</li>`).join("") + "</ol>";
        } else {
            content += "<p>정의를 찾을 수 없습니다.</p>";
        }
        modalBody.innerHTML = content;

    } catch (e) {
        modalBody.innerHTML = "<p>정보 없음</p>";
    }
}