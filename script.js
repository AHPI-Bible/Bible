// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 성경 66권 목록
const BIBLE_BOOKS = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther",
    "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Songs",
    "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
    "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
    "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
    "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let nextRef = null;
let prevRef = null;

document.addEventListener("DOMContentLoaded", function() {
    initBookSelect();

    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    document.getElementById("prev-btn").addEventListener("click", goToPrev);
    document.getElementById("next-btn").addEventListener("click", goToNext);
    document.getElementById("go-btn").addEventListener("click", navigateManual);

    setupEditorEvents();
    fetchHybridText(currentBook, currentChapter, currentVerse);
});

function initBookSelect() {
    const select = document.getElementById("book-select");
    BIBLE_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        select.appendChild(option);
    });
}

function goToNext() {
    if (nextRef) {
        parseAndNavigate(nextRef);
    } else {
        alert("다음 절이 없습니다.");
    }
}

function goToPrev() {
    if (prevRef) {
        parseAndNavigate(prevRef);
    } else {
        alert("이전 절이 없습니다.");
    }
}

// [수정됨] 더 똑똑해진 주소 해석 함수
function parseAndNavigate(refString) {
    // 예: "Genesis 2:1" 또는 "Genesis 2"
    const lastSpace = refString.lastIndexOf(" ");
    const bookName = refString.substring(0, lastSpace);
    const rest = refString.substring(lastSpace + 1);

    // 콜론(:)이 있는지 확인
    if (rest.includes(":")) {
        // "2:1" 처럼 절이 있는 경우
        const [chap, ver] = rest.split(":");
        fetchHybridText(bookName, parseInt(chap), parseInt(ver));
    } else {
        // "2" 처럼 장 번호만 있는 경우 -> 1절로 간주
        fetchHybridText(bookName, parseInt(rest), 1);
    }
}

function navigateManual() {
    const book = document.getElementById("book-select").value;
    const chapter = parseInt(document.getElementById("chapter-input").value);
    const verse = parseInt(document.getElementById("verse-input").value);

    if (book && chapter > 0 && verse > 0) {
        fetchHybridText(book, chapter, verse);
    }
}

function updateNavUI() {
    document.getElementById("book-select").value = currentBook;
    document.getElementById("chapter-input").value = currentChapter;
    document.getElementById("verse-input").value = currentVerse;
}

async function fetchHybridText(book, chapter, verse) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = verse;
    updateNavUI();

    const displayArea = document.querySelector(".bible-text-container");
    const commentDisplay = document.getElementById('commentary-display');
    
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;
    commentDisplay.innerText = "로딩 중...";

    try {
        const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_data/${book}/${chapter}/${verse}`).then(res => res.json());
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        if (ahpiData.error || !sefariaData.text) throw new Error("데이터 오류");

        nextRef = sefariaData.next; 
        prevRef = sefariaData.prev; 

        displayArea.innerHTML = `
            <div class="verse">
                <p class="korean-text">${ahpiData.korean_text}</p>
                <p class="english-text">${sefariaData.text}</p>
                <p class="hebrew-text" dir="rtl">${sefariaData.he}</p> 
            </div>
        `;
        commentDisplay.innerText = ahpiData.ahpi_commentary;
        
        resetEditorMode();
        makeHebrewWordsClickable(); 

    } catch (error) {
        console.error("실패:", error);
        displayArea.innerHTML = `<p style="color:red;">해당 구절을 찾을 수 없습니다.</p>`;
        commentDisplay.innerText = "";
    }
}

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
            alert("저장 실패");
        }
    } catch (error) {
        alert("통신 오류");
    } finally {
        saveBtn.innerText = "저장";
        saveBtn.disabled = false;
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
        } else {
            content += "<p>정의를 찾을 수 없습니다.</p>";
        }
        modalBody.innerHTML = content;
    } catch (e) {
        modalBody.innerHTML = "<p>정보 없음</p>";
    }
}