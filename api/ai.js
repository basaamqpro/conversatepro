const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-6-luna";

const DIRECTIONS = new Set(["en-ar", "ar-en"]);
const SPEAKERS = new Set(["user", "partner"]);

const segmentSchema = {
  type: "object",
  properties: {
    english: { type: "string" },
    arabic: { type: "string" },
    transliteration: { type: "string" }
  },
  required: ["english", "arabic", "transliteration"],
  additionalProperties: false
};

const linguisticProperties = {
  english: { type: "string" },
  arabic: { type: "string" },
  segments: {
    type: "array",
    items: segmentSchema
  }
};

const TASKS = {
  process_sentence: {
    schemaName: "conversate_process_sentence",
    schema: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        message: { type: "string" },
        inputKind: {
          type: "string",
          enum: [
            "english",
            "arabic",
            "transliteration",
            "mixed",
            "unknown"
          ]
        },
        ...linguisticProperties
      },
      required: [
        "valid",
        "message",
        "inputKind",
        "english",
        "arabic",
        "segments"
      ],
      additionalProperties: false
    }
  },

  next_turn: {
    schemaName: "conversate_next_turn",
    schema: {
      type: "object",
      properties: {
        speaker: {
          type: "string",
          enum: ["user", "partner"]
        },
        ...linguisticProperties
      },
      required: ["speaker", "english", "arabic", "segments"],
      additionalProperties: false
    }
  },

  generate_options: {
    schemaName: "conversate_options",
    schema: {
      type: "object",
      properties: {
        options: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: linguisticProperties,
            required: ["english", "arabic", "segments"],
            additionalProperties: false
          }
        }
      },
      required: ["options"],
      additionalProperties: false
    }
  },

  build_paragraph: {
    schemaName: "conversate_paragraph",
    schema: {
      type: "object",
      properties: linguisticProperties,
      required: ["english", "arabic", "segments"],
      additionalProperties: false
    }
  },

  teach: {
    schemaName: "conversate_teach",
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" }
      },
      required: ["explanation"],
      additionalProperties: false
    }
  }
};

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function jsonError(res, status, message, details) {
  return res.status(status).json({
    success: false,
    error: message,
    ...(details ? { details } : {})
  });
}

function validDirection(direction) {
  return DIRECTIONS.has(direction);
}

function nextSpeakerFromHistory(history) {
  const last = history[history.length - 1];

  if (!last) {
    return "partner";
  }

  return last.speaker === "user" ? "partner" : "user";
}

function normalizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return rawHistory
    .slice(-40)
    .map((item) => ({
      speaker: SPEAKERS.has(item?.speaker) ? item.speaker : "user",
      english: cleanText(item?.english),
      arabic: cleanText(item?.arabic)
    }))
    .filter((item) => item.english || item.arabic);
}

function validateRequest(task, data) {
  if (!TASKS[task]) {
    return "Unsupported AI task.";
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "A data object is required.";
  }

  if (!validDirection(data.direction)) {
    return "direction must be either 'en-ar' or 'ar-en'.";
  }

  if (task === "process_sentence") {
    const text = cleanText(data.text);
    if (!text) return "Sentence text is required.";
    if (text.length > 1000) return "Sentence text is too long.";
  }

  if (task === "next_turn") {
    const history = normalizeHistory(data.history);
    if (history.length > 40) return "Conversation history is too long.";
  }

  if (task === "generate_options") {
    const sentence = data.sentence;
    if (!sentence || typeof sentence !== "object") {
      return "A source sentence is required.";
    }
    if (!cleanText(sentence.english) || !cleanText(sentence.arabic)) {
      return "The source sentence must contain English and Arabic.";
    }
  }

  if (task === "build_paragraph") {
    if (!Array.isArray(data.sentences) || data.sentences.length < 2) {
      return "At least two sentences are required to build a paragraph.";
    }
    if (data.sentences.length > 20) {
      return "A paragraph can contain at most 20 sentences for now.";
    }
  }

  if (task === "teach") {
    const item = data.item;
    if (!item || typeof item !== "object") {
      return "A sentence or option is required for Teach.";
    }
    if (!cleanText(item.english) || !cleanText(item.arabic)) {
      return "Teach requires both English and Arabic text.";
    }
  }

  return "";
}

function directionText(direction) {
  return direction === "en-ar"
    ? "The learning direction is English to Arabic. Arabic is the target/practice language."
    : "The learning direction is Arabic to English. English is the target/practice language.";
}

