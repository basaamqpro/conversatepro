/*
==================================================
CONVERSATE PRO
GOOGLE CLOUD TEXT-TO-SPEECH API ROUTE
==================================================

Browser:

audio.js
    ↓
POST /api/speak
    ↓
speak.js
    ↓
Google Cloud Text-to-Speech
    ↓
Base64 MP3
    ↓
audio.js plays it


IMPORTANT:

GOOGLE_TTS_KEY remains on Vercel.

It is NEVER sent to:
- index.html
- audio.js
- chatAudio.js
- the browser
==================================================
*/


export default async function handler(
  req,
  res
) {

  /*
  ==================================================
  ONLY ALLOW POST
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
        "GOOGLE_TTS_KEY is missing."
      );


      return res
        .status(500)
        .json({

          error:
            "Google Text-to-Speech is not configured."

        });

    }



    /*
    ==================================================
    REQUEST BODY
    ==================================================

    audio.js will later send:

    {
      text:
        "مرحبًا كيف حالك؟",

      languageCode:
        "ar-XA",

      voiceName:
        "ar-XA-Chirp3-HD-Despina",

      speed:
        0.9
    }
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
    VALIDATE TEXT
    ==================================================
    */

    const cleanText =

      String(
        text || ""
      ).trim();



    if (
      !cleanText
    ) {

      return res
        .status(400)
        .json({

          error:
            "Missing text."

        });

    }



    /*
    Prevent accidentally sending extremely
    large chat content through this endpoint.
    */

    if (
      cleanText.length > 5000
    ) {

      return res
        .status(400)
        .json({

          error:
            "Text is too long for this speech request."

        });

    }



    /*
    ==================================================
    VALIDATE LANGUAGE CODE
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

          error:
            "Missing languageCode."

        });

    }



    /*
    ==================================================
    VALIDATE VOICE NAME
    ==================================================
    */

    const cleanVoiceName =

      String(
        voiceName || ""
      ).trim();



    if (
      !cleanVoiceName
    ) {

      return res
        .status(400)
        .json({

          error:
            "Missing voiceName."

        });

    }



    /*
    ==================================================
    SPEED
    ==================================================

    Normal:
        1

    Slightly slower:
        0.85

    Beginner:
        0.75

    audio.js will choose the default later.
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
        1.0;

    }



    /*
    Keep user input inside a sensible
    range for Conversate Pro.
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
    GOOGLE TEXT-TO-SPEECH REQUEST
    ==================================================

    Official endpoint:

    POST
    https://texttospeech.googleapis.com/v1/text:synthesize

    Google expects:

    input
    voice
    audioConfig

    and returns:

    audioContent

    as base64 audio.
    ==================================================
    */

    const googleResponse =

      await fetch(

        "https://texttospeech.googleapis.com/v1/text:synthesize?key="

        +

        encodeURIComponent(
          key
        ),

        {

          method:
            "POST",


          headers: {

            "Content-Type":
              "application/json"

          },


          body:
            JSON.stringify({

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

              voice: {

                languageCode:
                  cleanLanguageCode,

                name:
                  cleanVoiceName

              },


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

            })

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
        await googleResponse.json();


    } catch (error) {

      console.error(
        "Invalid Google TTS response:",
        error
      );


      return res
        .status(502)
        .json({

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


      return res
        .status(
          googleResponse.status || 500
        )
        .json({

          error:
            googleData?.error?.message
            ||
            "Google Text-to-Speech request failed.",


          /*
          Useful during development.

          Does NOT expose the API key.
          */

          googleStatus:
            googleResponse.status

        });

    }



    /*
    ==================================================
    AUDIO CONTENT
    ==================================================

    Google returns base64 encoded audio
    when using JSON REST responses.
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

          error:
            "Google Text-to-Speech returned no audio."

        });

    }



    /*
    ==================================================
    SUCCESS
    ==================================================
    */

    res.setHeader(

      "Cache-Control",

      "no-store"

    );


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


        voiceName:
          cleanVoiceName,


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

      "Conversate Pro TTS Error:",

      error

    );


    return res
      .status(500)
      .json({

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