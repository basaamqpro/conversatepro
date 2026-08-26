(function (global) {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO
  ADD TEACH TO REAL CHAT MESSAGES
  ==================================================

  Existing Options already have:

  <button class="teach_option_button">
      Teach
  </button>

  This file adds the SAME Teach button to:

  ✓ Conversation Partner messages
  ✓ User messages

  It uses the existing:

  ConversateTeach.explain(...)

  No Firestore Teach data.
  No translation changes.
  No Options changes.
  No new CSS required.
  ==================================================
  */


  const CHAT_CONTAINER_ID =
    "chat_page_id";


  let observer =
    null;


  let processing =
    false;


  let teachLoadingPromise =
    null;



  /*
  ==================================================
  GET CHAT CONTAINER
  ==================================================
  */

  function getContainer() {

    return document.getElementById(
      CHAT_CONTAINER_ID
    );

  }



  /*
  ==================================================
  LOAD teach.js IF NECESSARY
  ==================================================

  If teach.js is already loaded:
      use it immediately.

  Otherwise:
      load it only when Teach is clicked.
  ==================================================
  */

  function ensureTeachLoaded() {


    if (
      global.ConversateTeach &&
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
      teachLoadingPromise
    ) {

      return teachLoadingPromise;

    }



    teachLoadingPromise =

      new Promise(

        function(resolve, reject) {


          /*
          Maybe another script tag already
          exists but has not finished.
          */

          const existing =

            document.querySelector(
              'script[src="teach.js"]'
            );



          if (
            existing
          ) {

            existing.addEventListener(

              "load",

              function() {

                if (
                  global.ConversateTeach
                ) {

                  resolve(
                    global.ConversateTeach
                  );

                } else {

                  reject(
                    new Error(
                      "teach.js loaded but ConversateTeach was not found."
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
          Load teach.js dynamically.
          */

          const script =

            document.createElement(
              "script"
            );


          script.src =
            "teach.js";


          script.onload =

            function() {

              if (
                global.ConversateTeach
              ) {

                resolve(
                  global.ConversateTeach
                );

              }

              else {

                reject(
                  new Error(
                    "ConversateTeach was not found."
                  )
                );

              }

            };


          script.onerror =

            function() {

              reject(
                new Error(
                  "Could not load teach.js."
                )
              );

            };


          document.head.appendChild(
            script
          );

        }

      );



    return teachLoadingPromise;

  }



  /*
  ==================================================
  CURRENT ROOM
  ==================================================
  */

  async function getCurrentRoom() {


    if (

      !global.ConversateFirebase

      ||

      typeof global
        .ConversateFirebase
        .getCurrentRoom !==
        "function"

    ) {

      throw new Error(
        "ConversateFirebase is not available."
      );

    }



    const room =

      await global
        .ConversateFirebase
        .getCurrentRoom();



    if (
      !room
    ) {

      throw new Error(
        "Current conversation room was not found."
      );

    }



    if (
      !Array.isArray(
        room.room_data
      )
    ) {

      room.room_data = [];

    }


    return room;

  }



  /*
  ==================================================
  FLOW → SENTENCE
  ==================================================
  */

  function flowToText(
    flow,
    field,
    language
  ) {


    if (
      !Array.isArray(
        flow
      )
    ) {

      return "";

    }



    const words =

      flow

        .map(

          function(item) {

            return String(

              item?.[field] ||

              ""

            ).trim();

          }

        )

        .filter(Boolean);



    const noSpaceLanguages = [

      "Japanese",

      "Mandarin Chinese",

      "Cantonese"

    ];



    let text =

      words.join(

        noSpaceLanguages.includes(
          language
        )

          ? ""

          : " "

      );



    /*
    Clean punctuation spacing.
    */

    return text

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

  }



  /*
  ==================================================
  GET LAST ORIGINAL PROMPT
  ==================================================
  */

  function getStoredPrompt(
    chat
  ) {


    if (
      !Array.isArray(
        chat?.prompts_and_answers
      )
    ) {

      return "";

    }



    if (
      !chat.prompts_and_answers.length
    ) {

      return "";

    }



    const last =

      chat.prompts_and_answers[

        chat.prompts_and_answers.length
        - 1

      ];



    return String(

      last?.user_prompt ||

      ""

    ).trim();

  }



  /*
  ==================================================
  CHAT → OPTION-LIKE OBJECT
  ==================================================

  teach.js already knows how to teach an Option.

  Therefore we adapt a real chat message into
  the same kind of object.

  We are NOT changing teach.js.
  ==================================================
  */

  function chatToTeachItem(
    chat
  ) {


    const targetFlow =

      Array.isArray(
        chat?.target_flow
      )

        ? chat.target_flow

        : Array.isArray(
            chat?.targetFlow
          )

          ? chat.targetFlow

          : [];



    const sourceFlow =

      Array.isArray(
        chat?.source_flow
      )

        ? chat.source_flow

        : Array.isArray(
            chat?.sourceFlow
          )

          ? chat.sourceFlow

          : [];



    /*
    Source/helper-language meaning.
    */

    let sourceText =

      String(

        chat?.interpreted_source_text ||

        chat?.interpretedSourceText ||

        chat?.interaction_text ||

        chat?.interactionText ||

        ""

      ).trim();



    if (
      !sourceText
    ) {

      sourceText =
        getStoredPrompt(
          chat
        );

    }



    if (
      !sourceText
    ) {

      sourceText =

        flowToText(

          targetFlow,

          "source",

          chat?.source_language

        );

    }



    /*
    Practice-language text.
    */

    let targetText =

      String(

        chat?.interpreted_target_text ||

        chat?.interpretedTargetText ||

        ""

      ).trim();



    if (
      !targetText
    ) {

      targetText =

        flowToText(

          targetFlow,

          "target",

          chat?.target_language

        );

    }



    /*
    This deliberately resembles an Option,
    so existing teach.js can work normally.
    */

    return {

      option_idx:

        "chat_" +

        String(
          chat?.chat_idx ||
          Date.now()
        ),


      sourceText:
        sourceText,


      source_text:
        sourceText,


      text:
        sourceText,


      targetText:
        targetText,


      target_text:
        targetText,


      useText:
        targetText,


      targetFlow:
        targetFlow,


      target_flow:
        targetFlow,


      sourceFlow:
        sourceFlow,


      source_flow:
        sourceFlow,


      groups:

        Array.isArray(
          chat?.groups
        )

          ? chat.groups

          : []

    };

  }



  /*
  ==================================================
  FIND CHAT FOR MESSAGE ROW
  ==================================================

  renderChat displays room_data in the same order.

  We therefore associate:

  message_row[0]
      ↔ room_data[0]

  message_row[1]
      ↔ room_data[1]

  etc.
  ==================================================
  */

  async function getChatForButton(
    button
  ) {


    const row =

      button.closest(
        ".message_row"
      );



    if (
      !row
    ) {

      return null;

    }



    const container =
      getContainer();



    if (
      !container
    ) {

      return null;

    }



    const rows =

      Array.from(

        container.querySelectorAll(
          ":scope > .message_row"
        )

      );



    const rowIndex =

      rows.indexOf(
        row
      );



    if (
      rowIndex < 0
    ) {

      return null;

    }



    const room =
      await getCurrentRoom();



    const chat =

      room.room_data[
        rowIndex
      ];



    if (
      !chat
    ) {

      return null;

    }



    return {

      room:
        room,

      chat:
        chat,

      row:
        row

    };

  }



  /*
  ==================================================
  GET / CREATE TEACH BOX
  ==================================================

  We deliberately reuse:

      teach_box

  so existing Teach CSS can apply.

  chat_teach_box is only an extra identifier.
  ==================================================
  */

  function getTeachBox(
    bubble
  ) {


    let box =

      bubble.querySelector(
        ":scope > .chat_teach_box"
      );



    if (
      box
    ) {

      return box;

    }



    box =

      document.createElement(
        "div"
      );


    box.className =
      "teach_box chat_teach_box";


    box.hidden =
      true;



    bubble.appendChild(
      box
    );


    return box;

  }



  /*
  ==================================================
  STATUS
  ==================================================
  */

  function showLoading(
    box
  ) {


    box.hidden =
      false;


    box.innerHTML =
      "";


    const text =

      document.createElement(
        "div"
      );


    text.className =
      "teach_loading";


    text.textContent =
      "Teaching...";


    box.appendChild(
      text
    );

  }



  function showError(
    box,
    error
  ) {


    box.hidden =
      false;


    box.innerHTML =
      "";


    const text =

      document.createElement(
        "div"
      );


    text.className =
      "teach_error";


    text.textContent =

      error?.message ||

      "Teach could not load.";



    box.appendChild(
      text
    );

  }



  /*
  ==================================================
  GET EXPLANATION TEXT
  ==================================================
  */

  function getExplanationText(
    result
  ) {


    if (
      typeof result ===
      "string"
    ) {

      return result;

    }



    return String(

      result?.explanation ||

      result?.answer ||

      result?.text ||

      result?.response ||

      ""

    ).trim();

  }



  /*
  ==================================================
  DISPLAY TEACH RESULT
  ==================================================

  This uses the same teaching engine.

  It also keeps Ask available, so Chat Teach
  has the same useful behaviour as Option Teach.
  ==================================================
  */

  function renderTeachResult(
    box,
    details,
    teachItem,
    result
  ) {


    box.hidden =
      false;


    box.innerHTML =
      "";



    /*
    ------------------------------
    Explanation
    ------------------------------
    */

    const explanation =

      document.createElement(
        "div"
      );


    explanation.className =
      "teach_explanation";


    explanation.textContent =

      getExplanationText(
        result
      )

      ||

      "No explanation was returned.";



    box.appendChild(
      explanation
    );



    /*
    ------------------------------
    Question history
    ------------------------------
    */

    const answers =

      document.createElement(
        "div"
      );


    answers.className =
      "teach_answers";


    box.appendChild(
      answers
    );



    /*
    ------------------------------
    Ask area
    ------------------------------
    */

    const askArea =

      document.createElement(
        "div"
      );


    askArea.className =
      "teach_question_area";



    const input =

      document.createElement(
        "input"
      );


    input.type =
      "text";


    input.className =
      "teach_question_input";


    input.placeholder =
      "Ask about this sentence...";



    const askButton =

      document.createElement(
        "button"
      );


    askButton.type =
      "button";


    askButton.className =
      "teach_ask_button";


    askButton.textContent =
      "Ask";



    /*
    ==================================================
    ASK QUESTION
    ==================================================
    */

    async function askQuestion() {


      const question =

        input.value
          .trim();



      if (
        !question
      ) {

        return;

      }



      askButton.disabled =
        true;


      askButton.textContent =
        "Thinking...";



      try {


        const teach =

          await ensureTeachLoaded();



        const answerResult =

          await teach.explain({

            room:
              details.room,

            chat:
              details.chat,

            option:
              teachItem,

            question:
              question

          });



        const answerText =

          getExplanationText(
            answerResult
          );



        /*
        User question.
        */

        const questionElement =

          document.createElement(
            "div"
          );


        questionElement.className =
          "teach_question";


        questionElement.textContent =

          question;



        /*
        Teach answer.
        */

        const answerElement =

          document.createElement(
            "div"
          );


        answerElement.className =
          "teach_answer";


        answerElement.textContent =

          answerText ||

          "No answer was returned.";



        answers.append(

          questionElement,

          answerElement

        );



        input.value =
          "";



      } catch (error) {


        console.error(
          "Chat Teach question:",
          error
        );


        const errorElement =

          document.createElement(
            "div"
          );


        errorElement.className =
          "teach_error";


        errorElement.textContent =

          error?.message ||

          "Could not answer the question.";


        answers.appendChild(
          errorElement
        );



      } finally {


        askButton.disabled =
          false;


        askButton.textContent =
          "Ask";

      }

    }



    askButton.addEventListener(

      "click",

      function(event) {

        event.preventDefault();

        event.stopPropagation();

        askQuestion();

      }

    );



    input.addEventListener(

      "keydown",

      function(event) {


        if (
          event.key ===
          "Enter"
        ) {

          event.preventDefault();

          event.stopPropagation();

          askQuestion();

        }

      }

    );



    askArea.append(

      input,

      askButton

    );


    box.appendChild(
      askArea
    );

  }



  /*
  ==================================================
  TEACH BUTTON CLICK
  ==================================================
  */

  async function handleTeachClick(
    event
  ) {


    event.preventDefault();


    event.stopPropagation();



    const button =
      event.currentTarget;



    const bubble =

      button.closest(
        ".message_bubble"
      );



    if (
      !bubble
    ) {

      return;

    }



    const box =
      getTeachBox(
        bubble
      );



    /*
    If already open, clicking Teach again
    simply closes it.
    */

    if (

      !box.hidden

      &&

      box.dataset.loaded ===
        "true"

    ) {

      box.hidden =
        true;


      return;

    }



    /*
    Already generated before.

    Re-open without another API call.
    */

    if (

      box.hidden

      &&

      box.dataset.loaded ===
        "true"

    ) {

      box.hidden =
        false;


      return;

    }



    showLoading(
      box
    );



    button.disabled =
      true;



    try {


      /*
      1. Find real conversation chat.
      */

      const details =

        await getChatForButton(
          button
        );



      if (
        !details
      ) {

        throw new Error(
          "This chat message could not be found."
        );

      }



      /*
      2. Reuse existing Teach engine.
      */

      const teach =

        await ensureTeachLoaded();



      /*
      3. Adapt real chat into same structure
         Teach already receives from Options.
      */

      const teachItem =

        chatToTeachItem(
          details.chat
        );



      /*
      4. Existing teach.js.
      */

      const result =

        await teach.explain({

          room:
            details.room,

          chat:
            details.chat,

          option:
            teachItem

        });



      /*
      5. Display result.
      */

      renderTeachResult(

        box,

        details,

        teachItem,

        result

      );



      box.dataset.loaded =
        "true";



    } catch (error) {


      console.error(
        "Chat Teach:",
        error
      );


      showError(
        box,
        error
      );



    } finally {


      button.disabled =
        false;

    }

  }



  /*
  ==================================================
  ADD TEACH BUTTON TO ONE MESSAGE
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



    /*
    Existing action row:

    Reverse
    Edit
    Delete
    etc.
    */

    const actions =

      bubble.querySelector(
        ":scope > .chat_actions"
      );



    if (
      !actions
    ) {

      return;

    }



    /*
    Never duplicate it.
    */

    if (
      actions.querySelector(
        ":scope > .chat_teach_button"
      )
    ) {

      return;

    }



    const button =

      document.createElement(
        "button"
      );



    button.type =
      "button";



    /*
    IMPORTANT:

    teach_option_button
        = existing Option Teach CSS

    chat_teach_button
        = only used so this script knows
          which buttons it added.
    */

    button.className =

      "teach_option_button " +

      "chat_teach_button";



    button.textContent =
      "Teach";



    button.addEventListener(

      "click",

      handleTeachClick

    );



    /*
    Add it to the SAME real-chat action bar.
    */

    actions.appendChild(
      button
    );

  }



  /*
  ==================================================
  DECORATE ALL REAL CHAT MESSAGES
  ==================================================
  */

  function addTeachToAllChats() {


    const container =
      getContainer();



    if (
      !container
    ) {

      return;

    }



    const rows =

      container.querySelectorAll(
        ":scope > .message_row"
      );



    rows.forEach(
      addTeachButton
    );

  }



  /*
  ==================================================
  SCHEDULE DECORATION
  ==================================================

  renderChat() can replace the entire DOM.

  MutationObserver notices that and adds the
  Teach buttons back automatically.
  ==================================================
  */

  function scheduleDecoration() {


    if (
      processing
    ) {

      return;

    }



    processing =
      true;



    requestAnimationFrame(

      function() {

        processing =
          false;


        addTeachToAllChats();

      }

    );

  }



  /*
  ==================================================
  OBSERVER
  ==================================================
  */

  function startObserver() {


    const container =
      getContainer();



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



    /*
    Existing messages.
    */

    scheduleDecoration();



    return true;

  }



  /*
  ==================================================
  INITIALIZE
  ==================================================
  */

  function init() {


    if (
      !getContainer()
    ) {

      console.warn(
        "addElement_teach.js: #chat_page_id was not found."
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

  global.ConversateChatTeach =
    Object.freeze({

      init:
        init,

      refresh:
        addTeachToAllChats,

      chatToTeachItem:
        chatToTeachItem

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