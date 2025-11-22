// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

const BIBLE_DATA = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
    "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24, "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10, "Nehemiah": 13, "Esther": 10,
    "Job": 42, "Psalms": 150, "Proverbs": 31, "Ecclesiastes": 12, "Song of Songs": 8,
    "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12,
    "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
    "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
    "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6, "Philippians": 4, "Colossians": 4,
    "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4, "Titus": 3, "Philemon": 1,
    "Hebrews": 13, "James": 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22
};

const NT_BOOKS = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const ALL_BOOKS = Object.keys(BIBLE_DATA);
const OT_BOOKS = ALL_BOOKS.filter(book => !NT_BOOKS.includes(book));

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let loadedChapterData = { korean: {}, english: [], original: [], commentaries: {} };

document.addEventListener("DOMContentLoaded", function() {
    initSelectors(); 
    setupEventListeners();
    fetchChapter(currentBook, currentChapter);
});

function setupEventListeners() {
    // 팝업 닫기
    document.getElementById("modal-close-button").onclick = () => document.getElementById("lexicon-modal").style.display = "none";
    document.getElementById("search-close-button").onclick = () => document.getElementById("search-result-modal").style.display = "none";

    // 내비게이션 버튼
    document.getElementById("prev-btn").onclick = goToPrevChapter;
    document.getElementById("next-btn").onclick = goToNextChapter;
    document.getElementById("go-btn").onclick = navigateManual;
    document.getElementById("search-btn").onclick = performSearch;
    document.getElementById("search-input").onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    // [수정됨] 구약 선택 시
    document.getElementById("ot-select").onchange = function() {
        document.getElementById("nt-select").value = ""; // 신약 초기화
        updateChapterOptions(this.value);
    };

    // [수정됨] 신약 선택 시
    document.getElementById("nt-select").onchange = function() {
        document.getElementById("ot-select").value = ""; // 구약 초기화
        updateChapterOptions(this.value);
    };

    // 에디터 버튼
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    
    editBtn.onclick = openEditor;
    cancelBtn.onclick = closeEditor;
    saveBtn.onclick = saveCommentary;
}

// --- [수정됨] 초기화 함수 (구약/신약 분리) ---
function initSelectors() {
    const otSelect = document.getElementById("ot-select");
    const ntSelect = document.getElementById("nt-select");

    OT_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        otSelect.appendChild(option);
    });

    NT_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        ntSelect.appendChild(option);
    });

    updateChapterOptions("Genesis");
}

// --- [수정됨] 이동 로직 ---
function navigateManual() {
    // 구약에서 선택했는지 신약에서 선택했는지 확인
    const otBook = document.getElementById("ot-select").value;
    const ntBook = document.getElementById("nt-select").value;
    const book = otBook || ntBook || currentBook; // 둘 다 없으면 현재 책 유지

    const chapter = parseInt(document.getElementById("chapter-select").value);
    
    fetchChapter(book, chapter);
}

// --- [수정됨] UI 업데이트 ---
function updateNavUI() {
    // 현재 책이 구약인지 신약인지 확인하여 해당 드롭다운 활성화
    if (NT_BOOKS.includes(currentBook)) {
        document.getElementById("nt-select").value = currentBook;
        document.getElementById("ot-select").value = ""; // 구약 선택 해제
    } else {
        document.getElementById("ot-select").value = currentBook;
        document.getElementById("nt-select").value = ""; // 신약 선택 해제
    }

    // 장 목록 업데이트 (현재 장이 목록에 없으면 재생성)
    if (document.getElementById("chapter-select").options.length < currentChapter) {
        updateChapterOptions(currentBook);
    }
    document.getElementById("chapter-select").value = currentChapter;
}

