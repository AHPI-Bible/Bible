// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 성경 전체 데이터 (책 이름: 장 수)
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

// 신약 목록
const NT_BOOKS = [
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", 
    "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", 
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", 
    "1 John", "2 John", "3 John", "Jude", "Revelation"
];

// 구약 목록 (전체에서 신약 뺀 것)
const ALL_BOOKS = Object.keys(BIBLE_DATA);
const OT_BOOKS = ALL_BOOKS.filter(book => !NT_BOOKS.includes(book));

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let loadedChapterData = { korean: {}, english: [], original: [], commentaries: {} };

document.addEventListener("DOMContentLoaded", function() {
    initSelectors(); 
    setupEventListeners();
    // 초기 실행: 창세기 1장
    fetchChapter(currentBook, currentChapter);
});

// --- [핵심] 드롭다운 초기화 및 채우기 ---
function initSelectors() {
    const otSelect = document.getElementById("ot-select");
    const ntSelect = document.getElementById("nt-select");

    // 구약 목록 채우기
    OT_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        otSelect.appendChild(option);
    });

    // 신약 목록 채우기
    NT_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        ntSelect.appendChild(option);
    });

    // 초기값 설정 (창세기가 선택된 상태)
    otSelect.value = "Genesis";
    updateChapterOptions("Genesis");
}

function setupEventListeners() {
    // 팝업 닫기
    document.getElementById("modal-close-button").onclick = () => document.getElementById("lexicon-modal").style.display = "none";
    document.getElementById("search-close-button").onclick = () => document.getElementById("search-result-modal").style.display = "none";

    // 이동 버튼
    document.getElementById("prev-btn").onclick = goToPrevChapter;
    document.getElementById("next-btn").onclick = goToNextChapter;
    document.getElementById("go-btn").onclick = navigateManual;
    
    // 검색
    document.getElementById("search-btn").onclick = performSearch;
    document.getElementById("search-input").onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    // [중요] 구약 선택 시 -> 신약 초기화
    document.getElementById("ot-select").onchange = function() {
        document.getElementById("nt-select").value = ""; // 신약 선택 해제
        updateChapterOptions(this.value);
    };

    // [중요] 신약 선택 시 -> 구약 초기화
    document.getElementById("nt-select").onchange = function() {
        document.getElementById("ot-select").value = ""; // 구약 선택 해제
        updateChapterOptions(this.value);
    };

    // 에디터 버튼
    document.getElementById("edit-btn").onclick = openEditor;
    document.getElementById("cancel-btn").onclick = closeEditor;
    document.getElementById("save-btn").onclick = saveCommentary;
}

// --- 챕터 드롭다운 업데이트 ---
function updateChapterOptions(bookName) {
    const sel = document.getElementById("chapter-select");
    sel.innerHTML = "";
    const max = BIBLE_DATA[bookName] || 50;
    
    for(let i=1; i<=max; i++) {
        const opt = document.createElement("option");
        opt.value = i; opt.innerText = i;
        sel.appendChild(opt);
    }
    sel.value = 1; // 1장으로 리셋
}

// --- [이동] 버튼 클릭 시 실행 ---
function navigateManual() {
    // 구약이 선택되었는지, 신약이 선택되었는지 확인
    const otVal = document.getElementById("ot-select").value;
    const ntVal = document.getElementById("nt-select").value;
    
    // 둘 중 값이 있는 것을 선택, 둘 다 없으면 현재 책 유지
    const book = otVal || ntVal || currentBook;
    const chapter = parseInt(document.getElementById("chapter-select").value);
    
    fetchChapter(book, chapter);
}

// --- UI 업데이트 (이전/다음 버튼 눌렀을 때 드롭다운 맞추기) ---
function updateNavUI() {
    const isNT = NT_BOOKS.includes(currentBook);
    
    if (isNT) {
        document.getElementById("nt-select").value = currentBook;
        document.getElementById("ot-select").value = "";
    } else {
        document.getElementById("ot-select").value = currentBook;
        document.getElementById("nt-select").value = "";
    }

    // 현재 책의 장 목록이 안 맞으면 업데이트
    if (document.getElementById("chapter-select").options.length < currentChapter) {
        updateChapterOptions(currentBook);
    }
    document.getElementById("chapter-select").value = currentChapter;
}

// --- 챕터 로드 (데이터 가져오기) ---
async function fetchChapter(book, chapter) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = 1; 
    updateNavUI();

    const bibleList = document.getElementById("bible-list");
    bibleList.innerHTML = "<p>데이터를 불러오는 중입니다...</p>";
    
    // 1. AHPI 서버 (한글 + 주해 + 헬라어 + 히브리어)
    const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_chapter_data/${book}/${chapter}`).then(res => res.json());

    // 2. 외부 API (영어) - 안전 모드
    let externalPromise = Promise.resolve({});
    
    if (NT_BOOKS.includes(book)) {
        // 신약 영어 (Bible-Api)
        externalPromise = fetch(`https://bible-api.com/${book}+${chapter}?translation=web`)
            .then(res => res.json())
            .then(data => ({ en: data.verses || [] }))
            .catch(() => ({ en: [] }));
    } else {
        // 구약 영어 (Sefaria)
        externalPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}?context=0`)
            .then(res => res.json())
            .then(data => ({ en: data.text || [] }))
            .catch(() => ({ en: [] }));
    }

    try {
        const [ahpiData, extData] = await Promise.all([ahpiPromise, externalPromise]);
        
        loadedChapterData.korean = ahpiData.korean_verses || {};
        loadedChapterData.commentaries = ahpiData.commentaries || {};
        
        const serverGreek = ahpiData.greek_verses || {};
        const serverHebrew = ahpiData.hebrew_verses || {};
        
        loadedChapterData.original = [];
        const maxVerse = Math.max(
            Object.keys(loadedChapterData.korean).length, 
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

        // 영어 데이터 처리
        if (isNT && extData.en) {
            loadedChapterData.english = extData.en.map(v => v.text ? v.text.replace(/<[^>]*>?/gm, '') : "");
        } else {
            loadedChapterData.english = extData.en || [];
        }

        renderBibleList();
        selectVerse(1);

    } catch (error) {
        console.error(error);
        bibleList.innerHTML = "<p style='color:red'>데이터 로드 실패</p>";
    }
}

// --- 리스트 그리기 ---
function renderBibleList() {
    const list = document.getElementById("bible-list");
    list.innerHTML = "";
    const maxVerse = Object.keys(loadedChapterData.korean).length;

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
        
        // 영어 처리 (배열 안전 접근)
        let eng = "";
        if (Array.isArray(loadedChapterData.english)) {
            eng = loadedChapterData.english[i-1] || "";
        }
        
        const ori = loadedChapterData.original[i-1] || "";

        let html = `<span class="verse-num">${i}.</span>`;
        html += `<span class="korean-text">${kor}</span>`;
        html += `<span class="english-text">${eng}</span>`;
        
        // 원어 단어 처리
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

// --- 절 선택 및 주해 표시 ---
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

// --- 에디터 관련 ---
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

// --- 단어 클릭 (사전) ---
function makeHebrewWordsClickable() {
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', handleWordClick);
    });
}
async function handleWordClick(event) {
    const rawWord = event.target.dataset.word;