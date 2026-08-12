(function (global) {
  "use strict";

  const API_ENDPOINT = "/api/translate";

  const supportedLanguages = [
    "English",
    "Arabic",
    "Hausa",
    "French",
    "Spanish",
    "Portuguese",
    "German",
    "Italian",
    "Dutch",
    "Russian",
    "Ukrainian",
    "Polish",
    "Turkish",
    "Persian",
    "Urdu",
    "Hindi",
    "Bengali",
    "Punjabi",
    "Gujarati",
    "Marathi",
    "Tamil",
    "Telugu",
    "Kannada",
    "Malayalam",
    "Nepali",
    "Sinhala",
    "Mandarin Chinese",
    "Cantonese",
    "Japanese",
    "Korean",
    "Vietnamese",
    "Thai",
    "Indonesian",
    "Malay",
    "Filipino (Tagalog)",
    "Swahili",
    "Somali",
    "Amharic",
    "Yoruba",
    "Igbo",
    "Zulu",
    "Afrikaans",
    "Hebrew",
    "Greek",
    "Romanian",
    "Czech",
    "Hungarian",
    "Swedish",
    "Norwegian",
    "Danish"
  ];

  let latestResults = null;

  function updateStatus(callback, message) {
    if (typeof callback === "function") {
      callback(message);
    }
  }

  function extractOutputText(data) {
    if (!Array.isArray(data?.output)) {
      return "";
    }

    return data.output
      .flatMap(function (outputItem) {
        return Array.isArray(outputItem.content)
          ? outputItem.content
          : [];
      })
      .filter(function (contentItem) {
        return (
          contentItem.type === "output_text" &&
          typeof contentItem.text === "string"
        );
      })
      .map(function (contentItem) {
        return contentItem.text;
      })
      .join("");
  }

  function cleanJSON(text) {
    return String(text || "")
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  async function callAPI(prompt, options) {
    const settings = options || {};

    const response = await fetch(
      settings.apiEndpoint || API_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          prompt: prompt
        }),

        signal: settings.signal
      }
    );

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        "The server returned invalid JSON."
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        "The API request failed.";

      throw new Error(
        typeof message === "string"
          ? message
          : "The API request failed."
      );
    }

    const output = cleanJSON(
      extractOutputText(data)
    );

    if (!output) {
      throw new Error(
        "The API returned no text."
      );
    }

    try {
      return JSON.parse(output);
    } catch (error) {
      console.error(
        "Invalid AI JSON:",
        output
      );

      throw new Error(
        "The AI response was not valid JSON."
      );
    }
  }

  function buildPrompt(
    text,
    sourceLanguage,
    targetLanguage
  ) {
    const sourceInstruction =
      sourceLanguage === "Auto Detect"
        ? `
Detect the actual source language automatically.
`
        : `
The expected source language is ${sourceLanguage}.

Verify the actual source language.
`;

    return `
You are a multilingual translation, pronunciation and sentence
breakdown engine.

SUPPORTED LANGUAGES:

${supportedLanguages.join(", ")}

SOURCE LANGUAGE SETTING:

${sourceLanguage}

TARGET LANGUAGE:

${targetLanguage}

${sourceInstruction}

USER TEXT:

${text}

MAIN TASK:

Translate the complete source sentence naturally into
${targetLanguage}.

Then create two different sentence-flow breakdowns.

VIEW 1: TARGET-LANGUAGE FLOW

Break the target translation into natural words or short grammatical
phrases in the exact order used by the target language.

For every target-language part, return:

- target:
  The target-language word or phrase in its normal writing system.

- pronunciation:
  An easy Latin-letter natural pronunciation of that target part.

- source:
  The closest source-language meaning.

The source value may be an empty string when a grammatical target
particle has no independent source-language meaning.

VIEW 2: SOURCE-LANGUAGE FLOW

Break the original source sentence into natural words or short phrases
in the exact original source order.

For every source-language part, return:

- source:
  The source word or phrase in its original order.

- target:
  The closest corresponding target-language word or phrase.

- pronunciation:
  The pronunciation of the corresponding target-language part.

The target and pronunciation may be empty strings when a source word,
such as an article, has no separate equivalent in the target language.

IMPORTANT:

The two views do not need to contain the same number of items.

Do not force a one-to-one word translation.

One source word may correspond to several target words.

Several source words may correspond to one target word or phrase.

EXAMPLE:

SOURCE:

I got a pen, book and pencil from the university.

TARGET LANGUAGE:

Japanese

Natural Japanese meaning:

私は大学からペンと本と鉛筆をもらいました。

TARGET-LANGUAGE FLOW EXAMPLE:

[
  {
    "index": 0,
    "target": "私は",
    "pronunciation": "Watashi wah",
    "source": "I"
  },
  {
    "index": 1,
    "target": "大学",
    "pronunciation": "Dai-gah-koo",
    "source": "university"
  },
  {
    "index": 2,
    "target": "から",
    "pronunciation": "Kah-rah",
    "source": "from"
  },
  {
    "index": 3,
    "target": "ペン",
    "pronunciation": "Pen",
    "source": "pen"
  },
  {
    "index": 4,
    "target": "と",
    "pronunciation": "Toh",
    "source": "and"
  },
  {
    "index": 5,
    "target": "本",
    "pronunciation": "Hohn",
    "source": "book"
  },
  {
    "index": 6,
    "target": "と",
    "pronunciation": "Toh",
    "source": "and"
  },
  {
    "index": 7,
    "target": "鉛筆",
    "pronunciation": "En-pee-tsoo",
    "source": "pencil"
  },
  {
    "index": 8,
    "target": "をもらいました",
    "pronunciation": "Oh moh-rah-ee-mah-shee-tah",
    "source": "I got"
  }
]

SOURCE-LANGUAGE FLOW EXAMPLE:

[
  {
    "index": 0,
    "source": "I",
    "target": "私は",
    "pronunciation": "Watashi wah"
  },
  {
    "index": 1,
    "source": "got",
    "target": "をもらいました",
    "pronunciation": "Oh moh-rah-ee-mah-shee-tah"
  },
  {
    "index": 2,
    "source": "a",
    "target": "",
    "pronunciation": ""
  },
  {
    "index": 3,
    "source": "pen",
    "target": "ペン",
    "pronunciation": "Pen"
  },
  {
    "index": 4,
    "source": "book",
    "target": "本",
    "pronunciation": "Hohn"
  },
  {
    "index": 5,
    "source": "and",
    "target": "と",
    "pronunciation": "Toh"
  },
  {
    "index": 6,
    "source": "pencil",
    "target": "鉛筆",
    "pronunciation": "En-pee-tsoo"
  },
  {
    "index": 7,
    "source": "from",
    "target": "から",
    "pronunciation": "Kah-rah"
  },
  {
    "index": 8,
    "source": "the university",
    "target": "大学",
    "pronunciation": "Dai-gah-koo"
  }
]

TARGET-FLOW RULES:

- Follow the natural target-language sentence order.
- Preserve the complete translation.
- Do not rearrange the target language into English order.
- Keep grammatical units together when separating them would make
  them unnatural.
- Small particles may have an empty source meaning.
- Preserve repeated words and repeated particles.
- Do not remove meaningful words.
- Do not split a word into individual letters or characters.
- For Japanese, do not split one conjugated verb into separate kanji
  and kana fragments.
- A phrase such as をもらいました may remain together.

SOURCE-FLOW RULES:

- Follow the exact original source-language order.
- Preserve every meaningful source word.
- Articles may have an empty target value when there is no equivalent.
- Do not change the original meaning.
- Do not reorder source words to match the target language.
- Do not omit repeated source words.
- Use short natural phrases when individual words cannot be translated
  independently.

PRONUNCIATION RULES:

- Use readable Latin letters.
- Make pronunciation easy for an English-speaking learner.
- Do not use IPA.
- The pronunciation must match only its target word or phrase.
- Do not place translations inside pronunciation.
- For Japanese, use easy romaji-style pronunciation.
- For Chinese, use easy Latin-letter pronunciation.
- For Arabic, Persian and Urdu, use readable Latin transliteration.
- For Indian languages, use readable Latin transliteration.

GENERAL RULES:

- Detect the actual source language.
- Preserve names, numbers and complete meaning.
- Use the normal writing system of ${targetLanguage}.
- Do not add explanations.
- Do not use Markdown.
- Return valid JSON only.
- Indexes must start from 0.
- Indexes must increase by 1.
- Every target_flow item must contain index, target,
  pronunciation and source.
- Every source_flow item must contain index, source,
  target and pronunciation.
- Empty equivalents must be returned as empty strings.
- Do not use null.

OUTPUT EXACTLY:

{
  "detected_language": "",
  "target_language": "",
  "target_flow": [
    {
      "index": 0,
      "target": "",
      "pronunciation": "",
      "source": ""
    }
  ],
  "source_flow": [
    {
      "index": 0,
      "source": "",
      "target": "",
      "pronunciation": ""
    }
  ]
}
`;
  }

  function normalizeTargetFlow(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map(function (item) {
        return {
          target: String(
            item?.target || ""
          ).trim(),

          pronunciation: String(
            item?.pronunciation || ""
          ).trim(),

          source: String(
            item?.source || ""
          ).trim()
        };
      })
      .filter(function (item) {
        return (
          item.target ||
          item.pronunciation ||
          item.source
        );
      })
      .map(function (item, index) {
        return {
          index: index,
          target: item.target,
          pronunciation:
            item.pronunciation,
          source: item.source
        };
      });
  }

  function normalizeSourceFlow(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map(function (item) {
        return {
          source: String(
            item?.source || ""
          ).trim(),

          target: String(
            item?.target || ""
          ).trim(),

          pronunciation: String(
            item?.pronunciation || ""
          ).trim()
        };
      })
      .filter(function (item) {
        return Boolean(item.source);
      })
      .map(function (item, index) {
        return {
          index: index,
          source: item.source,
          target: item.target,
          pronunciation:
            item.pronunciation
        };
      });
  }

  async function generateResults(options) {
    const settings = options || {};

    const text = String(
      settings.text || ""
    ).trim();

    const sourceLanguage =
      settings.sourceLanguage ||
      "Auto Detect";

    const targetLanguage =
      settings.targetLanguage ||
      "English";

    if (!text) {
      throw new Error(
        "Enter some text."
      );
    }

    if (
      sourceLanguage !== "Auto Detect" &&
      sourceLanguage === targetLanguage
    ) {
      throw new Error(
        "The source and target languages must be different."
      );
    }

    updateStatus(
      settings.onStatus,
      "Translating and breaking down the sentence..."
    );

    const response = await callAPI(
      buildPrompt(
        text,
        sourceLanguage,
        targetLanguage
      ),
      settings
    );

    const targetFlow =
      normalizeTargetFlow(
        response.target_flow
      );

    const sourceFlow =
      normalizeSourceFlow(
        response.source_flow
      );

    if (!targetFlow.length) {
      throw new Error(
        "No target-language sentence breakdown was returned."
      );
    }

    if (!sourceFlow.length) {
      throw new Error(
        "No source-language sentence breakdown was returned."
      );
    }

    latestResults = {
      request: {
        text: text,

        sourceLanguage:
          sourceLanguage,

        targetLanguage:
          targetLanguage
      },

      detectedLanguage:
        response.detected_language ||
        sourceLanguage,

      targetLanguage:
        response.target_language ||
        targetLanguage,

      targetFlow:
        targetFlow,

      sourceFlow:
        sourceFlow,

      /*
        Backward-compatible data for your current index.html.

        This allows the existing display to continue showing
        target-language order before the Reverse button is added.
      */

      groups: targetFlow.map(function (item) {
        return {
          index: item.index,

          source:
            item.source || "—",

          translation:
            item.target || "—",

          pronunciation:
            item.pronunciation || "—"
        };
      }),

      activeFlow:
        "target",

      generatedAt:
        new Date().toISOString()
    };

    global.lingoResults =
      latestResults;

    updateStatus(
      settings.onStatus,
      "Complete."
    );

    return latestResults;
  }

  function getLatestResults() {
    return latestResults;
  }

  global.lingoResults = null;

  global.LingoGPTResults =
    Object.freeze({
      supportedLanguages:
        Object.freeze(
          supportedLanguages.slice()
        ),

      generateResults:
        generateResults,

      getLatestResults:
        getLatestResults
    });

})(window);