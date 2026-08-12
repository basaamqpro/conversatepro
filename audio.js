(function (global) {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO AUDIO.JS
  QUALITY-FIRST 50-LANGUAGE AUDIO ENGINE
  ==================================================

  PRIORITY:

  1. Google Chirp 3 HD
     where officially supported

  2. Best other Google voice
     where Chirp 3 HD is unavailable

  3. Browser SpeechSynthesis fallback
     where Google Cloud TTS currently
     does not provide that language


  PUBLIC USAGE:

  ConversateAudio.play({
    text: "مرحبا كيف حالك؟",
    language: "Arabic"
  });

  ==================================================
  */


  const API_ENDPOINT =
    "/api/speak";


  /*
  ==================================================
  AUDIO SETTINGS
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
  VOICE PROFILE HELPERS
  ==================================================
  */

  function chirpProfile(
    languageCode,
    voice
  ) {

    const voiceStyle =
      voice || "Aoede";


    return {

      languageCode:
        languageCode,

      engine:
        "google",

      tier:
        "Chirp3-HD",

      voiceName:

        languageCode +

        "-Chirp3-HD-" +

        voiceStyle,

      browserFallback:
        true

    };

  }



  function googleProfile(
    languageCode,
    voiceName,
    tier
  ) {

    return {

      languageCode:
        languageCode,

      engine:
        "google",

      tier:
        tier || "Google",

      voiceName:
        voiceName || "",

      browserFallback:
        true

    };

  }



  function browserProfile(
    languageCode
  ) {

    return {

      languageCode:
        languageCode,

      engine:
        "browser",

      tier:
        "Browser",

      voiceName:
        "",

      browserFallback:
        true

    };

  }



  /*
  ==================================================
  50-LANGUAGE VOICE DATABASE
  ==================================================

  Chirp3-HD is preferred wherever Google
  currently officially supports the locale.

  Aoede is used as the default high-quality
  conversational voice persona.

  Arabic keeps Despina because you already
  tested it successfully and it sounds
  natural for this application.

  Where Google has no Chirp3 support, we use
  another premium voice when available.

  Where Google currently has no listed TTS
  voice at all, browser speech is used.
  ==================================================
  */

  const voiceProfiles = {


    /*
    ==================================================
    CHIRP 3 HD
    ==================================================
    */


    English:
      chirpProfile(
        "en-GB",
        "Aoede"
      ),


    Arabic:
      chirpProfile(
        "ar-XA",
        "Despina"
      ),


    French:
      chirpProfile(
        "fr-FR",
        "Aoede"
      ),


    Spanish:
      chirpProfile(
        "es-ES",
        "Aoede"
      ),


    Portuguese:
      chirpProfile(
        "pt-BR",
        "Aoede"
      ),


    German:
      chirpProfile(
        "de-DE",
        "Aoede"
      ),


    Italian:
      chirpProfile(
        "it-IT",
        "Aoede"
      ),


    Dutch:
      chirpProfile(
        "nl-NL",
        "Aoede"
      ),


    Russian:
      chirpProfile(
        "ru-RU",
        "Aoede"
      ),


    Ukrainian:
      chirpProfile(
        "uk-UA",
        "Aoede"
      ),


    Polish:
      chirpProfile(
        "pl-PL",
        "Aoede"
      ),


    Turkish:
      chirpProfile(
        "tr-TR",
        "Aoede"
      ),


    /*
    Google Chirp currently lists Urdu India.
    */

    Urdu:
      chirpProfile(
        "ur-IN",
        "Aoede"
      ),


    Hindi:
      chirpProfile(
        "hi-IN",
        "Aoede"
      ),


    Bengali:
      chirpProfile(
        "bn-IN",
        "Aoede"
      ),


    /*
    Punjabi Chirp 3 HD is currently Preview.
    */

    Punjabi:
      chirpProfile(
        "pa-IN",
        "Aoede"
      ),


    Gujarati:
      chirpProfile(
        "gu-IN",
        "Aoede"
      ),


    Marathi:
      chirpProfile(
        "mr-IN",
        "Aoede"
      ),


    Tamil:
      chirpProfile(
        "ta-IN",
        "Aoede"
      ),


    Telugu:
      chirpProfile(
        "te-IN",
        "Aoede"
      ),


    Kannada:
      chirpProfile(
        "kn-IN",
        "Aoede"
      ),


    Malayalam:
      chirpProfile(
        "ml-IN",
        "Aoede"
      ),


    "Mandarin Chinese":
      chirpProfile(
        "cmn-CN",
        "Aoede"
      ),


    /*
    Cantonese Chirp 3 HD is currently Preview.
    */

    Cantonese:
      chirpProfile(
        "yue-HK",
        "Aoede"
      ),


    Japanese:
      chirpProfile(
        "ja-JP",
        "Aoede"
      ),


    Korean:
      chirpProfile(
        "ko-KR",
        "Aoede"
      ),


    Vietnamese:
      chirpProfile(
        "vi-VN",
        "Aoede"
      ),


    Thai:
      chirpProfile(
        "th-TH",
        "Aoede"
      ),


    Indonesian:
      chirpProfile(
        "id-ID",
        "Aoede"
      ),


    Swahili:
      chirpProfile(
        "sw-KE",
        "Aoede"
      ),


    Hebrew:
      chirpProfile(
        "he-IL",
        "Aoede"
      ),


    Greek:
      chirpProfile(
        "el-GR",
        "Aoede"
      ),


    Romanian:
      chirpProfile(
        "ro-RO",
        "Aoede"
      ),


    Czech:
      chirpProfile(
        "cs-CZ",
        "Aoede"
      ),


    Hungarian:
      chirpProfile(
        "hu-HU",
        "Aoede"
      ),


    Swedish:
      chirpProfile(
        "sv-SE",
        "Aoede"
      ),


    Norwegian:
      chirpProfile(
        "nb-NO",
        "Aoede"
      ),


    Danish:
      chirpProfile(
        "da-DK",
        "Aoede"
      ),



    /*
    ==================================================
    GOOGLE TTS — NON-CHIRP
    ==================================================
    */


    /*
    Afrikaans currently has Standard voices.
    */

    Afrikaans:

      googleProfile(

        "af-ZA",

        "af-ZA-Standard-A",

        "Standard"

      ),



    /*
    Malay currently provides WaveNet.

    WaveNet is preferred over Standard here.
    */

    Malay:

      googleProfile(

        "ms-MY",

        "ms-MY-Wavenet-A",

        "WaveNet"

      ),



    /*
    Filipino currently provides Neural2.

    Prefer Neural2 over its Standard/
    WaveNet voices.
    */

    "Filipino (Tagalog)":

      googleProfile(

        "fil-PH",

        "fil-ph-Neural2-A",

        "Neural2"

      ),



    /*
    ==================================================
    CURRENTLY NOT LISTED IN GOOGLE CLOUD
    TTS VOICE CATALOG

    Use browser speech synthesis.

    This allows Conversate Pro to attempt
    speech using voices installed by the
    user's OS/browser.
    ==================================================
    */


    Hausa:
      browserProfile(
        "ha-NG"
      ),


    Persian:
      browserProfile(
        "fa-IR"
      ),


    Nepali:
      browserProfile(
        "ne-NP"
      ),


    Sinhala:
      browserProfile(
        "si-LK"
      ),


    Somali:
      browserProfile(
        "so-SO"
      ),


    Amharic:
      browserProfile(
        "am-ET"
      ),


    Yoruba:
      browserProfile(
        "yo-NG"
      ),


    Igbo:
      browserProfile(
        "ig-NG"
      ),


    Zulu:
      browserProfile(
        "zu-ZA"
      )

  };



  /*
  ==================================================
  STATE
  ==================================================
  */

  let currentAudio =
    null;


  let currentUtterance =
    null;


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
  Google MP3 cache.

  Browser SpeechSynthesis does not create
  an MP3, so only Google audio is cached.
  */

  const audioCache =
    new Map();



  /*
  ==================================================
  EVENTS
  ==================================================

  chatAudio.js can later listen for:

  conversate-audio-start

  conversate-audio-end

  conversate-audio-stop

  conversate-audio-error
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
  PROFILE HELPERS
  ==================================================
  */

  function getVoiceProfile(
    language
  ) {

    return (

      voiceProfiles[
        String(
          language || ""
        ).trim()
      ]

      ||

      null

    );

  }



  function getLanguageCode(
    language
  ) {

    return (

      getVoiceProfile(
        language
      )
      ?.languageCode

      ||

      ""

    );

  }



  function getPreferredVoice(
    language
  ) {

    return (

      getVoiceProfile(
        language
      )
      ?.voiceName

      ||

      ""

    );

  }



  function getVoiceTier(
    language
  ) {

    return (

      getVoiceProfile(
        language
      )
      ?.tier

      ||

      ""

    );

  }



  function getPreferredEngine(
    language
  ) {

    return (

      getVoiceProfile(
        language
      )
      ?.engine

      ||

      ""

    );

  }



  function isLanguageSupported(
    language
  ) {

    return Boolean(

      getVoiceProfile(
        language
      )

    );

  }



  function getSupportedLanguages() {

    return Object.keys(
      voiceProfiles
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

    let result =
      Number(
        value
      );


    if (
      !Number.isFinite(
        result
      )
    ) {

      result =
        DEFAULT_SPEED;

    }


    return Math.min(

      MAX_SPEED,

      Math.max(

        MIN_SPEED,

        result

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
  TEXT
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
  GOOGLE CACHE KEY
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
  BASE64 → AUDIO BLOB
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


    const bytes =
      new Uint8Array(
        binary.length
      );


    for (
      let index = 0;
      index < binary.length;
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
  STOP EVERYTHING
  ==================================================
  */

  function stop(
    options
  ) {

    const settings =
      options || {};



    /*
    Cancel pending Google request.
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
    Stop Google MP3.
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
          error
        );

      }


      currentAudio =
        null;

    }



    /*
    Stop browser TTS.
    */

    if (

      "speechSynthesis"
      in window

    ) {

      window
        .speechSynthesis
        .cancel();

    }


    currentUtterance =
      null;


    speaking =
      false;



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
  GOOGLE TTS REQUEST
  ==================================================
  */

  async function requestGoogleSpeech(
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

      const error =
        new Error(

          data?.error ||

          "Google Text-to-Speech failed."

        );


      error.status =
        response.status;


      throw error;

    }



    if (
      !data?.audioContent
    ) {

      throw new Error(
        "Google returned no audio."
      );

    }


    return data;

  }



  /*
  ==================================================
  GOOGLE HIGH-QUALITY REQUEST WITH FALLBACK
  ==================================================

  TRY 1:

  configured best voice

  Example:

  ar-XA-Chirp3-HD-Despina


  TRY 2:

  if that exact voice fails,
  ask Google to automatically select
  a voice for the same language.


  This protects the app if Google's
  voice catalog changes later.
  ==================================================
  */

  async function requestGoogleWithFallback(
    settings
  ) {

    try {

      const result =

        await requestGoogleSpeech(
          settings
        );


      return {

        data:
          result,

        voiceName:
          settings.voiceName ||
          "automatic",

        usedAutomaticVoice:
          !settings.voiceName

      };


    } catch (firstError) {


      /*
      Abort should never retry.
      */

      if (
        firstError.name ===
        "AbortError"
      ) {

        throw firstError;

      }



      /*
      If we already tried automatic voice,
      there is nothing else to retry here.
      */

      if (
        !settings.voiceName
      ) {

        throw firstError;

      }



      console.warn(

        "Preferred Google voice failed. Retrying automatic voice:",

        settings.voiceName

      );



      /*
      Retry Google without explicit voice.
      */

      const automaticResult =

        await requestGoogleSpeech({

          ...settings,

          voiceName:
            ""

        });



      return {

        data:
          automaticResult,

        voiceName:
          "automatic",

        usedAutomaticVoice:
          true

      };

    }

  }



  /*
  ==================================================
  GOOGLE AUDIO URL
  ==================================================
  */

  async function getGoogleAudioURL(
    settings
  ) {

    const preferredCacheKey =

      createCacheKey(
        settings
      );



    /*
    Exact preferred voice cached.
    */

    if (
      audioCache.has(
        preferredCacheKey
      )
    ) {

      return {

        url:
          audioCache.get(
            preferredCacheKey
          ),

        cached:
          true,

        voiceName:
          settings.voiceName ||
          "automatic"

      };

    }



    const result =

      await requestGoogleWithFallback(
        settings
      );



    /*
    The actual voice may have changed to
    automatic after fallback.
    */

    const actualSettings = {

      ...settings,

      voiceName:

        result.usedAutomaticVoice

          ? ""

          : settings.voiceName

    };



    const actualCacheKey =

      createCacheKey(
        actualSettings
      );



    /*
    Automatic version may already exist.
    */

    if (
      audioCache.has(
        actualCacheKey
      )
    ) {

      return {

        url:
          audioCache.get(
            actualCacheKey
          ),

        cached:
          true,

        voiceName:
          result.voiceName

      };

    }



    const blob =

      base64ToBlob(

        result.data.audioContent,

        "audio/mpeg"

      );



    const url =

      URL.createObjectURL(
        blob
      );



    audioCache.set(

      actualCacheKey,

      url

    );



    return {

      url:
        url,

      cached:
        false,

      voiceName:
        result.voiceName,

      server:
        result.data

    };

  }



  /*
  ==================================================
  FIND BEST BROWSER VOICE
  ==================================================

  Used for languages Google Cloud TTS
  currently does not support, or as the
  final emergency fallback.

  Browser availability depends on:
  - Chrome
  - Windows/macOS/Android/iOS
  - installed system voices
  ==================================================
  */

  function findBrowserVoice(
    languageCode
  ) {

    if (
      !(
        "speechSynthesis"
        in window
      )
    ) {

      return null;

    }



    const voices =

      window
        .speechSynthesis
        .getVoices();



    if (
      !voices.length
    ) {

      return null;

    }



    const exact =

      voices.find(

        function(voice) {

          return (

            String(
              voice.lang || ""
            )
              .toLowerCase()

            ===

            String(
              languageCode
            )
              .toLowerCase()

          );

        }

      );



    if (
      exact
    ) {

      return exact;

    }



    /*
    Try base language.

    Example:

    ha-NG
        ↓
    ha
    */

    const base =

      String(
        languageCode
      )

        .split("-")[0]

        .toLowerCase();



    return (

      voices.find(

        function(voice) {

          return (

            String(
              voice.lang || ""
            )

              .toLowerCase()

              .startsWith(
                base + "-"
              )

          );

        }

      )

      ||

      null

    );

  }



  /*
  ==================================================
  BROWSER SPEECH
  ==================================================
  */

  async function playBrowserSpeech(
    settings
  ) {

    if (

      !(
        "speechSynthesis"
        in window
      )

      ||

      !(
        "SpeechSynthesisUtterance"
        in window
      )

    ) {

      throw new Error(
        "This browser does not support speech synthesis."
      );

    }



    /*
    Stop previous browser speech.
    */

    window
      .speechSynthesis
      .cancel();



    const utterance =

      new SpeechSynthesisUtterance(
        settings.text
      );



    utterance.lang =
      settings.languageCode;



    /*
    Browser speech engines normally
    accept approximately 0.1–10.

    We keep Conversate Pro's own
    safe range.
    */

    utterance.rate =
      settings.speed;



    const browserVoice =

      findBrowserVoice(
        settings.languageCode
      );



    if (
      browserVoice
    ) {

      utterance.voice =
        browserVoice;

    }



    currentUtterance =
      utterance;



    utterance.onstart =

      function() {

        speaking =
          true;


        dispatchAudioEvent(

          "conversate-audio-start",

          {

            request:
              latestRequest,

            engine:
              "browser",

            voice:
              browserVoice?.name ||
              "browser automatic"

          }

        );

      };



    utterance.onend =

      function() {

        speaking =
          false;


        currentUtterance =
          null;


        dispatchAudioEvent(

          "conversate-audio-end",

          {

            request:
              latestRequest,

            engine:
              "browser"

          }

        );

      };



    utterance.onerror =

      function(event) {

        speaking =
          false;


        currentUtterance =
          null;


        dispatchAudioEvent(

          "conversate-audio-error",

          {

            request:
              latestRequest,

            engine:
              "browser",

            error:
              event.error ||
              "Browser speech failed."

          }

        );

      };



    window
      .speechSynthesis
      .speak(
        utterance
      );



    latestResult = {

      success:
        true,

      engine:
        "browser",

      text:
        settings.text,

      language:
        settings.language,

      languageCode:
        settings.languageCode,

      voiceName:

        browserVoice?.name ||

        "browser automatic",

      tier:
        "Browser",

      speed:
        settings.speed,

      cached:
        false,

      startedAt:
        new Date()
          .toISOString()

    };


    return latestResult;

  }



  /*
  ==================================================
  PLAY GOOGLE AUDIO
  ==================================================
  */

  async function playGoogleAudio(
    settings,
    profile,
    controller
  ) {

    const audioResult =

      await getGoogleAudioURL({

        text:
          settings.text,

        languageCode:
          profile.languageCode,

        voiceName:
          settings.voiceName,

        speed:
          settings.speed,

        signal:
          controller.signal

      });



    /*
    Ignore obsolete requests.
    */

    if (
      currentRequestController !==
      controller
    ) {

      return null;

    }



    currentRequestController =
      null;



    const audio =

      new Audio(
        audioResult.url
      );


    currentAudio =
      audio;



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

            engine:
              "google",

            voice:
              audioResult.voiceName

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
              latestRequest,

            engine:
              "google"

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

            engine:
              "google",

            error:
              "MP3 playback failed."

          }

        );

      }

    );



    await audio.play();



    latestResult = {

      success:
        true,

      engine:
        "google",

      text:
        settings.text,

      language:
        settings.language,

      languageCode:
        profile.languageCode,

      voiceName:
        audioResult.voiceName,

      tier:
        profile.tier,

      speed:
        settings.speed,

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

  }



  /*
  ==================================================
  MAIN PLAY FUNCTION
  ==================================================
  */

  async function play(
    options
  ) {

    const settings =
      options || {};



    /*
    ------------------------------
    TEXT
    ------------------------------
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
    ------------------------------
    LANGUAGE
    ------------------------------
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



    const profile =

      getVoiceProfile(
        language
      );



    if (
      !profile
    ) {

      throw new Error(

        "Conversate Pro audio is not configured for: " +

        language

      );

    }



    /*
    ------------------------------
    SPEED
    ------------------------------
    */

    const speakingRate =

      normalizeSpeed(

        settings.speed ??

        speed

      );



    /*
    Stop previous speech/audio.
    */

    stop({

      silent:
        true

    });



    latestRequest = {

      text:
        text,

      language:
        language,

      languageCode:
        profile.languageCode,

      preferredEngine:
        profile.engine,

      preferredTier:
        profile.tier,

      preferredVoice:
        profile.voiceName,

      speed:
        speakingRate,

      requestedAt:
        new Date()
          .toISOString()

    };



    /*
    ==================================================
    BROWSER-FIRST PROFILE

    Used when Google does not currently
    list the language.
    ==================================================
    */

    if (
      profile.engine ===
      "browser"
    ) {

      return await playBrowserSpeech({

        text:
          text,

        language:
          language,

        languageCode:
          profile.languageCode,

        speed:
          speakingRate

      });

    }



    /*
    ==================================================
    GOOGLE PROFILE
    ==================================================
    */

    const controller =
      new AbortController();


    currentRequestController =
      controller;



    /*
    External signal.
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

        settings.signal
          .addEventListener(

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



    const requestedVoice =

      Object.prototype
        .hasOwnProperty
        .call(
          settings,
          "voiceName"
        )

        ? String(
            settings.voiceName ||
            ""
          ).trim()

        : profile.voiceName;



    try {


      /*
      ==================================================
      GOOGLE FIRST

      Quality priority:
      Chirp3 / Neural2 / WaveNet / Standard
      ==================================================
      */

      return await playGoogleAudio(

        {

          text:
            text,

          language:
            language,

          voiceName:
            requestedVoice,

          speed:
            speakingRate

        },

        profile,

        controller

      );


    } catch (error) {


      if (
        error.name ===
        "AbortError"
      ) {

        return null;

      }



      console.warn(

        "Google TTS failed; trying browser speech fallback:",

        language,

        error

      );



      if (
        currentRequestController ===
        controller
      ) {

        currentRequestController =
          null;

      }



      /*
      ==================================================
      FINAL SAFETY FALLBACK

      Even officially supported Google
      languages can temporarily fail.

      Try browser speech instead.
      ==================================================
      */

      if (
        profile.browserFallback
      ) {

        try {

          return await playBrowserSpeech({

            text:
              text,

            language:
              language,

            languageCode:
              profile.languageCode,

            speed:
              speakingRate

          });


        } catch (browserError) {


          console.error(

            "Browser fallback also failed:",

            browserError

          );

        }

      }



      speaking =
        false;



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
  REPLAY
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

      speed:
        latestRequest.speed

    });

  }



  /*
  ==================================================
  STATE HELPERS
  ==================================================
  */

  function isSpeaking() {

    return speaking;

  }



  function getCurrentRequest() {

    return latestRequest
      ? {
          ...latestRequest
        }
      : null;

  }



  function getLatestResult() {

    return latestResult
      ? {
          ...latestResult
        }
      : null;

  }



  /*
  ==================================================
  CACHE
  ==================================================
  */

  function clearCache() {

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

  }



  function getCacheSize() {

    return audioCache.size;

  }



  /*
  ==================================================
  CLEAN UP
  ==================================================
  */

  window.addEventListener(

    "beforeunload",

    clearCache

  );



  /*
  ==================================================
  PUBLIC API
  ==================================================
  */

  global.ConversateAudio =
    Object.freeze({


      /*
      Audio
      */

      play:
        play,

      stop:
        stop,

      replay:
        replay,



      /*
      Speed
      */

      setSpeed:
        setSpeed,

      getSpeed:
        getSpeed,



      /*
      Languages / voices
      */

      getVoiceProfile:
        getVoiceProfile,

      getLanguageCode:
        getLanguageCode,

      getPreferredVoice:
        getPreferredVoice,

      getVoiceTier:
        getVoiceTier,

      getPreferredEngine:
        getPreferredEngine,

      isLanguageSupported:
        isLanguageSupported,

      getSupportedLanguages:
        getSupportedLanguages,



      /*
      State
      */

      isSpeaking:
        isSpeaking,

      getCurrentRequest:
        getCurrentRequest,

      getLatestResult:
        getLatestResult,



      /*
      Cache
      */

      clearCache:
        clearCache,

      getCacheSize:
        getCacheSize

    });



})(window);