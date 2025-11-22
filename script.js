// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 현재 위치 상태 관리
let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;

document.addEventListener("DOMContentLoaded", function() {
    // 1. 팝업 닫기
    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    // 2. 내비게이션 버튼 이벤트
    document.getElementById("prev-btn").addEventListener("click", () => navigateVerse(-1));
    document.getElementById("next-btn").addEventListener("click", () => navigateVerse(1));
    document.getElementById("go-btn").addEventListener("click", navigateManual);

    // 3. 주석 에디터 이벤트
    setupEditorEvents();

    // 4. 초기 데이터 로드
    fetchHybridText(currentBook, currentChapter, currentVerse);
});

// [이동 기능 1] 이전/다음 절 버튼
function navigateVerse(direction) {
    // 현재는 단순하게 절 번호만 증감시킵니다.
    // (추후: 1장이 끝나면 2장 1절로 넘어가는 고급 로직 필요)
    let newVerse = currentVerse + direction;
    if (newVerse < 1) newVerse = 1; // 1절 미만 방지
    
    fetchHybridText(currentBook, currentChapter, newVerse);
}

// [이동 기능 2] 직접 입력 이동
function navigateManual() {
    const book = document.getElementById("book-input").value;
    const chapter = parseInt(document.getElementById("chapter-input").value);
    const verse = parseInt(document.getElementById("verse-input").value);

    if (book && chapter > 0 && verse > 0) {
        fetchHybridText(book, chapter, verse);
    } else {
        alert("올바른 성경 위치를 입력하세요.");
    }
}

// UI 업데이트 (현재 위치 표시)
function updateNavUI() {
    document.getElementById("book-input").value = currentBook;
    document.getElementById("chapter-input").value = currentChapter;
    document.getElementById("verse-input").value = currentVerse;
}

// 데이터 불러오기 및 화면 표시
async function fetchHybridText(book, chapter, verse) {
    // 상태 업데이트
    currentBook = book;
    currentChapter = chapter;
    currentVerse = verse;
    updateNavUI(); // 입력창 숫자 동기화

    const displayArea = document.querySelector(".bible-text-container");
    const commentDisplay = document.getElementById('commentary-display');
    
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;
    commentDisplay.innerText = "로딩 중...";

    try {
        const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_data/${book}/${chapter}/${verse}`).then(res => res.json());
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        if (ahpiData.error || !sefariaData.text) {
             throw new Error("데이터를 찾을 수 없습니다.");
        }

        // 본문 표시
        displayArea.innerHTML = `
            <div class="verse">
                <p class="korean-text">${ahpiData.korean_text}</p>
                <p class="english-text">${sefariaData.text}</p>
                <p class="hebrew-text" dir="rtl">${sefariaData.he}</p> 
            </div>
        `;
        
        // 주석 표시
        commentDisplay.innerText = ahpiData.ahpi_commentary;
        
        // 편집 모드였다면 다시 보기 모드로 초기화
        resetEditorMode();
        
        // 히브리어 클릭 활성화
        makeHebrewWordsClickable(); 

    } catch (error) {
        console.error("실패:", error);
        displayArea.innerHTML = `<p style="color:red;">해당 구절을 찾을 수 없습니다. (Book 이름을 영어로 정확히 입력했는지 확인하세요)</p>`;
        commentDisplay.innerText = "";
    }
}

// 에디터 관련 이벤트 설정
function setupEditorEvents() {
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const editorDiv = document.getElementById("editor-container");
    const displayDiv = document.getElementById("commentary-display");
    const inputArea = document.getElementById("commentary-input");

    editBtn.addEventListener("click", () => {
        inputArea.value = displayDiv.innerText === "작성된 주석이 없습니다." ? "" : displayDiv.innerText;
        displayDiv.style.display = "none";
        editBtn.style.display = "none";
        editorDiv.style.display = "block";
    });

    cancelBtn.addEventListener("click", resetEditorMode);
    saveBtn.addEventListener("click", saveCommentary);
}

function resetEditorMode() {
    document.getElementById("editor-container").style.display = "none";
    document.getElementById("commentary-display").style.display = "block";
    document.getElementById("edit-btn").style.display = "block";
}

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
            document.getElementById('commentary-display').innerText = content;
            resetEditorMode();
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

// 히브리어 단어 클릭 기능 (기존과 동일)
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