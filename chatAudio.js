(function (global) {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO
  CHAT AUDIO CONTROLLER
  ==================================================

  FEATURES

  1. New Conversation Partner messages
     automatically speak.

  2. Every real chat sentence gets
     its own 🔊 button.

  3. Every Option sentence gets
     its own 🔊 button.

  4. Clicking the chat itself remains free
     for Options / other existing behaviour.

  5. Global 🔊 button opens speed slider.

  6. Speed is remembered in localStorage.

  ==================================================
  */


  const CHAT_CONTAINER_ID =
    "chat_page_id";


  const SPEED_STORAGE_KEY =
    "conversate_audio_speed";


  let autoPlayEnabled =
    true;


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
  BASIC HELPERS
  ==================================================
  */

  function getChatContainer() {

    return document.getElementById(
      CHAT_CONTAINER_ID
    );

  }



  /*
  ==================================================
  PRACTICE LANGUAGE
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
    Fallback.
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
  MAIN REAL CHAT SENTENCE
  ==================================================

  We use this when detecting the real
  newly-created Conversation Partner chat.

  Option sentences may also use
  .translation_sentence, but they do not
  count as real messages.
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

      Array
        .from(
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
  GET PRACTICE-LANGUAGE TEXT
  ==================================================

  Example:

  marhaban
  مرحبًا
  Hello

  kayfa
  كيف
  how


  Audio receives only:

  مرحبًا كيف
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

      Array
        .from(
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
    Languages where spaces between generated
    segments are normally inappropriate.
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
    Remove unwanted spaces around punctuation.
    */

    text =

      text

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
  IS CONVERSATION PARTNER?
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



    if (
      speakerText ===
      "conversation partner"
    ) {

      return true;

    }



    /*
    Current Conversate Pro AI messages
    are on the left.
    */

    return row
      .classList
      .contains(
        "left"
      );

  }



  /*
  ==================================================
  VISUAL STATE
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
  PLAY A SENTENCE
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



    if (

      !global.ConversateAudio

      ||

      typeof global
        .ConversateAudio
        .play !==
        "function"

    ) {

      console.error(
        "audio.js must be loaded before chatAudio.js."
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
        "No practice-language text found."
      );


      return null;

    }



    if (
      !language
    ) {

      console.warn(
        "Practice language could not be determined."
      );


      return null;

    }



    clearAudioClasses();


    activeSentence =
      sentence;


    sentence.classList.add(
      "audio_loading"
    );



    try {

      return await global
        .ConversateAudio
        .play({

          text:
            text,

          language:
            language

        });


    } catch (error) {

      sentence.classList.remove(
        "audio_loading"
      );


      sentence.classList.add(
        "audio_error"
      );


      console.warn(

        settings.automatic

          ? "Automatic audio could not play:"
          : "Audio could not play:",

        error

      );


      return null;

    }

  }



  /*
  ==================================================
  AUDIO BUTTON CLICK
  ==================================================

  IMPORTANT:

  The event listener lives DIRECTLY on
  the 🔊 button.

  This means stopPropagation() happens
  before the parent AI sentence sees
  the click.

  Therefore:

  Click chat
      → Options

  Click 🔊
      → Audio only
  ==================================================
  */

  function handleAudioButtonClick(
    event
  ) {

    event.preventDefault();


    event.stopPropagation();



    const button =
      event.currentTarget;



    const sentence =

      button.closest(
        ".translation_sentence"
      );



    playSentence(

      sentence,

      {

        automatic:
          false

      }

    );

  }



  /*
  ==================================================
  CREATE 🔊 BUTTON
  ==================================================
  */

  function addAudioButton(
    sentence
  ) {

    if (
      !sentence
    ) {

      return;

    }



    /*
    Already created.
    */

    if (
      sentence.querySelector(
        ":scope > .chat_audio_button"
      )
    ) {

      return;

    }



    sentence.classList.add(
      "audio_enabled"
    );



    const button =

      document.createElement(
        "button"
      );



    button.type =
      "button";


    button.className =
      "chat_audio_button";


    button.innerHTML =
      "🔊";


    button.title =
      "Play audio";


    button.setAttribute(
      "aria-label",
      "Play audio"
    );



    /*
    Direct listener is important.

    It prevents the parent AI message
    from opening Options when 🔊 is clicked.
    */

    button.addEventListener(

      "click",

      handleAudioButtonClick

    );



    sentence.appendChild(
      button
    );

  }



  /*
  ==================================================
  DECORATE ALL SENTENCES
  ==================================================

  THIS IS THE MAJOR CHANGE.

  Previously only real chat messages
  got an audio control.

  Now ALL translation_sentence elements
  inside the conversation receive 🔊.

  That includes:

  ✓ Conversation Partner
  ✓ User
  ✓ Option 1
  ✓ Option 2
  ✓ Option 3

  Teach text is plain explanatory text,
  so it is not automatically decorated.
  ==================================================
  */

  function decorateAllSentences() {

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

          addAudioButton(
            sentence
          );

        }

      );

  }



  /*
  ==================================================
  AUTOMATIC AI SPEECH
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
    Only AI / Conversation Partner messages.
    */

    if (
      !isConversationPartnerRow(
        lastRow
      )
    ) {

      return;

    }



    const bubble =

      Array
        .from(
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
  CHAT STATE
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
    This also detects newly generated
    Option sentences.
    */

    decorateAllSentences();



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
    INITIAL LOAD

    Existing chats should NOT suddenly
    start speaking after page refresh.
    ==================================================
    */

    if (
      !initialized
    ) {


      if (
        rows.length > 0
      ) {

        previousMessageCount =
          rows.length;


        initialized =
          true;


        return;

      }



      if (
        emptyChat
      ) {

        previousMessageCount =
          0;


        initialized =
          true;


        return;

      }



      return;

    }



    const currentCount =
      rows.length;



    /*
    Real new message was added.
    */

    if (
      currentCount >
      previousMessageCount
    ) {

      autoPlayLastPartnerMessage(
        rows
      );

    }



    previousMessageCount =
      currentCount;

  }



  /*
  ==================================================
  MUTATION SCHEDULER
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
  OBSERVER
  ==================================================

  Automatically sees:

  new messages
  options
  rerenders
  edited messages
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



    scheduleProcessing();


    return true;

  }



  /*
  ==================================================
  AUDIO EVENTS
  ==================================================
  */

  function setupAudioEvents() {


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



    document.addEventListener(

      "conversate-audio-stop",

      function() {

        clearAudioClasses();


        activeSentence =
          null;

      }

    );



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
  SPEED CONTROL
  ==================================================
  */


  function loadSavedSpeed() {

    if (
      !global.ConversateAudio
    ) {

      return;

    }



    const saved =

      localStorage.getItem(
        SPEED_STORAGE_KEY
      );



    if (
      saved === null
    ) {

      return;

    }



    const number =
      Number(
        saved
      );



    if (
      Number.isFinite(
        number
      )
    ) {

      global
        .ConversateAudio
        .setSpeed(
          number
        );

    }

  }



  /*
  ==================================================
  CREATE SPEED UI
  ==================================================

             🔊
              ↓
        ┌───────────────┐
        │ Speech speed  │
        │  ─────●────   │
        │     0.90×     │
        └───────────────┘
  ==================================================
  */

  function createSpeedControl() {


    if (
      document.getElementById(
        "chat_audio_settings"
      )
    ) {

      return;

    }



    const wrapper =

      document.createElement(
        "div"
      );


    wrapper.id =
      "chat_audio_settings";


    wrapper.className =
      "chat_audio_settings";



    /*
    Main button.
    */

    const button =

      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.id =
      "chat_audio_speed_button";


    button.className =
      "chat_audio_speed_button";


    button.innerHTML =
      "🔊";


    button.title =
      "Audio speed";


    button.setAttribute(
      "aria-label",
      "Audio speed"
    );



    /*
    Panel.
    */

    const panel =

      document.createElement(
        "div"
      );


    panel.id =
      "chat_audio_speed_panel";


    panel.className =
      "chat_audio_speed_panel";


    panel.hidden =
      true;



    const title =

      document.createElement(
        "div"
      );


    title.className =
      "chat_audio_speed_title";


    title.textContent =
      "Speech speed";



    /*
    Value text.
    */

    const value =

      document.createElement(
        "span"
      );


    value.className =
      "chat_audio_speed_value";



    /*
    Slider.
    */

    const slider =

      document.createElement(
        "input"
      );


    slider.type =
      "range";


    slider.min =
      "0.50";


    slider.max =
      "1.50";


    slider.step =
      "0.05";


    slider.className =
      "chat_audio_speed_slider";



    const currentSpeed =

      global.ConversateAudio
        ?.getSpeed?.()

      ||

      0.9;



    slider.value =
      String(
        currentSpeed
      );


    value.textContent =

      Number(
        currentSpeed
      ).toFixed(2)

      +

      "×";



    /*
    Useful labels.
    */

    const labels =

      document.createElement(
        "div"
      );


    labels.className =
      "chat_audio_speed_labels";


    labels.innerHTML =

      "<span>Slow</span>" +

      "<span>Normal</span>" +

      "<span>Fast</span>";



    /*
    Slider changes global audio speed.
    */

    slider.addEventListener(

      "input",

      function() {

        const newSpeed =

          Number(
            slider.value
          );



        if (
          global.ConversateAudio
        ) {

          global
            .ConversateAudio
            .setSpeed(
              newSpeed
            );

        }



        value.textContent =

          newSpeed.toFixed(
            2
          )

          +

          "×";



        localStorage.setItem(

          SPEED_STORAGE_KEY,

          String(
            newSpeed
          )

        );

      }

    );



    /*
    Toggle panel.
    */

    button.addEventListener(

      "click",

      function(event) {

        event.stopPropagation();


        panel.hidden =
          !panel.hidden;

      }

    );



    /*
    Prevent click inside panel from
    closing itself.
    */

    panel.addEventListener(

      "click",

      function(event) {

        event.stopPropagation();

      }

    );



    /*
    Click elsewhere closes panel.
    */

    document.addEventListener(

      "click",

      function() {

        panel.hidden =
          true;

      }

    );



    panel.appendChild(
      title
    );


    panel.appendChild(
      value
    );


    panel.appendChild(
      slider
    );


    panel.appendChild(
      labels
    );


    wrapper.appendChild(
      button
    );


    wrapper.appendChild(
      panel
    );


    document.body.appendChild(
      wrapper
    );

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



  /*
  ==================================================
  MANUAL REFRESH
  ==================================================
  */

  function refresh() {

    decorateAllSentences();


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
        "ConversateChatAudio: #chat_page_id not found."
      );


      return false;

    }



    if (
      !global.ConversateAudio
    ) {

      console.warn(
        "Load audio.js before chatAudio.js."
      );

    }



    /*
    Apply remembered speed.
    */

    loadSavedSpeed();



    /*
    Add global speed control.
    */

    createSpeedControl();



    /*
    Audio visual events.
    */

    setupAudioEvents();



    /*
    Watch messages and Options.
    */

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

      init:
        init,


      playSentence:
        playSentence,


      extractPracticeText:
        extractPracticeText,


      getPracticeLanguage:
        getPracticeLanguage,


      setAutoPlay:
        setAutoPlay,


      getAutoPlay:
        getAutoPlay,


      refresh:
        refresh

    });



  /*
  ==================================================
  AUTO INITIALIZE
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