// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 성경 66권 이름과 '총 장(Chapter) 수' 데이터
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

const BOOK_NAMES = Object.keys(BIBLE_DATA);

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let nextRef = null;
let prevRef = null;

document.addEventListener("DOMContentLoaded", function() {
    initSelectors(); 

    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    document.getElementById("prev-btn").addEventListener("click", goToPrevChapter);
    document.getElementById("next-btn").addEventListener("click", goToNextChapter);
    document.getElementById("go-btn").addEventListener("click", navigateManual);

    // 책 선택 시 장 목록 업데이트
    document.getElementById("book-select").addEventListener("change", function() {
        updateChapterOptions(this.value);
        // 책을 바꾸면 절은 일단 1절로 리셋 (데이터 로드 후 정확해짐)
        updateVerseOptions(176); 
        document.getElementById("verse-select").value = 1;
    });

    // 장 선택 시 절 선택 초기화
    document.getElementById("chapter-select").addEventListener("change", function() {
        document.getElementById("verse-select").value = 1;
    });

    setupEditorEvents();
    fetchHybridText(currentBook, currentChapter, currentVerse);
});

function initSelectors() {
    // 1. 책 목록
    const bookSelect = document.getElementById("book-select");
    BOOK_NAMES.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        bookSelect.appendChild(option);
    });

    // 2. 초기 장 목록
    updateChapterOptions("Genesis");

    // 3. 초기 절 목록 (임시로 넉넉하게, 로드 후 조정됨)
    updateVerseOptions(176);
}

function updateChapterOptions(bookName) {
    const chapterSelect = document.getElementById("chapter-select");
    const maxChapters = BIBLE_DATA[bookName] || 50;
    
    chapterSelect.innerHTML = ""; 
    
    for (let i = 1; i <= maxChapters; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.innerText = i;
        chapterSelect.appendChild(option);
    }
    chapterSelect.value = 1;
}

// [NEW] 절(Verse) 드롭다운을 실제 절 수에 맞춰 다시 그리는 함수
function updateVerseOptions(maxVerses) {
    const verseSelect = document.getElementById("verse-select");
    const currentVal = parseInt(verseSelect.value) || 1; // 현재 선택된 값 기억

    verseSelect.innerHTML = ""; // 기존 목록 비우기

    for (let i = 1; i <= maxVerses; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.innerText = i;
        verseSelect.appendChild(option);
    }

    // 아까 선택했던 절이 범위 안에 있으면 유지, 넘치면 1절로
    if (currentVal <= maxVerses) {
        verseSelect.value = currentVal;
    } else {
        verseSelect.value = 1;
    }
}

function goToNextChapter() {
    const maxChapters = BIBLE_DATA[currentBook];
    if (currentChapter < maxChapters) {
        fetchHybridText(currentBook, currentChapter + 1, 1);
    } else {
        const currentBookIndex = BOOK_NAMES.indexOf(currentBook);
        if (currentBookIndex < BOOK_NAMES.length - 1) {
            const nextBook = BOOK_NAMES[currentBookIndex + 1];
            updateChapterOptions(nextBook); 
            fetchHybridText(nextBook, 1, 1);
        } else {
            alert("성경의 마지막입니다.");
        }
    }
}

function goToPrevChapter() {
    if (currentChapter > 1) {
        fetchHybridText(currentBook, currentChapter - 1, 1);
    } else {
        const currentBookIndex = BOOK_NAMES.indexOf(currentBook);
        if (currentBookIndex > 0) {
            const prevBook = BOOK_NAMES[currentBookIndex - 1];
            const prevBookMaxChapter = BIBLE_DATA[prevBook];
            updateChapterOptions(prevBook); 
            fetchHybridText(prevBook, prevBookMaxChapter, 1);
        } else {
            alert("성경의 시작입니다.");
        }
    }
}

function navigateManual() {
    const book = document.getElementById("book-select").value;
    const chapter = parseInt(document.getElementById("chapter-select").value);
    const verse = parseInt(document.getElementById("verse-select").value);

    fetchHybridText(book, chapter, verse);
}

function updateNavUI() {
    document.getElementById("book-select").value = currentBook;
    
    // 현재 장이 드롭다운 범위 밖이면 업데이트
    if (document.getElementById("chapter-select").options.length < currentChapter) {
        updateChapterOptions(currentBook);
    }
    document.getElementById("chapter-select").value = currentChapter;
    
    // (주의) 절 드롭다운 업데이트는 fetchHybridText 안에서 데이터 확인 후 실행됨
    document.getElementById("verse-select").value = currentVerse;
}

async function fetchHybridText(book, chapter, verse) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = verse;
    
    // UI 업데이트 (여기서는 아직 절 개수를 모름)
    updateNavUI();

    const displayArea = document.querySelector(".bible-text-container");
    const commentDisplay = document.getElementById('commentary-display');
    
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;
    commentDisplay.innerText = "로딩 중...";

    try {
        const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_data/${book}/${chapter}/${verse}`).then(res => res.json());
        // Sefaria API 호출
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        if (ahpiData.error || !sefariaData.text) throw new Error("데이터 오류");

        nextRef = sefariaData.next; 
        prevRef = sefariaData.prev; 

        // [핵심] Sefaria 데이터에서 이 장의 총 절 수 확인
        // Sefaria API 구조: sefariaData.text는 현재 절의 텍스트만 줌 (context=0 때문에)
        // 하지만 드롭다운 수정을 위해 이 장 전체의 길이가 필요함.
        // -> 이를 위해 '장 전체' 정보를 가볍게 확인하거나, 
        // -> 더 쉬운 방법: Sefaria는 text 길이를 현재 절 1개만 줄 수 있음.
        // -> 따라서 '절 드롭다운'을 정확히 하려면 '장 전체'를 한번 호출해서 길이를 재야 함.
        // -> 성능을 위해 여기서는 'API 호출'을 하나 더 추가하여 '장 전체 길이'를 가져오겠습니다.
        
        // 장 전체 구조 가져오기 (Shape API 사용 - 매우 가벼움)
        fetch(`https://www.sefaria.org/api/shape/${book}.${chapter}`)
            .then(res => res.json())
            .then(shapeData => {
                // shapeData는 배열 형태. 예: [chapter_array] -> chapter_array의 길이가 절의 개수
                // shapeData 구조 확인 필요. 보통 shapeData[0] 이나 shapeData 가 절의 개수를 담은 배열임.
                // 더 확실한 방법: text-preview API 사용.
                // 가장 확실하고 쉬운 방법: 그냥 해당 장 전체를 요청해서 길이 재기 (Sefaria는 빠름)
                return fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}?context=0&pad=0`);
            })
            .then(res => res.json())
            .then(chapterData => {
                if(chapterData && chapterData.text) {
                    // [수정 완료] 실제 절의 개수만큼 드롭다운 업데이트
                    updateVerseOptions(chapterData.text.length);
                    // 드롭다운 값 다시 설정
                    document.getElementById("verse-select").value = currentVerse;
                }
            });


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