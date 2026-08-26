(function (global) {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO
  ADD TEACH TO REAL CHAT MESSAGES
  ==================================================

  PURPOSE:

  Every REAL chat message gets:

      [ Teach ]

  This includes:

      ✓ Conversation Partner messages
      ✓ User messages


  EXISTING OPTION TEACH BUTTONS:

      options.js / index.html
              ↓
          teach.js

  NEW CHAT TEACH BUTTONS:

          addTeach.js
              ↓
          teach.js


  IMPORTANT:

  addTeach.js does NOT:

      - call OpenAI directly
      - translate text
      - save Firestore data
      - modify chats
      - modify Options
      - modify audio

  It simply connects real chat messages
  to the existing ConversateTeach engine.

  ==================================================
  */


  const CHAT_CONTAINER_ID =
    "chat_page_id";


  let observer =
    null;


  let processScheduled =
    false;


  let teachLoadPromise =
    null;



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
  ENSURE teach.js EXISTS
  ==================================================

  Your main app already uses teach.js.

  But addTeach.js remains independent.

  If ConversateTeach already exists:
      use it.

  If it has not been loaded yet:
      dynamically load teach.js.

  Therefore the only NEW script you really
  need to add is:

      <script src="addTeach.js"></script>

  ==================================================
  */

  function ensureTeachEngine() {


    if (

      global.ConversateTeach

      &&

      typeof global
        .ConversateTeach
        .explain ===
        "function"

    ) {

      return Promise.resolve(
        global.ConversateTeach
      );

    }



    if (
      teachLoadPromise
    ) {

      return teachLoadPromise;

    }



    teachLoadPromise =

      new Promise(

        function(
          resolve,
          reject
        ) {


          /*
          Check whether teach.js is already
          present in the page.
          */

          const existing =

            Array
              .from(
                document.scripts
              )

              .find(

                function(script) {

                  const src =

                    String(
                      script.src || ""
                    );


                  return (

                    src.endsWith(
                      "/teach.js"
                    )

                    ||

                    src.endsWith(
                      "teach.js"
                    )

                  );

                }

              );



          function checkReady() {


            if (

              global.ConversateTeach

              &&

              typeof global
                .ConversateTeach
                .explain ===
                "function"

            ) {

              resolve(
                global.ConversateTeach
              );


              return true;

            }


            return false;

          }



          /*
          teach.js exists but may still
          be loading.
          */

          if (
            existing
          ) {


            if (
              checkReady()
            ) {

              return;

            }



            existing.addEventListener(

              "load",

              function() {


                if (
                  !checkReady()
                ) {

                  reject(

                    new Error(
                      "teach.js loaded but ConversateTeach was not created."
                    )

                  );

                }

              },

              {
                once:
                  true
              }

            );



            existing.addEventListener(

              "error",

              function() {

                reject(

                  new Error(
                    "Could not load teach.js."
                  )

                );

              },

              {
                once:
                  true
              }

            );


            return;

          }



          /*
          teach.js has not been loaded.
          */

          const script =

            document.createElement(
              "script"
            );


          script.src =
            "teach.js";


          script.async =
            true;



          script.onload =

            function() {


              if (
                !checkReady()
              ) {

                reject(

                  new Error(
                    "teach.js loaded but ConversateTeach was not created."
                  )

                );

              }

            };



          script.onerror =

            function() {

              reject(

                new Error(
                  "Unable to load teach.js."
                )

              );

            };



          document.head.appendChild(
            script
          );

        }

      );



    return teachLoadPromise;

  }



  /*
  ==================================================
  CURRENT ROOM
  ==================================================
  */

  function getCurrentRoom() {


    /*
    Best method:
    use existing firebase.js API.
    */

    if (

      global.ConversateFirebase

      &&

      typeof global
        .ConversateFirebase
        .getCurrentRoom ===
        "function"

    ) {

      const room =

        global
          .ConversateFirebase
          .getCurrentRoom();


      if (
        room
      ) {

        return room;

      }

    }



    /*
    ==================================================
    LOCAL STORAGE FALLBACK
    ==================================================
    */

    try {


      const dataText =

        localStorage.getItem(
          "conversate_user_data"
        );


      const currentRoomText =

        localStorage.getItem(
          "conversate_current_room"
        );



      if (
        !dataText
      ) {

        return null;

      }



      const data =

        JSON.parse(
          dataText
        );



      const rooms =

        Array.isArray(
          data?.rooms
        )

          ? data.rooms

          : [];



      if (
        !rooms.length
      ) {

        return null;

      }



      let currentRoomIdx =
        currentRoomText;



      /*
      current room may have been stored
      as JSON.
      */

      try {

        const parsed =

          JSON.parse(
            currentRoomText
          );


        if (
          typeof parsed ===
          "string"
        ) {

          currentRoomIdx =
            parsed;

        }

        else if (
          parsed?.room_idx
        ) {

          currentRoomIdx =
            parsed.room_idx;

        }

      }

      catch (error) {

        /*
        Plain string is perfectly okay.
        */

      }



      return (

        rooms.find(

          function(room) {

            return (

              String(
                room.room_idx
              )

              ===

              String(
                currentRoomIdx
              )

            );

          }

        )

        ||

        null

      );


    } catch (error) {


      console.warn(

        "addTeach.js could not read current room:",

        error

      );


      return null;

    }

  }



  /*
  ==================================================
  GET REAL MESSAGE BUBBLE
  ==================================================
  */

  function getMessageBubble(
    row
  ) {

    if (
      !row
    ) {

      return null;

    }



    return (

      Array
        .from(
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

        )

      ||

      row.querySelector(
        ".message_bubble"
      )

      ||

      null

    );

  }



  /*
  ==================================================
  GET MAIN TRANSLATION SENTENCE
  ==================================================

  We only want the REAL message sentence.

  We do not want an Option sentence that
  happens to be nested somewhere inside
  the AI message.

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
  GET CHAT FOR MESSAGE ROW
  ==================================================

  BEST CASE:

      row.dataset.chatIdx

  FALLBACK:

      message row position corresponds with
      room.room_data position.

  Your current renderChat() renders real
  room messages in their conversation order,
  so this gives us a clean independent
  connection without changing index.html.

  ==================================================
  */

  function getChatForRow(
    row
  ) {

    const room =
      getCurrentRoom();


    if (
      !room
    ) {

      return null;

    }



    const chats =

      Array.isArray(
        room.room_data
      )

        ? room.room_data

        : [];



    if (
      !chats.length
    ) {

      return null;

    }



    /*
    ==================================================
    TRY CHAT ID FIRST
    ==================================================
    */

    const bubble =

      getMessageBubble(
        row
      );


    const sentence =

      getMainSentence(
        bubble
      );



    const possibleChatIdx =

      row?.dataset?.chatIdx

      ||

      bubble?.dataset?.chatIdx

      ||

      sentence?.dataset?.chatIdx

      ||

      "";



    if (
      possibleChatIdx
    ) {

      const found =

        chats.find(

          function(chat) {

            return (

              String(
                chat.chat_idx
              )

              ===

              String(
                possibleChatIdx
              )

            );

          }

        );


      if (
        found
      ) {

        return found;

      }

    }



    /*
    ==================================================
    FALLBACK TO ROW POSITION
    ==================================================
    */

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



    const rowIndex =

      rows.indexOf(
        row
      );



    if (

      rowIndex < 0

      ||

      rowIndex >= chats.length

    ) {

      return null;

    }



    return chats[
      rowIndex
    ];

  }



  /*
  ==================================================
  CLEAN TEXT
  ==================================================
  */

  function cleanText(
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
  JOIN FLOW
  ==================================================
  */

  function flowToText(
    flow,
    property,
    language
  ) {

    if (
      !Array.isArray(
        flow
      )
    ) {

      return "";

    }



    const pieces =

      flow

        .map(

          function(item) {

            return cleanText(
              item?.[
                property
              ]
            );

          }

        )

        .filter(Boolean);



    if (
      !pieces.length
    ) {

      return "";

    }



    const noSpaceLanguages = [

      "Japanese",

      "Mandarin Chinese",

      "Cantonese"

    ];



    let result =

      pieces.join(

        noSpaceLanguages.includes(
          language
        )

          ? ""

          : " "

      );



    /*
    Punctuation cleanup.
    */

    result =

      result

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



    return result;

  }



  /*
  ==================================================
  BUILD CHAT TEACH ITEM
  ==================================================

  teach.js originally receives an Option.

  We create an Option-like teaching object
  from the real chat.

  This means:

  teach.js itself does not need modification.

  ==================================================
  */

  function createChatTeachItem(
    room,
    chat
  ) {


    const targetFlow =

      chat?.target_flow

      ||

      chat?.targetFlow

      ||

      [];



    const sourceFlow =

      chat?.source_flow

      ||

      chat?.sourceFlow

      ||

      [];



    const sourceLanguage =

      chat?.source_language

      ||

      room?.source_language

      ||

      "";



    const targetLanguage =

      chat?.target_language

      ||

      room?.target_language

      ||

      "";



    /*
    ==================================================
    SOURCE / HELPER-LANGUAGE MEANING
    ==================================================
    */


    let sourceText =

      cleanText(

        chat
          ?.interpreted_source_text

      )

      ||

      cleanText(

        chat
          ?.interaction_text

      )

      ||

      cleanText(

        chat
          ?.prompts_and_answers
          ?.[0]
          ?.user_prompt

      )

      ||

      flowToText(

        sourceFlow,

        "source",

        sourceLanguage

      );



    /*
    ==================================================
    PRACTICE-LANGUAGE SENTENCE
    ==================================================
    */


    let targetText =

      cleanText(

        chat
          ?.interpreted_target_text

      )

      ||

      flowToText(

        targetFlow,

        "target",

        targetLanguage

      )

      ||

      flowToText(

        sourceFlow,

        "target",

        targetLanguage

      );



    /*
    ==================================================
    PRONUNCIATION
    ==================================================
    */

    const pronunciation =

      flowToText(

        targetFlow,

        "pronunciation",

        sourceLanguage

      );



    return {


      /*
      Unique identity for teach.js cache.

      Chat teaching should not collide
      with option_1 / option_2 / etc.
      */

      option_idx:

        "real_chat_" +

        String(
          chat?.chat_idx ||
          Date.now()
        ),



      /*
      Standard aliases expected by
      ConversateTeach.
      */

      text:
        sourceText,


      sourceText:
        sourceText,


      source_text:
        sourceText,


      targetText:
        targetText,


      target_text:
        targetText,


      useText:
        targetText,


      pronunciation:
        pronunciation,


      targetFlow:
        targetFlow,


      target_flow:
        targetFlow,


      sourceFlow:
        sourceFlow,


      source_flow:
        sourceFlow,


      groups:
        chat?.groups || [],


      sourceLanguage:
        sourceLanguage,


      targetLanguage:
        targetLanguage,


      chatIdx:
        chat?.chat_idx,


      /*
      Helpful identifier if we ever
      inspect the teaching object.
      */

      teachingSource:
        "real_chat"

    };

  }



  /*
  ==================================================
  GET TEXT FROM TEACH RESULT
  ==================================================

  This is deliberately tolerant because
  teach.js may return:

      string

  or:

      {
        explanation: "..."
      }

  or:

      {
        answer: "..."
      }

  ==================================================
  */

  function getResultText(
    result,
    mode
  ) {

    if (
      typeof result ===
      "string"
    ) {

      return cleanText(
        result
      );

    }



    if (
      !result
    ) {

      return "";

    }



    /*
    For questions, prefer answer fields.
    */

    if (
      mode ===
      "question"
    ) {

      const directAnswer =

        result.answer

        ||

        result.response

        ||

        result.reply

        ||

        result.text;



      if (
        directAnswer
      ) {

        return String(
          directAnswer
        ).trim();

      }



      /*
      teach.js stored format:

      questions: [
        {
          question,
          answer
        }
      ]
      */

      if (

        Array.isArray(
          result.questions
        )

        &&

        result.questions.length

      ) {

        const lastQuestion =

          result.questions[
            result.questions.length - 1
          ];


        if (
          lastQuestion?.answer
        ) {

          return String(
            lastQuestion.answer
          ).trim();

        }

      }

    }



    /*
    Initial teaching explanation.
    */

    const explanation =

      result.explanation

      ||

      result.teaching

      ||

      result.answer

      ||

      result.response

      ||

      result.text

      ||

      result.message;



    if (
      explanation
    ) {

      return String(
        explanation
      ).trim();

    }



    /*
    Some implementations wrap result.
    */

    if (
      result.result
    ) {

      return getResultText(

        result.result,

        mode

      );

    }



    if (
      result.data
    ) {

      return getResultText(

        result.data,

        mode

      );

    }



    return "";

  }



  /*
  ==================================================
  CREATE TEACH PANEL
  ==================================================
  */

  function createTeachPanel(
    row,
    bubble
  ) {


    const panel =

      document.createElement(
        "div"
      );


    panel.className =
      "chat_teach_panel";


    panel.hidden =
      true;



    /*
    Prevent any parent chat click behavior.
    */

    panel.addEventListener(

      "click",

      function(event) {

        event.stopPropagation();

      }

    );



    /*
    ==================================================
    HEADER
    ==================================================
    */

    const header =

      document.createElement(
        "div"
      );


    header.className =
      "chat_teach_header";



    const title =

      document.createElement(
        "strong"
      );


    title.textContent =
      "Teach";



    const closeButton =

      document.createElement(
        "button"
      );


    closeButton.type =
      "button";


    closeButton.className =
      "chat_teach_close";


    closeButton.textContent =
      "×";


    closeButton.setAttribute(
      "aria-label",
      "Close Teach"
    );



    closeButton.addEventListener(

      "click",

      function(event) {

        event.preventDefault();

        event.stopPropagation();


        panel.hidden =
          true;

      }

    );



    header.appendChild(
      title
    );


    header.appendChild(
      closeButton
    );



    /*
    ==================================================
    STATUS
    ==================================================
    */

    const status =

      document.createElement(
        "div"
      );


    status.className =
      "chat_teach_status";


    status.hidden =
      true;



    /*
    ==================================================
    EXPLANATION
    ==================================================
    */

    const explanation =

      document.createElement(
        "div"
      );


    explanation.className =
      "chat_teach_explanation";



    /*
    ==================================================
    QUESTIONS / ANSWERS
    ==================================================
    */

    const questions =

      document.createElement(
        "div"
      );


    questions.className =
      "chat_teach_questions";



    /*
    ==================================================
    ASK FORM
    ==================================================
    */

    const form =

      document.createElement(
        "form"
      );


    form.className =
      "chat_teach_form";



    const input =

      document.createElement(
        "input"
      );


    input.type =
      "text";


    input.className =
      "chat_teach_input";


    input.placeholder =
      "Ask about this sentence...";


    input.autocomplete =
      "off";



    const askButton =

      document.createElement(
        "button"
      );


    askButton.type =
      "submit";


    askButton.className =
      "chat_teach_ask";


    askButton.textContent =
      "Ask";



    form.appendChild(
      input
    );


    form.appendChild(
      askButton
    );



    panel.appendChild(
      header
    );


    panel.appendChild(
      status
    );


    panel.appendChild(
      explanation
    );


    panel.appendChild(
      questions
    );


    panel.appendChild(
      form
    );



    /*
    ==================================================
    PANEL HELPERS
    ==================================================
    */

    panel._teachElements = {

      status:
        status,

      explanation:
        explanation,

      questions:
        questions,

      form:
        form,

      input:
        input,

      askButton:
        askButton

    };



    bubble.appendChild(
      panel
    );


    return panel;

  }



  /*
  ==================================================
  STATUS DISPLAY
  ==================================================
  */

  function setPanelStatus(
    panel,
    message
  ) {

    const status =
      panel?._teachElements?.status;


    if (
      !status
    ) {

      return;

    }



    const text =

      typeof message ===
      "string"

        ? message

        : message?.message
          || message?.status
          || "";



    if (
      !text
    ) {

      status.hidden =
        true;


      status.textContent =
        "";


      return;

    }



    status.hidden =
      false;


    status.textContent =
      text;

  }



  /*
  ==================================================
  ADD QUESTION/ANSWER TO PANEL
  ==================================================
  */

  function appendQuestionAnswer(
    panel,
    question,
    answer
  ) {

    const container =

      panel
        ?._teachElements
        ?.questions;


    if (
      !container
    ) {

      return;

    }



    const item =

      document.createElement(
        "div"
      );


    item.className =
      "chat_teach_qa";



    const questionElement =

      document.createElement(
        "div"
      );


    questionElement.className =
      "chat_teach_question";


    questionElement.textContent =

      "You: " +

      question;



    const answerElement =

      document.createElement(
        "div"
      );


    answerElement.className =
      "chat_teach_answer";


    answerElement.textContent =
      answer;



    item.appendChild(
      questionElement
    );


    item.appendChild(
      answerElement
    );


    container.appendChild(
      item
    );

  }



  /*
  ==================================================
  LOAD INITIAL TEACHING
  ==================================================
  */

  async function loadTeaching(
    row,
    panel
  ) {


    /*
    Already loaded.
    */

    if (
      panel.dataset.loaded ===
      "true"
    ) {

      return;

    }



    /*
    Prevent duplicate request.
    */

    if (
      panel.dataset.loading ===
      "true"
    ) {

      return;

    }



    panel.dataset.loading =
      "true";



    const room =
      getCurrentRoom();


    const chat =
      getChatForRow(
        row
      );



    if (
      !room
      ||
      !chat
    ) {

      setPanelStatus(

        panel,

        "Could not identify this chat message."

      );


      panel.dataset.loading =
        "false";


      return;

    }



    try {


      const teach =

        await ensureTeachEngine();



      const teachItem =

        createChatTeachItem(

          room,

          chat

        );



      setPanelStatus(

        panel,

        "Preparing explanation..."

      );



      const result =

        await teach.explain({

          room:
            room,

          chat:
            chat,

          option:
            teachItem,

          question:
            "",


          onStatus:

            function(status) {

              setPanelStatus(
                panel,
                status
              );

            }

        });



      const explanationText =

        getResultText(

          result,

          "explanation"

        );



      if (
        explanationText
      ) {

        panel
          ._teachElements
          .explanation
          .textContent =
            explanationText;

      }

      else {

        panel
          ._teachElements
          .explanation
          .textContent =
            "No explanation was returned.";

      }



      setPanelStatus(
        panel,
        ""
      );



      panel.dataset.loaded =
        "true";



      /*
      ==================================================
      ASK QUESTIONS
      ==================================================
      */

      if (
        panel.dataset.formReady !==
        "true"
      ) {

        setupQuestionForm(

          row,

          panel,

          room,

          chat,

          teachItem

        );


        panel.dataset.formReady =
          "true";

      }



    } catch (error) {


      console.error(

        "Chat Teach Error:",

        error

      );


      setPanelStatus(

        panel,

        error.message ||
        "Teaching explanation could not be generated."

      );

    }

    finally {

      panel.dataset.loading =
        "false";

    }

  }



  /*
  ==================================================
  QUESTION FORM
  ==================================================
  */

  function setupQuestionForm(
    row,
    panel,
    room,
    chat,
    teachItem
  ) {

    const elements =
      panel._teachElements;



    elements.form.addEventListener(

      "submit",

      async function(event) {


        event.preventDefault();

        event.stopPropagation();



        const question =

          cleanText(
            elements.input.value
          );



        if (
          !question
        ) {

          return;

        }



        elements.input.disabled =
          true;


        elements.askButton.disabled =
          true;



        setPanelStatus(

          panel,

          "Thinking..."

        );



        try {


          const teach =

            await ensureTeachEngine();



          const result =

            await teach.explain({

              room:
                room,

              chat:
                chat,

              option:
                teachItem,

              question:
                question,


              onStatus:

                function(status) {

                  setPanelStatus(

                    panel,

                    status

                  );

                }

            });



          const answer =

            getResultText(

              result,

              "question"

            );



          appendQuestionAnswer(

            panel,

            question,

            answer ||

            "No answer was returned."

          );



          elements.input.value =
            "";



          setPanelStatus(
            panel,
            ""
          );



        } catch (error) {


          console.error(

            "Teach question error:",

            error

          );


          setPanelStatus(

            panel,

            error.message ||

            "The question could not be answered."

          );

        }

        finally {


          elements.input.disabled =
            false;


          elements.askButton.disabled =
            false;


          elements.input.focus();

        }

      }

    );

  }



  /*
  ==================================================
  TEACH BUTTON CLICK
  ==================================================
  */

  function handleTeachClick(
    event
  ) {


    /*
    CRITICAL:

    Do NOT allow this click to reach the
    AI chatbox click handler.

    Therefore Teach does NOT open Options.
    */

    event.preventDefault();

    event.stopPropagation();



    const button =
      event.currentTarget;



    const row =

      button.closest(
        ".message_row"
      );


    const bubble =

      button.closest(
        ".message_bubble"
      );



    if (
      !row
      ||
      !bubble
    ) {

      return;

    }



    let panel =

      bubble.querySelector(
        ":scope > .chat_teach_panel"
      );



    if (
      !panel
    ) {

      panel =

        createTeachPanel(

          row,

          bubble

        );

    }



    /*
    Toggle existing open panel.
    */

    if (
      panel.hidden ===
      false
    ) {

      panel.hidden =
        true;


      return;

    }



    panel.hidden =
      false;



    /*
    Generate only the first time.

    teach.js itself also has localStorage
    caching, so reopening is efficient.
    */

    loadTeaching(

      row,

      panel

    );

  }



  /*
  ==================================================
  CREATE TEACH BUTTON
  ==================================================
  */

  function addTeachButton(
    row
  ) {

    if (
      !row
    ) {

      return;

    }



    const bubble =

      getMessageBubble(
        row
      );


    if (
      !bubble
    ) {

      return;

    }



    /*
    Only real translated chat bubbles.
    */

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
    Already decorated.
    */

    if (
      bubble.querySelector(
        ":scope > .chat_teach_controls"
      )
    ) {

      return;

    }



    const controls =

      document.createElement(
        "div"
      );


    controls.className =
      "chat_teach_controls";



    /*
    Prevent click from reaching parent
    chat interactions.
    */

    controls.addEventListener(

      "click",

      function(event) {

        event.stopPropagation();

      }

    );



    const button =

      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.className =
      "chat_teach_button";


    button.textContent =
      "Teach";


    button.title =
      "Teach me this sentence";


    button.setAttribute(
      "aria-label",
      "Teach me this sentence"
    );



    button.addEventListener(

      "click",

      handleTeachClick

    );



    controls.appendChild(
      button
    );


    bubble.appendChild(
      controls
    );

  }



  /*
  ==================================================
  DECORATE ALL REAL CHATS
  ==================================================
  */

  function decorateChats() {

    const container =
      getChatContainer();


    if (
      !container
    ) {

      return;

    }



    /*
    .message_row represents real conversation
    messages in your current app.

    Option cards themselves are not real
    .message_row entries, so they are left to
    their existing Options Teach system.
    */

    container

      .querySelectorAll(
        ".message_row"
      )

      .forEach(

        function(row) {

          addTeachButton(
            row
          );

        }

      );

  }



  /*
  ==================================================
  SCHEDULE DECORATION
  ==================================================

  renderChat and Options may create many
  DOM mutations.

  We collapse them into one operation.
  ==================================================
  */

  function scheduleDecoration() {

    if (
      processScheduled
    ) {

      return;

    }



    processScheduled =
      true;



    requestAnimationFrame(

      function() {

        processScheduled =
          false;


        decorateChats();

      }

    );

  }



  /*
  ==================================================
  MUTATION OBSERVER
  ==================================================

  Automatically catches:

      ✓ old chats loaded
      ✓ new user chat
      ✓ new AI chat
      ✓ edited chat
      ✓ rerender
      ✓ room changes

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

          scheduleDecoration();

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



    scheduleDecoration();


    return true;

  }



  /*
  ==================================================
  REFRESH
  ==================================================
  */

  function refresh() {

    decorateChats();

  }



  /*
  ==================================================
  INIT
  ==================================================
  */

  function init() {


    const container =
      getChatContainer();



    if (
      !container
    ) {

      console.warn(

        "ConversateAddTeach: #chat_page_id was not found."

      );


      return false;

    }



    startObserver();


    return true;

  }



  /*
  ==================================================
  PUBLIC API
  ==================================================
  */

  global.ConversateAddTeach =
    Object.freeze({

      init:
        init,


      refresh:
        refresh,


      createChatTeachItem:
        createChatTeachItem,


      getChatForRow:
        getChatForRow

    });



  /*
  ==================================================
  AUTO START
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