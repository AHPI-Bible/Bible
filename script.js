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
const BOOK_NAMES = Object.keys(BIBLE_DATA);

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1; // 현재 선택된 절 (주해용)
// 로드된 챕터 데이터 저장용 (캐시)
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

    // 내비게이션
    document.getElementById("prev-btn").onclick = goToPrevChapter;
    document.getElementById("next-btn").onclick = goToNextChapter;
    document.getElementById("go-btn").onclick = navigateManual;
    document.getElementById("search-btn").onclick = performSearch;
    document.getElementById("search-input").onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    // 드롭다운 변경
    document.getElementById("book-select").onchange = function() {
        updateChapterOptions(this.value);
        updateVerseOptions(176); 
        document.getElementById("verse-select").value = 1;
    };
    // [절 선택 변경 시] -> 해당 절로 스크롤 + 주해 선택
    document.getElementById("verse-select").onchange = function() {
        selectVerse(parseInt(this.value));
    };

    // 에디터
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    
    editBtn.onclick = openEditor;
    cancelBtn.onclick = closeEditor;
    saveBtn.onclick = saveCommentary;
}

// --- [핵심] 챕터 전체 로드 ---
async function fetchChapter(book, chapter) {
    currentBook = book;
    currentChapter = chapter;
    // 챕터 이동 시 기본 1절 선택
    currentVerse = 1; 
    updateNavUI();

    const bibleList = document.getElementById("bible-list");
    bibleList.innerHTML = "<p>데이터를 불러오는 중입니다...</p>";
    
    // 1. AHPI 서버 (한글 + 모든 주해)
    const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_chapter_data/${book}/${chapter}`).then(res => res.json());

    // 2. 외부 API (영어 + 원어)
    let externalPromise;
    if (NT_BOOKS.includes(book)) {
        // 신약 (Bible-Api & Sefaria Hybrid)
        const bookId = NT_BOOKS.indexOf(book) + 40;
        const engP = fetch(`https://bible-api.com/${book}+${chapter}?translation=web`).then(res => res.json());
        // 헬라어 (Sefaria SBL)
        const grkP = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}?version=SBL_Greek_New_Testament`).then(res => res.ok ? res.json() : {text:[]});
        
        externalPromise = Promise.all([engP, grkP]).then(([en, gr]) => ({
            en: en.verses || [], // Bible-api returns array of objects
            he: gr.text || []    // Sefaria returns array of strings
        }));
    } else {
        // 구약 (Sefaria)
        externalPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}?context=0`).then(res => res.json());
    }

    try {
        const [ahpiData, extData] = await Promise.all([ahpiPromise, externalPromise]);
        
        // 데이터 저장
        loadedChapterData.korean = ahpiData.korean_verses;
        loadedChapterData.commentaries = ahpiData.commentaries;
        
        // 외부 데이터 포맷 통일
        if (NT_BOOKS.includes(book)) {
            // 신약 데이터 가공
            loadedChapterData.english = extData.en.map(v => v.text.replace(/<[^>]*>?/gm, '')); 
            loadedChapterData.original = Array.isArray(extData.he) ? extData.he : [];
        } else {
            // 구약 데이터 가공 (Sefaria)
            loadedChapterData.english = extData.text || [];
            loadedChapterData.original = extData.he || [];
        }

        // [UI 렌더링] 리스트 만들기
        renderBibleList();
        // 드롭다운 절 개수 업데이트
        updateVerseOptions(Object.keys(loadedChapterData.korean).length || loadedChapterData.english.length);
        // 1절 자동 선택
        selectVerse(1);

    } catch (error) {
        console.error(error);
        bibleList.innerHTML = "<p style='color:red'>데이터 로드 실패</p>";
    }
}

// --- [UI] 성경 리스트 그리기 ---
function renderBibleList() {
    const list = document.getElementById("bible-list");
    list.innerHTML = "";

    // 절 개수 파악 (한글 데이터 기준, 없으면 영어 기준)
    const maxVerse = Math.max(
        Object.keys(loadedChapterData.korean).length, 
        loadedChapterData.english.length
    );

    if (maxVerse === 0) {
        list.innerHTML = "<p>본문이 없습니다.</p>";
        return;
    }

    for (let i = 1; i <= maxVerse; i++) {
        const div = document.createElement("div");
        div.className = "verse-item";
        div.id = `verse-row-${i}`; // 스크롤 이동용 ID
        div.onclick = () => selectVerse(i); // 클릭 시 선택

        const kor = loadedChapterData.korean[i] || "";
        // 배열 인덱스는 0부터 시작하므로 i-1
        const eng = loadedChapterData.english[i-1] || "";
        const ori = loadedChapterData.original[i-1] || "";

        // HTML 조립
        let html = `<span class="verse-num">${i}.</span>`;
        html += `<span class="korean-text">${kor}</span>`;
        html += `<span class="english-text">${eng}</span>`;
        
        // 원어 단어 처리 (클릭 기능)
        const oriWords = ori.replace(/<[^>]*>?/gm, '').split(/\s+/);
        let oriHtml = "";
        oriWords.forEach(w => {
            if(w) oriHtml += `<span class="hebrew-word" onclick="openLexicon(event, '${w}')">${w}</span> `;
        });
        html += `<span class="hebrew-text">${oriHtml}</span>`;

        div.innerHTML = html;
        list.appendChild(div);
    }
}

