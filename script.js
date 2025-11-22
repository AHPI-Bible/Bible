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

// --- [수정됨] 단어 클릭 기능 및 사전 연동 ---

// 1. 히브리어/헬라어 단어에 클릭 이벤트 심기
function makeHebrewWordsClickable() {
    const hebrewElement = document.querySelector(".hebrew-text");
    if (!hebrewElement) return;
    
    // 텍스트를 공백으로 분리
    const words = hebrewElement.textContent.split(/\s+/).filter(w => w.length > 0);
    let htmlContent = '';
    
    words.forEach(word => {
        // 히브리어 또는 헬라어인지 확인 (유니코드 범위 체크)
        // 히브리어: \u0590-\u05FF, 헬라어: \u0370-\u03FF 등
        if (/[\u0590-\u05FF]/.test(word) || /[\u0370-\u03FF\u1F00-\u1FFF]/.test(word)) {
            // 따옴표나 문장부호(.,:;)를 미리 제거하고 데이터에 담음
            const cleanData = word.replace(/['".,;:]/g, '');
            htmlContent += `<span class="hebrew-word" data-word="${cleanData}">${word}</span> `;
        } else {
            htmlContent += `${word} `;
        }
    });
    
    hebrewElement.innerHTML = htmlContent;
    
    // 이벤트 리스너 연결
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', handleWordClick);
    });
}

// 2. [핵심 수정] 단어 클릭 시 팝업 처리
async function handleWordClick(event) {
    const rawWord = event.target.dataset.word;
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    
    // 팝업 열기
    modal.style.display = "flex"; 
    modalBody.innerHTML = `<p style="color:#666; font-size:1.2rem;">🔍 '${rawWord}' 검색 중...</p>`;

    // 언어 감지 (히브리어인지?)
    const isHebrew = /[\u0590-\u05FF]/.test(rawWord);

    if (isHebrew) {
        // --- [히브리어] Sefaria 사전 검색 ---
        try {
            // 1. 검색을 위해 장식 기호(트로프/니쿠드) 제거 -> 자음만 남김
            // (Sefaria는 자음만으로 검색할 때 결과가 가장 잘 나옴)
            const strippedWord = rawWord.replace(/[\u0591-\u05C7]/g, '');
            
            // 2. API 호출
            const res = await fetch(`https://www.sefaria.org/api/words/${strippedWord}`);
            if (!res.ok) throw new Error("API 오류");
            
            const data = await res.json();
            console.log("Sefaria Data:", data); // 디버깅용 확인

            // 3. 결과 처리 (undefined 방지 로직)
            // Sefaria는 결과를 배열(Array)로 줍니다.
            if (Array.isArray(data) && data.length > 0) {
                // 가장 첫 번째 결과가 정확도가 높음
                const entry = data[0]; 
                
                // 제목 표시 (히브리어 단어)
                // entry.hebrew가 없으면 우리가 검색한 단어(strippedWord)를 보여줌
                let html = `<h3 dir="rtl" style="font-size:2rem; color:#007bff; margin-bottom:10px;">
                                ${entry.hebrew || strippedWord}
                            </h3>`;
                
                // 기본형(Root) 표시
                if (entry.headword) {
                    html += `<p style="color:#555; font-weight:bold;">기본형(Root): ${entry.headword}</p>`;
                }
                
                // 뜻풀이 (Definitions)
                if (entry.senses && entry.senses.length > 0) {
                    html += "<ul style='text-align:left; margin-top:10px;'>";
                    entry.senses.forEach(sense => {
                        // 뜻이 있는 경우만 리스트에 추가
                        if (sense.definition) {
                            html += `<li style="margin-bottom:5px;">${sense.definition}</li>`;
                        }
                    });
                    html += "</ul>";
                } else {
                    html += "<p>상세 정의를 찾을 수 없습니다.</p>";
                }
                
                modalBody.innerHTML = html;
            } else {
                // 결과가 텅 비었을 때 (BibleHub 링크 제공)
                modalBody.innerHTML = `
                    <h3 dir="rtl" style="font-size:2rem; color:#333;">${rawWord}</h3>
                    <p style="color:red;">Sefaria 사전에 결과가 없습니다.</p>
                    <hr style="margin:15px 0; border:0; border-top:1px solid #eee;">
                    <a href="https://biblehub.com/hebrew/${strippedWord}.htm" target="_blank" 
                       style="display:block; padding:12px; background:#f8f9fa; border-radius:8px; text-decoration:none; color:#007bff; font-weight:bold; text-align:center; border:1px solid #ddd;">
                       📘 BibleHub에서 더 자세히 보기 ↗
                    </a>
                `;
            }
        } catch (e) {
            console.error(e);
            modalBody.innerHTML = `<p>사전 데이터를 불러오는 중 오류가 발생했습니다.</p>`;
        }

    } else {
        // --- [헬라어] 외부 사전 링크 제공 ---
        // 헬라어는 문법 변화가 심해서 무료 API로는 정확한 뜻을 찾기 어렵습니다.
        // 전문 사전 사이트(BibleHub)로 연결해주는 것이 가장 확실합니다.
        
        const cleanGreek = rawWord.replace(/[.,;·]/g, ''); // 문장부호 제거
        
        let html = `<h3 style="font-size:1.8rem; margin-bottom:10px;">${rawWord}</h3>`;
        html += `<p style="color:#666;">헬라어 단어입니다.<br>상세 의미는 아래 전문 사전에서 확인하세요.</p>`;
        html += `<div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">`;
        
        html += `<a href="https://biblehub.com/greek/${cleanGreek}.htm" target="_blank" 
                    style="padding:12px; background:#f1f3f5; border-radius:8px; text-decoration:none; color:#333; font-weight:bold; text-align:center; border:1px solid #ddd;">
                    📘 BibleHub 사전 ↗
                 </a>`;
                 
        html += `<a href="https://www.billmounce.com/greek-dictionary?search=${cleanGreek}" target="_blank" 
                    style="padding:12px; background:#f1f3f5; border-radius:8px; text-decoration:none; color:#333; font-weight:bold; text-align:center; border:1px solid #ddd;">
                    📗 Bill Mounce 사전 ↗
                 </a>`;
        
        html += `</div>`;
        
        modalBody.innerHTML = html;
    }
}