// --- 챕터 로드 (기존과 동일) ---
async function fetchChapter(book, chapter) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = 1; 
    updateNavUI();

    const bibleList = document.getElementById("bible-list");
    bibleList.innerHTML = "<p>데이터를 불러오는 중입니다...</p>";
    
    const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_chapter_data/${book}/${chapter}`).then(res => res.json());
    let externalPromise = Promise.resolve({}); 

    try {
        const [ahpiData, extData] = await Promise.all([ahpiPromise, externalPromise]);
        
        loadedChapterData.korean = ahpiData.korean_verses || {};
        loadedChapterData.english = ahpiData.english_verses || {}; 
        loadedChapterData.commentaries = ahpiData.commentaries || {};
        
        const serverGreek = ahpiData.greek_verses || {};
        const serverHebrew = ahpiData.hebrew_verses || {};
        
        loadedChapterData.original = [];
        const maxVerse = Math.max(
            Object.keys(loadedChapterData.korean).length, 
            Object.keys(loadedChapterData.english).length,
            Object.keys(serverGreek).length,
            Object.keys(serverHebrew).length
        );
        
        const isNT = NT_BOOKS.includes(book);

        for(let i=1; i<=maxVerse; i++) {
            if (isNT) {
                loadedChapterData.original.push(serverGreek[i] || "");
            } else {
                loadedChapterData.original.push(serverHebrew[i] || "");
            }
        }

        renderBibleList();
        selectVerse(1);

    } catch (error) {
        console.error(error);
        bibleList.innerHTML = "<p style='color:red'>데이터 로드 실패 (서버 오류)</p>";
    }
}

// --- 리스트 그리기 (기존과 동일) ---
function renderBibleList() {
    const list = document.getElementById("bible-list");
    list.innerHTML = "";

    const maxVerse = Math.max(Object.keys(loadedChapterData.korean).length, loadedChapterData.english.length || 0);

    if (maxVerse === 0) {
        list.innerHTML = "<p>본문이 없습니다.</p>";
        return;
    }

    for (let i = 1; i <= maxVerse; i++) {
        const div = document.createElement("div");
        div.className = "verse-item";
        div.id = `verse-row-${i}`; 
        div.onclick = () => selectVerse(i); 

        const kor = loadedChapterData.korean[i] || "";
        let eng = "";
        if (Array.isArray(loadedChapterData.english)) {
            eng = loadedChapterData.english[i-1] || "";
        } else {
            eng = loadedChapterData.english[i] || "";
        }
        const ori = loadedChapterData.original[i-1] || "";

        let html = `<span class="verse-num">${i}.</span>`;
        html += `<span class="korean-text">${kor}</span>`;
        html += `<span class="english-text">${eng}</span>`;
        
        const oriWords = ori.split(/\s+/).filter(w => w.length > 0);
        let oriHtml = "";
        
        oriWords.forEach(word => {
            if (/[\u0590-\u05FF]/.test(word) || /[\u0370-\u03FF\u1F00-\u1FFF]/.test(word)) {
                const cleanData = word.replace(/['".,;:]/g, '');
                oriHtml += `<span class="hebrew-word" data-word="${cleanData}">${word}</span> `;
            } else {
                oriHtml += `${word} `;
            }
        });
        html += `<span class="hebrew-text">${oriHtml}</span>`;

        div.innerHTML = html;
        list.appendChild(div);
    }
    makeHebrewWordsClickable();
}

function makeHebrewWordsClickable() {
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', handleWordClick);
    });
}

async function handleWordClick(event) {
    const rawWord = event.target.dataset.word;
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    
    modal.style.display = "flex"; 
    modalBody.innerHTML = `<p style="color:#666;">'${rawWord}' 검색 중...</p>`;

    const isHebrew = /[\u0590-\u05FF]/.test(rawWord);

    if (isHebrew) {
        try {
            const strippedWord = rawWord.replace(/[\u0591-\u05C7]/g, '');
            const res = await fetch(`https://www.sefaria.org/api/words/${strippedWord}`);
            if (!res.ok) throw new Error("API 오류");
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                const entry = data[0]; 
                let html = `<h3 dir="rtl" style="font-size:1.8rem; color:#007bff;">${entry.hebrew || strippedWord}</h3>`;
                html += `<p><strong>기본형(Root):</strong> ${entry.headword || "-"}</p>`;
                if (entry.senses && entry.senses.length > 0) {
                    html += "<ul style='text-align:left;'>";
                    entry.senses.forEach(sense => {
                        if (sense.definition) html += `<li>${sense.definition}</li>`;
                    });
                    html += "</ul>";
                } else html += "<p>상세 정의를 찾을 수 없습니다.</p>";
                modalBody.innerHTML = html;
            } else {
                modalBody.innerHTML = `
                    <h3 dir="rtl">${rawWord}</h3>
                    <p>Sefaria 사전에 결과가 없습니다.</p>
                    <a href="https://biblehub.com/hebrew/${strippedWord}.htm" target="_blank" style="color:blue;">BibleHub에서 검색하기 ↗</a>`;
            }
        } catch (e) { modalBody.innerHTML = `<p>오류 발생</p>`; }
    } else {
        const cleanGreek = rawWord.replace(/[.,;·]/g, '');
        let html = `<h3 style="font-size:1.5rem;">${rawWord}</h3>`;
        html += `<p>헬라어 사전 링크:</p>`;
        html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
        html += `<a href="https://biblehub.com/greek/${cleanGreek}.htm" target="_blank" style="padding:10px; background:#eee;">📘 BibleHub 사전</a>`;
        html += `</div>`;
        modalBody.innerHTML = html;
    }
}

