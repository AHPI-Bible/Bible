// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 현재 보고 있는 성경 위치를 기억하는 변수
let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;

document.addEventListener("DOMContentLoaded", function() {
    // 1. 팝업 닫기
    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    // 2. 에디터 버튼 이벤트 연결
    const displayDiv = document.getElementById("commentary-display");
    const editorDiv = document.getElementById("editor-container");
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const inputArea = document.getElementById("commentary-input");

    // [작성/수정] 버튼 클릭 시
    editBtn.addEventListener("click", () => {
        // 현재 주석 내용을 입력창으로 가져옴
        inputArea.value = displayDiv.innerText === "작성된 주석이 없습니다." ? "" : displayDiv.innerText;
        // 화면 전환
        displayDiv.style.display = "none";
        editBtn.style.display = "none";
        editorDiv.style.display = "block";
    });

    // [취소] 버튼 클릭 시
    cancelBtn.addEventListener("click", () => {
        displayDiv.style.display = "block";
        editBtn.style.display = "block";
        editorDiv.style.display = "none";
    });

    // [저장] 버튼 클릭 시 (핵심 기능!)
    saveBtn.addEventListener("click", saveCommentary);

    // 시작 시 데이터 로드
    fetchHybridText(currentBook, currentChapter, currentVerse);
});

// 데이터 불러오기
async function fetchHybridText(book, chapter, verse) {
    // 현재 위치 업데이트
    currentBook = book;
    currentChapter = chapter;
    currentVerse = verse;

    const displayArea = document.querySelector(".bible-text-container");
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;

    try {
        const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_data/${book}/${chapter}/${verse}`).then(res => res.json());
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        if (ahpiData.error || !sefariaData.text) throw new Error("데이터 오류");

        displayArea.innerHTML = `
            <div class="verse">
                <p class="korean-text">${ahpiData.korean_text}</p>
                <p class="english-text">${sefariaData.text}</p>
                <p class="hebrew-text" dir="rtl">${sefariaData.he}</p> 
            </div>
        `;
        document.getElementById('commentary-display').innerText = ahpiData.ahpi_commentary;
        makeHebrewWordsClickable(); 

    } catch (error) {
        console.error("실패:", error);
        displayArea.innerHTML = `<p>데이터 로드 실패.</p>`;
    }
}

// [핵심] 주석 저장 함수 (POST 요청)
async function saveCommentary() {
    const content = document.getElementById("commentary-input").value;
    const saveBtn = document.getElementById("save-btn");
    
    saveBtn.innerText = "저장 중...";
    saveBtn.disabled = true;

    try {
        const response = await fetch(`${AHPI_API_BASE_URL}/save_commentary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book: currentBook,
                chapter: currentChapter,
                verse: currentVerse,
                content: content
            })
        });

        if (response.ok) {
            alert("주석이 저장되었습니다!");
            // 화면 갱신 (저장된 내용 보여주기)
            document.getElementById('commentary-display').innerText = content;
            // 에디터 닫기
            document.getElementById("editor-container").style.display = "none";
            document.getElementById("commentary-display").style.display = "block";
            document.getElementById("edit-btn").style.display = "block";
        } else {
            alert("저장 실패: 서버 오류");
        }
    } catch (error) {
        console.error("저장 오류:", error);
        alert("저장에 실패했습니다.");
    } finally {
        saveBtn.innerText = "저장";
        saveBtn.disabled = false;
    }
}

// (이하 히브리어 단어 클릭 기능은 기존과 동일)
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
        } else {
            content += "<p>정의를 찾을 수 없습니다.</p>";
        }
        modalBody.innerHTML = content;
    } catch (e) {
        modalBody.innerHTML = "<p>정보 없음</p>";
    }
}