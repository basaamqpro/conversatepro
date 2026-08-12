(function (global) {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO AUDIO.JS
  ==================================================

  RESPONSIBILITY:

  text + language
        ↓
  determine Google language code
        ↓
  choose preferred voice when available
        ↓
  POST /api/speak
        ↓
  receive MP3 base64
        ↓
  play audio


  audio.js knows NOTHING about:

  - chat boxes
  - Firestore
  - translation
  - InteractPlus
  - Options
  - Teach

  chatAudio.js will connect chat messages
  to this audio engine later.
  ==================================================
  */


  const API_ENDPOINT =
    "/api/speak";



  /*
  ==================================================
  LANGUAGE MAP

  Conversate Pro language name
        ↓
  Google TTS BCP-47 language code

  These names correspond to the languages
  used by your results5.js language system.
  ==================================================
  */

  const languageMap = {

    English:
      "en-GB",

    Arabic:
      "ar-XA",

    Hausa:
      "ha-NG",

    French:
      "fr-FR",

    Spanish:
      "es-ES",

    Portuguese:
      "pt-BR",

    German:
      "de-DE",

    Italian:
      "it-IT",

    Dutch:
      "nl-NL",

    Russian:
      "ru-RU",

    Ukrainian:
      "uk-UA",

    Polish:
      "pl-PL",

    Turkish:
      "tr-TR",

    Persian:
      "fa-IR",

    Urdu:
      "ur-PK",

    Hindi:
      "hi-IN",

    Bengali:
      "bn-IN",

    Punjabi:
      "pa-IN",

    Gujarati:
      "gu-IN",

    Marathi:
      "mr-IN",

    Tamil:
      "ta-IN",

    Telugu:
      "te-IN",

    Kannada:
      "kn-IN",

    Malayalam:
      "ml-IN",

    Nepali:
      "ne-NP",

    Sinhala:
      "si-LK",

    "Mandarin Chinese":
      "cmn-CN",

    Cantonese:
      "yue-HK",

    Japanese:
      "ja-JP",

    Korean:
      "ko-KR",

    Vietnamese:
      "vi-VN",

    Thai:
      "th-TH",

    Indonesian:
      "id-ID",

    Malay:
      "ms-MY",

    "Filipino (Tagalog)":
      "fil-PH",

    Swahili:
      "sw-KE",

    Somali:
      "so-SO",

    Amharic:
      "am-ET",

    Yoruba:
      "yo-NG",

    Igbo:
      "ig-NG",

    Zulu:
      "zu-ZA",

    Afrikaans:
      "af-ZA",

    Hebrew:
      "he-IL",

    Greek:
      "el-GR",

    Romanian:
      "ro-RO",

    Czech:
      "cs-CZ",

    Hungarian:
      "hu-HU",

    Swedish:
      "sv-SE",

    Norwegian:
      "nb-NO",

    Danish:
      "da-DK"

  };



  /*
  ==================================================
  PREFERRED VOICES

  Only specify voices we already know
  and want to prefer.

  For every other language:

      voiceName = ""

  Google chooses an appropriate voice.

  This is deliberately safer than inventing
  Chirp voice names for all languages.
  ==================================================
  */

  const preferredVoices = {

    English:
      "en-US-Chirp3-HD-Achernar",

    Arabic:
      "ar-XA-Chirp3-HD-Despina",

    Japanese:
      "ja-JP-Chirp3-HD-Aoede",

    French:
      "fr-FR-Chirp3-HD-Aoede",

    Spanish:
      "es-ES-Chirp3-HD-Aoede"

  };



  /*
  ==================================================
  DEFAULT SETTINGS
  ==================================================

  0.9 is slightly slower than normal
  and useful for language conversation.

  Can later be changed by:

  ConversateAudio.setSpeed(0.75)
  ==================================================
  */

  const DEFAULT_SPEED =
    0.9;


  const MIN_SPEED =
    0.5;


  const MAX_SPEED =
    2.0;



  /*
  ==================================================
  STATE
  ==================================================
  */

  let currentAudio =
    null;


  let currentAudioURL =
    "";


  let currentRequestController =
    null;


  let speaking =
    false;


  let speed =
    DEFAULT_SPEED;


  let latestRequest =
    null;


  let latestResult =
    null;



  /*
  ==================================================
  AUDIO CACHE

  Avoid requesting Google TTS repeatedly for
  the exact same:

  language + voice + speed + text

  during the current page session.
  ==================================================
  */

  const audioCache =
    new Map();



  /*
  ==================================================
  EVENTS

  Other files can listen for:

  conversate-audio-start
  conversate-audio-end
  conversate-audio-error
  conversate-audio-stop

  chatAudio.js can use these later for CSS.
  ==================================================
  */

  function dispatchAudioEvent(
    eventName,
    detail
  ) {

    document.dispatchEvent(

      new CustomEvent(

        eventName,

        {

          detail:
            detail || {}

        }

      )

    );

  }



  /*
  ==================================================
  GET LANGUAGE CODE
  ==================================================
  */

  function getLanguageCode(
    language
  ) {

    const cleanLanguage =

      String(
        language || ""
      ).trim();



    return (

      languageMap[
        cleanLanguage
      ]

      ||

      ""

    );

  }



  /*
  ==================================================
  GET PREFERRED VOICE
  ==================================================
  */

  function getPreferredVoice(
    language
  ) {

    const cleanLanguage =

      String(
        language || ""
      ).trim();



    return (

      preferredVoices[
        cleanLanguage
      ]

      ||

      ""

    );

  }



  /*
  ==================================================
  LANGUAGE SUPPORTED BY OUR MAP?
  ==================================================
  */

  function isLanguageSupported(
    language
  ) {

    return Boolean(

      getLanguageCode(
        language
      )

    );

  }



  /*
  ==================================================
  GET SUPPORTED LANGUAGES
  ==================================================
  */

  function getSupportedLanguages() {

    return Object.keys(
      languageMap
    );

  }



  /*
  ==================================================
  SPEED
  ==================================================
  */

  function normalizeSpeed(
    value
  ) {

    let number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      number =
        DEFAULT_SPEED;

    }


    return Math.min(

      MAX_SPEED,

      Math.max(

        MIN_SPEED,

        number

      )

    );

  }



  function setSpeed(
    value
  ) {

    speed =
      normalizeSpeed(
        value
      );


    return speed;

  }



  function getSpeed() {

    return speed;

  }



  /*
  ==================================================
  TEXT CLEANING
  ==================================================

  chatAudio.js should normally supply only
  the practice-language sentence.

  This function simply removes excessive
  whitespace.
  ==================================================
  */

  function cleanSpeechText(
    text
  ) {

    return String(
      text || ""
    )

      .replace(
        /\s+/g,
        " "
      )

      .trim();

  }



  /*
  ==================================================
  CACHE KEY
  ==================================================
  */

  function createCacheKey(
    settings
  ) {

    return [

      settings.languageCode,

      settings.voiceName ||
      "automatic",

      settings.speed,

      settings.text

    ].join(
      "::"
    );

  }



  /*
  ==================================================
  BASE64 → BLOB
  ==================================================

  Google returns:

  audioContent:
      base64 encoded MP3

  Instead of leaving a very large
  data: URL around, convert it to a Blob.
  ==================================================
  */

  function base64ToBlob(
    base64,
    mimeType
  ) {

    const binary =
      atob(
        base64
      );


    const length =
      binary.length;


    const bytes =
      new Uint8Array(
        length
      );


    for (
      let index = 0;
      index < length;
      index++
    ) {

      bytes[
        index
      ] =
        binary.charCodeAt(
          index
        );

    }


    return new Blob(

      [
        bytes
      ],

      {

        type:
          mimeType ||
          "audio/mpeg"

      }

    );

  }



  /*
  ==================================================
  STOP CURRENT AUDIO
  ==================================================
  */

  function stop(
    options
  ) {

    const settings =
      options || {};


    /*
    Cancel TTS request if still running.
    */

    if (
      currentRequestController
    ) {

      currentRequestController
        .abort();


      currentRequestController =
        null;

    }



    /*
    Stop actual playback.
    */

    if (
      currentAudio
    ) {

      try {

        currentAudio.pause();


        currentAudio.currentTime =
          0;


      } catch (error) {

        console.warn(
          "Could not stop audio:",
          error
        );

      }


      currentAudio =
        null;

    }



    speaking =
      false;



    /*
    Do not revoke cached URLs here.

    They may be reused during this session.
    */



    if (
      !settings.silent
    ) {

      dispatchAudioEvent(

        "conversate-audio-stop",

        {

          request:
            latestRequest

        }

      );

    }

  }



  /*
  ==================================================
  REQUEST GOOGLE SPEECH
  ==================================================
  */

  async function requestSpeech(
    settings
  ) {

    const response =

      await fetch(

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

              text:
                settings.text,


              languageCode:
                settings.languageCode,


              /*
              Empty string is intentional.

              speak.js then lets Google
              automatically choose a voice.
              */

              voiceName:
                settings.voiceName ||
                "",


              speed:
                settings.speed

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
        "The audio server returned invalid JSON."
      );

    }



    if (
      !response.ok
    ) {

      throw new Error(

        data?.error ||

        "Text-to-Speech request failed."

      );

    }



    if (
      !data?.audioContent
    ) {

      throw new Error(
        "No audio was returned."
      );

    }


    return data;

  }



  /*
  ==================================================
  GET OR CREATE AUDIO URL
  ==================================================
  */

  async function getAudioURL(
    settings
  ) {

    const cacheKey =

      createCacheKey(
        settings
      );



    /*
    Already generated during this page session.
    */

    if (
      audioCache.has(
        cacheKey
      )
    ) {

      return {

        url:
          audioCache.get(
            cacheKey
          ),

        cached:
          true

      };

    }



    /*
    Request new speech.
    */

    const data =

      await requestSpeech(
        settings
      );



    const blob =

      base64ToBlob(

        data.audioContent,

        "audio/mpeg"

      );



    const url =

      URL.createObjectURL(
        blob
      );



    audioCache.set(

      cacheKey,

      url

    );



    return {

      url:
        url,

      cached:
        false,

      server:
        data

    };

  }



  /*
  ==================================================
  PLAY AUDIO
  ==================================================

  EXAMPLE:

  ConversateAudio.play({

      text:
        "مرحبا كيف حالك؟",

      language:
        "Arabic"

  });
  ==================================================
  */

  async function play(
    options
  ) {

    const settings =
      options || {};



    /*
    ==================================================
    TEXT
    ==================================================
    */

    const text =

      cleanSpeechText(
        settings.text
      );



    if (
      !text
    ) {

      throw new Error(
        "No text was provided for audio."
      );

    }



    /*
    ==================================================
    LANGUAGE
    ==================================================
    */

    const language =

      String(
        settings.language || ""
      ).trim();



    if (
      !language
    ) {

      throw new Error(
        "No language was provided for audio."
      );

    }



    const languageCode =

      settings.languageCode ||

      getLanguageCode(
        language
      );



    if (
      !languageCode
    ) {

      throw new Error(

        "Audio language is not configured: " +

        language

      );

    }



    /*
    ==================================================
    VOICE

    Caller can explicitly override:

    ConversateAudio.play({
        text: "...",
        language: "Arabic",
        voiceName: "..."
    })

    Otherwise use preferred voice if known.

    Otherwise blank:
        Google automatically chooses.
    ==================================================
    */

    let voiceName;


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          settings,
          "voiceName"
        )
    ) {

      voiceName =

        String(
          settings.voiceName || ""
        ).trim();

    }

    else {

      voiceName =

        getPreferredVoice(
          language
        );

    }



    /*
    ==================================================
    SPEED
    ==================================================
    */

    const speakingRate =

      normalizeSpeed(

        settings.speed ??

        speed

      );



    /*
    ==================================================
    STOP PREVIOUS SPEECH

    A conversation should not have several
    messages speaking over one another.
    ==================================================
    */

    stop({

      silent:
        true

    });



    /*
    ==================================================
    REQUEST CONTROLLER
    ==================================================
    */

    const controller =
      new AbortController();


    currentRequestController =
      controller;



    /*
    External AbortSignal support.
    */

    if (
      settings.signal
    ) {


      if (
        settings.signal.aborted
      ) {

        controller.abort();

      }

      else {

        settings.signal.addEventListener(

          "abort",

          function() {

            controller.abort();

          },

          {

            once:
              true

          }

        );

      }

    }



    latestRequest = {

      text:
        text,

      language:
        language,

      languageCode:
        languageCode,

      voiceName:
        voiceName,

      speed:
        speakingRate,

      requestedAt:
        new Date()
          .toISOString()

    };



    try {


      /*
      ==================================================
      GET MP3
      ==================================================
      */

      const audioResult =

        await getAudioURL({

          text:
            text,

          languageCode:
            languageCode,

          voiceName:
            voiceName,

          speed:
            speakingRate,

          signal:
            controller.signal

        });



      /*
      Request may have been replaced
      while waiting.
      */

      if (
        currentRequestController !==
        controller
      ) {

        return null;

      }



      currentRequestController =
        null;



      /*
      ==================================================
      CREATE AUDIO PLAYER
      ==================================================
      */

      const audio =

        new Audio(
          audioResult.url
        );


      currentAudio =
        audio;


      currentAudioURL =
        audioResult.url;



      /*
      ==================================================
      AUDIO EVENTS
      ==================================================
      */

      audio.addEventListener(

        "play",

        function() {


          speaking =
            true;


          dispatchAudioEvent(

            "conversate-audio-start",

            {

              request:
                latestRequest,

              audio:
                audio

            }

          );

        }

      );



      audio.addEventListener(

        "ended",

        function() {


          speaking =
            false;


          currentAudio =
            null;


          dispatchAudioEvent(

            "conversate-audio-end",

            {

              request:
                latestRequest

            }

          );

        }

      );



      audio.addEventListener(

        "pause",

        function() {


          if (
            !audio.ended
          ) {

            speaking =
              false;

          }

        }

      );



      audio.addEventListener(

        "error",

        function() {


          speaking =
            false;


          dispatchAudioEvent(

            "conversate-audio-error",

            {

              request:
                latestRequest,

              error:
                "Audio playback failed."

            }

          );

        }

      );



      /*
      ==================================================
      PLAY
      ==================================================
      */

      await audio.play();



      latestResult = {

        success:
          true,


        text:
          text,


        language:
          language,


        languageCode:
          languageCode,


        voiceName:

          voiceName ||

          audioResult
            .server
            ?.voiceName ||

          "automatic",


        speed:
          speakingRate,


        cached:
          audioResult.cached ===
          true,


        audioURL:
          audioResult.url,


        startedAt:
          new Date()
            .toISOString()

      };



      return latestResult;


    } catch (error) {


      if (
        currentRequestController ===
        controller
      ) {

        currentRequestController =
          null;

      }



      if (
        error.name ===
        "AbortError"
      ) {

        return null;

      }



      speaking =
        false;



      console.error(
        "ConversateAudio:",
        error
      );



      dispatchAudioEvent(

        "conversate-audio-error",

        {

          request:
            latestRequest,

          error:
            error.message

        }

      );



      throw error;

    }

  }



  /*
  ==================================================
  REPLAY LAST REQUEST
  ==================================================
  */

  async function replay() {

    if (
      !latestRequest
    ) {

      return null;

    }


    return play({

      text:
        latestRequest.text,

      language:
        latestRequest.language,

      languageCode:
        latestRequest.languageCode,

      voiceName:
        latestRequest.voiceName,

      speed:
        latestRequest.speed

    });

  }



  /*
  ==================================================
  IS SPEAKING?
  ==================================================
  */

  function isSpeaking() {

    return speaking;

  }



  /*
  ==================================================
  GET CURRENT REQUEST
  ==================================================
  */

  function getCurrentRequest() {

    return latestRequest
      ? {
          ...latestRequest
        }
      : null;

  }



  /*
  ==================================================
  GET LATEST RESULT
  ==================================================
  */

  function getLatestResult() {

    return latestResult
      ? {
          ...latestResult
        }
      : null;

  }



  /*
  ==================================================
  CLEAR AUDIO CACHE
  ==================================================
  */

  function clearCache() {


    /*
    Stop audio first.
    */

    stop({

      silent:
        true

    });



    audioCache.forEach(

      function(url) {

        try {

          URL.revokeObjectURL(
            url
          );

        } catch (error) {

          console.warn(
            error
          );

        }

      }

    );


    audioCache.clear();


    currentAudioURL =
      "";

  }



  /*
  ==================================================
  CACHE SIZE
  ==================================================
  */

  function getCacheSize() {

    return audioCache.size;

  }



  /*
  ==================================================
  CLEAN UP PAGE
  ==================================================
  */

  window.addEventListener(

    "beforeunload",

    function() {

      clearCache();

    }

  );



  /*
  ==================================================
  GLOBAL API
  ==================================================
  */

  global.ConversateAudio =
    Object.freeze({

      /*
      Main audio controls.
      */

      play:
        play,

      stop:
        stop,

      replay:
        replay,


      /*
      Speed.
      */

      setSpeed:
        setSpeed,

      getSpeed:
        getSpeed,


      /*
      Language information.
      */

      getLanguageCode:
        getLanguageCode,

      getPreferredVoice:
        getPreferredVoice,

      isLanguageSupported:
        isLanguageSupported,

      getSupportedLanguages:
        getSupportedLanguages,


      /*
      State.
      */

      isSpeaking:
        isSpeaking,

      getCurrentRequest:
        getCurrentRequest,

      getLatestResult:
        getLatestResult,


      /*
      Cache.
      */

      clearCache:
        clearCache,

      getCacheSize:
        getCacheSize

    });



})(window);