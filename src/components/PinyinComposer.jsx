
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

function containsChinese(value) {
  return /[\u3400-\u9fff]/.test(value);
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

  function handleInputChange(e) {
    const input = e.target.value;

    // Chinese pasted directly
    if (containsChinese(input)) {
      onChange(input);
      setPinyinInput("");
      return;
    }

    // Pinyin typing
    setPinyinInput(input);
  }

  function handleKeyDown(e) {
    // Enter selects first suggestion
    if (
      e.key === "Enter" &&
      suggestions.length > 0
    ) {
      e.preventDefault();

      selectWord(suggestions[0]);
    }
  }

  function clearSentence() {
    onChange("");
    setPinyinInput("");
  }

  return (
    <div className="pinyin-composer">

      {/* LARGE TEXTAREA */}
      <div className="composer-textarea-wrapper">

        <textarea
          className="composer-textarea"
          value={value || pinyinInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type pinyin to build a Chinese sentence, or paste Chinese text..."
          rows={6}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {(value || pinyinInput) && (
          <button
            className="composer-clear"
            onClick={clearSentence}
            type="button"
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {/* CHARACTER SUGGESTIONS */}
      {suggestions.length > 0 && (
        <div className="character-suggestions">
          {suggestions.map((item, index) => (
            <button
              key={`${item.word}-${item.pinyin}-${index}`}
              className="character-suggestion"
              onClick={() => selectWord(item)}
              type="button"
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

