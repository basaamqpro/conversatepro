(function (global) {

  "use strict";


  /*
  ==================================================
  SETTINGS
  ==================================================

  teach.js explains a suggested response.

  It does NOT:

  - continue the conversation
  - create response options
  - modify a real conversation message
  - save anything to Firestore

  Everything created here remains temporary
  inside localStorage:

  conversate_teach
  ==================================================
  */

  const API_ENDPOINT =
    "/api/translate";


  const TEACH_STORAGE_KEY =
    "conversate_teach";


  /*
  Keep explanations deliberately short.

  Conversate Pro should teach inside
  the conversation rather than turning
  every click into a full lesson.
  */

  const MAX_HISTORY_MESSAGES =
    8;



  /*
  ==================================================
  STATE
  ==================================================
  */

  let latestTeachResult =
    null;



  /*
  ==================================================
  STATUS
  ==================================================
  */

  function updateStatus(
    callback,
    message
  ) {

    if (
      typeof callback ===
      "function"
    ) {

      callback(
        message
      );

    }

  }



  /*
  ==================================================
  EXTRACT API OUTPUT
  ==================================================
  */

  function extractOutputText(
    data
  ) {

    if (
      !Array.isArray(
        data?.output
      )
    ) {

      return "";

    }


    return data.output

      .flatMap(

        function(outputItem) {

          return Array.isArray(
            outputItem.content
          )

            ? outputItem.content

            : [];

        }

      )

      .filter(

        function(contentItem) {

          return (

            contentItem.type ===
              "output_text"

            &&

            typeof contentItem.text ===
              "string"

          );

        }

      )

      .map(

        function(contentItem) {

          return contentItem.text;

        }

      )

      .join("")

      .trim();

  }



  /*
  ==================================================
  CLEAN TEXT
  ==================================================

  Teach returns plain text.

  No JSON is necessary because index.html
  simply needs a short explanation.
  ==================================================
  */

  function cleanText(
    text
  ) {

    let result =

      String(
        text || ""
      )

        .trim()

        .replace(
          /^```[\w-]*\s*/i,
          ""
        )

        .replace(
          /\s*```$/i,
          ""
        )

        .trim();



    /*
    Remove unnecessary surrounding quotes.
    */

    if (

      (
        result.startsWith('"')
        &&
        result.endsWith('"')
      )

      ||

      (
        result.startsWith("'")
        &&
        result.endsWith("'")
      )

    ) {

      result =
        result.slice(
          1,
          -1
        );

    }


    return result.trim();

  }



  /*
  ==================================================
  API CALL
  ==================================================
  */

  async function callAPI(
    prompt,
    options
  ) {

    const settings =
      options || {};


    const response =

      await fetch(

        settings.apiEndpoint ||
        API_ENDPOINT,

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              prompt:
                prompt

            }),

          signal:
            settings.signal

        }

      );



    let data;


    try {

      data =
        await response.json();


    } catch (error) {

      throw new Error(
        "The server returned invalid JSON."
      );

    }



    if (
      !response.ok
    ) {

      const message =

        data?.error?.message ||

        data?.error ||

        "Teach request failed.";


      throw new Error(

        typeof message ===
          "string"

          ? message

          : "Teach request failed."

      );

    }



    const output =

      extractOutputText(
        data
      );


    if (
      !output
    ) {

      throw new Error(
        "Teach returned no explanation."
      );

    }


    return cleanText(
      output
    );

  }



  /*
  ==================================================
  GET STORED CHAT TEXT
  ==================================================
  */

  function getStoredPrompt(
    chat
  ) {

    if (

      Array.isArray(
        chat?.prompts_and_answers
      )

      &&

      chat
        .prompts_and_answers
        .length

    ) {

      const last =

        chat
          .prompts_and_answers[
            chat
              .prompts_and_answers
              .length - 1
          ];


      if (
        last?.user_prompt
      ) {

        return String(
          last.user_prompt
        ).trim();

      }

    }


    return "";

  }



  /*
  ==================================================
  CHAT TEXT
  ==================================================
  */

  function getChatText(
    chat
  ) {

    if (
      !chat
    ) {

      return "";

    }



    /*
    AI message.
    */

    if (

      chat.message_type ===
        "interaction"

      ||

      chat.is_interaction ===
        true

    ) {

      if (
        chat.interaction_text
      ) {

        return String(
          chat.interaction_text
        ).trim();

      }


      if (
        chat.interactionText
      ) {

        return String(
          chat.interactionText
        ).trim();

      }

    }



    /*
    User canonical meaning.
    */

    if (
      chat.interpreted_source_text
    ) {

      return String(
        chat.interpreted_source_text
      ).trim();

    }


    if (
      chat.interpretedSourceText
    ) {

      return String(
        chat.interpretedSourceText
      ).trim();

    }



    const stored =
      getStoredPrompt(
        chat
      );


    if (
      stored
    ) {

      return stored;

    }



    if (
      chat.original_input
    ) {

      return String(
        chat.original_input
      ).trim();

    }


    return "";

  }



  /*
  ==================================================
  GET SPEAKER
  ==================================================
  */

  function getSpeaker(
    chat
  ) {

    if (

      chat?.message_type ===
        "interaction"

      ||

      chat?.is_interaction ===
        true

    ) {

      return "CONVERSATION PARTNER";

    }


    return "LEARNER";

  }



  /*
  ==================================================
  RECENT ROOM HISTORY
  ==================================================

  Teach may benefit from a little context.

  Example:

  AI:
  What will you do today?

  Option:
  I will go to the market.

  Teach can understand what the option
  is responding to.
  ==================================================
  */

  function getRecentHistory(
    room,
    chat
  ) {

    if (

      !room

      ||

      !Array.isArray(
        room.room_data
      )

    ) {

      return [];

    }



    const clickedIndex =

      room.room_data.findIndex(

        function(item) {

          return (
            item.chat_idx ===
            chat?.chat_idx
          );

        }

      );



    if (
      clickedIndex === -1
    ) {

      return [];

    }



    return room.room_data

      .slice(
        0,
        clickedIndex + 1
      )

      .slice(
        -MAX_HISTORY_MESSAGES
      )

      .map(

        function(item) {

          return {

            speaker:
              getSpeaker(
                item
              ),

            text:
              getChatText(
                item
              )

          };

        }

      )

      .filter(

        function(item) {

          return Boolean(
            item.text
          );

        }

      );

  }



  /*
  ==================================================
  HISTORY TO TEXT
  ==================================================
  */

  function historyToText(
    history
  ) {

    if (
      !history.length
    ) {

      return (
        "[No additional conversation context]"
      );

    }


    return history

      .map(

        function(item) {

          return (

            item.speaker +

            ": " +

            item.text

          );

        }

      )

      .join("\n");

  }



  /*
  ==================================================
  OPTION SOURCE TEXT
  ==================================================

  options.js stores:

  text
      helper/source-language version

  Example:

  I am fine.
  ==================================================
  */

  function getOptionSourceText(
    option
  ) {

    return String(

      option?.sourceText ||

      option?.source_text ||

      option?.text ||

      ""

    ).trim();

  }



  /*
  ==================================================
  OPTION TARGET TEXT
  ==================================================

  Example:

  أنا بخير
  ==================================================
  */

  function getOptionTargetText(
    option
  ) {

    let text =

      String(

        option?.targetText ||

        option?.target_text ||

        option?.useText ||

        ""

      ).trim();



    if (
      text
    ) {

      return text;

    }



    /*
    Reconstruct from targetFlow
    if necessary.
    */

    const flow =

      option?.targetFlow ||

      option?.target_flow;



    if (
      !Array.isArray(
        flow
      )
    ) {

      return "";

    }



    return flow

      .map(

        function(item) {

          return String(
            item?.target || ""
          ).trim();

        }

      )

      .filter(Boolean)

      .join(" ")

      .trim();

  }



  /*
  ==================================================
  OPTION PRONUNCIATION
  ==================================================
  */

  function getOptionPronunciation(
    option
  ) {

    const flow =

      option?.targetFlow ||

      option?.target_flow;



    if (
      !Array.isArray(
        flow
      )
    ) {

      return "";

    }



    return flow

      .map(

        function(item) {

          return String(
            item?.pronunciation || ""
          ).trim();

        }

      )

      .filter(Boolean)

      .join(" ")

      .trim();

  }



  /*
  ==================================================
  OPTION BREAKDOWN TO TEXT
  ==================================================

  This gives Teach precise information about
  what results5.js already produced.

  Example:

  أنا | Ana | I
  بخير | Bikhair | am fine
  ==================================================
  */

  function getOptionBreakdown(
    option
  ) {

    const flow =

      option?.targetFlow ||

      option?.target_flow;



    if (
      !Array.isArray(
        flow
      )

      ||

      !flow.length
    ) {

      return (
        "[No breakdown available]"
      );

    }



    return flow

      .map(

        function(item) {

          const target =

            String(
              item?.target || ""
            ).trim();


          const pronunciation =

            String(
              item?.pronunciation || ""
            ).trim();


          const source =

            String(
              item?.source || ""
            ).trim();



          return (

            "TARGET: " +
            target +

            "\nPRONUNCIATION: " +
            pronunciation +

            "\nMEANING: " +
            source

          );

        }

      )

      .join(
        "\n\n"
      );

  }



  /*
  ==================================================
  INITIAL TEACH PROMPT
  ==================================================

  Used when user presses:

  [Teach]

  without asking a specific question.
  ==================================================
  */

  function buildExplanationPrompt(
    room,
    chat,
    option
  ) {

    const sourceLanguage =

      room?.source_language ||

      "English";


    const targetLanguage =

      room?.target_language ||

      "Arabic";


    const history =

      historyToText(

        getRecentHistory(
          room,
          chat
        )

      );


    const sourceText =

      getOptionSourceText(
        option
      );


    const targetText =

      getOptionTargetText(
        option
      );


    const pronunciation =

      getOptionPronunciation(
        option
      );


    const breakdown =

      getOptionBreakdown(
        option
      );



    return `
You are the short teaching helper inside a language conversation application.

The learner understands:

${sourceLanguage}

The learner is practising:

${targetLanguage}

The learner clicked Teach on a suggested response.

RECENT CONVERSATION:

${history}

SUGGESTED RESPONSE MEANING:

${sourceText}

SUGGESTED RESPONSE IN ${targetLanguage}:

${targetText}

PRONUNCIATION:

${pronunciation}

EXISTING RESULTS5.JS BREAKDOWN:

${breakdown}

YOUR TASK:

Briefly teach the learner how this suggested response works.

The learner needs a SHORT, practical explanation that helps them understand and use the sentence in conversation.

Explain mainly in ${sourceLanguage}.

You may include necessary ${targetLanguage} words or phrases because those are what the learner is studying.

FOCUS ON:

- what the complete response means
- the important words or short phrases
- how the parts combine naturally
- one important grammar point only when useful
- anything about word order that would help the learner
- pronunciation only if there is something especially useful to clarify

DO NOT:

- generate another conversation response
- generate response options
- create a long lesson
- write an essay
- discuss unrelated grammar
- overload the learner with terminology
- mention being an AI
- mention the prompt
- mention results5.js
- mention internal application architecture
- use Markdown headings
- use bullet lists unless absolutely necessary
- give multiple exercises
- ask the learner a question
- tell the learner to click anything

STYLE:

- short
- clear
- beginner-friendly
- conversational
- practical
- normally about 3 to 6 short sentences

IMPORTANT:

If the existing breakdown uses approximate meanings rather than literal one-to-one translations, explain naturally rather than claiming every word has an exact independent English equivalent.

OUTPUT:

Return ONLY the short teaching explanation as plain text.
`;

  }



  /*
  ==================================================
  QUESTION PROMPT
  ==================================================

  Used when learner types a question such as:

  Why isn't "am" translated?

  Why does the verb come first?

  Can I say this to a woman?

  What does بخير mean?
  ==================================================
  */

  function buildQuestionPrompt(
    room,
    chat,
    option,
    question,
    previousExplanation
  ) {

    const sourceLanguage =

      room?.source_language ||

      "English";


    const targetLanguage =

      room?.target_language ||

      "Arabic";


    const history =

      historyToText(

        getRecentHistory(
          room,
          chat
        )

      );


    const sourceText =

      getOptionSourceText(
        option
      );


    const targetText =

      getOptionTargetText(
        option
      );


    const pronunciation =

      getOptionPronunciation(
        option
      );


    const breakdown =

      getOptionBreakdown(
        option
      );



    return `
You are the short teaching helper inside a language conversation application.

The learner understands:

${sourceLanguage}

The learner is practising:

${targetLanguage}

RECENT CONVERSATION:

${history}

THE RESPONSE BEING STUDIED:

Meaning:
${sourceText}

${targetLanguage}:
${targetText}

Pronunciation:
${pronunciation}

Breakdown:
${breakdown}

PREVIOUS SHORT EXPLANATION:

${previousExplanation || "[No previous explanation]"}

THE LEARNER ASKS:

${question}

YOUR TASK:

Answer ONLY the learner's question about this response.

Explain mainly in ${sourceLanguage}.

You may use the necessary ${targetLanguage} words or phrases while explaining.

RULES:

- Answer the exact question directly.
- Keep the answer short.
- Usually 1 to 4 short sentences.
- Explain enough to make the point clear.
- Use simple terminology unless technical terminology is necessary.
- If you use a grammar term, briefly make its meaning clear.
- Do not restart the entire lesson.
- Do not repeat information unnecessarily.
- Do not continue the conversation as the conversation partner.
- Do not generate suggested responses.
- Do not introduce unrelated topics.
- Do not mention being an AI.
- Do not mention application internals.
- Do not use Markdown headings.
- Do not surround the answer with quotation marks.

If the learner asks whether another expression is possible, you may provide a very short alternative when relevant.

OUTPUT:

Return ONLY the direct plain-text answer.
`;

  }



  /*
  ==================================================
  OPTION ID
  ==================================================
  */

  function getOptionId(
    option
  ) {

    if (
      option?.option_idx
    ) {

      return String(
        option.option_idx
      );

    }


    /*
    Fallback if an option somehow lacks ID.
    */

    const source =

      getOptionSourceText(
        option
      );


    return (

      "option_" +

      simpleHash(
        source
      )

    );

  }



  /*
  ==================================================
  SIMPLE HASH
  ==================================================

  Used only to build a stable localStorage
  identifier.

  This is NOT security-related.
  ==================================================
  */

  function simpleHash(
    text
  ) {

    const value =
      String(
        text || ""
      );


    let hash =
      0;


    for (
      let index = 0;
      index < value.length;
      index++
    ) {

      hash =

        (
          (
            hash << 5
          )

          -

          hash

          +

          value.charCodeAt(
            index
          )
        )

        |

        0;

    }


    return Math.abs(
      hash
    ).toString();

  }



  /*
  ==================================================
  READ TEACH DATA
  ==================================================
  */

  function getAllTeachData() {

    /*
    Prefer firebase.js helper because
    firebase.js already owns the storage keys.
    */

    if (

      global.ConversateFirebase

      &&

      typeof global
        .ConversateFirebase
        .getTeachData ===
        "function"

    ) {

      return global
        .ConversateFirebase
        .getTeachData();

    }



    /*
    Fallback.
    */

    try {

      const value =

        JSON.parse(

          localStorage.getItem(
            TEACH_STORAGE_KEY
          )

          ||

          "{}"

        );


      return (

        value

        &&

        typeof value ===
          "object"

        &&

        !Array.isArray(
          value
        )

      )

        ? value

        : {};


    } catch (error) {

      console.warn(
        "Invalid Teach localStorage:",
        error
      );


      return {};

    }

  }



  /*
  ==================================================
  SAVE TEACH DATA
  ==================================================
  */

  function saveAllTeachData(
    data
  ) {

    if (

      global.ConversateFirebase

      &&

      typeof global
        .ConversateFirebase
        .saveTeachData ===
        "function"

    ) {

      global
        .ConversateFirebase
        .saveTeachData(
          data
        );


      return;

    }



    localStorage.setItem(

      TEACH_STORAGE_KEY,

      JSON.stringify(
        data || {}
      )

    );

  }



  /*
  ==================================================
  GET STORED TEACH RECORD
  ==================================================

  Structure:

  conversate_teach
  │
  └── room_123
        │
        └── chat_456
              │
              └── option_1
                    │
                    ├── explanation
                    └── questions[]
  ==================================================
  */

  function getStoredTeach(
    roomIdx,
    chatIdx,
    optionIdx
  ) {

    if (
      !roomIdx ||
      !chatIdx ||
      !optionIdx
    ) {

      return null;

    }


    const data =
      getAllTeachData();


    return (

      data?.[
        roomIdx
      ]?.[
        chatIdx
      ]?.[
        optionIdx
      ]

      ||

      null

    );

  }



  /*
  ==================================================
  ENSURE TEACH RECORD
  ==================================================
  */

  function ensureTeachRecord(
    room,
    chat,
    option
  ) {

    const roomIdx =

      room?.room_idx ||
      "";


    const chatIdx =

      chat?.chat_idx ||
      "";


    const optionIdx =

      getOptionId(
        option
      );



    if (
      !roomIdx ||
      !chatIdx
    ) {

      throw new Error(
        "Teach could not identify this conversation."
      );

    }



    const data =
      getAllTeachData();



    if (
      !data[
        roomIdx
      ]
    ) {

      data[
        roomIdx
      ] = {};

    }



    if (
      !data[
        roomIdx
      ][
        chatIdx
      ]
    ) {

      data[
        roomIdx
      ][
        chatIdx
      ] = {};

    }



    if (
      !data[
        roomIdx
      ][
        chatIdx
      ][
        optionIdx
      ]
    ) {

      data[
        roomIdx
      ][
        chatIdx
      ][
        optionIdx
      ] = {

        room_idx:
          roomIdx,

        chat_idx:
          chatIdx,

        option_idx:
          optionIdx,


        source_language:
          room.source_language ||
          "",


        target_language:
          room.target_language ||
          "",


        source_text:
          getOptionSourceText(
            option
          ),


        target_text:
          getOptionTargetText(
            option
          ),


        pronunciation:
          getOptionPronunciation(
            option
          ),


        explanation:
          "",


        questions:
          [],


        created_at:
          new Date()
            .toISOString(),


        updated_at:
          new Date()
            .toISOString()

      };

    }



    return {

      data:
        data,

      record:

        data[
          roomIdx
        ][
          chatIdx
        ][
          optionIdx
        ],

      roomIdx:
        roomIdx,

      chatIdx:
        chatIdx,

      optionIdx:
        optionIdx

    };

  }



  /*
  ==================================================
  SAVE INITIAL EXPLANATION
  ==================================================
  */

  function saveExplanation(
    room,
    chat,
    option,
    explanation
  ) {

    const storage =

      ensureTeachRecord(
        room,
        chat,
        option
      );


    storage.record.explanation =
      explanation;


    storage.record.updated_at =

      new Date()
        .toISOString();


    saveAllTeachData(
      storage.data
    );


    return storage.record;

  }



  /*
  ==================================================
  SAVE QUESTION + ANSWER
  ==================================================
  */

  function saveQuestionAnswer(
    room,
    chat,
    option,
    question,
    answer
  ) {

    const storage =

      ensureTeachRecord(
        room,
        chat,
        option
      );


    if (
      !Array.isArray(
        storage.record.questions
      )
    ) {

      storage.record.questions =
        [];

    }



    storage.record.questions.push({

      question:
        question,

      answer:
        answer,

      asked_at:
        new Date()
          .toISOString()

    });



    storage.record.updated_at =

      new Date()
        .toISOString();



    saveAllTeachData(
      storage.data
    );


    return storage.record;

  }



  /*
  ==================================================
  FIND CACHED QUESTION
  ==================================================

  If learner asks exactly the same question again,
  we can return the local answer immediately.
  ==================================================
  */

  function findCachedQuestion(
    record,
    question
  ) {

    if (

      !record

      ||

      !Array.isArray(
        record.questions
      )

    ) {

      return null;

    }



    const normalized =

      String(
        question || ""
      )

        .trim()

        .toLowerCase()

        .replace(
          /\s+/g,
          " "
        );



    return record.questions.find(

      function(item) {

        const storedQuestion =

          String(
            item?.question || ""
          )

            .trim()

            .toLowerCase()

            .replace(
              /\s+/g,
              " "
            );


        return (
          storedQuestion ===
          normalized
        );

      }

    ) || null;

  }



  /*
  ==================================================
  MAIN EXPLAIN FUNCTION
  ==================================================

  index.html already calls:

  ConversateTeach.explain({

      room,
      chat,
      option,
      question

  })
  ==================================================
  */

  async function explain(
    options
  ) {

    const settings =
      options || {};


    const room =
      settings.room ||
      null;


    const chat =
      settings.chat ||
      null;


    const option =
      settings.option ||
      null;


    const question =

      String(
        settings.question || ""
      ).trim();



    /*
    ==================================================
    VALIDATION
    ==================================================
    */

    if (
      !room
    ) {

      throw new Error(
        "No conversation room was provided."
      );

    }


    if (
      !chat
    ) {

      throw new Error(
        "No conversation message was provided."
      );

    }


    if (
      !option
    ) {

      throw new Error(
        "No response option was provided."
      );

    }



    /*
    ==================================================
    STORAGE RECORD
    ==================================================
    */

    const storage =

      ensureTeachRecord(
        room,
        chat,
        option
      );


    const record =
      storage.record;



    /*
    ==================================================
    MODE 1

    USER PRESSED TEACH
    ==================================================
    */

    if (
      !question
    ) {


      /*
      Already explained?

      Return local version immediately.
      */

      if (
        record.explanation
      ) {

        latestTeachResult = {

          type:
            "explanation",

          cached:
            true,

          roomIdx:
            storage.roomIdx,

          chatIdx:
            storage.chatIdx,

          optionIdx:
            storage.optionIdx,

          text:
            record.explanation,

          explanation:
            record.explanation

        };


        global.conversateTeachResult =
          latestTeachResult;


        updateStatus(

          settings.onStatus,

          "Explanation ready."

        );


        /*
        index.html accepts a string directly.
        */

        return record.explanation;

      }



      updateStatus(

        settings.onStatus,

        "Preparing a short explanation..."

      );



      const answer =

        await callAPI(

          buildExplanationPrompt(

            room,

            chat,

            option

          ),

          settings

        );



      if (
        !answer
      ) {

        throw new Error(
          "No explanation was generated."
        );

      }



      saveExplanation(

        room,

        chat,

        option,

        answer

      );



      latestTeachResult = {

        type:
          "explanation",

        cached:
          false,

        roomIdx:
          storage.roomIdx,

        chatIdx:
          storage.chatIdx,

        optionIdx:
          storage.optionIdx,

        text:
          answer,

        explanation:
          answer,

        generatedAt:
          new Date()
            .toISOString()

      };


      global.conversateTeachResult =
        latestTeachResult;



      updateStatus(

        settings.onStatus,

        "Explanation ready."

      );


      return answer;

    }



    /*
    ==================================================
    MODE 2

    LEARNER ASKED A QUESTION
    ==================================================
    */

    const cachedQuestion =

      findCachedQuestion(

        record,

        question

      );



    if (
      cachedQuestion
    ) {

      latestTeachResult = {

        type:
          "question",

        cached:
          true,

        roomIdx:
          storage.roomIdx,

        chatIdx:
          storage.chatIdx,

        optionIdx:
          storage.optionIdx,

        question:
          question,

        text:
          cachedQuestion.answer,

        answer:
          cachedQuestion.answer

      };


      global.conversateTeachResult =
        latestTeachResult;


      updateStatus(

        settings.onStatus,

        "Answer ready."

      );


      return cachedQuestion.answer;

    }



    updateStatus(

      settings.onStatus,

      "Thinking about your question..."

    );



    const answer =

      await callAPI(

        buildQuestionPrompt(

          room,

          chat,

          option,

          question,

          record.explanation

        ),

        settings

      );



    if (
      !answer
    ) {

      throw new Error(
        "No answer was generated."
      );

    }



    saveQuestionAnswer(

      room,

      chat,

      option,

      question,

      answer

    );



    latestTeachResult = {

      type:
        "question",

      cached:
        false,

      roomIdx:
        storage.roomIdx,

      chatIdx:
        storage.chatIdx,

      optionIdx:
        storage.optionIdx,

      question:
        question,

      text:
        answer,

      answer:
        answer,

      generatedAt:
        new Date()
          .toISOString()

    };


    global.conversateTeachResult =
      latestTeachResult;



    updateStatus(

      settings.onStatus,

      "Answer ready."

    );


    return answer;

  }



  /*
  ==================================================
  GET LATEST RESULT
  ==================================================
  */

  function getLatestResult() {

    return latestTeachResult;

  }



  /*
  ==================================================
  GET STORED TEACH DATA FOR OPTION
  ==================================================
  */

  function getStoredResult(
    roomIdx,
    chatIdx,
    optionIdx
  ) {

    return getStoredTeach(

      roomIdx,

      chatIdx,

      optionIdx

    );

  }



  /*
  ==================================================
  CLEAR ONE OPTION'S TEACH DATA
  ==================================================
  */

  function clearStoredResult(
    roomIdx,
    chatIdx,
    optionIdx
  ) {

    const data =
      getAllTeachData();



    if (
      !data?.[
        roomIdx
      ]?.[
        chatIdx
      ]?.[
        optionIdx
      ]
    ) {

      return false;

    }



    delete data[
      roomIdx
    ][
      chatIdx
    ][
      optionIdx
    ];



    /*
    Remove empty chat container.
    */

    if (

      !Object.keys(
        data[
          roomIdx
        ][
          chatIdx
        ]
      ).length

    ) {

      delete data[
        roomIdx
      ][
        chatIdx
      ];

    }



    /*
    Remove empty room container.
    */

    if (

      !Object.keys(
        data[
          roomIdx
        ]
      ).length

    ) {

      delete data[
        roomIdx
      ];

    }



    saveAllTeachData(
      data
    );


    return true;

  }



  /*
  ==================================================
  GLOBAL
  ==================================================
  */

  global.conversateTeachResult =
    null;



  global.ConversateTeach =
    Object.freeze({

      /*
      Main function required by index.html.
      */

      explain:
        explain,


      /*
      LocalStorage helpers.
      */

      getStoredResult:
        getStoredResult,


      clearStoredResult:
        clearStoredResult,


      /*
      Most recent result.
      */

      getLatestResult:
        getLatestResult

    });



})(window);