function selectVerse(verseNum) {
    currentVerse = verseNum;
    document.querySelectorAll(".verse-item").forEach(el => el.classList.remove("selected"));
    const targetRow = document.getElementById(`verse-row-${verseNum}`);
    if (targetRow) {
        targetRow.classList.add("selected");
        targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    document.getElementById("current-verse-display").innerText = `${currentBook} ${currentChapter}:${verseNum}`;
    const comment = loadedChapterData.commentaries[verseNum];
    document.getElementById("commentary-display").innerText = comment ? comment : "작성된 주해가 없습니다.";
    closeEditor();
}

function openEditor() {
    const displayDiv = document.getElementById("commentary-display");
    const input = document.getElementById("commentary-input");
    input.value = displayDiv.innerText === "작성된 주해가 없습니다." ? "" : displayDiv.innerText;
    document.getElementById("commentary-display").style.display = "none";
    document.getElementById("edit-btn").style.display = "none";
    document.getElementById("editor-container").style.display = "block";
}
function closeEditor() {
    document.getElementById("editor-container").style.display = "none";
    document.getElementById("commentary-display").style.display = "block";
    document.getElementById("edit-btn").style.display = "block";
}
async function saveCommentary() {
    const content = document.getElementById("commentary-input").value;
    const btn = document.getElementById("save-btn");
    btn.innerText = "저장 중...";
    try {
        const res = await fetch(`${AHPI_API_BASE_URL}/save_commentary`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                book: currentBook, chapter: currentChapter, verse: currentVerse, content: content
            })
        });
        if (res.ok) {
            alert("저장되었습니다.");
            loadedChapterData.commentaries[currentVerse] = content;
            selectVerse(currentVerse); 
        } else alert("저장 실패");
    } catch(e) { alert("오류 발생"); }
    finally { btn.innerText = "저장"; }
}

function updateChapterOptions(bookName) {
    const sel = document.getElementById("chapter-select");
    sel.innerHTML = "";
    const max = BIBLE_DATA[bookName] || 50;
    for(let i=1; i<=max; i++) {
        const opt = document.createElement("option");
        opt.value = i; opt.innerText = i;
        sel.appendChild(opt);
    }
    sel.value = 1;
}

function goToNextChapter() {
    if(currentChapter < BIBLE_DATA[currentBook]) fetchChapter(currentBook, currentChapter + 1);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if(idx < BOOK_NAMES.length-1) fetchChapter(BOOK_NAMES[idx+1], 1);
        else alert("끝입니다.");
    }
}
function goToPrevChapter() {
    if(currentChapter > 1) fetchChapter(currentBook, currentChapter - 1);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if(idx > 0) fetchChapter(BOOK_NAMES[idx-1], BIBLE_DATA[BOOK_NAMES[idx-1]]);
        else alert("시작입니다.");
    }
}

async function performSearch() {
    const q = document.getElementById("search-input").value;
    if(q.length<2) return alert("2글자 이상 입력");
    const modal = document.getElementById("search-result-modal");
    const body = document.getElementById("search-results-body");
    body.innerHTML = "검색 중...";
    modal.style.display = "flex";
    const res = await fetch(`${AHPI_API_BASE_URL}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if(data.results?.length) {
        body.innerHTML = data.results.map(item => 
            `<div class="search-item" onclick="goToSearchResult('${item.book}', ${item.chapter}, ${item.verse})">
                <div class="search-ref">${item.book} ${item.chapter}:${item.verse}</div>
                <div class="search-text">${item.text}</div>
            </div>`
        ).join("");
    } else body.innerHTML = "결과 없음";
}
window.goToSearchResult = function(b, c, v) {
    document.getElementById("search-result-modal").style.display = "none";
    currentVerse = v; 
    fetchChapter(b, c);
};