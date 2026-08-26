(function (global) {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO
  TEACH.JS

  VERSION 2
  ==================================================

  PURPOSE:

  Explain a selected response/message in detail.

  Used by:

  1. Options → Teach
  2. Real chat messages → Teach
  3. Follow-up Ask questions


  IMPORTANT:

  Teach data stays in localStorage.

  It does NOT enter Firestore.
  ==================================================
  */


  const API_ENDPOINT =
    "/api/translate";


  /*
  Changing this version automatically invalidates
  old short cached explanations.

  Therefore you do NOT need to manually clear
  conversate_teach from localStorage.
  */

  const TEACH_VERSION =
    "teach_v2_detailed_pronunciation";



  let latestResult =
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
  STORAGE KEY
  ==================================================
  */

  function getStorageKey() {

    return (

      global
        .ConversateFirebase
        ?.storageKeys
        ?.teach

      ||

      "conversate_teach"

    );

  }



  /*
  ==================================================
  READ LOCAL STORAGE
  ==================================================
  */

  function readStore() {

    try {

      const value =

        JSON.parse(

          localStorage.getItem(
            getStorageKey()
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
  WRITE LOCAL STORAGE
  ==================================================
  */

  function writeStore(
    value
  ) {

    localStorage.setItem(

      getStorageKey(),

      JSON.stringify(
        value
      )

    );

  }



  /*
  ==================================================
  EXTRACT OPENAI OUTPUT
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
  CALL API
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
        "The Teach server returned invalid JSON."
      );

    }



    if (
      !response.ok
    ) {

      const message =

        data?.error?.message

        ||

        data?.error

        ||

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


    return output;

  }



  /*
  ==================================================
  NORMALIZE FLOW
  ==================================================
  */

  function normalizeTargetFlow(
    option
  ) {

    const flow =

      option?.targetFlow

      ||

      option?.target_flow

      ||

      option?.groups

      ||

      [];


    if (
      !Array.isArray(
        flow
      )
    ) {

      return [];

    }



    return flow

      .map(

        function(item) {

          return {

            target:

              String(

                item?.target

                ??

                item?.translation

                ??

                ""

              ).trim(),


            pronunciation:

              String(

                item?.pronunciation

                ||

                ""

              ).trim(),


            source:

              String(

                item?.source

                ||

                ""

              ).trim()

          };

        }

      )

      .filter(

        function(item) {

          return (

            item.target

            ||

            item.pronunciation

            ||

            item.source

          );

        }

      );

  }



  /*
  ==================================================
  SOURCE TEXT
  ==================================================
  */

  function getSourceText(
    option
  ) {

    return String(

      option?.sourceText

      ||

      option?.source_text

      ||

      option?.text

      ||

      ""

    ).trim();

  }



  /*
  ==================================================
  TARGET TEXT
  ==================================================
  */

  function getTargetText(
    option
  ) {

    const direct =

      String(

        option?.targetText

        ||

        option?.target_text

        ||

        ""

      ).trim();



    if (
      direct
    ) {

      return direct;

    }



    return normalizeTargetFlow(
      option
    )

      .map(

        function(item) {

          return item.target;

        }

      )

      .filter(Boolean)

      .join(" ")

      .replace(

        /\s+([,.!?;:،؛؟。！？，、])/g,

        "$1"

      )

      .trim();

  }



  /*
  ==================================================
  COMPLETE PRONUNCIATION
  ==================================================
  */

  function getPronunciation(
    option
  ) {

    return normalizeTargetFlow(
      option
    )

      .map(

        function(item) {

          return item.pronunciation;

        }

      )

      .filter(Boolean)

      .join(" ")

      .trim();

  }



  /*
  ==================================================
  DETAILED BREAKDOWN
  ==================================================

  This is extremely important.

  Instead of merely telling Teach:

      魔法学校で

  we give it:

      TARGET:
      魔法学校で

      PRONUNCIATION:
      mahō gakkō de

      MEANING:
      at the magic school


  results5.js already produces this information.
  ==================================================
  */

  function buildBreakdown(
    option
  ) {

    const flow =

      normalizeTargetFlow(
        option
      );


    if (
      !flow.length
    ) {

      return "No detailed breakdown was provided.";

    }



    return flow

      .map(

        function(
          item,
          index
        ) {

          return (

            (index + 1) +
            ".\n" +

            "Target: " +
            (
              item.target ||
              "(none)"
            ) +
            "\n" +

            "Pronunciation: " +
            (
              item.pronunciation ||
              "(not provided)"
            ) +
            "\n" +

            "Meaning: " +
            (
              item.source ||
              "(grammar function)"
            )

          );

        }

      )

      .join(
        "\n\n"
      );

  }



  /*
  ==================================================
  CONVERSATION CONTEXT
  ==================================================
  */

  function getConversationContext(
    room,
    currentChat
  ) {

    if (
      !Array.isArray(
        room?.room_data
      )
    ) {

      return "";

    }



    let chats =
      room.room_data;



    /*
    Only include conversation up to the
    currently selected message.
    */

    if (
      currentChat?.chat_idx
    ) {

      const index =

        chats.findIndex(

          function(item) {

            return (

              item.chat_idx ===
              currentChat.chat_idx

            );

          }

        );


      if (
        index !== -1
      ) {

        chats =
          chats.slice(
            0,
            index + 1
          );

      }

    }



    /*
    A little context is enough.
    */

    return chats

      .slice(-6)

      .map(

        function(chat) {


          const role =

            (
              chat.message_type ===
                "interaction"

              ||

              chat.is_interaction ===
                true
            )

              ? "Conversation partner"

              : "Learner";



          const text =

            chat.interpreted_source_text

            ||

            chat.interaction_text

            ||

            chat.prompts_and_answers?.[
              chat.prompts_and_answers.length - 1
            ]?.user_prompt

            ||

            "";



          return (

            role +
            ": " +
            String(
              text
            ).trim()

          );

        }

      )

      .filter(

        function(item) {

          return !item.endsWith(
            ": "
          );

        }

      )

      .join("\n");

  }



  /*
  ==================================================
  INITIAL EXPLANATION PROMPT
  ==================================================
  */

  function buildExplanationPrompt(
    {
      room,
      chat,
      option
    }
  ) {


    const sourceLanguage =

      room?.source_language

      ||

      chat?.source_language

      ||

      "English";


    const targetLanguage =

      room?.target_language

      ||

      chat?.target_language

      ||

      "the target language";


    const sourceText =

      getSourceText(
        option
      );


    const targetText =

      getTargetText(
        option
      );


    const pronunciation =

      getPronunciation(
        option
      );


    const breakdown =

      buildBreakdown(
        option
      );


    const context =

      getConversationContext(
        room,
        chat
      );



    return `
You are the language teacher inside Conversate Pro.

The learner is practising:

HELPER / EXPLANATION LANGUAGE:
${sourceLanguage}

TARGET LANGUAGE:
${targetLanguage}


SELECTED SENTENCE:

TARGET SENTENCE:
${targetText}

FULL PRONUNCIATION:
${pronunciation || "(see phrase breakdown below)"}

MEANING:
${sourceText}


PHRASE BREAKDOWN:

${breakdown}


RECENT CONVERSATION CONTEXT:

${context || "(No additional context is needed.)"}


YOUR TASK:

Teach this sentence clearly and thoroughly to a language learner.

This explanation must be more detailed than a short dictionary explanation.

Normally write approximately 180 to 320 words when the sentence contains enough material.

For a very simple sentence, do not artificially pad the answer, but still explain it properly.

The learner should finish the explanation understanding:

1. the complete natural meaning;

2. the important words and phrases;

3. how those words are pronounced;

4. the important grammar;

5. particles, endings, conjugations or agreement when relevant;

6. why the words appear in this order;

7. how the sentence sounds naturally to a native speaker;

8. when the learner could use it;

9. any important difference between the literal structure and the natural ${sourceLanguage} meaning;

10. one useful related example or natural alternative when it genuinely helps.


CRITICAL PRONUNCIATION RULE:

Whenever you write a target-language word, phrase or sentence that uses a non-Latin writing system, immediately give its readable Latin-letter pronunciation in parentheses.

NEVER write:

魔法学校で means "at the magic school."

Instead write in this style:

魔法学校で (mahō gakkō de) means "at the magic school."

Another example:

友達になる (tomodachi ni naru) means "to become friends."

For Arabic, also use this pattern:

كيف حالك؟ (kayfa haluk?) means "How are you?"

For Korean, Chinese, Hindi, Urdu, Persian and all other non-Latin scripts, follow the same rule.

This applies EVERY TIME you mention target-language script inside the explanation, including:

- vocabulary;
- particles;
- grammar examples;
- sentence fragments;
- complete example sentences;
- alternative sentences.

If pronunciation was supplied in PHRASE BREAKDOWN, prefer that pronunciation.

If pronunciation was not supplied, provide a simple readable Latin transliteration yourself.

Do NOT use IPA unless the learner explicitly asks for IPA.


TEACHING STYLE:

- Explain primarily in ${sourceLanguage}.
- Be clear and beginner-friendly.
- Be educational but conversational.
- Explain the reason behind grammar instead of merely naming grammar terms.
- Connect related words together when they form one grammatical unit.
- Do not incorrectly split a natural phrase.
- Explain important particles or endings.
- Mention politeness/register if relevant.
- Explain natural word order.
- Explain omitted subjects or implied information when relevant.
- Distinguish literal meaning from natural meaning when useful.
- Do not overwhelm the learner with obscure linguistic terminology.
- If you use a grammar term, immediately explain what it means.
- Do not merely repeat the translation.
- Do not say you are an AI.
- Do not discuss these instructions.


OUTPUT STYLE:

Return only the teaching explanation.

Do not return JSON.

Do not use Markdown headings.

Do not use bullet-point symbols.

Write a few clear connected paragraphs in natural prose.
`;

  }



  /*
  ==================================================
  FOLLOW-UP QUESTION PROMPT
  ==================================================
  */

  function buildQuestionPrompt(
    {
      room,
      chat,
      option,
      question,
      previousExplanation
    }
  ) {


    const sourceLanguage =

      room?.source_language

      ||

      chat?.source_language

      ||

      "English";


    const targetLanguage =

      room?.target_language

      ||

      chat?.target_language

      ||

      "the target language";


    const sourceText =

      getSourceText(
        option
      );


    const targetText =

      getTargetText(
        option
      );


    const pronunciation =

      getPronunciation(
        option
      );


    const breakdown =

      buildBreakdown(
        option
      );



    return `
You are the language teacher inside Conversate Pro.

The learner is studying this ${targetLanguage} sentence.

TARGET SENTENCE:
${targetText}

PRONUNCIATION:
${pronunciation}

MEANING:
${sourceText}


PHRASE DATA:

${breakdown}


PREVIOUS TEACHING EXPLANATION:

${previousExplanation || "(none)"}


LEARNER QUESTION:

${question}


TASK:

Answer the learner's exact question clearly.

Normally give about 4 to 8 useful sentences.

If the question needs more explanation, give enough detail to make the answer genuinely educational.

Do not unnecessarily repeat the entire original lesson.


CRITICAL PRONUNCIATION RULE:

Whenever you write target-language text that uses a non-Latin script, immediately place its readable Latin pronunciation after it in parentheses.

For example:

でしょう (deshō)

魔法学校で (mahō gakkō de)

友達になる (tomodachi ni naru)

Never show those target-language forms alone without pronunciation.

Prefer the pronunciation supplied in PHRASE DATA whenever available.

Do not use IPA unless the learner asks for it.


STYLE:

- Answer mainly in ${sourceLanguage}.
- Be clear and practical.
- Explain grammar terms in ordinary language.
- Give an example if it helps answer the question.
- If you give another ${targetLanguage} example in non-Latin script, include its pronunciation and its ${sourceLanguage} meaning.
- Do not say you are an AI.
- Return only the answer.
- No JSON.
`;

  }



  /*
  ==================================================
  IDS
  ==================================================
  */

  function getIds(
    room,
    chat,
    option
  ) {

    return {

      roomIdx:

        String(

          room?.room_idx

          ||

          "room"

        ),


      chatIdx:

        String(

          chat?.chat_idx

          ||

          "chat"

        ),


      optionIdx:

        String(

          option?.option_idx

          ||

          "option"

        )

    };

  }



  /*
  ==================================================
  GET STORED ENTRY
  ==================================================
  */

  function getEntry(
    room,
    chat,
    option
  ) {

    const store =
      readStore();


    const ids =

      getIds(
        room,
        chat,
        option
      );


    return (

      store
        ?.[ids.roomIdx]
        ?.[ids.chatIdx]
        ?.[ids.optionIdx]

      ||

      null

    );

  }



  /*
  ==================================================
  SAVE STORED ENTRY
  ==================================================
  */

  function saveEntry(
    room,
    chat,
    option,
    entry
  ) {

    const store =
      readStore();


    const ids =

      getIds(
        room,
        chat,
        option
      );



    if (
      !store[
        ids.roomIdx
      ]
    ) {

      store[
        ids.roomIdx
      ] = {};

    }



    if (
      !store[
        ids.roomIdx
      ][
        ids.chatIdx
      ]
    ) {

      store[
        ids.roomIdx
      ][
        ids.chatIdx
      ] = {};

    }



    store[
      ids.roomIdx
    ][
      ids.chatIdx
    ][
      ids.optionIdx
    ] = entry;



    writeStore(
      store
    );


    return entry;

  }



  /*
  ==================================================
  NORMALIZE QUESTION
  ==================================================
  */

  function normalizeQuestion(
    question
  ) {

    return String(
      question || ""
    )

      .trim()

      .replace(
        /\s+/g,
        " "
      )

      .toLowerCase();

  }



  /*
  ==================================================
  EXPLAIN
  ==================================================
  */

  async function explain(
    options
  ) {

    const settings =
      options || {};


    const room =
      settings.room;


    const chat =
      settings.chat;


    const option =
      settings.option;


    const question =

      String(
        settings.question || ""
      ).trim();



    if (
      !room
    ) {

      throw new Error(
        "Teach requires a room."
      );

    }



    if (
      !chat
    ) {

      throw new Error(
        "Teach requires a chat message."
      );

    }



    if (
      !option
    ) {

      throw new Error(
        "Teach requires a response or message."
      );

    }



    /*
    ==================================================
    EXISTING CACHE
    ==================================================
    */

    let stored =

      getEntry(
        room,
        chat,
        option
      );



    /*
    IMPORTANT:

    Ignore old V1 cached explanations.

    This means old short Teach responses will
    regenerate automatically after this update.
    */

    const cacheIsCurrent =

      stored?.teach_version ===
      TEACH_VERSION;



    /*
    ==================================================
    FOLLOW-UP QUESTION
    ==================================================
    */

    if (
      question
    ) {


      /*
      Reuse the explanation only if it was generated
      with the new detailed Teach version.
      */

      if (
        !cacheIsCurrent
      ) {

        stored =
          null;

      }



      const normalizedQuestion =

        normalizeQuestion(
          question
        );



      /*
      Exact question already answered?
      */

      const existingQuestion =

        Array.isArray(
          stored?.questions
        )

          ? stored.questions.find(

              function(item) {

                return (

                  normalizeQuestion(
                    item.question
                  )

                  ===

                  normalizedQuestion

                );

              }

            )

          : null;



      if (
        existingQuestion
      ) {

        latestResult = {

          mode:
            "question",

          question:
            existingQuestion.question,

          answer:
            existingQuestion.answer,

          cached:
            true

        };


        return latestResult;

      }



      updateStatus(

        settings.onStatus,

        "Answering your question..."

      );



      /*
      If the initial explanation does not exist yet,
      it is okay to answer using the sentence data.
      */

      const prompt =

        buildQuestionPrompt({

          room:
            room,

          chat:
            chat,

          option:
            option,

          question:
            question,

          previousExplanation:

            stored?.explanation ||
            ""

        });



      const answer =

        await callAPI(

          prompt,

          settings

        );



      const now =
        new Date()
          .toISOString();



      /*
      Preserve/create entry.
      */

      const entry = {

        teach_version:
          TEACH_VERSION,


        source_text:

          getSourceText(
            option
          ),


        target_text:

          getTargetText(
            option
          ),


        pronunciation:

          getPronunciation(
            option
          ),


        explanation:

          stored?.explanation ||
          "",


        questions:

          Array.isArray(
            stored?.questions
          )

            ? stored.questions.slice()

            : [],


        created_at:

          stored?.created_at ||
          now,


        updated_at:
          now

      };



      entry.questions.push({

        question:
          question,

        answer:
          answer,

        asked_at:
          now

      });



      saveEntry(

        room,
        chat,
        option,
        entry

      );



      latestResult = {

        mode:
          "question",

        question:
          question,

        answer:
          answer,

        cached:
          false

      };



      updateStatus(

        settings.onStatus,

        "Complete."

      );


      return latestResult;

    }



    /*
    ==================================================
    INITIAL TEACH EXPLANATION
    ==================================================
    */


    /*
    New-version explanation already cached.
    */

    if (

      cacheIsCurrent

      &&

      stored?.explanation

    ) {

      latestResult = {

        mode:
          "explanation",

        explanation:
          stored.explanation,

        sourceText:
          stored.source_text,

        targetText:
          stored.target_text,

        pronunciation:
          stored.pronunciation,

        cached:
          true

      };


      return latestResult;

    }



    updateStatus(

      settings.onStatus,

      "Teaching this response..."

    );



    const prompt =

      buildExplanationPrompt({

        room:
          room,

        chat:
          chat,

        option:
          option

      });



    const explanation =

      await callAPI(

        prompt,

        settings

      );



    const now =
      new Date()
        .toISOString();



    /*
    New explanation replaces old V1 cache.

    Old questions are also intentionally cleared
    because they may have been produced using the
    older prompt rules.
    */

    const entry = {

      teach_version:
        TEACH_VERSION,


      source_text:

        getSourceText(
          option
        ),


      target_text:

        getTargetText(
          option
        ),


      pronunciation:

        getPronunciation(
          option
        ),


      explanation:
        explanation,


      questions:
        [],


      created_at:
        now,


      updated_at:
        now

    };



    saveEntry(

      room,
      chat,
      option,
      entry

    );



    latestResult = {

      mode:
        "explanation",

      explanation:
        explanation,

      sourceText:
        entry.source_text,

      targetText:
        entry.target_text,

      pronunciation:
        entry.pronunciation,

      cached:
        false

    };



    updateStatus(

      settings.onStatus,

      "Complete."

    );


    return latestResult;

  }



  /*
  ==================================================
  GET STORED RESULT
  ==================================================
  */

  function getStoredResult(
    options
  ) {

    const settings =
      options || {};


    const entry =

      getEntry(

        settings.room,

        settings.chat,

        settings.option

      );



    /*
    Do not expose outdated V1 results as current.
    */

    if (

      !entry

      ||

      entry.teach_version !==
        TEACH_VERSION

    ) {

      return null;

    }


    return entry;

  }



  /*
  ==================================================
  CLEAR ONE STORED RESULT
  ==================================================
  */

  function clearStoredResult(
    options
  ) {

    const settings =
      options || {};


    const ids =

      getIds(

        settings.room,

        settings.chat,

        settings.option

      );


    const store =
      readStore();



    if (

      !store[
        ids.roomIdx
      ]

      ||

      !store[
        ids.roomIdx
      ][
        ids.chatIdx
      ]

    ) {

      return false;

    }



    delete store[
      ids.roomIdx
    ][
      ids.chatIdx
    ][
      ids.optionIdx
    ];



    /*
    Clean empty objects.
    */

    if (

      Object.keys(

        store[
          ids.roomIdx
        ][
          ids.chatIdx
        ]

      ).length ===
      0

    ) {

      delete store[
        ids.roomIdx
      ][
        ids.chatIdx
      ];

    }



    if (

      Object.keys(

        store[
          ids.roomIdx
        ]

        ||

        {}

      ).length ===
      0

    ) {

      delete store[
        ids.roomIdx
      ];

    }



    writeStore(
      store
    );


    return true;

  }



  /*
  ==================================================
  LATEST RESULT
  ==================================================
  */

  function getLatestResult() {

    return latestResult;

  }



  /*
  ==================================================
  GLOBAL API
  ==================================================
  */

  global.ConversateTeach =
    Object.freeze({

      explain:
        explain,

      getStoredResult:
        getStoredResult,

      clearStoredResult:
        clearStoredResult,

      getLatestResult:
        getLatestResult

    });



})(window);