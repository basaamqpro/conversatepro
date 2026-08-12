(function (global) {

  "use strict";


  /*
  ==================================================
  SETTINGS
  ==================================================

  options.js has ONE job:

  "What could the LEARNER naturally say next?"

  It does NOT:

  - continue the conversation as the AI
  - teach grammar
  - save conversation messages
  - save anything to Firestore

  Generated options are stored only inside:

  localStorage:
  conversate_options

  Every option is passed through results5.js
  so it gets the exact same:

  - translation
  - pronunciation
  - targetFlow
  - sourceFlow
  - groups

  used by normal Conversate Pro messages.
  ==================================================
  */

  const API_ENDPOINT =
    "/api/translate";


  /*
  Number of response suggestions.
  */

  const OPTION_COUNT =
    3;


  /*
  Maximum history used when generating
  learner response suggestions.

  Importantly, history stops at the
  AI message that the learner clicked.
  */

  const DEFAULT_HISTORY_LIMIT =
    16;


  /*
  LocalStorage fallback key.

  Normally firebase.js provides helper
  methods for this same key.
  */

  const OPTIONS_STORAGE_KEY =
    "conversate_options";


  /*
  ==================================================
  STATE
  ==================================================
  */

  let latestOptions =
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
  EXTRACT OPENAI RESPONSE TEXT
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
  CLEAN JSON
  ==================================================
  */

  function cleanJSON(
    text
  ) {

    return String(
      text || ""
    )

      .trim()

      .replace(
        /^```json\s*/i,
        ""
      )

      .replace(
        /^```\s*/i,
        ""
      )

      .replace(
        /\s*```$/i,
        ""
      )

      .trim();

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

        "Could not generate response options.";


      throw new Error(

        typeof message ===
          "string"

          ? message

          : "Could not generate response options."

      );

    }



    const output =

      cleanJSON(

        extractOutputText(
          data
        )

      );



    if (
      !output
    ) {

      throw new Error(
        "No response options were returned."
      );

    }



    try {

      return JSON.parse(
        output
      );


    } catch (error) {

      console.error(
        "Invalid options JSON:",
        output
      );


      throw new Error(
        "The response options were not valid JSON."
      );

    }

  }



  /*
  ==================================================
  GET STORED PROMPT
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
  GET CHAT TEXT
  ==================================================

  The internal conversation is kept in
  the source/helper language.

  Example:

  visible AI Arabic:
  مرحباً، كيف حالك؟

  internal interaction_text:
  Hello, how are you?


  learner types:
  ana bikhair

  understandInput.js stores:

  interpreted_source_text:
  I am fine.

  So options.js sees a clean conversation:

  CONVERSATION PARTNER:
  Hello, how are you?

  LEARNER:
  I am fine.
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
    ------------------------------
    AI MESSAGE
    ------------------------------
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


      const stored =
        getStoredPrompt(
          chat
        );


      if (
        stored
      ) {

        return stored;

      }

    }



    /*
    ------------------------------
    USER MESSAGE
    ------------------------------
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

      return "conversation_partner";

    }


    return "learner";

  }



  /*
  ==================================================
  FIND CHAT INDEX
  ==================================================
  */

  function findChatIndex(
    room,
    chat
  ) {

    if (

      !room

      ||

      !Array.isArray(
        room.room_data
      )

      ||

      !chat

    ) {

      return -1;

    }



    return room.room_data.findIndex(

      function(item) {

        return (

          item.chat_idx ===
          chat.chat_idx

        );

      }

    );

  }



  /*
  ==================================================
  HISTORY UP TO CLICKED MESSAGE
  ==================================================

  This is important.

  Suppose the conversation is:

  AI 1
  USER 1
  AI 2
  USER 2
  AI 3

  Later the learner clicks AI 1.

  options.js should generate responses to AI 1,
  NOT responses based on AI 3.

  Therefore we stop history exactly at the
  message that was clicked.
  ==================================================
  */

  function getHistoryUpToChat(
    room,
    chat,
    maxMessages
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

      findChatIndex(
        room,
        chat
      );



    if (
      clickedIndex === -1
    ) {

      return [];

    }



    const requestedLimit =
      Number(
        maxMessages
      );


    const limit =

      Number.isInteger(
        requestedLimit
      )

      &&

      requestedLimit > 0

        ? requestedLimit

        : DEFAULT_HISTORY_LIMIT;



    /*
    Include the clicked AI message.
    */

    const relevantChats =

      room.room_data.slice(

        0,

        clickedIndex + 1

      );



    return relevantChats

      .slice(
        -limit
      )

      .map(

        function(item) {

          return {

            chatIdx:
              item.chat_idx ||
              "",

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

      !Array.isArray(
        history
      )

      ||

      !history.length

    ) {

      return (
        "[No conversation context]"
      );

    }



    return history

      .map(

        function(item) {


          if (
            item.speaker ===
            "conversation_partner"
          ) {

            return (

              "CONVERSATION PARTNER: " +

              item.text

            );

          }


          return (

            "LEARNER: " +

            item.text

          );

        }

      )

      .join("\n");

  }



  /*
  ==================================================
  BUILD OPTIONS PROMPT
  ==================================================

  IMPORTANT:

  We generate the suggested responses in
  source/helper language first.

  Example:

  source:
  English

  target:
  Arabic


  AI says:

  "How are you?"


  options.js internally generates:

  1. "I am fine."
  2. "I'm a little tired today."
  3. "I'm fine. How are you?"


  THEN results5.js translates each one to Arabic.

  This guarantees the visible option uses the
  exact same LingoGPT translation engine.
  ==================================================
  */

  function buildOptionsPrompt(
    room,
    chat,
    history
  ) {

    const sourceLanguage =

      room?.source_language ||

      "English";


    const targetLanguage =

      room?.target_language ||

      "Arabic";


    const conversation =

      historyToText(
        history
      );


    const clickedMessage =

      getChatText(
        chat
      );


    return `
You generate suggested learner responses for a language conversation application called Conversate Pro.

The learner understands:

SOURCE / HELPER LANGUAGE:
${sourceLanguage}

The learner is practising:

TARGET / PRACTICE LANGUAGE:
${targetLanguage}

IMPORTANT INTERNAL ARCHITECTURE:

Generate the suggestions ONLY in ${sourceLanguage}.

Do NOT translate them into ${targetLanguage}.

Another system called results5.js will translate each response into ${targetLanguage}, create pronunciation, and create the exact word/phrase breakdown.

REAL CONVERSATION UP TO THE MESSAGE THE LEARNER CLICKED:

${conversation}

THE CONVERSATION PARTNER'S MESSAGE THE LEARNER CLICKED:

${clickedMessage}

YOUR TASK:

Generate exactly ${OPTION_COUNT} natural things the LEARNER could reasonably say NEXT in response to that conversation-partner message.

These are suggestions for the learner.

You are NOT continuing the conversation as the conversation partner.

The suggestions must respond naturally to the clicked message and fit the conversation context.

DIVERSITY:

Make the ${OPTION_COUNT} options meaningfully different.

A useful pattern is:

OPTION 1:
A simple direct response.

OPTION 2:
A different realistic response or personal variation.

OPTION 3:
A response that naturally continues the conversation, perhaps by adding a detail or asking a simple question back.

However, do not force that exact pattern when it would sound unnatural.

EXAMPLE:

CONVERSATION PARTNER:

"How are you?"

Possible learner suggestions:

1.
"I am fine."

2.
"I'm a little tired today."

3.
"I'm fine. How are you?"

ANOTHER EXAMPLE:

CONVERSATION PARTNER:

"What will you do today?"

Possible learner suggestions:

1.
"I am going to work."

2.
"I will stay at home today."

3.
"I haven't decided yet."

ANOTHER EXAMPLE:

CONVERSATION PARTNER:

"What did you buy at the market?"

Possible learner suggestions:

1.
"I bought some fruit."

2.
"I bought bread and vegetables."

3.
"I only bought a few things."

RULES:

- Generate exactly ${OPTION_COUNT} options.
- Write every option ONLY in ${sourceLanguage}.
- Keep the meaning beginner-friendly.
- Prefer common everyday vocabulary.
- Keep each response short.
- Usually use one sentence.
- Two very short sentences are acceptable.
- Each option must be something the LEARNER could actually say next.
- Respond to the clicked conversation-partner message.
- Respect earlier conversation context.
- Do not contradict known information unnecessarily.
- Do not invent specific personal facts unless presented as a generic possible response.
- Keep options distinct from each other.
- Do not make all options simple synonyms.
- Do not make every option a question.
- Do not make every option positive.
- Natural neutral or negative responses are allowed when appropriate.
- Do not teach grammar.
- Do not explain vocabulary.
- Do not provide pronunciation.
- Do not translate into ${targetLanguage}.
- Do not mention Conversate Pro.
- Do not mention being an AI.
- Do not include Markdown.
- Do not use numbered text inside the response sentence itself.
- Do not surround sentences with quotation marks.

RETURN VALID JSON ONLY.

OUTPUT EXACTLY:

{
  "options": [
    {
      "text": ""
    },
    {
      "text": ""
    },
    {
      "text": ""
    }
  ]
}
`;

  }



  /*
  ==================================================
  NORMALIZE RAW OPTIONS
  ==================================================
  */

  function normalizeRawOptions(
    response
  ) {

    const rawOptions =

      Array.isArray(
        response?.options
      )

        ? response.options

        : [];



    const unique = [];


    const seen =
      new Set();



    rawOptions.forEach(

      function(item) {


        const text =

          String(

            typeof item ===
              "string"

              ? item

              : item?.text

            ||

            ""

          ).trim();



        if (
          !text
        ) {

          return;

        }



        const key =

          text
            .toLowerCase()
            .replace(
              /\s+/g,
              " "
            )
            .trim();



        if (
          seen.has(
            key
          )
        ) {

          return;

        }


        seen.add(
          key
        );


        unique.push({

          text:
            text

        });

      }

    );



    return unique.slice(
      0,
      OPTION_COUNT
    );

  }



  /*
  ==================================================
  TARGET TEXT JOINING
  ==================================================

  results5.js returns targetFlow items.

  For languages such as Japanese and Chinese,
  words should generally not be rejoined with
  English-style spaces.

  This function creates the text used by the
  "Use" button.
  ==================================================
  */

  function targetJoiner(
    language
  ) {

    const noSpaceLanguages = [

      "Japanese",

      "Mandarin Chinese",

      "Cantonese",

      "Thai"

    ];


    return noSpaceLanguages.includes(
      String(
        language || ""
      )
    )

      ? ""

      : " ";

  }



  /*
  ==================================================
  FLOW TO TARGET TEXT
  ==================================================
  */

  function flowToTargetText(
    flow,
    targetLanguage
  ) {

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

      .join(
        targetJoiner(
          targetLanguage
        )
      )

      .trim();

  }



  /*
  ==================================================
  BUILD CACHE SIGNATURE
  ==================================================

  If the clicked message or the context before it
  changes, cached suggestions should no longer
  be reused.

  We therefore save a simple context signature.
  ==================================================
  */

  function createSignature(
    room,
    chat,
    history
  ) {

    const sourceLanguage =

      room?.source_language ||
      "";


    const targetLanguage =

      room?.target_language ||
      "";


    const historyText =

      Array.isArray(
        history
      )

        ? history

            .map(

              function(item) {

                return (

                  item.speaker +

                  ":" +

                  item.text

                );

              }

            )

            .join("|")

        : "";


    return (

      sourceLanguage +

      "→" +

      targetLanguage +

      "|" +

      (
        chat?.chat_idx ||
        ""
      ) +

      "|" +

      historyText

    );

  }



  /*
  ==================================================
  READ ALL LOCAL OPTIONS
  ==================================================
  */

  function getAllOptionsData() {

    /*
    Prefer firebase.js helper.
    */

    if (

      global.ConversateFirebase

      &&

      typeof global
        .ConversateFirebase
        .getOptionsData ===
        "function"

    ) {

      return global
        .ConversateFirebase
        .getOptionsData();

    }



    /*
    Fallback.
    */

    try {

      const value =

        JSON.parse(

          localStorage.getItem(
            OPTIONS_STORAGE_KEY
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
        error
      );


      return {};

    }

  }



  /*
  ==================================================
  SAVE ALL LOCAL OPTIONS
  ==================================================
  */

  function saveAllOptionsData(
    data
  ) {

    /*
    Prefer firebase.js helper.
    */

    if (

      global.ConversateFirebase

      &&

      typeof global
        .ConversateFirebase
        .saveOptionsData ===
        "function"

    ) {

      global
        .ConversateFirebase
        .saveOptionsData(
          data
        );


      return;

    }



    /*
    Fallback.
    */

    localStorage.setItem(

      OPTIONS_STORAGE_KEY,

      JSON.stringify(
        data || {}
      )

    );

  }



  /*
  ==================================================
  GET CACHED OPTIONS
  ==================================================
  */

  function getCachedOptions(
    roomIdx,
    chatIdx,
    signature
  ) {

    if (
      !roomIdx ||
      !chatIdx
    ) {

      return null;

    }



    const data =
      getAllOptionsData();



    const stored =

      data?.[
        roomIdx
      ]?.[
        chatIdx
      ];



    if (
      !stored
    ) {

      return null;

    }



    if (
      stored.signature !==
      signature
    ) {

      return null;

    }



    if (
      !Array.isArray(
        stored.options
      )

      ||

      !stored.options.length
    ) {

      return null;

    }



    return stored;

  }



  /*
  ==================================================
  SAVE OPTIONS TO LOCALSTORAGE
  ==================================================
  */

  function saveCachedOptions(
    room,
    chat,
    signature,
    options
  ) {

    const roomIdx =

      room?.room_idx ||
      "";


    const chatIdx =

      chat?.chat_idx ||
      "";



    if (
      !roomIdx ||
      !chatIdx
    ) {

      return;

    }



    const data =
      getAllOptionsData();



    if (
      !data[
        roomIdx
      ]
    ) {

      data[
        roomIdx
      ] = {};

    }



    data[
      roomIdx
    ][
      chatIdx
    ] = {

      room_idx:
        roomIdx,

      chat_idx:
        chatIdx,

      signature:
        signature,

      source_language:
        room.source_language,

      target_language:
        room.target_language,

      options:
        options,

      generated_at:
        new Date()
          .toISOString()

    };



    saveAllOptionsData(
      data
    );

  }



  /*
  ==================================================
  TRANSLATE ONE OPTION USING RESULTS5.JS
  ==================================================
  */

  async function prepareOption(
    sourceText,
    index,
    room,
    settings
  ) {

    const sourceLanguage =

      room.source_language ||
      "English";


    const targetLanguage =

      room.target_language ||
      "Arabic";



    updateStatus(

      settings.onStatus,

      "Preparing option " +

      (index + 1) +

      " of " +

      OPTION_COUNT +

      "..."

    );



    /*
    ==================================================
    SAME RESULTS5.JS ENGINE

    This is what makes suggested responses
    visually and linguistically match the
    normal LingoGPT / Conversate Pro message.
    ==================================================
    */

    const results =

      await global
        .LingoGPTResults
        .generateResults({

          text:
            sourceText,

          sourceLanguage:
            sourceLanguage,

          targetLanguage:
            targetLanguage,

          signal:
            settings.signal,

          onStatus:

            function(message) {

              /*
              Keep the options status simpler.
              */

              if (
                message

                &&

                message !==
                  "Complete."
              ) {

                updateStatus(

                  settings.onStatus,

                  "Preparing option " +

                  (index + 1) +

                  " of " +

                  OPTION_COUNT +

                  "..."

                );

              }

            }

        });



    const targetFlow =

      Array.isArray(
        results.targetFlow
      )

        ? results.targetFlow

        : [];



    const sourceFlow =

      Array.isArray(
        results.sourceFlow
      )

        ? results.sourceFlow

        : [];



    const groups =

      Array.isArray(
        results.groups
      )

        ? results.groups

        : [];



    /*
    Build the actual practice-language
    sentence for the Use button.
    */

    const targetText =

      flowToTargetText(

        targetFlow,

        targetLanguage

      );



    return {

      /*
      Unique local option ID.
      */

      option_idx:

        "option_" +

        (index + 1),



      /*
      Original helper/source-language
      suggestion generated by options.js.
      */

      text:
        sourceText,


      sourceText:
        sourceText,


      source_text:
        sourceText,



      /*
      Practice-language version.

      Use button will prefer this.
      */

      targetText:
        targetText,


      target_text:
        targetText,


      useText:
        targetText || sourceText,



      /*
      Exact results5.js structures.
      */

      targetFlow:
        targetFlow,


      target_flow:
        targetFlow,


      sourceFlow:
        sourceFlow,


      source_flow:
        sourceFlow,


      groups:
        groups,



      /*
      Language information.
      */

      detectedLanguage:

        results.detectedLanguage ||
        sourceLanguage,


      targetLanguage:

        results.targetLanguage ||
        targetLanguage,



      /*
      Complete results5 result.

      Kept locally only.
      Useful later for Teach.
      */

      results:
        results,



      generatedAt:

        results.generatedAt ||

        new Date()
          .toISOString()

    };

  }



  /*
  ==================================================
  MAIN GENERATE OPTIONS
  ==================================================

  index.html calls:

  ConversateOptions.generateOptions({

      room,
      chat,
      signal,
      onStatus

  })
  ==================================================
  */

  async function generateOptions(
    options
  ) {

    const settings =
      options || {};



    /*
    ==================================================
    RESULTS5.JS REQUIRED
    ==================================================
    */

    if (

      !global.LingoGPTResults

      ||

      typeof global
        .LingoGPTResults
        .generateResults !==
        "function"

    ) {

      throw new Error(
        "results5.js must be loaded before options.js."
      );

    }



    /*
    ==================================================
    ROOM
    ==================================================
    */

    const room =
      settings.room ||
      null;



    if (
      !room
    ) {

      throw new Error(
        "No conversation room was provided."
      );

    }



    /*
    ==================================================
    CLICKED CHAT
    ==================================================
    */

    const chat =
      settings.chat ||
      null;



    if (
      !chat
    ) {

      throw new Error(
        "No conversation message was provided."
      );

    }



    /*
    Options should normally be requested from
    conversation-partner messages.
    */

    const interactionMessage =

      chat.message_type ===
        "interaction"

      ||

      chat.is_interaction ===
        true;



    if (
      !interactionMessage
    ) {

      throw new Error(
        "Response options can only be generated for a conversation-partner message."
      );

    }



    /*
    ==================================================
    LANGUAGES
    ==================================================
    */

    const sourceLanguage =

      room.source_language ||
      "English";


    const targetLanguage =

      room.target_language ||
      "Arabic";



    if (
      sourceLanguage ===
      targetLanguage
    ) {

      throw new Error(
        "The conversation languages must be different."
      );

    }



    /*
    ==================================================
    HISTORY STOPS AT CLICKED AI MESSAGE
    ==================================================
    */

    const history =

      getHistoryUpToChat(

        room,

        chat,

        settings.maxHistory ||
        DEFAULT_HISTORY_LIMIT

      );



    if (
      !history.length
    ) {

      throw new Error(
        "Could not read the conversation context."
      );

    }



    const signature =

      createSignature(

        room,

        chat,

        history

      );



    /*
    ==================================================
    CHECK LOCAL CACHE FIRST
    ==================================================
    */

    const cached =

      getCachedOptions(

        room.room_idx,

        chat.chat_idx,

        signature

      );



    if (
      cached
    ) {

      updateStatus(

        settings.onStatus,

        "Response options ready."

      );



      latestOptions = {

        roomIdx:
          room.room_idx,

        chatIdx:
          chat.chat_idx,

        cached:
          true,

        options:
          cached.options,

        generatedAt:
          cached.generated_at

      };



      global.conversateOptions =
        latestOptions;



      return latestOptions;

    }



    /*
    ==================================================
    STEP 1

    GENERATE RAW LEARNER RESPONSES
    ==================================================
    */

    updateStatus(

      settings.onStatus,

      "Thinking of natural ways you could respond..."

    );



    const rawResponse =

      await callAPI(

        buildOptionsPrompt(

          room,

          chat,

          history

        ),

        settings

      );



    const rawOptions =

      normalizeRawOptions(
        rawResponse
      );



    if (
      !rawOptions.length
    ) {

      throw new Error(
        "No usable response options were generated."
      );

    }



    /*
    ==================================================
    STEP 2

    PASS EACH OPTION THROUGH RESULTS5.JS
    ==================================================

    We deliberately do these sequentially.

    This keeps status reporting simple and
    avoids sending all translation requests
    simultaneously.
    ==================================================
    */

    const preparedOptions =
      [];



    for (
      let index = 0;
      index < rawOptions.length;
      index++
    ) {

      /*
      Respect AbortController before
      each additional API call.
      */

      if (
        settings.signal?.aborted
      ) {

        const abortError =
          new Error(
            "Operation aborted."
          );


        abortError.name =
          "AbortError";


        throw abortError;

      }



      try {

        const prepared =

          await prepareOption(

            rawOptions[
              index
            ].text,

            index,

            room,

            settings

          );



        /*
        Require target flow so the UI
        can show the real breakdown.
        */

        if (
          Array.isArray(
            prepared.targetFlow
          )

          &&

          prepared.targetFlow.length
        ) {

          preparedOptions.push(
            prepared
          );

        }


      } catch (error) {


        if (
          error.name ===
          "AbortError"
        ) {

          throw error;

        }



        /*
        One failed option should not destroy
        all other successfully prepared
        suggestions.
        */

        console.error(

          "Could not prepare option " +
          (index + 1),

          error

        );

      }

    }



    if (
      !preparedOptions.length
    ) {

      throw new Error(
        "The response suggestions could not be translated."
      );

    }



    /*
    ==================================================
    STEP 3

    LOCALSTORAGE ONLY

    NO FIRESTORE CALL.
    ==================================================
    */

    saveCachedOptions(

      room,

      chat,

      signature,

      preparedOptions

    );



    /*
    ==================================================
    FINAL RESULT
    ==================================================
    */

    latestOptions = {

      roomIdx:
        room.room_idx ||
        "",


      chatIdx:
        chat.chat_idx ||
        "",


      sourceLanguage:
        sourceLanguage,


      targetLanguage:
        targetLanguage,


      history:
        history,


      cached:
        false,


      options:
        preparedOptions,


      generatedAt:
        new Date()
          .toISOString()

    };



    global.conversateOptions =
      latestOptions;



    updateStatus(

      settings.onStatus,

      "Response options ready."

    );



    return latestOptions;

  }



  /*
  ==================================================
  GET LATEST OPTIONS
  ==================================================
  */

  function getLatestOptions() {

    return latestOptions;

  }



  /*
  ==================================================
  GET OPTIONS FOR ONE MESSAGE
  ==================================================

  This reads only localStorage.

  Useful later if another page needs the
  cached suggestions without generating them.
  ==================================================
  */

  function getStoredOptions(
    roomIdx,
    chatIdx
  ) {

    const data =
      getAllOptionsData();


    return (

      data?.[
        roomIdx
      ]?.[
        chatIdx
      ]

      ||

      null

    );

  }



  /*
  ==================================================
  DELETE OPTIONS FOR ONE MESSAGE
  ==================================================

  LocalStorage only.
  ==================================================
  */

  function clearStoredOptions(
    roomIdx,
    chatIdx
  ) {

    const data =
      getAllOptionsData();



    if (
      !data?.[
        roomIdx
      ]
    ) {

      return false;

    }



    if (
      !Object.prototype
        .hasOwnProperty
        .call(

          data[
            roomIdx
          ],

          chatIdx

        )
    ) {

      return false;

    }



    delete data[
      roomIdx
    ][
      chatIdx
    ];



    /*
    Remove empty room cache.
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



    saveAllOptionsData(
      data
    );


    return true;

  }



  /*
  ==================================================
  GLOBAL
  ==================================================
  */

  global.conversateOptions =
    null;



  global.ConversateOptions =
    Object.freeze({

      /*
      Main function expected by index.html.
      */

      generateOptions:
        generateOptions,


      /*
      Local cache helpers.
      */

      getStoredOptions:
        getStoredOptions,


      clearStoredOptions:
        clearStoredOptions,


      /*
      Latest result.
      */

      getLatestOptions:
        getLatestOptions

    });



})(window);