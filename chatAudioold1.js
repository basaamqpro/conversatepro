(function (global) {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO
  CHAT AUDIO CONTROLLER
  ==================================================

  RESPONSIBILITY:

  Existing chat UI
        ↓
  find practice-language text
        ↓
  ConversateAudio.play(...)
        ↓
  Google / browser TTS


  IMPORTANT:

  This file does NOT:

  - call Google directly
  - contain API keys
  - save anything to Firestore
  - translate anything
  - modify results5.js
  - modify interactPlus.js

  ==================================================
  */


  const CHAT_CONTAINER_ID =
    "chat_page_id";


  /*
  ==================================================
  SETTINGS
  ==================================================
  */


  /*
  Automatically speak NEW
  Conversation Partner messages.
  */

  let autoPlayEnabled =
    true;


  /*
  Clicking a real chat bubble
  speaks the message.
  */

  let clickToPlayEnabled =
    true;



  /*
  ==================================================
  STATE
  ==================================================
  */

  let observer =
    null;


  let initialized =
    false;


  let previousMessageCount =
    0;


  let activeSentence =
    null;


  let processScheduled =
    false;



  /*
  ==================================================
  GET CHAT CONTAINER
  ==================================================
  */

  function getChatContainer() {

    return document.getElementById(
      CHAT_CONTAINER_ID
    );

  }



  /*
  ==================================================
  TARGET / PRACTICE LANGUAGE
  ==================================================

  index.html already displays:

  English → Arabic

  inside:

  #roomLanguages

  So we use the language after →.

  Fallback:
  #targetLang
  ==================================================
  */

  function getPracticeLanguage() {

    const roomLanguages =

      document.getElementById(
        "roomLanguages"
      );


    if (
      roomLanguages
    ) {

      const text =

        String(
          roomLanguages.textContent || ""
        ).trim();


      if (
        text.includes("→")
      ) {

        const parts =
          text.split("→");


        const target =

          String(
            parts[
              parts.length - 1
            ] || ""
          ).trim();


        if (
          target
        ) {

          return target;

        }

      }

    }



    /*
    Fallback to composer target language.
    */

    const targetSelect =

      document.getElementById(
        "targetLang"
      );


    return String(

      targetSelect?.value ||

      ""

    ).trim();

  }



  /*
  ==================================================
  GET DIRECT MESSAGE SENTENCE
  ==================================================

  A message bubble contains:

  speaker
  translation_sentence
  actions
  options panel

  Options themselves also contain
  translation_sentence elements.

  We ONLY want the real chat message,
  not an Option sentence.
  ==================================================
  */

  function getMainSentence(
    bubble
  ) {

    if (
      !bubble
    ) {

      return null;

    }


    return (

      Array.from(
        bubble.children
      )

        .find(

          function(child) {

            return child
              .classList
              ?.contains(
                "translation_sentence"
              );

          }

        )

      ||

      null

    );

  }



  /*
  ==================================================
  EXTRACT PRACTICE-LANGUAGE TEXT
  ==================================================

  Example DOM:

  marhaban
  مرحبًا
  Hi

  kayfa
  كيف
  how

  haluka
  حالك
  are you


  We extract ONLY:

  مرحبًا
  كيف
  حالك

  and build:

  مرحبًا كيف حالك


  We DO NOT speak:

  pronunciation
  English/source meaning
  ==================================================
  */

  function extractPracticeText(
    sentence
  ) {

    if (
      !sentence
    ) {

      return "";

    }



    const groups =

      Array.from(
        sentence.children
      )

        .filter(

          function(child) {

            return child
              .classList
              ?.contains(
                "translation_group"
              );

          }

        );



    const pieces =

      groups

        .map(

          function(group) {

            const translation =

              group.querySelector(
                ".group_translation"
              );


            return String(

              translation?.textContent ||

              ""

            ).trim();

          }

        )

        .filter(Boolean);



    if (
      !pieces.length
    ) {

      return "";

    }



    const language =
      getPracticeLanguage();



    /*
    Chinese/Japanese writing normally
    does not need spaces between these
    generated segments.

    For most other languages, spaces
    are appropriate.
    */

    const noSpaceLanguages = [

      "Japanese",

      "Mandarin Chinese",

      "Cantonese"

    ];



    let text =

      pieces.join(

        noSpaceLanguages.includes(
          language
        )

          ? ""

          : " "

      );



    /*
    ==================================================
    PUNCTUATION CLEANUP
    ==================================================

    Example:

    مرحبًا ، كيف حالك ؟

    becomes:

    مرحبًا، كيف حالك؟
    ==================================================
    */

    text = text

      .replace(

        /\s+([,.!?;:،؛؟。！？，、])/g,

        "$1"

      )

      .replace(

        /([([{«“‘])\s+/g,

        "$1"

      )

      .replace(

        /\s+([)\]}»”’])/g,

        "$1"

      )

      .replace(

        /\s+/g,

        " "

      )

      .trim();



    return text;

  }



  /*
  ==================================================
  CONVERSATION PARTNER?
  ==================================================
  */

  function isConversationPartnerRow(
    row
  ) {

    if (
      !row
    ) {

      return false;

    }



    const speaker =

      row.querySelector(
        ".speaker_label"
      );



    const speakerText =

      String(

        speaker?.textContent ||

        ""

      )

        .trim()

        .toLowerCase();



    /*
    Exact label used by the
    Conversate Pro index.html.
    */

    if (
      speakerText ===
      "conversation partner"
    ) {

      return true;

    }



    /*
    Fallback because AI messages
    are displayed on the left.
    */

    return row
      .classList
      .contains(
        "left"
      );

  }



  /*
  ==================================================
  CLEAR AUDIO VISUAL STATE
  ==================================================
  */

  function clearAudioClasses() {

    const container =
      getChatContainer();


    if (
      !container
    ) {

      return;

    }



    container

      .querySelectorAll(
        ".translation_sentence"
      )

      .forEach(

        function(sentence) {

          sentence.classList.remove(

            "audio_loading",

            "audio_playing",

            "audio_error"

          );

        }

      );

  }



  /*
  ==================================================
  AUDIO ICON
  ==================================================

  Adds:

  🔊

  to real chat messages only.

  CSS in index.html controls appearance.
  ==================================================
  */

  function addAudioIndicator(
    sentence
  ) {

    if (
      !sentence
    ) {

      return;

    }



    sentence.classList.add(
      "audio_enabled"
    );



    /*
    Already added.
    */

    if (
      sentence.querySelector(
        ":scope > .chat_audio_icon"
      )
    ) {

      return;

    }



    const icon =
      document.createElement(
        "span"
      );


    icon.className =
      "chat_audio_icon";


    icon.textContent =
      "🔊";


    icon.setAttribute(
      "aria-hidden",
      "true"
    );


    sentence.appendChild(
      icon
    );

  }



  /*
  ==================================================
  DECORATE REAL CHAT MESSAGES
  ==================================================
  */

  function decorateMessages() {

    const container =
      getChatContainer();


    if (
      !container
    ) {

      return;

    }



    const rows =

      container.querySelectorAll(
        ".message_row"
      );



    rows.forEach(

      function(row) {

        const bubble =

          Array.from(
            row.children
          )

            .find(

              function(child) {

                return child
                  .classList
                  ?.contains(
                    "message_bubble"
                  );

              }

            );


        if (
          !bubble
        ) {

          return;

        }


        const sentence =

          getMainSentence(
            bubble
          );


        if (
          sentence
        ) {

          addAudioIndicator(
            sentence
          );

        }

      }

    );

  }



  /*
  ==================================================
  PLAY ONE SENTENCE
  ==================================================
  */

  async function playSentence(
    sentence,
    options
  ) {

    const settings =
      options || {};


    if (
      !sentence
    ) {

      return null;

    }



    /*
    Make sure audio.js exists.
    */

    if (

      !global.ConversateAudio

      ||

      typeof global
        .ConversateAudio
        .play !==
        "function"

    ) {

      console.error(
        "ConversateAudio is not available. Load audio.js before chatAudio.js."
      );


      return null;

    }



    const text =

      extractPracticeText(
        sentence
      );



    const language =

      getPracticeLanguage();



    if (
      !text
    ) {

      console.warn(
        "No practice-language text was found in this chat."
      );


      return null;

    }



    if (
      !language
    ) {

      console.warn(
        "Could not determine the practice language."
      );


      return null;

    }



    /*
    ==================================================
    ACTIVE VISUAL MESSAGE
    ==================================================
    */

    clearAudioClasses();


    activeSentence =
      sentence;


    sentence.classList.add(
      "audio_loading"
    );



    try {


      const result =

        await global
          .ConversateAudio
          .play({

            text:
              text,

            language:
              language

          });



      return result;


    } catch (error) {


      /*
      Browser autoplay can occasionally
      reject automatic sound before a
      user gesture.

      Manual click-to-play will still work.
      */

      console.warn(

        settings.automatic

          ? "Automatic chat audio could not play:"
          : "Chat audio could not play:",

        error

      );


      sentence.classList.remove(
        "audio_loading"
      );


      sentence.classList.add(
        "audio_error"
      );


      return null;

    }

  }



  /*
  ==================================================
  PLAY MESSAGE BUBBLE
  ==================================================
  */

  function playBubble(
    bubble
  ) {

    const sentence =

      getMainSentence(
        bubble
      );


    if (
      !sentence
    ) {

      return null;

    }


    return playSentence(

      sentence,

      {

        automatic:
          false

      }

    );

  }



  /*
  ==================================================
  CLICK HANDLER
  ==================================================

  Clicking:

  REAL CHAT BUBBLE
      → speaks


  Clicking:

  Reverse
  Edit
  Delete
  Option
  Use
  Teach
  Ask
  input
      → does NOT trigger chat audio


  IMPORTANT:

  Clicking an AI sentence may ALSO open
  Options because index.html already has
  that behavior.

  Therefore:

  AI chat click
      ↓
  🔊 speak
      +
  show response options

  This matches your Conversate Pro design.
  ==================================================
  */

  function handleChatClick(
    event
  ) {

    if (
      !clickToPlayEnabled
    ) {

      return;

    }



    const target =
      event.target;



    /*
    Ignore controls and learning panels.
    */

    if (

      target.closest(
        [
          ".chat_actions",
          ".message_assist_panel",
          ".option_actions",
          ".teach_box",
          "button",
          "input",
          "textarea",
          "select",
          "a"
        ].join(",")
      )

    ) {

      return;

    }



    const bubble =

      target.closest(
        ".message_bubble"
      );



    if (
      !bubble
    ) {

      return;

    }



    const container =
      getChatContainer();



    if (

      !container

      ||

      !container.contains(
        bubble
      )

    ) {

      return;

    }



    playBubble(
      bubble
    );

  }



  /*
  ==================================================
  AUTO PLAY LATEST AI MESSAGE
  ==================================================
  */

  function autoPlayLastPartnerMessage(
    rows
  ) {

    if (
      !autoPlayEnabled
    ) {

      return;

    }



    if (
      !rows.length
    ) {

      return;

    }



    const lastRow =
      rows[
        rows.length - 1
      ];



    /*
    Only AI / Conversation Partner
    messages auto-play.

    User messages DO NOT auto-play.
    */

    if (
      !isConversationPartnerRow(
        lastRow
      )
    ) {

      return;

    }



    const bubble =

      Array.from(
        lastRow.children
      )

        .find(

          function(child) {

            return child
              .classList
              ?.contains(
                "message_bubble"
              );

          }

        );



    const sentence =

      getMainSentence(
        bubble
      );



    if (
      !sentence
    ) {

      return;

    }



    /*
    Wait one animation frame so the
    translation UI is fully rendered.
    */

    requestAnimationFrame(

      function() {

        playSentence(

          sentence,

          {

            automatic:
              true

          }

        );

      }

    );

  }



  /*
  ==================================================
  PROCESS CHAT STATE
  ==================================================

  We compare MESSAGE COUNTS.

  This works well with your current
  renderChat() architecture.

  EXAMPLE:

  Initial existing conversation:
      7 messages
      → baseline only
      → NO automatic speech


  User sends:
      7 → 8
      last = USER
      → NO auto speech


  AI automatically replies:
      8 → 9
      last = PARTNER
      → 🔊 AUTO SPEAK


  Empty room:
      baseline = 0

  InteractPlus:
      0 → 1
      last = PARTNER
      → 🔊 AUTO SPEAK
  ==================================================
  */

  function processChatState() {

    processScheduled =
      false;



    const container =
      getChatContainer();



    if (
      !container
    ) {

      return;

    }



    /*
    Add audio indicators.
    */

    decorateMessages();



    const rows =

      Array.from(

        container.querySelectorAll(
          ".message_row"
        )

      );



    const emptyChat =

      container.querySelector(
        ".empty_chat"
      );



    /*
    ==================================================
    INITIAL PAGE RENDER
    ==================================================

    If an old conversation already exists,
    do NOT read its latest message aloud
    merely because the page was refreshed.

    We establish a baseline.
    ==================================================
    */

    if (
      !initialized
    ) {


      /*
      Existing conversation loaded.
      */

      if (
        rows.length > 0
      ) {

        previousMessageCount =
          rows.length;


        initialized =
          true;


        return;

      }



      /*
      Empty conversation loaded.

      Baseline is 0.

      Therefore the first InteractPlus
      message will auto-play.
      */

      if (
        emptyChat
      ) {

        previousMessageCount =
          0;


        initialized =
          true;


        return;

      }



      /*
      Page hasn't rendered a conversation
      state yet.
      */

      return;

    }



    const currentCount =
      rows.length;



    /*
    ==================================================
    NEW MESSAGE ADDED
    ==================================================
    */

    if (
      currentCount >
      previousMessageCount
    ) {

      autoPlayLastPartnerMessage(
        rows
      );

    }



    /*
    Update baseline for:

    additions
    deletions
    rerenders
    */

    previousMessageCount =
      currentCount;

  }



  /*
  ==================================================
  SCHEDULE PROCESSING
  ==================================================

  renderChat() can make many DOM mutations.

  We collapse them into one check.
  ==================================================
  */

  function scheduleProcessing() {

    if (
      processScheduled
    ) {

      return;

    }


    processScheduled =
      true;


    requestAnimationFrame(
      processChatState
    );

  }



  /*
  ==================================================
  OBSERVE CHAT
  ==================================================
  */

  function startObserver() {

    const container =
      getChatContainer();



    if (
      !container
    ) {

      return false;

    }



    if (
      observer
    ) {

      observer.disconnect();
    }



    observer =

      new MutationObserver(

        function() {

          scheduleProcessing();

        }

      );



    observer.observe(

      container,

      {

        childList:
          true,

        subtree:
          true

      }

    );



    /*
    Process any content already present.
    */

    scheduleProcessing();


    return true;

  }



  /*
  ==================================================
  AUDIO EVENT HANDLERS
  ==================================================
  */

  function setupAudioEvents() {


    /*
    Audio actually started.
    */

    document.addEventListener(

      "conversate-audio-start",

      function() {


        clearAudioClasses();


        if (
          activeSentence
        ) {

          activeSentence
            .classList
            .add(
              "audio_playing"
            );

        }

      }

    );



    /*
    Finished naturally.
    */

    document.addEventListener(

      "conversate-audio-end",

      function() {


        if (
          activeSentence
        ) {

          activeSentence
            .classList
            .remove(
              "audio_loading",
              "audio_playing"
            );

        }


        activeSentence =
          null;

      }

    );



    /*
    Explicit stop.
    */

    document.addEventListener(

      "conversate-audio-stop",

      function() {

        clearAudioClasses();


        activeSentence =
          null;

      }

    );



    /*
    Playback error.
    */

    document.addEventListener(

      "conversate-audio-error",

      function() {


        if (
          activeSentence
        ) {

          activeSentence
            .classList
            .remove(
              "audio_loading",
              "audio_playing"
            );


          activeSentence
            .classList
            .add(
              "audio_error"
            );

        }


        activeSentence =
          null;

      }

    );

  }



  /*
  ==================================================
  PLAY LATEST PARTNER MESSAGE MANUALLY
  ==================================================
  */

  function playLatestPartnerMessage() {

    const container =
      getChatContainer();


    if (
      !container
    ) {

      return null;

    }



    const rows =

      Array.from(

        container.querySelectorAll(
          ".message_row"
        )

      );



    for (
      let index =
        rows.length - 1;

      index >= 0;

      index--
    ) {

      if (
        isConversationPartnerRow(
          rows[
            index
          ]
        )
      ) {


        const bubble =

          Array.from(
            rows[
              index
            ].children
          )

            .find(

              function(child) {

                return child
                  .classList
                  ?.contains(
                    "message_bubble"
                  );

              }

            );


        return playBubble(
          bubble
        );

      }

    }


    return null;

  }



  /*
  ==================================================
  SETTINGS
  ==================================================
  */

  function setAutoPlay(
    enabled
  ) {

    autoPlayEnabled =
      enabled !== false;


    return autoPlayEnabled;

  }



  function getAutoPlay() {

    return autoPlayEnabled;

  }



  function setClickToPlay(
    enabled
  ) {

    clickToPlayEnabled =
      enabled !== false;


    return clickToPlayEnabled;

  }



  function getClickToPlay() {

    return clickToPlayEnabled;

  }



  /*
  ==================================================
  REFRESH DECORATION
  ==================================================
  */

  function refresh() {

    decorateMessages();


    scheduleProcessing();

  }



  /*
  ==================================================
  INITIALIZE
  ==================================================
  */

  function init() {


    const container =
      getChatContainer();



    if (
      !container
    ) {

      console.warn(
        "ConversateChatAudio: #chat_page_id was not found."
      );


      return false;

    }



    /*
    Audio engine check.
    */

    if (
      !global.ConversateAudio
    ) {

      console.warn(
        "ConversateChatAudio: load audio.js before chatAudio.js."
      );

    }



    /*
    Event delegation.

    Only one click listener is needed,
    even when renderChat recreates messages.
    */

    container.addEventListener(

      "click",

      handleChatClick

    );



    setupAudioEvents();


    startObserver();


    return true;

  }



  /*
  ==================================================
  PUBLIC API
  ==================================================
  */

  global.ConversateChatAudio =
    Object.freeze({

      /*
      Initialization.
      */

      init:
        init,


      /*
      Playback.
      */

      playBubble:
        playBubble,

      playSentence:
        playSentence,

      playLatestPartnerMessage:
        playLatestPartnerMessage,


      /*
      Text extraction.
      */

      extractPracticeText:
        extractPracticeText,

      getPracticeLanguage:
        getPracticeLanguage,


      /*
      Settings.
      */

      setAutoPlay:
        setAutoPlay,

      getAutoPlay:
        getAutoPlay,

      setClickToPlay:
        setClickToPlay,

      getClickToPlay:
        getClickToPlay,


      /*
      UI refresh.
      */

      refresh:
        refresh

    });



  /*
  ==================================================
  AUTOMATIC START
  ==================================================
  */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(

      "DOMContentLoaded",

      init,

      {
        once:
          true
      }

    );

  }

  else {

    init();

  }



})(window);