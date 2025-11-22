// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 성경 데이터 (책 이름 및 장 수)
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

// 상태 변수
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

    // 드롭다운 변경
    document.getElementById("book-select").onchange = function() {
        updateChapterOptions(this.value);
        updateVerseOptions(176); 
        document.getElementById("verse-select").value = 1;
    };
    // 절 선택 변경 시
    document.getElementById("verse-select").onchange = function() {
        selectVerse(parseInt(this.value));
    };

    // 에디터 버튼
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    
    editBtn.onclick = openEditor;
    cancelBtn.onclick = closeEditor;
    saveBtn.onclick = saveCommentary;
}

// --- 챕터 로드 ---
async function fetchChapter(book, chapter) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = 1; 
    updateNavUI();

    const bibleList = document.getElementById("bible-list");
    bibleList.innerHTML = "<p>데이터를 불러오는 중입니다...</p>";
    
    // 1. AHPI 서버 (한글 + 주해 + 헬라어 + 히브리어 + 영어)
    const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_chapter_data/${book}/${chapter}`).then(res => res.json());

    // 2. 외부 API (영어만 보조적으로 사용 - 현재는 서버 데이터 우선)
    let externalPromise = Promise.resolve({}); // 기본 빈 약속

    try {
        const [ahpiData, extData] = await Promise.all([ahpiPromise, externalPromise]);
        
        // 데이터 저장
        loadedChapterData.korean = ahpiData.korean_verses || {};
        loadedChapterData.english = ahpiData.english_verses || {}; 
        loadedChapterData.commentaries = ahpiData.commentaries || {};
        
        // 원어 데이터 분류
        const serverGreek = ahpiData.greek_verses || {};
        const serverHebrew = ahpiData.hebrew_verses || {};
        
        loadedChapterData.original = [];
        
        // 최대 절 수 계산
        const maxVerse = Math.max(
            Object.keys(loadedChapterData.korean).length, 
            Object.keys(loadedChapterData.english).length,
            Object.keys(serverGreek).length,
            Object.keys(serverHebrew).length
        );
        
        const isNT = NT_BOOKS.includes(book);

        // 배열로 변환 (1절부터 maxVerse까지)
        for(let i=1; i<=maxVerse; i++) {
            if (isNT) {
                loadedChapterData.original.push(serverGreek[i] || "");