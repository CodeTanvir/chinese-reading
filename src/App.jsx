import { useEffect, useMemo, useState } from "react";
import texts from "./data/texts";
import "./styles.css";
import vocabulary from "./data/vocabulary";
import TranslateModal from "./components/TranslateModal";

function App() {
  const [selectedLessonId, setSelectedLessonId] = useState(texts[0]?.id);
  const [revealed, setRevealed] = useState({});
  const [search, setSearch] = useState("");
  const [voices, setVoices] = useState([]);
  const [speed, setSpeed] = useState(0.8);
  const [speakingId, setSpeakingId] = useState(null);

  // Reading-area text selection translator
  const [selectedText, setSelectedText] = useState("");
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [selectionTranslation, setSelectionTranslation] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);

  /*
   * Load browser voices.
   *
   * Some browsers, especially Chrome, load voices
   * a little after the page starts.
   */
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices
      );
    };
  }, []);

  /*
   * Close reading translation popup when clicking elsewhere.
   */
  useEffect(() => {
    function handleDocumentMouseDown(event) {
      if (
        event.target.closest(".reading-selection-popup") ||
        event.target.closest(".chinese")
      ) {
        return;
      }

      setSelectionPopup(null);
      setSelectedText("");
      setSelectionTranslation("");
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentMouseDown
      );
    };
  }, []);

  const selectedLesson =
    texts.find((lesson) => lesson.id === selectedLessonId) || texts[0];

  const filteredLessons = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return texts;

    return texts.filter(
      (lesson) =>
        lesson.title?.toLowerCase().includes(value) ||
        String(lesson.number).includes(value)
    );
  }, [search]);

  const allLineKeys =
    selectedLesson?.sections?.flatMap((section) =>
      section.lines.map((line) => line.id)
    ) || [];

  const revealedCount = allLineKeys.filter(
    (lineId) => revealed[lineId]
  ).length;

  const progress =
    allLineKeys.length > 0
      ? Math.round((revealedCount / allLineKeys.length) * 100)
      : 0;

  function toggleLine(lineId) {
    setRevealed((previous) => ({
      ...previous,
      [lineId]: !previous[lineId],
    }));
  }

  function showAll() {
    const next = {};

    allLineKeys.forEach((lineId) => {
      next[lineId] = true;
    });

    setRevealed(next);
  }

  function hideAll() {
    setRevealed({});
  }

  function selectLesson(id) {
    window.speechSynthesis?.cancel();

    setSelectedLessonId(id);
    setRevealed({});
    setSpeakingId(null);

    // Close selection translator when changing lesson
    setSelectedText("");
    setSelectionPopup(null);
    setSelectionTranslation("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * Find a Chinese voice.
   *
   * Prefer zh-CN, then any Chinese voice.
   */
  function getChineseVoice() {
    return (
      voices.find((voice) => voice.lang === "zh-CN") ||
      voices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("zh")
      ) ||
      null
    );
  }

  /*
   * Speak Chinese sentence.
   */
  function speakChinese(text, lineId) {
    if (!("speechSynthesis" in window)) {
      alert(
        "Your browser does not support Chinese text-to-speech."
      );
      return;
    }

    // Stop previous sentence
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "zh-CN";
    utterance.rate = speed;
    utterance.pitch = 1;

    const chineseVoice = getChineseVoice();

    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    setSpeakingId(lineId);

    utterance.onend = () => {
      setSpeakingId(null);
    };

    utterance.onerror = () => {
      setSpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  }

  /*
   * Stop speaking
   */
  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }

  /*
   * Handle selecting Chinese text inside the Reading Practice area.
   *
   * Example:
   * User selects:
   *
   *     不能没有朋友
   *
   * A small Translate popup appears.
   */
  function handleChineseSelection(event) {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed) {
    return;
  }

  const text = selection.toString().trim();

  if (!text) {
    return;
  }

  const chineseElement = event.currentTarget;

  // Make sure selection belongs to this Chinese text
  if (!chineseElement.contains(selection.anchorNode)) {
    return;
  }

  if (!chineseElement.contains(selection.focusNode)) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (!rect || rect.width === 0) {
    return;
  }

  setSelectedText(text);
  setSelectionTranslation("");

  /*
   * Popup is anchored to the TOP of the selection.
   *
   * CSS will use:
   *
   * transform: translate(-50%, -100%);
   *
   * Therefore the popup grows UPWARD.
   */
  let left = rect.left + rect.width / 2;

  /*
   * Keep popup inside viewport horizontally.
   */
  const horizontalPadding = 12;

  if (left < horizontalPadding) {
    left = horizontalPadding;
  }

  if (left > window.innerWidth - horizontalPadding) {
    left = window.innerWidth - horizontalPadding;
  }

  /*
   * Normally put popup ABOVE the selected text.
   *
   * 10px gap between popup and selection.
   */
  const top = Math.max(10, rect.top - 10);

  setSelectionPopup({
    top,
    left,
  });
}

  /*
   * Translate ONLY the selected reading text.
   */
  async function translateSelectedText() {
    if (!selectedText || translationLoading) return;

    setTranslationLoading(true);
    setSelectionTranslation("");

    try {
      const url =
        "https://api.mymemory.translated.net/get?" +
        new URLSearchParams({
          q: selectedText,
          langpair: "zh-CN|en",
        });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Translation request failed (${response.status})`
        );
      }

      const data = await response.json();

      const translatedText = data?.responseData?.translatedText;

      if (!translatedText) {
        throw new Error("No translation was returned.");
      }

      setSelectionTranslation(translatedText);
    } catch (error) {
      console.error("Reading translation error:", error);

      setSelectionTranslation(
        error.message || "Unable to translate this text."
      );
    } finally {
      setTranslationLoading(false);
    }
  }

  if (!selectedLesson) {
    return (
      <div className="empty-page">
        <h2>No lessons available</h2>
        <p>Check your texts.js data.</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">中</div>

          <div>
            <h1>HSK Reading</h1>
            <span>Chinese Practice</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="speed-control">
            <span>🔊 Speed</span>

            <button
              className={speed === 0.6 ? "speed-active" : ""}
              onClick={() => setSpeed(0.6)}
            >
              0.6×
            </button>

            <button
              className={speed === 0.8 ? "speed-active" : ""}
              onClick={() => setSpeed(0.8)}
            >
              0.8×
            </button>

            <button
              className={speed === 1 ? "speed-active" : ""}
              onClick={() => setSpeed(1)}
            >
              1×
            </button>
          </div>

          <div className="lesson-count">
            {texts.length} Lessons
          </div>
        </div>
      </header>

      <div className="page">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div>
              <h2>Lessons</h2>
              <p>HSK 4 Reading</p>
            </div>
          </div>

          <div className="search-box">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search lesson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lesson-list">
            {filteredLessons.map((lesson) => {
              const active = lesson.id === selectedLessonId;

              return (
                <button
                  key={lesson.id}
                  className={`lesson-item ${
                    active ? "lesson-active" : ""
                  }`}
                  onClick={() => selectLesson(lesson.id)}
                >
                  <div className="lesson-number">
                    {String(lesson.number).padStart(2, "0")}
                  </div>

                  <div className="lesson-details">
                    <strong>{lesson.title}</strong>

                    <span>
                      {lesson.sections?.length || 0} texts
                    </span>
                  </div>

                  {active && (
                    <div className="lesson-arrow">
                      →
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main">
          {/* HERO */}
          <section className="hero">
            <div className="hero-content">
              <div className="eyebrow">
                LESSON{" "}
                {String(selectedLesson.number).padStart(2, "0")}
              </div>

              <h2>{selectedLesson.title}</h2>

              <p>
                Read the Chinese sentence, listen to the
                pronunciation, then reveal the pinyin and
                English translation.
              </p>
            </div>

            <div className="hero-stat">
              <strong>{allLineKeys.length}</strong>
              <span>Lines</span>
            </div>
          </section>

          {/* PROGRESS */}
          {/* <section className="progress-card">
            <div className="progress-info">
              <div>
                <span className="progress-label">
                  Reading progress
                </span>

                <strong>
                  {revealedCount} / {allLineKeys.length}
                </strong>
              </div>

              <span className="progress-percent">
                {progress}%
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="progress-actions">
              <button onClick={showAll}>
                Show all
              </button>

              <button onClick={hideAll}>
                Hide all
              </button>
            </div>
          </section> */}

          {/* TEXT SECTIONS */}
          <div className="sections">
            {selectedLesson.sections?.map((section) => (
              <section
                className="text-card"
                key={section.id}
              >
                {vocabulary[section.id]?.length > 0 && (
                  <div className="vocabulary-section">
                    <div className="vocabulary-header">
                      <div>
                        <span className="vocabulary-label">
                          NEW WORDS
                        </span>

                        <h3>Vocabulary</h3>
                      </div>

                      <div className="vocabulary-count">
                        {vocabulary[section.id].length} words
                      </div>
                    </div>

                    <div className="vocabulary-table-wrapper">
                      <table className="vocabulary-table">
                        <thead>
                          <tr>
                            <th>Chinese</th>
                            <th>Pinyin</th>
                            <th>Meaning</th>
                          </tr>
                        </thead>

                        <tbody>
                          {vocabulary[section.id].map(
                            (item, index) => (
                              <tr
                                key={`${section.id}-${item.word}-${index}`}
                              >
                                <td className="vocabulary-word">
                                  {item.word}
                                </td>

                                <td className="vocabulary-pinyin">
                                  {item.pinyin}
                                </td>

                                <td className="vocabulary-meaning">
                                  {item.meaning}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="text-header">
                  <div>
                    <span className="text-label">
                      TEXT{" "}
                      {String(section.number).padStart(2, "0")}
                    </span>

                    <h3>
                      Reading Practice
                    </h3>
                  </div>

                  <div className="line-count">
                    {section.lines?.length || 0} lines
                  </div>
                </div>

                <div className="lines">
                  {section.lines?.map((line, index) => {
                    const isRevealed = !!revealed[line.id];
                    const isSpeaking = speakingId === line.id;

                    return (
                      <article
                        className={`line ${
                          isRevealed
                            ? "line-revealed"
                            : ""
                        }`}
                        key={line.id}
                      >
                        <div className="line-top">
                          <div className="line-index">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div
                            className="chinese"
                            onMouseUp={handleChineseSelection}
                            onTouchEnd={handleChineseSelection}
                          >
                            {line.chinese}
                          </div>

                          <div className="line-actions">
                            {/* VOICE BUTTON */}
                            <button
                              className={`voice-button ${
                                isSpeaking
                                  ? "voice-active"
                                  : ""
                              }`}
                              onClick={() => {
                                if (isSpeaking) {
                                  stopSpeaking();
                                } else {
                                  speakChinese(
                                    line.chinese,
                                    line.id
                                  );
                                }
                              }}
                              title={
                                isSpeaking
                                  ? "Stop"
                                  : "Listen to Chinese"
                              }
                              aria-label={
                                isSpeaking
                                  ? "Stop pronunciation"
                                  : "Play Chinese pronunciation"
                              }
                            >
                              {isSpeaking ? "■" : "🔊"}
                            </button>

                            {/* REVEAL BUTTON */}
                            <button
                              className={`reveal-button ${
                                isRevealed
                                  ? "revealed-button"
                                  : ""
                              }`}
                              onClick={() =>
                                toggleLine(line.id)
                              }
                            >
                              {isRevealed ? (
                                <>
                                  <span>−</span>
                                  Hide
                                </>
                              ) : (
                                <>
                                  <span>+</span>
                                  See
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* REVEALED INFORMATION */}
                        {isRevealed && (
                          <div className="help-area">
                            <div className="pinyin-box">
                              <div className="box-label">
                                <span className="pinyin-icon">
                                  拼
                                </span>
                                PINYIN
                              </div>

                              <div className="pinyin-text">
                                {line.pinyin}
                              </div>
                            </div>

                            <div className="translation-box">
                              <div className="box-label">
                                <span className="english-icon">
                                  EN
                                </span>
                                ENGLISH
                              </div>

                              <div className="translation-text">
                                {line.translation}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>

      <p
        style={{
          margin: "20px 8px 5px",
          paddingTop: "15px",
          borderTop: "1px solid #eee",
          textAlign: "center",
          color: "#9a9eaa",
          fontSize: "10px",
          lineHeight: "1.5",
        }}
      >
        Developed by{" "}
        <a
          href="https://github.com/CodeTanvir"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#4f46e5",
            fontWeight: "700",
            textDecoration: "none",
            letterSpacing: "0.3px",
          }}
        >
          TANVIR_HOSSAIN
        </a>
      </p>

      {/* Existing full translator modal */}
      <TranslateModal />

      {/* READING AREA SELECTION TRANSLATOR */}
   {selectionPopup && selectedText && (
  <div
    className="reading-selection-popup"
    style={{
      top: `${selectionPopup.top}px`,
      left: `${selectionPopup.left}px`,
    }}
    onMouseDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
  >
    {/* CLOSE BUTTON */}
    <button
      className="reading-selection-close"
      onClick={() => {
        setSelectionPopup(null);
        setSelectedText("");
        setSelectionTranslation("");
        setTranslationLoading(false);
      }}
      aria-label="Close"
      title="Close"
    >
      ×
    </button>

    {!selectionTranslation && (
      <button
        className="reading-selection-translate-button"
        onClick={translateSelectedText}
        disabled={translationLoading}
      >
        <span className="reading-selection-translate-icon">
          🌐
        </span>

        <span>
          {translationLoading
            ? "Translating..."
            : "Translate"}
        </span>
      </button>
    )}

    {selectionTranslation && (
      <div className="reading-selection-result">
        <div className="reading-selection-result-header">
          <span className="reading-selection-result-icon">
            EN
          </span>

          <span className="reading-selection-result-label">
            English
          </span>
        </div>

        <div className="reading-selection-result-text">
          {selectionTranslation}
        </div>

        <button
          className="reading-selection-again"
          onClick={() => {
            setSelectionTranslation("");
          }}
        >
          Translate again
        </button>
      </div>
    )}
  </div>
)}
    </div>
  );
}

export default App;