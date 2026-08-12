(function (global) {

  "use strict";


  /*
  ==================================================
  SETTINGS
  ==================================================

  We use the SAME secure backend endpoint
  already used by results5.js and
  interactPlus.js.

  This file does NOT save anything to
  Firebase.

  Its only job is to understand what the
  learner typed.
  ==================================================
  */

  const API_ENDPOINT =
    "/api/translate";


  /*
  ==================================================
  STATE
  ==================================================
  */

  let latestUnderstanding =
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
  EXTRACT OPENAI OUTPUT TEXT
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

        "Could not understand the response.";


      throw new Error(

        typeof message ===
          "string"

          ? message

          : "Could not understand the response."

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
        "No interpretation was returned."
      );

    }



    try {

      return JSON.parse(
        output
      );


    } catch (error) {

      console.error(
        "Invalid understandInput JSON:",
        output
      );


      throw new Error(
        "The input interpretation was not valid JSON."
      );

    }

  }



  /*
  ==================================================
  BUILD INPUT UNDERSTANDING PROMPT
  ==================================================

  EXAMPLE ROOM:

  source language:
      English

  target language:
      Arabic


  The learner may type:

      I'm fine

      أنا بخير

      ana bikhair

      ana bee-khair

      I'm bikhair

  All of these may express approximately:

      SOURCE MEANING:
      I am fine

      TARGET SENTENCE:
      أنا بخير
  ==================================================
  */

  function buildPrompt(
    text,
    sourceLanguage,
    targetLanguage
  ) {

    return `
You are the input-understanding engine for a language conversation application called Conversate Pro.

The learner understands:

SOURCE / HELPER LANGUAGE:
${sourceLanguage}

The learner is practising:

TARGET / PRACTICE LANGUAGE:
${targetLanguage}

The learner typed:

${text}

YOUR TASK:

Determine what the learner intended to communicate.

The learner is allowed to answer in several different forms.

FORM 1 — SOURCE LANGUAGE

The learner may simply use ${sourceLanguage}.

Example for English → Arabic:

"I'm fine."

FORM 2 — TARGET LANGUAGE SCRIPT

The learner may write directly in ${targetLanguage}.

Example:

أنا بخير

FORM 3 — TARGET LANGUAGE TRANSLITERATION

The learner may write the target language using Latin letters or another helper script.

Example:

ana bikhair

FORM 4 — TARGET LANGUAGE PRONUNCIATION SPELLING

The learner may spell approximately how the target-language sentence sounds.

Example:

ana bee-khair

The spelling may not follow a formal transliteration system.

FORM 5 — MIXED INPUT

The learner may combine forms.

Examples:

"I'm bikhair."

"ana I am fine"

"أنا fine"

They may mix the source language, target language, transliteration, names, numbers or ordinary expressions.

IMPORTANT:

The learner is practising conversation.

Interpret the learner's intended meaning naturally.

Do not be overly strict about spelling.

Do not reject a reasonable transliteration merely because it is informal.

Do not require academic transliteration.

For example:

ana bikhair
ana bekhair
ana bi khair
ana bee-khair

may all represent the same intended Arabic expression:

أنا بخير

when the context supports it.

YOUR OUTPUT MUST IDENTIFY:

1. original_text

The learner's exact original text.

Do not modify it.

2. input_form

Return ONE of:

"source_language"

"target_script"

"target_transliteration"

"target_pronunciation"

"mixed"

"unknown"

Definitions:

source_language:
The message is mainly written naturally in ${sourceLanguage}.

target_script:
The message is mainly written using the normal writing system of ${targetLanguage}.

target_transliteration:
The message represents ${targetLanguage}, but is written using a Latin-letter or helper-script transliteration.

target_pronunciation:
The learner appears to be spelling how ${targetLanguage} sounds rather than using a conventional transliteration.

mixed:
The learner combines two or more of the above forms.

unknown:
Use only when the intended linguistic form genuinely cannot be determined.

3. source_text

Express the learner's intended COMPLETE meaning naturally in ${sourceLanguage}.

This is extremely important because the conversation engine will use source_text to understand what the learner meant.

Examples:

INPUT:
ana bikhair

SOURCE TEXT:
I am fine.

INPUT:
أنا ذاهب إلى السوق

SOURCE TEXT:
I am going to the market.

Do not explain anything.

Return only the natural intended meaning.

4. target_text

Express the learner's intended COMPLETE message naturally in ${targetLanguage}, using the normal writing system of ${targetLanguage}.

For example:

INPUT:
I am fine.

TARGET:
أنا بخير

INPUT:
ana bikhair

TARGET:
أنا بخير

INPUT:
أنا بخير

TARGET:
أنا بخير

Do not transliterate target_text.

Use the normal target-language writing system.

5. detected_language

Identify the main linguistic language represented by the learner's input.

Important:

If the learner writes:

ana bikhair

and this clearly represents Arabic,

detected_language should be:

Arabic

even though Latin letters were used.

If the learner writes:

I'm fine

detected_language should be:

English

6. confidence

Return one of:

"high"

"medium"

"low"

This measures confidence in the intended interpretation.

7. normalized_transliteration

If the learner's input represents the target language through transliteration or pronunciation spelling, return a clean easy Latin-letter transliteration.

Example:

ana bee-khair

could become:

Ana bikhair

For target-script or source-language input, you may still provide a useful target-language transliteration when appropriate.

If transliteration would not be useful, return an empty string.

IMPORTANT CONVERSATION RULES:

- Preserve the learner's intended meaning.
- Preserve names.
- Preserve numbers.
- Preserve places.
- Preserve dates.
- Preserve important details.
- Do not invent information.
- Do not expand the learner's message unnecessarily.
- Do not turn a short answer into a long sentence.
- Do not correct the learner by changing their intended meaning.
- Minor spelling mistakes may be interpreted naturally.
- Informal transliteration is allowed.
- Pronunciation spelling is allowed.
- Mixed-language input is allowed.
- Determine intent from the entire message.
- Do not provide grammar explanations.
- Do not provide teaching.
- Do not provide response suggestions.
- Do not answer the learner.
- Your job is interpretation only.

VERY IMPORTANT:

source_text and target_text MUST communicate the same intended meaning.

For example:

original:
ana bikhair

source_text:
I am fine.

target_text:
أنا بخير

These must represent the same message.

RETURN VALID JSON ONLY.

Do not use Markdown.

Do not use code fences.

Do not add explanations.

OUTPUT EXACTLY IN THIS STRUCTURE:

{
  "original_text": "",
  "input_form": "",
  "source_text": "",
  "target_text": "",
  "detected_language": "",
  "confidence": "",
  "normalized_transliteration": ""
}
`;

  }



  /*
  ==================================================
  NORMALIZE INPUT FORM
  ==================================================
  */

  function normalizeInputForm(
    value
  ) {

    const allowed = [

      "source_language",

      "target_script",

      "target_transliteration",

      "target_pronunciation",

      "mixed",

      "unknown"

    ];


    const normalized =

      String(
        value || ""
      )

        .trim()

        .toLowerCase();



    return allowed.includes(
      normalized
    )

      ? normalized

      : "unknown";

  }



  /*
  ==================================================
  NORMALIZE CONFIDENCE
  ==================================================
  */

  function normalizeConfidence(
    value
  ) {

    const allowed = [

      "high",
      "medium",
      "low"

    ];


    const normalized =

      String(
        value || ""
      )

        .trim()

        .toLowerCase();



    return allowed.includes(
      normalized
    )

      ? normalized

      : "medium";

  }



  /*
  ==================================================
  MAIN UNDERSTAND FUNCTION
  ==================================================

  index.html calls:

  ConversateInput.understand({

      text,
      room,

      sourceLanguage,
      targetLanguage,

      signal,
      onStatus

  })
  ==================================================
  */

  async function understand(
    options
  ) {

    const settings =
      options || {};



    /*
    ==================================================
    RAW TEXT
    ==================================================
    */

    const text =

      String(
        settings.text || ""
      ).trim();



    if (
      !text
    ) {

      throw new Error(
        "Enter a response."
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



    /*
    ==================================================
    LANGUAGES
    ==================================================
    */

    const sourceLanguage =

      settings.sourceLanguage ||

      room?.source_language ||

      "English";



    const targetLanguage =

      settings.targetLanguage ||

      room?.target_language ||

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
    STEP 1

    Ask AI to understand what the learner meant.
    ==================================================
    */

    updateStatus(

      settings.onStatus,

      "Understanding how you expressed your response..."

    );



    const response =

      await callAPI(

        buildPrompt(

          text,

          sourceLanguage,

          targetLanguage

        ),

        settings

      );



    /*
    ==================================================
    STEP 2

    NORMALIZE RESULT
    ==================================================
    */

    const originalText =
      text;



    const inputForm =

      normalizeInputForm(

        response.input_form ||

        response.inputForm

      );



    let sourceText =

      String(

        response.source_text ||

        response.sourceText ||

        ""

      ).trim();



    let targetText =

      String(

        response.target_text ||

        response.targetText ||

        ""

      ).trim();



    const detectedLanguage =

      String(

        response.detected_language ||

        response.detectedLanguage ||

        ""

      ).trim();



    const confidence =

      normalizeConfidence(

        response.confidence

      );



    const normalizedTransliteration =

      String(

        response.normalized_transliteration ||

        response.normalizedTransliteration ||

        ""

      ).trim();



    /*
    ==================================================
    BASIC VALIDATION
    ==================================================
    */

    if (
      !sourceText
    ) {

      /*
      We still preserve the original
      instead of losing the learner's
      message completely.
      */

      sourceText =
        originalText;

    }



    if (
      !targetText
    ) {

      /*
      targetText is useful but index.html
      can still call results5.js using
      sourceText.

      Therefore this is not fatal.
      */

      targetText =
        "";

    }



    /*
    ==================================================
    FINAL NORMALIZED OBJECT
    ==================================================

    IMPORTANT:

    We expose BOTH camelCase and some
    semantic aliases because this makes
    the module easy to use elsewhere.

    index.html currently expects:

    originalText
    inputForm
    sourceText
    targetText
    detectedLanguage
    ==================================================
    */

    latestUnderstanding = {


      /*
      Exactly what learner typed.
      */

      originalText:
        originalText,


      /*
      Compatibility.
      */

      original_text:
        originalText,



      /*
      Type of learner input.
      */

      inputForm:
        inputForm,


      input_form:
        inputForm,



      /*
      Canonical meaning in helper language.

      THIS is the important value used by
      interactPlus.js conversation history.
      */

      sourceText:
        sourceText,


      source_text:
        sourceText,


      sourceMeaning:
        sourceText,


      interpretedSourceText:
        sourceText,



      /*
      Canonical message in target language.
      */

      targetText:
        targetText,


      target_text:
        targetText,


      interpretedTargetText:
        targetText,



      /*
      What language the learner's
      expression actually represented.
      */

      detectedLanguage:

        detectedLanguage ||

        (
          inputForm ===
            "source_language"

            ? sourceLanguage

            : targetLanguage
        ),


      detected_language:

        detectedLanguage ||

        (
          inputForm ===
            "source_language"

            ? sourceLanguage

            : targetLanguage
        ),



      /*
      Interpretation confidence.
      */

      confidence:
        confidence,



      /*
      Clean transliteration when useful.
      */

      normalizedTransliteration:
        normalizedTransliteration,


      normalized_transliteration:
        normalizedTransliteration,



      /*
      Room-language information.
      */

      sourceLanguage:
        sourceLanguage,


      targetLanguage:
        targetLanguage,



      /*
      Raw AI interpretation.

      Useful for debugging.

      This is NOT automatically saved
      anywhere by this module.
      */

      raw:
        response,



      /*
      Time.
      */

      interpretedAt:

        new Date()
          .toISOString()

    };



    global.conversateInputUnderstanding =
      latestUnderstanding;



    updateStatus(

      settings.onStatus,

      "Response understood."

    );



    return latestUnderstanding;

  }



  /*
  ==================================================
  GET LATEST UNDERSTANDING
  ==================================================
  */

  function getLatestUnderstanding() {

    return latestUnderstanding;

  }



  /*
  ==================================================
  GLOBAL
  ==================================================
  */

  global.conversateInputUnderstanding =
    null;



  global.ConversateInput =
    Object.freeze({

      understand:
        understand,

      getLatestUnderstanding:
        getLatestUnderstanding

    });



})(window);