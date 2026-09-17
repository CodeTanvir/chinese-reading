import { useEffect, useMemo, useState } from "react";
import texts from "./data/texts";
import "./styles.css";
import vocabulary from "./data/vocabulary";

function App() {
  const [selectedLessonId, setSelectedLessonId] = useState(texts[0]?.id);
  const [revealed, setRevealed] = useState({});
  const [search, setSearch] = useState("");
  const [voices, setVoices] = useState([]);
  const [speed, setSpeed] = useState(0.8);
  const [speakingId, setSpeakingId] = useState(null);

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
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("zh")) ||
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
    utterance.rate = 0.65;
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
                LESSON {String(selectedLesson.number).padStart(2, "0")}
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
          <section className="progress-card">
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
          </section>

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
          {vocabulary[section.id].map((item, index) => (
            <tr key={`${section.id}-${item.word}-${index}`}>
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
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
                <div className="text-header">
                  <div>
                    <span className="text-label">
                      TEXT {String(section.number).padStart(2, "0")}
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
                          isRevealed ? "line-revealed" : ""
                        }`}
                        key={line.id}
                      >
                        <div className="line-top">
                          <div className="line-index">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="chinese">
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
                {/* VOCABULARY */}

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
    </div>
  );
}

export default App;