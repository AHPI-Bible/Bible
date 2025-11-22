// AHPI 서버 주소 (로컬 컴퓨터)
const AHPI_API_BASE_URL = ""https://ahpi-bible-backend.onrender.com/api/get_data"";
document.addEventListener("DOMContentLoaded", function() {
    // 팝업 닫기 버튼 설정
    document.getElementById("modal-close-button").addEventListener("click", function() {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    // 시작 시 데이터 로드
    fetchHybridText("Genesis", 1, 1);
});

async function fetchHybridText(book, chapter, verse) {
    const reference = `${book}.${chapter}.${verse}`;
    const displayArea = document.querySelector(".bible-text-container");
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;

    try {
        // Netlify(HTTPS)에서 Localhost(HTTP)를 호출하면 보안 에러가 날 수 있음
        const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/${book}/${chapter}/${verse}`).then(res => res.json());
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${reference}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        if (ahpiData.error || !sefariaData.text) throw new Error("데이터 오류");

        displayArea.innerHTML = `
            <div class="verse">
                <p class="korean-text">${ahpiData.korean_text}</p>
                <p class="english-text">${sefariaData.text}</p>
                <p class="hebrew-text" dir="rtl">${sefariaData.he}</p> 
            </div>
        `;
        document.getElementById('commentary-display').innerHTML = `<p>${ahpiData.ahpi_commentary}</p>`;
        makeHebrewWordsClickable(); 

    } catch (error) {
        console.error("실패:", error);
        displayArea.innerHTML = `<p>데이터 로드 실패. (서버 연결 확인 필요)</p>`;
    }
}

function makeHebrewWordsClickable() {
    const hebrewElement = document.querySelector(".hebrew-text");
    if (!hebrewElement) return;
    
    const words = hebrewElement.textContent.split(/\s+/).filter(w => w.length > 0);
    let htmlContent = '';
    
    words.forEach(word => {
        if (/[\u0590-\u05FF]/.test(word)) {
            htmlContent += `<span class="hebrew-word" data-word="${word}">${word}</span> `;
        } else {
            htmlContent += `${word} `;
        }
    });
    hebrewElement.innerHTML = htmlContent;
    
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', handleWordClick);
    });
}

async function handleWordClick(event) {
    const word = event.target.dataset.word;
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    
    modalBody.innerHTML = `<p>검색 중...</p>`;
    modal.style.display = "flex"; 

    try {
        const res = await fetch(`https://www.sefaria.org/api/words/${word}`);
        const data = await res.json();
        
        let content = `<h3 dir="rtl">${data.entry}</h3>`;
        if (data.senses) {
            content += "<ol>" + data.senses.map(s => `<li>${s.definition.en}</li>`).join("") + "</ol>";
        }
        modalBody.innerHTML = content;
    } catch (e) {
        modalBody.innerHTML = "<p>정보 없음</p>";
    }
}