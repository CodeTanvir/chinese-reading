
import { useState } from "react";
import PinyinComposer from "./PinyinComposer";

function TranslateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [sentence, setSentence] = useState("");
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTranslate() {
    if (!sentence.trim() || loading) return;

    setLoading(true);
    setTranslation("");

    try {
      const url =
        "https://api.mymemory.translated.net/get?" +
        new URLSearchParams({
          q: sentence.trim(),
          langpair: "zh-CN|en",
        });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Translation request failed (${response.status})`
        );
      }

      const data = await response.json();

      const translatedText =
        data?.responseData?.translatedText;

      if (!translatedText) {
        throw new Error(
          "No translation was returned."
        );
      }

      setTranslation(translatedText);
    } catch (error) {
      console.error("Translation error:", error);

      setTranslation(
        error.message ||
          "Unable to translate this sentence."
      );
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setIsOpen(false);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  }

  return (
    <>
      {/* Floating Translate Button */}
      <button
        className="floating-translate-button"
        onClick={() => setIsOpen(true)}
        aria-label="Open translator"
      >
        <span>🌐</span>
        Translate
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="translate-modal-overlay"
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
        >
          <div className="translate-modal">
            <div className="translate-modal-header">
              <div>
                <span className="translate-modal-label">
                  TRANSLATOR
                </span>

                <h2>Chinese Sentence Builder</h2>
              </div>

              <button
                className="translate-close-button"
                onClick={closeModal}
                aria-label="Close translator"
              >
                ×
              </button>
            </div>

            <div className="translate-modal-body">
              <PinyinComposer
                value={sentence}
                onChange={(value) => {
                  setSentence(value);
                  setTranslation("");
                }}
              />

              <button
                className="translate-submit-button"
                onClick={handleTranslate}
                disabled={
                  loading || !sentence.trim()
                }
              >
                {loading ? (
                  <>
                    <span className="translate-spinner"></span>
                    Translating...
                  </>
                ) : (
                  "🌐 Translate to English"
                )}
              </button>

              {translation && (
                <div className="translate-result">
                  <div className="translate-result-header">
                    ENGLISH
                  </div>

                  <div className="translate-result-text">
                    {translation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TranslateModal;

