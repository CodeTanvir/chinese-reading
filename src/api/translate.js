export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Please enter some Chinese text.",
      });
    }

    const chineseText = text.trim();

    const url =
      "https://api.mymemory.translated.net/get?" +
      new URLSearchParams({
        q: chineseText,
        langpair: "zh-CN|en",
      });

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "MyMemory translation request failed.",
      });
    }

    const translation =
      data?.responseData?.translatedText;

    if (!translation) {
      return res.status(502).json({
        error: "No translation was returned.",
      });
    }

    return res.status(200).json({
      translation,
    });
  } catch (error) {
    console.error("Translation error:", error);

    return res.status(500).json({
      error: "Translation server error.",
    });
  }
}