function commonArabicRules() {
  return [
    "Use clear, natural Modern Standard Arabic (MSA), not dialect, unless the supplied sentence itself contains a proper name or unavoidable borrowed term.",
    "FULL ARABIC VOCALIZATION IS REQUIRED: write Arabic with complete tashkeel/harakat wherever grammatically determinable, including fatha, kasra, damma, sukun, shadda, tanwin, and appropriate final case or mood endings. Do not return ordinary unvocalized Arabic when a fully vocalized form can be supplied.",
    "Fully vocalize common particles, pronouns, verbs, nouns, adjectives, and attached forms too. Example: 'أنا ذهبت إلى المدرسة' should be returned as 'أَنَا ذَهَبْتُ إِلَى الْمَدْرَسَةِ'.",
    "The Arabic inside every breakdown segment must use the SAME vocalization as the corresponding word or words in the full Arabic sentence. Do not show a vocalized full sentence but unvocalized segment Arabic, or vice versa.",
    "If a proper name or borrowed word has genuinely uncertain pronunciation, preserve the correct Arabic spelling and add only the diacritics you can determine confidently rather than inventing a false vocalization.",
    "Preserve the intended meaning, person, tense, polarity, question/statement type, and important details.",
    "Always return both a natural English sentence and its natural fully vocalized MSA Arabic equivalent.",
    "For every breakdown segment, provide aligned English, fully vocalized Arabic, and Latin-script Arabic transliteration.",
    "SEGMENTATION PRIORITY: make the breakdown fine-grained and Arabic-aligned. The default is ONE Arabic orthographic word per segment, in Arabic reading order.",
    "For each Arabic word, give the smallest natural English gloss that represents that word's contribution in this sentence. The English gloss may contain more than one English word when Arabic packs several meanings into one written word.",
    "Keep Arabic clitics and attached morphology with the written Arabic word rather than inventing separate Arabic tokens. Examples: 'المدرسة' -> 'the school'; 'كتابي' -> 'my book'; 'وذهبتُ' -> 'and I went'; 'بالمدرسة' -> 'at/in the school'.",
    "When an explicit Arabic word already carries a meaning separately, avoid duplicating that meaning in the next segment. Example: in 'أنا ذهبتُ إلى المدرسة', prefer 'أنا' -> 'I', 'ذهبتُ' -> 'went', 'إلى' -> 'to', 'المدرسة' -> 'the school'.",
    "Only combine two or more Arabic words into one segment when splitting them would be misleading, semantically empty, or would destroy a fixed expression. Use multi-word segments sparingly.",
    "Do NOT collapse an ordinary sentence into two or three broad phrase segments when it can be represented accurately with more word-level segments.",
    "The transliteration must represent the Arabic segment, not the English text, and should reflect the vowels shown by the Arabic tashkeel as closely as practical.",
    "Do not add explanations outside the requested JSON structure."
  ].join("\n");
}