// --- [핵심] 절 선택 (Select Verse) ---
function selectVerse(verseNum) {
    currentVerse = verseNum;
    
    // 1. 왼쪽 리스트에서 하이라이트 표시
    document.querySelectorAll(".verse-item").forEach(el => el.classList.remove("selected"));
    const targetRow = document.getElementById(`verse-row-${verseNum}`);
    if (targetRow) {
        targetRow.classList.add("selected");
        targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // 2. 오른쪽 주해 창 업데이트
    document.getElementById("current-verse-display").innerText = `${currentBook} ${currentChapter}:${verseNum}`;
    const comment = loadedChapterData.commentaries[verseNum];
    document.getElementById("commentary-display").innerText = comment ? comment : "작성된 주해가 없습니다.";
    
    // 에디터 닫기
    closeEditor();
    
    // 드롭다운 값 동기화
    document.getElementById("verse-select").value = verseNum;
}

// --- 주해 작성/수정 ---
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
            // 로컬 데이터 갱신
            loadedChapterData.commentaries[currentVerse] = content;
            selectVerse(currentVerse); // 화면 갱신
        } else alert("저장 실패");
    } catch(e) { alert("오류 발생"); }
    finally { btn.innerText = "저장"; }
}

// --- 사전 팝업 ---
window.openLexicon = async function(event, word) {
    event.stopPropagation(); // 부모 클릭 방지
    const modal = document.getElementById("lexicon-modal");
    const body = document.getElementById("modal-body");
    
    body.innerHTML = "검색 중...";
    modal.style.display = "flex";
    
    try {
        // 구약 히브리어만 지원 (신약은 추후)
        const res = await fetch(`https://www.sefaria.org/api/words/${word}`);
        const data = await res.json();
        let html = `<h3 dir="rtl">${data.entry}</h3>`;
        if(data.senses) html += "<ol>" + data.senses.map(s => `<li>${s.definition.en}</li>`).join("") + "</ol>";
        else html += "<p>정의 없음</p>";
        body.innerHTML = html;
    } catch(e) { body.innerHTML = "<p>정보 없음</p>"; }
};

// --- 기타 유틸리티 (이동, 검색 등) ---
// (기존 함수들과 거의 동일, initSelectors 등은 위에 포함됨)
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
function updateVerseOptions(max) {
    const sel = document.getElementById("verse-select");
    sel.innerHTML = "";
    for(let i=1; i<=max; i++) {
        const opt = document.createElement("option");
        opt.value = i; opt.innerText = i;
        sel.appendChild(opt);
    }
}
function updateNavUI() {
    document.getElementById("book-select").value = currentBook;
    if(document.getElementById("chapter-select").options.length < currentChapter) updateChapterOptions(currentBook);
    document.getElementById("chapter-select").value = currentChapter;
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
function navigateManual() {
    const b = document.getElementById("book-select").value;
    const c = parseInt(document.getElementById("chapter-select").value);
    const v = parseInt(document.getElementById("verse-select").value);
    fetchChapter(b, c);
    // 페이지 로드 후 해당 절로 이동하기 위해 약간의 지연 후 selectVerse 호출은 
    // fetchChapter 내부의 render 완료 시점 처리로 해결됨.
    // 여기서는 fetchChapter 호출 시 v 값을 전달하지 않았으므로,
    // fetchChapter 함수에 verse 인자를 추가하거나 전역 currentVerse를 설정해야 함.
    currentVerse = v; // 전역 변수 미리 설정
}

// 검색 기능 (기존과 동일, 클릭 시 fetchChapter 호출로 변경)
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
    currentVerse = v; // 이동할 절 설정
    fetchChapter(b, c);
};

function initSelectors() {
    const bookSelect = document.getElementById("book-select");
    BOOK_NAMES.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        bookSelect.appendChild(option);
    });
    updateChapterOptions("Genesis");
    updateVerseOptions(176);
}