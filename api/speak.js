/*
==================================================
CONVERSATE PRO
GOOGLE CLOUD TEXT-TO-SPEECH
/api/speak.js
==================================================

FLOW:

chatAudio.js
      ↓
audio.js
      ↓
POST /api/speak
      ↓
Google Cloud Text-to-Speech
      ↓
MP3 base64
      ↓
audio.js
      ↓
🔊


IMPORTANT:

GOOGLE_TTS_KEY stays only on Vercel.

Never expose it in:

- index.html
- audio.js
- chatAudio.js
- browser JavaScript
==================================================
*/


export default async function handler(
  req,
  res
) {


  /*
  ==================================================
  ONLY POST REQUESTS
  ==================================================
  */

  if (
    req.method !== "POST"
  ) {

    res.setHeader(
      "Allow",
      "POST"
    );


    return res
      .status(405)
      .json({

        success:
          false,

        error:
          "Method not allowed. Use POST."

      });

  }



  try {


    /*
    ==================================================
    GOOGLE API KEY
    ==================================================
    */

    const key =
      process.env.GOOGLE_TTS_KEY;



    if (
      !key
    ) {

      console.error(
        "Missing GOOGLE_TTS_KEY"
      );


      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Google Text-to-Speech is not configured."

        });

    }



    /*
    ==================================================
    REQUEST BODY
    ==================================================

    audio.js sends something like:

    {
      text:
        "مرحبا كيف حالك؟",

      languageCode:
        "ar-XA",

      voiceName:
        "ar-XA-Chirp3-HD-Despina",

      speed:
        0.9
    }


    OR for languages without a preferred voice:

    {
      text:
        "Sannu, yaya kake?",

      languageCode:
        "ha-NG",

      voiceName:
        "",

      speed:
        0.9
    }


    Empty voiceName means:

    Let Google choose an appropriate
    voice for that language.
    ==================================================
    */

    const {

      text,
      languageCode,
      voiceName,
      speed

    } = req.body || {};



    /*
    ==================================================
    TEXT
    ==================================================
    */

    const cleanText =

      String(
        text || ""
      )

        .replace(
          /\s+/g,
          " "
        )

        .trim();



    if (
      !cleanText
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          error:
            "Missing text."

        });

    }



    /*
    Protect endpoint from accidentally
    receiving very large text.
    */

    if (
      cleanText.length > 5000
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          error:
            "Text is too long for this speech request."

        });

    }



    /*
    ==================================================
    LANGUAGE CODE
    ==================================================

    Examples:

    Arabic:
      ar-XA

    English:
      en-GB

    Hausa:
      ha-NG

    Japanese:
      ja-JP
    ==================================================
    */

    const cleanLanguageCode =

      String(
        languageCode || ""
      ).trim();



    if (
      !cleanLanguageCode
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          error:
            "Missing languageCode."

        });

    }



    /*
    ==================================================
    VOICE NAME
    ==================================================

    IMPORTANT CHANGE:

    voiceName is now OPTIONAL.

    Example preferred voice:

    ar-XA-Chirp3-HD-Despina

    But audio.js may send:

    ""

    for languages such as Hausa.

    In that situation we simply omit
    "name" from Google's voice object.

    Google then selects an available voice.
    ==================================================
    */

    const cleanVoiceName =

      String(
        voiceName || ""
      ).trim();



    /*
    ==================================================
    SPEED
    ==================================================
    */

    let speakingRate =

      Number(
        speed
      );



    if (
      !Number.isFinite(
        speakingRate
      )
    ) {

      speakingRate =
        0.9;

    }



    /*
    Conversate Pro supported range.

    0.5 = quite slow
    0.75 = learner speed
    0.9 = default
    1.0 = normal
    1.5 = faster
    2.0 = maximum allowed here
    */

    speakingRate =

      Math.min(

        2.0,

        Math.max(

          0.5,

          speakingRate

        )

      );



    /*
    ==================================================
    BUILD GOOGLE VOICE OBJECT
    ==================================================

    SPECIFIC VOICE:

    {
      languageCode: "ar-XA",
      name: "ar-XA-Chirp3-HD-Despina"
    }


    AUTOMATIC VOICE:

    {
      languageCode: "ha-NG"
    }
    ==================================================
    */

    const googleVoice = {

      languageCode:
        cleanLanguageCode,

      ...(cleanVoiceName

        ? {

            name:
              cleanVoiceName

          }

        : {}

      )

    };



    /*
    ==================================================
    GOOGLE REQUEST BODY
    ==================================================
    */

    const googleRequestBody = {


      /*
      ------------------------------
      TEXT
      ------------------------------
      */

      input: {

        text:
          cleanText

      },



      /*
      ------------------------------
      VOICE
      ------------------------------
      */

      voice:
        googleVoice,



      /*
      ------------------------------
      AUDIO
      ------------------------------
      */

      audioConfig: {

        audioEncoding:
          "MP3",

        speakingRate:
          speakingRate

      }

    };



    /*
    ==================================================
    GOOGLE TEXT-TO-SPEECH REQUEST
    ==================================================

    API key is sent in the request header.

    It never reaches the browser.
    ==================================================
    */

    const googleResponse =

      await fetch(

        "https://texttospeech.googleapis.com/v1/text:synthesize",

        {

          method:
            "POST",


          headers: {

            "Content-Type":
              "application/json",

            "x-goog-api-key":
              key

          },


          body:
            JSON.stringify(
              googleRequestBody
            )

        }

      );



    /*
    ==================================================
    READ GOOGLE RESPONSE
    ==================================================
    */

    let googleData;



    try {

      googleData =

        await googleResponse
          .json();


    } catch (error) {

      console.error(

        "Invalid Google TTS response:",

        error

      );


      return res
        .status(502)
        .json({

          success:
            false,

          error:
            "Google Text-to-Speech returned an invalid response."

        });

    }



    /*
    ==================================================
    GOOGLE ERROR
    ==================================================
    */

    if (

      !googleResponse.ok

      ||

      googleData?.error

    ) {


      console.error(

        "Google TTS Error:",

        googleData

      );



      const googleMessage =

        googleData
          ?.error
          ?.message

        ||

        "Google Text-to-Speech request failed.";



      return res
        .status(

          googleResponse.status ||
          500

        )
        .json({

          success:
            false,


          error:
            googleMessage,


          googleStatus:
            googleResponse.status,


          /*
          Helpful when testing a language.

          This contains no secret.
          */

          languageCode:
            cleanLanguageCode,


          requestedVoice:

            cleanVoiceName ||

            "automatic"

        });

    }



    /*
    ==================================================
    AUDIO CONTENT
    ==================================================

    Google returns:

    {
      audioContent:
        "base64..."
    }
    ==================================================
    */

    const audioContent =

      googleData?.audioContent;



    if (
      !audioContent
    ) {

      console.error(

        "Google returned no audioContent:",

        googleData

      );


      return res
        .status(502)
        .json({

          success:
            false,

          error:
            "Google Text-to-Speech returned no audio."

        });

    }



    /*
    ==================================================
    DO NOT CACHE API RESPONSE

    audio.js already has its own in-memory
    MP3 cache.

    So the server response does not need
    browser/proxy caching right now.
    ==================================================
    */

    res.setHeader(

      "Cache-Control",

      "no-store"

    );



    /*
    ==================================================
    SUCCESS
    ==================================================
    */

    return res
      .status(200)
      .json({

        success:
          true,


        audioContent:
          audioContent,


        audioEncoding:
          "MP3",


        languageCode:
          cleanLanguageCode,


        /*
        If blank was supplied:

        "automatic"

        lets audio.js know Google selected
        the available voice automatically.
        */

        voiceName:

          cleanVoiceName ||

          "automatic",


        speed:
          speakingRate

      });



  } catch (error) {


    /*
    ==================================================
    UNEXPECTED SERVER ERROR
    ==================================================
    */

    console.error(

      "Conversate Pro TTS Server Error:",

      error

    );


    return res
      .status(500)
      .json({

        success:
          false,


        error:
          "Text-to-Speech request failed.",


        details:

          process.env.NODE_ENV ===
            "development"

            ? error.message

            : undefined

      });

  }

}