function buildPrompt(task, data) {
  const direction = data.direction;
  const directionInstruction = directionText(direction);

  if (task === "process_sentence") {
    return {
      system: [
        "You are the sentence-normalization engine for ConversateProArabic, an English-Arabic language-learning application.",
        directionInstruction,
        commonArabicRules(),
        "The learner may type English, Arabic script, Arabic transliteration, approximate phonetic spelling such as 'dahabto illal madrasa', or a reasonable mixture of English and Arabic/transliteration.",
        "Infer the intended sentence conservatively. Correct obvious transliteration or spelling noise without changing the intended meaning.",
        "The application teaches one sentence at a time. If the input clearly contains more than one independent sentence, set valid=false, give a short message asking for one sentence at a time, and return empty English/Arabic strings with an empty segments array.",
        "If it is one sentence, set valid=true and message to an empty string.",
        "Classify inputKind as english, arabic, transliteration, mixed, or unknown.",
        "For valid input, produce a detailed Arabic-word-aligned breakdown rather than a small number of broad phrase groups."
      ].join("\n\n"),
      user: JSON.stringify({
        direction,
        text: cleanText(data.text)
      })
    };
  }

  if (task === "next_turn") {
    const history = normalizeHistory(data.history);
    const requiredSpeaker = nextSpeakerFromHistory(history);

    return {
      system: [
        "You generate exactly one next conversational turn for ConversateProArabic.",
        directionInstruction,
        commonArabicRules(),
        `The next speaker MUST be '${requiredSpeaker}'.`,
        "Generate exactly one natural sentence that continues the supplied conversation coherently.",
        "Do not generate both sides of the conversation and do not add narration.",
        "Keep the sentence useful for a beginner or intermediate language learner unless the existing conversation clearly requires more advanced wording.",
        "Return speaker exactly as required.",
        "Break the generated sentence down at Arabic-word level wherever linguistically sensible."
      ].join("\n\n"),
      user: JSON.stringify({
        direction,
        requiredSpeaker,
        history
      })
    };
  }

  if (task === "generate_options") {
    const sentence = {
      english: cleanText(data.sentence?.english),
      arabic: cleanText(data.sentence?.arabic)
    };

    return {
      system: [
        "You generate sentence variations for ConversateProArabic.",
        directionInstruction,
        commonArabicRules(),
        "Create exactly three useful alternatives related to the supplied sentence.",
        "The alternatives should help the learner vary vocabulary, place, object, time, adjective, verb, or another natural element while keeping the grammatical pattern reasonably learnable.",
        "Do not merely paraphrase all three in almost identical wording.",
        "Each option must be a complete standalone sentence and must preserve a sensible relation to the original sentence.",
        "Give every option the same fine-grained Arabic-word-aligned breakdown required for normal sentences."
      ].join("\n\n"),
      user: JSON.stringify({
        direction,
        sentence
      })
    };
  }

  if (task === "build_paragraph") {
    const sentences = data.sentences.map((sentence, index) => ({
      order: Number.isFinite(Number(sentence?.order))
        ? Number(sentence.order)
        : index,
      english: cleanText(sentence?.english),
      arabic: cleanText(sentence?.arabic)
    }));

    return {
      system: [
        "You build a short connected passage for ConversateProArabic from selected sentence meanings.",
        directionInstruction,
        commonArabicRules(),
        "Use ALL supplied sentences exactly once in their supplied order.",
        "Translate/rewrite the full selected content as one coherent passage; do not concatenate previously translated fragments mechanically.",
        "You may add only minimal grammatical connectors that are necessary for natural flow.",
        "Do not invent new facts, events, opinions, people, places, or actions.",
        "Preserve perspective, tense, negation, and questions where possible.",
        "Return a fresh paragraph-wide breakdown covering the complete passage.",
        "Even for a paragraph, keep the segments fine-grained and Arabic-word-aligned; do not turn each sentence into one large segment."
      ].join("\n\n"),
      user: JSON.stringify({
        direction,
        sentences
      })
    };
  }

  if (task === "teach") {
    const item = {
      english: cleanText(data.item?.english),
      arabic: cleanText(data.item?.arabic),
      segments: Array.isArray(data.item?.segments)
        ? data.item.segments
        : []
    };

    return {
      system: [
        "You are the Teach feature for ConversateProArabic.",
        directionInstruction,
        "Explain the supplied English-Arabic sentence pair to an English-speaking learner clearly and concisely.",
        "Focus on the most useful points: natural meaning, important vocabulary, Arabic pronunciation, grammar, word order, gender/number, pronouns, particles, attached pronouns, idafa, definiteness, verb form/root when genuinely helpful, and case endings only when pedagogically useful.",
        "Do not overwhelm the learner. Prefer a compact explanation of the most relevant features of this specific sentence.",
        "When the learning direction is Arabic to English, still explain important Arabic structure when it helps explain the English meaning.",
        "Do not claim a rule that is not illustrated by the supplied sentence."
      ].join("\n\n"),
      user: JSON.stringify({
        direction,
        item
      })
    };
  }

  throw new Error("Unsupported AI task.");
}

function extractOutputText(responseData) {
  if (typeof responseData?.output_text === "string") {
    return responseData.output_text.trim();
  }

  const pieces = [];

  for (const item of responseData?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        pieces.push(content.text);
      }

      if (content?.type === "refusal" && typeof content.refusal === "string") {
        throw new Error(content.refusal);
      }
    }
  }

  return pieces.join("\n").trim();
}

async function callOpenAI(task, data, apiKey) {
  const taskConfig = TASKS[task];
  const prompt = buildPrompt(task, data);

  const openAIResponse = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content: prompt.system
        },
        {
          role: "user",
          content: prompt.user
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: taskConfig.schemaName,
          strict: true,
          schema: taskConfig.schema
        }
      }
    })
  });

  let responseData;

  try {
    responseData = await openAIResponse.json();
  } catch (error) {
    throw new Error("OpenAI returned an invalid response.");
  }

  if (!openAIResponse.ok) {
    const message =
      responseData?.error?.message ||
      "OpenAI request failed.";

    const error = new Error(message);
    error.status = openAIResponse.status;
    throw error;
  }

  const outputText = extractOutputText(responseData);

  if (!outputText) {
    throw new Error("OpenAI returned no structured output.");
  }

  try {
    return JSON.parse(outputText);
  } catch (error) {
    throw new Error("OpenAI returned malformed structured output.");
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return jsonError(res, 405, "Method not allowed. Use POST.");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonError(
      res,
      500,
      "OPENAI_API_KEY is not configured."
    );
  }

  const task = cleanText(req.body?.task);
  const data = req.body?.data;
  const validationError = validateRequest(task, data);

  if (validationError) {
    return jsonError(res, 400, validationError);
  }

  try {
    const result = await callOpenAI(task, data, apiKey);

    return res.status(200).json({
      success: true,
      task,
      result
    });
  } catch (error) {
    console.error("ConversateProArabic AI error:", error);

    return jsonError(
      res,
      Number(error?.status) || 500,
      error?.message || "AI request failed."
    );
  }
}
