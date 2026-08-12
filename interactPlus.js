(function (global) {

  "use strict";


  /*
  ==================================================
  SETTINGS
  ==================================================

  We continue using the same backend endpoint
  as LingoGPT.

  This call generates the conversational sentence.

  results5.js will then perform:
  - translation
  - pronunciation
  - target flow
  - source flow
  - breakdown
  ==================================================
  */

  const API_ENDPOINT =
    "/api/translate";


  /*
  Maximum number of real conversation
  messages sent back to the AI.

  We do not send Options or Teach data
  because those are not part of room_data.
  */

  const DEFAULT_HISTORY_LIMIT =
    20;



  /*
  ==================================================
  STATE
  ==================================================
  */

  let latestInteraction =
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

  Your existing backend returns the
  OpenAI Responses API structure.

  We extract all output_text pieces.
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
  CLEAN GENERATED SENTENCE
  ==================================================
  */

  function cleanSentence(
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
    Remove quotes if the model
    unnecessarily returns:

    "Hello, how are you?"

    instead of:

    Hello, how are you?
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

        "Conversation request failed.";


      throw new Error(

        typeof message ===
          "string"

          ? message

          : "Conversation request failed."

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
        "The conversation partner returned no response."
      );

    }


    return cleanSentence(
      output
    );

  }



  /*
  ==================================================
  GET ORIGINAL STORED PROMPT
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

      const lastEntry =

        chat
          .prompts_and_answers[
            chat
              .prompts_and_answers
              .length - 1
          ];


      if (
        lastEntry?.user_prompt
      ) {

        return String(
          lastEntry.user_prompt
        ).trim();

      }

    }


    return "";

  }



  /*
  ==================================================
  GET CANONICAL CHAT TEXT
  ==================================================

  IMPORTANT:

  Conversate Pro may allow the learner
  to type:

  "I'm fine"

  "ana bikhair"

  "ana bee-khair"

  "أنا بخير"

  Later understandInput.js converts these
  into a canonical source-language meaning.

  Example:

  original_input:
      "ana bikhair"

  interpreted_source_text:
      "I am fine"

  interactPlus.js should use:

      "I am fine"

  for conversational understanding.

  We still preserve the learner's original
  text inside Firestore, but the AI conversation
  history uses the canonical meaning.
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
    ==================================================
    AI / CONVERSATION PARTNER MESSAGE
    ==================================================
    */

    if (

      chat.message_type ===
        "interaction"

      ||

      chat.is_interaction ===
        true

    ) {


      /*
      Best value:
      interaction_text
      */

      if (
        chat.interaction_text
      ) {

        return String(
          chat.interaction_text
        ).trim();

      }


      /*
      Compatibility with some possible
      older/newer naming.
      */

      if (
        chat.interactionText
      ) {

        return String(
          chat.interactionText
        ).trim();

      }


      /*
      Fallback to saved prompt.
      */

      const prompt =
        getStoredPrompt(
          chat
        );


      if (
        prompt
      ) {

        return prompt;

      }

    }



    /*
    ==================================================
    USER MESSAGE

    Best value:
    interpreted_source_text

    This represents what the user intended
    in the helper/source language.
    ==================================================
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



    /*
    Existing canonical prompt.
    */

    const prompt =
      getStoredPrompt(
        chat
      );


    if (
      prompt
    ) {

      return prompt;

    }



    /*
    Final fallback.

    This may be transliteration or target script,
    but it is better than losing the message.
    */

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
  WHO SENT THIS MESSAGE?
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


    return "user";

  }



  /*
  ==================================================
  ROOM HISTORY
  ==================================================

  Returns only REAL room_data messages.

  Options and Teach are not included because
  they are localStorage-only assistance.
  ==================================================
  */

  function getRoomHistory(
    room,
    maxMessages
  ) {

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



    if (

      !room

      ||

      !Array.isArray(
        room.room_data
      )

    ) {

      return [];

    }



    return room.room_data

      .slice(
        -limit
      )

      .map(

        function(chat) {


          return {

            chatIdx:
              chat.chat_idx ||
              "",


            speaker:
              getSpeaker(
                chat
              ),


            text:
              getChatText(
                chat
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
        "[The conversation has not started yet]"
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
  BUILD CONVERSATION PROMPT
  ==================================================

  IMPORTANT ARCHITECTURE:

  Example room:

  source_language:
      English

  target_language:
      Arabic


  Internally this file generates:

      "Hello, how are you?"

  results5.js then translates that to:

      مرحباً، كيف حالك؟

  and creates:

      pronunciation
      target flow
      source flow
      word/phrase mapping


  This is how we preserve the exact
  LingoGPT translation system.
  ==================================================
  */

  function buildInteractionPrompt(
    room,
    history,
    mode
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


    const startingConversation =

      mode === "start"

      ||

      !history.length;



    /*
    ==================================================
    EMPTY ROOM PROMPT
    ==================================================
    */

    if (
      startingConversation
    ) {

      return `
You are the conversation partner inside a language-practice application called Conversate Pro.

The learner understands:

${sourceLanguage}

The learner is practising:

${targetLanguage}

IMPORTANT INTERNAL ARCHITECTURE:

Write your response ONLY in ${sourceLanguage}.

Do NOT write ${targetLanguage} yourself.

Another system called results5.js will automatically translate your sentence into ${targetLanguage}, create the pronunciation, and create the word-by-word or phrase-by-phrase breakdown.

The conversation is completely empty.

YOUR TASK:

Start a natural friendly conversation with the learner.

The opening should be easy for a beginner to answer.

A good opening could be something similar to:

"Hello, how are you?"

But do not always use exactly that sentence.

You may naturally use another simple opening such as:

"Hi, how are you today?"

"Hello! How is your day going?"

"Hi! What are you doing today?"

CONVERSATION STYLE:

- You are the OTHER PERSON in a real conversation.
- You are not a teacher.
- You are not an AI assistant.
- Do not explain grammar.
- Do not explain vocabulary.
- Do not discuss translation.
- Do not mention pronunciation.
- Do not mention language learning.
- Do not mention Conversate Pro.
- Do not mention that another system will translate the sentence.
- Speak naturally.
- Be friendly.
- Keep the language beginner-friendly.
- Keep the opening short.
- Usually use one sentence.
- Two very short sentences are acceptable when natural.
- Make it easy for the learner to respond.
- A simple question is appropriate for the opening.
- Do not provide response options.
- Do not provide an explanation.
- Do not use Markdown.
- Do not use quotation marks around the response.
- Do not add a label such as "Conversation partner:".

LANGUAGE RULE:

Your entire output must be written ONLY in ${sourceLanguage}.

OUTPUT:

Return ONLY the sentence the conversation partner says.
`;

    }



    /*
    ==================================================
    CONTINUE CONVERSATION PROMPT
    ==================================================
    */

    return `
You are the conversation partner inside a language-practice application called Conversate Pro.

The learner understands:

${sourceLanguage}

The learner is practising:

${targetLanguage}

IMPORTANT INTERNAL ARCHITECTURE:

Write your response ONLY in ${sourceLanguage}.

Do NOT write ${targetLanguage} yourself.

Another system called results5.js will automatically translate your response into ${targetLanguage}, generate pronunciation, and create the exact translation breakdown shown to the learner.

Here is the REAL conversation so far:

${conversation}

YOUR ROLE:

Continue this conversation naturally as the CONVERSATION PARTNER.

Pay especially close attention to the most recent LEARNER message.

Respond to what the learner actually meant.

Do not ignore their latest message.

Maintain relevant context from earlier turns.

EXAMPLES OF NATURAL CONTINUATION:

If the learner says:

"I am fine."

You could naturally say:

"That's good. What are you doing today?"

If the learner says:

"I am going to the market."

You might say:

"Nice. What are you going to buy?"

If the learner says:

"I bought some fruit."

You might say:

"Which fruit did you buy?"

If the learner says:

"I am tired."

You could say:

"You should get some rest."

If the learner says:

"I like football."

You could say:

"Me too. Which team do you support?"

These are examples only.

Do not mechanically copy them.

CONVERSATION RULES:

- Act like another real person talking to the learner.
- Respond directly to the learner's latest meaning.
- Continue the existing topic when it is natural.
- Remember relevant details from earlier conversation.
- Do not randomly change the topic.
- Use normal everyday vocabulary.
- Keep the sentence suitable for a language learner.
- Prefer simple sentence structures.
- Usually use one sentence.
- Sometimes use two very short sentences when natural.
- You may ask a simple follow-up question.
- You do NOT have to ask a question every time.
- Sometimes react.
- Sometimes answer.
- Sometimes agree.
- Sometimes disagree gently.
- Sometimes make a related comment.
- Vary the conversation naturally.
- Avoid repeatedly saying "That's great."
- Avoid repeatedly saying "That's nice."
- Avoid repeatedly starting every response the same way.
- Never repeat the learner's entire sentence unnecessarily.
- Never produce several alternative responses.

IMPORTANT:

You are NOT the teacher.

options.js handles suggested learner responses.

teach.js handles explanations and questions.

Your only job here is to be the CONVERSATION PARTNER.

DO NOT:

- teach grammar
- explain vocabulary
- explain pronunciation
- translate anything
- correct the learner in this response
- provide response options
- provide numbered lists
- mention being an AI
- say "As an AI"
- mention the application
- mention the prompt
- use Markdown
- use labels
- surround the response with quotation marks

LANGUAGE RULE:

Your entire output must be written ONLY in ${sourceLanguage}.

OUTPUT:

Return ONLY what the conversation partner says next.
`;

  }



  /*
  ==================================================
  GENERATE RAW CONVERSATIONAL SENTENCE
  ==================================================
  */

  async function generateInteractionSentence(
    room,
    options
  ) {

    const settings =
      options || {};


    const mode =

      settings.mode ||
      "continue";



    const history =

      getRoomHistory(

        room,

        settings.maxHistory ||
        DEFAULT_HISTORY_LIMIT

      );



    const actualMode =

      !history.length

        ? "start"

        : mode;



    const prompt =

      buildInteractionPrompt(

        room,

        history,

        actualMode

      );



    updateStatus(

      settings.onStatus,

      actualMode === "start"

        ? "Starting the conversation..."

        : "Thinking of a natural reply..."

    );



    const sentence =

      await callAPI(

        prompt,

        settings

      );



    if (
      !sentence
    ) {

      throw new Error(
        "No conversation response was generated."
      );

    }



    return {

      sentence:
        sentence,

      history:
        history,

      mode:
        actualMode

    };

  }



  /*
  ==================================================
  MAIN INTERACT FUNCTION
  ==================================================

  index.html calls:

  ConversateInteractPlus.interact({
      room,
      mode,
      signal,
      onStatus
  })

  mode:

  "start"
      empty room

  "continue"
      normal automatic response
  ==================================================
  */

  async function interact(
    options
  ) {

    const settings =
      options || {};



    /*
    ==================================================
    RESULTS5.JS REQUIRED
    ==================================================

    This is what guarantees Conversate Pro
    uses the exact same translation and
    breakdown architecture as LingoGPT.
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
        "results5.js must be loaded before interactPlus.js."
      );

    }



    /*
    ==================================================
    ROOM
    ==================================================
    */

    let room =
      settings.room ||
      null;



    /*
    Optional fallback:

    If another page calls interactPlus
    without explicitly passing room,
    attempt to get it through
    ConversateFirebase.
    */

    if (

      !room

      &&

      global.ConversateFirebase

      &&

      typeof global
        .ConversateFirebase
        .getCurrentRoom ===
        "function"

    ) {

      room =

        await global
          .ConversateFirebase
          .getCurrentRoom();

    }



    if (
      !room
    ) {

      throw new Error(
        "No conversation room was found."
      );

    }



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
    DETERMINE MODE
    ==================================================
    */

    const roomIsEmpty =

      !Array.isArray(
        room.room_data
      )

      ||

      room.room_data.length ===
        0;



    const requestedMode =

      roomIsEmpty

        ? "start"

        : (
            settings.mode ||
            "continue"
          );



    /*
    ==================================================
    STEP 1

    Generate what the other person
    naturally says.

    Example internal result:

    "Hello, how are you?"
    ==================================================
    */

    const interaction =

      await generateInteractionSentence(

        room,

        {

          ...settings,

          mode:
            requestedMode

        }

      );



    const sentence =
      interaction.sentence;



    /*
    ==================================================
    STEP 2

    Send that sentence through THE SAME
    results5.js translation engine.

    Example:

    English internal sentence:

    "Hello, how are you?"

                ↓

    results5.js

                ↓

    Arabic:

    مرحباً، كيف حالك؟

    plus:

    pronunciation
    sourceFlow
    targetFlow
    groups
    ==================================================
    */

    updateStatus(

      settings.onStatus,

      "Preparing translation and pronunciation..."

    );



    const translationResults =

      await global
        .LingoGPTResults
        .generateResults({

          text:
            sentence,

          sourceLanguage:
            sourceLanguage,

          targetLanguage:
            targetLanguage,

          signal:
            settings.signal,

          onStatus:

            function(message) {

              if (

                message

                &&

                message !==
                  "Complete."

              ) {

                updateStatus(

                  settings.onStatus,

                  message

                );

              }

            }

        });



    /*
    ==================================================
    FINAL RESULT
    ==================================================

    This structure intentionally resembles
    your existing interact2.js result.

    Therefore index.html can work with the
    same concepts you already understand.
    ==================================================
    */

    latestInteraction = {


      /*
      ------------------------------------------------
      MESSAGE IDENTITY
      ------------------------------------------------
      */

      isInteraction:
        true,


      messageType:
        "interaction",



      /*
      ------------------------------------------------
      TYPE OF INTERACTION

      opening:
          first AI message

      automatic:
          AI response after learner message
      ------------------------------------------------
      */

      interactionType:

        interaction.mode ===
          "start"

          ? "opening"

          : "automatic",



      /*
      ------------------------------------------------
      WHAT THE CONVERSATION PARTNER
      ACTUALLY SAID INTERNALLY
      ------------------------------------------------
      */

      interactionText:
        sentence,



      /*
      ------------------------------------------------
      REQUEST
      ------------------------------------------------
      */

      request: {

        text:
          sentence,

        sourceLanguage:
          sourceLanguage,

        targetLanguage:
          targetLanguage

      },



      /*
      ------------------------------------------------
      LANGUAGE RESULT
      ------------------------------------------------
      */

      detectedLanguage:

        translationResults
          .detectedLanguage

        ||

        sourceLanguage,



      targetLanguage:

        translationResults
          .targetLanguage

        ||

        targetLanguage,



      /*
      ------------------------------------------------
      SAME TARGET FLOW AS LINGOGPT
      ------------------------------------------------
      */

      targetFlow:

        Array.isArray(
          translationResults
            .targetFlow
        )

          ? translationResults
              .targetFlow

          : [],



      /*
      ------------------------------------------------
      SAME SOURCE FLOW AS LINGOGPT
      ------------------------------------------------
      */

      sourceFlow:

        Array.isArray(
          translationResults
            .sourceFlow
        )

          ? translationResults
              .sourceFlow

          : [],



      /*
      ------------------------------------------------
      BACKWARD-COMPATIBLE GROUPS
      ------------------------------------------------
      */

      groups:

        Array.isArray(
          translationResults.groups
        )

          ? translationResults.groups

          : [],



      /*
      ------------------------------------------------
      DISPLAY TARGET LANGUAGE FIRST
      ------------------------------------------------
      */

      activeFlow:
        "target",



      /*
      ------------------------------------------------
      CONVERSATION HISTORY USED
      ------------------------------------------------
      */

      history:
        interaction.history,



      /*
      ------------------------------------------------
      ROOM
      ------------------------------------------------
      */

      roomIdx:

        room.room_idx ||
        "",



      /*
      ------------------------------------------------
      MODE
      ------------------------------------------------
      */

      mode:
        interaction.mode,



      /*
      ------------------------------------------------
      TIME
      ------------------------------------------------
      */

      generatedAt:

        new Date()
          .toISOString()

    };



    /*
    Make latest interaction available
    globally for debugging/testing.
    */

    global.conversateInteraction =
      latestInteraction;



    updateStatus(

      settings.onStatus,

      "Complete."

    );



    return latestInteraction;

  }



  /*
  ==================================================
  GET LATEST INTERACTION
  ==================================================
  */

  function getLatestInteraction() {

    return latestInteraction;

  }



  /*
  ==================================================
  PUBLIC HISTORY HELPER
  ==================================================
  */

  function publicGetRoomHistory(
    room,
    maxMessages
  ) {

    return getRoomHistory(

      room,

      maxMessages ||
      DEFAULT_HISTORY_LIMIT

    );

  }



  /*
  ==================================================
  GLOBAL
  ==================================================
  */

  global.conversateInteraction =
    null;



  global.ConversateInteractPlus =
    Object.freeze({


      /*
      Main function.
      */

      interact:
        interact,



      /*
      Useful later for debugging,
      options.js or other modules.
      */

      getRoomHistory:
        publicGetRoomHistory,



      /*
      Latest generated response.
      */

      getLatestInteraction:
        getLatestInteraction

    });



})(window);