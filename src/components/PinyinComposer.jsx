
import { useMemo, useState } from "react";
import vocabulary from "../data/vocabulary";

function normalizePinyin(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/v/g, "u")
    .replace(/[^a-z]/g, "");
}

function PinyinComposer({ value, onChange }) {
  const [pinyinInput, setPinyinInput] = useState("");

  const vocabularyList = useMemo(() => {
    const words = [];

    Object.values(vocabulary).forEach((sectionWords) => {
      if (!Array.isArray(sectionWords)) return;

      sectionWords.forEach((item) => {
        if (item?.word && item?.pinyin) {
          words.push(item);
        }
      });
    });

    const uniqueWords = new Map();

    words.forEach((item) => {
      const key = `${item.word}-${normalizePinyin(item.pinyin)}`;

      if (!uniqueWords.has(key)) {
        uniqueWords.set(key, item);
      }
    });

    return Array.from(uniqueWords.values());
  }, []);

  const suggestions = useMemo(() => {
    const query = normalizePinyin(pinyinInput);

    if (!query) return [];

    return vocabularyList
      .filter((item) => {
        const pinyin = normalizePinyin(item.pinyin);

        return (
          pinyin.startsWith(query) ||
          pinyin.includes(query)
        );
      })
      .slice(0, 10);
  }, [pinyinInput, vocabularyList]);

  function selectWord(item) {
    onChange(`${value}${item.word}`);
    setPinyinInput("");
  }

  function handlePinyinChange(e) {
    setPinyinInput(e.target.value);
  }

  function handleKeyDown(e) {
    if (
      e.key === "Enter" &&
      suggestions.length > 0
    ) {
      e.preventDefault();

      selectWord(suggestions[0]);
    }

    if (e.key === "Backspace" && !pinyinInput && value) {
      onChange(Array.from(value).slice(0, -1).join(""));
    }
  }

  function clearSentence() {
    onChange("");
    setPinyinInput("");
  }

  return (
    <div className="pinyin-composer">

      {/* SINGLE ROW */}
      <div className="composer-row">

        {/* Selected Chinese characters */}
        <div className="composer-sentence">
          {value && (
            <span className="composer-selected-text">
              {value}
            </span>
          )}

          {/* Pinyin typing area */}
          <input
            type="text"
            className="composer-pinyin-input"
            placeholder={
              value
                ? "Type pinyin..."
                : "Type pinyin to build a sentence..."
            }
            value={pinyinInput}
            onChange={handlePinyinChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>

        {/* Clear */}
        {(value || pinyinInput) && (
          <button
            className="composer-clear"
            onClick={clearSentence}
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {/* CHINESE CHARACTER SUGGESTIONS */}
      {suggestions.length > 0 && (
        <div className="character-suggestions">
          {suggestions.map((item, index) => (
            <button
              key={`${item.word}-${item.pinyin}-${index}`}
              className="character-suggestion"
              onClick={() => selectWord(item)}
              type="button"
              title={item.pinyin}
            >
              {item.word}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

export default PinyinComposer;

