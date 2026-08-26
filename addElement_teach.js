(function () {

  "use strict";


  /*
  ==================================================
  CONVERSATE PRO
  TEACH FOR REAL CHAT MESSAGES
  ==================================================

  This file adds:

      Teach

  to REAL conversation messages.

  It reuses:

      teach.js

  exactly like the Options system.

  Result:

  Real chat
      ↓
  Teach
      ↓
  Explanation
      ↓
  Ask a question
      ↓
  teach.js answers
  ==================================================
  */


  const chatPage =
    document.getElementById(
      "chat_page_id"
    );


  if (!chatPage) {

    console.warn(
      "Chat Teach: #chat_page_id not found."
    );

    return;

  }



  /*
  ==================================================
  ADD TEACH BUTTONS
  ==================================================
  */

  function addTeachButtons() {

    document
      .querySelectorAll(
        "#chat_page_id > .message_row"
      )
      .forEach(

        function (
          row,
          index
        ) {


          const actions =

            row.querySelector(
              ".chat_actions"
            );


          if (!actions) {

            return;

          }



          /*
          Already added.
          */

          if (

            actions.querySelector(
              ".chat_teach_button"
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


          button.className =
            "teach_option_button chat_teach_button";


          button.textContent =
            "Teach";


          /*
          Current room_data array position.

          This matches your current
          rendering architecture.
          */

          button.dataset.chatIndex =
            String(
              index
            );


          actions.appendChild(
            button
          );

        }

      );

  }



  /*
  ==================================================
  CHAT → TEACH ITEM
  ==================================================

  teach.js already knows how to teach:

      option

  So we convert a real chat message into
  the same basic shape as an Option.
  ==================================================
  */

  function chatToTeachItem(
    chat
  ) {


    const targetFlow =

      chat.target_flow ||

      chat.targetFlow ||

      [];



    const sourceFlow =

      chat.source_flow ||

      chat.sourceFlow ||

      [];



    /*
    Helper/source-language sentence.
    */

    const sourceText =

      chat.interpreted_source_text

      ||

      chat.interaction_text

      ||

      chat.prompts_and_answers?.[
        chat.prompts_and_answers.length - 1
      ]?.user_prompt

      ||

      targetFlow

        .map(

          function(item) {

            return (
              item.source ||
              ""
            );

          }

        )

        .join(" ")

        .trim();



    /*
    Practice/target-language sentence.
    */

    const targetText =

      chat.interpreted_target_text

      ||

      targetFlow

        .map(

          function(item) {

            return (
              item.target ||
              ""
            );

          }

        )

        .join(" ")

        .replace(
          /\s+([,.!?;:،؛؟。！？，、])/g,
          "$1"
        )

        .trim();



    return {

      option_idx:
        "chat_" +
        chat.chat_idx,


      /*
      Both camelCase and snake_case
      for compatibility with teach.js.
      */

      sourceText:
        sourceText,

      source_text:
        sourceText,


      targetText:
        targetText,

      target_text:
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
        chat.groups ||
        []

    };

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


    return (

      result?.explanation

      ||

      result?.answer

      ||

      result?.text

      ||

      "No explanation returned."

    );

  }



  /*
  ==================================================
  GET QUESTION ANSWER
  ==================================================
  */

  function getQuestionAnswer(
    result
  ) {

    if (
      typeof result ===
      "string"
    ) {

      return result;

    }


    return (

      result?.answer

      ||

      result?.explanation

      ||

      result?.text

      ||

      "No answer returned."

    );

  }



  /*
  ==================================================
  CREATE TEACH BOX
  ==================================================

  This recreates the same basic structure
  you showed from the Option Teach UI:

  teach_box visible
      ↓
  teach_answer
      ↓
  teach_question_row
      ↓
  input + Ask
  ==================================================
  */

  function createTeachBox(
    bubble
  ) {


    const teachBox =

      document.createElement(
        "div"
      );


    teachBox.className =
      "teach_box chat_teach_box";



    /*
    Explanation.
    */

    const answer =

      document.createElement(
        "p"
      );


    answer.className =
      "teach_answer";


    answer.textContent =
      "Teaching...";



    /*
    Question row.
    */

    const questionRow =

      document.createElement(
        "div"
      );


    questionRow.className =
      "teach_question_row";



    /*
    Question input.
    */

    const input =

      document.createElement(
        "input"
      );


    input.type =
      "text";


    input.className =
      "teach_question_input";


    input.placeholder =
      "Ask about this response...";



    /*
    Ask button.
    */

    const askButton =

      document.createElement(
        "button"
      );


    askButton.type =
      "button";


    askButton.className =
      "teach_question_button";


    askButton.textContent =
      "Ask";



    questionRow.appendChild(
      input
    );


    questionRow.appendChild(
      askButton
    );


    teachBox.appendChild(
      answer
    );


    teachBox.appendChild(
      questionRow
    );


    bubble.appendChild(
      teachBox
    );



    return {

      teachBox:
        teachBox,

      answer:
        answer,

      questionRow:
        questionRow,

      input:
        input,

      askButton:
        askButton

    };

  }



  /*
  ==================================================
  GET TEACH UI PARTS
  ==================================================
  */

  function getTeachUI(
    teachBox
  ) {

    return {

      teachBox:
        teachBox,

      answer:

        teachBox.querySelector(
          ".teach_answer"
        ),

      questionRow:

        teachBox.querySelector(
          ".teach_question_row"
        ),

      input:

        teachBox.querySelector(
          ".teach_question_input"
        ),

      askButton:

        teachBox.querySelector(
          ".teach_question_button"
        )

    };

  }



  /*
  ==================================================
  ASK QUESTION
  ==================================================
  */

  async function askQuestion(
    {
      room,
      chat,
      teachItem,
      ui
    }
  ) {


    const question =

      String(
        ui.input.value ||
        ""
      ).trim();



    if (!question) {

      return;

    }



    /*
    Prevent double clicking.
    */

    ui.askButton.disabled =
      true;


    ui.input.disabled =
      true;


    const oldButtonText =
      ui.askButton.textContent;


    ui.askButton.textContent =
      "...";



    try {


      /*
      SAME teach.js.

      The only difference from the first
      explanation call is:

          question: question
      */

      const result =

        await window
          .ConversateTeach
          .explain({

            room:
              room,

            chat:
              chat,

            option:
              teachItem,

            question:
              question

          });



      const answer =

        getQuestionAnswer(
          result
        );



      /*
      ==================================================
      DISPLAY QUESTION + ANSWER
      ==================================================

      Keep the original explanation and append
      each learner question underneath it.
      ==================================================
      */

      const questionBlock =

        document.createElement(
          "div"
        );


      questionBlock.className =
        "teach_followup";



      const questionText =

        document.createElement(
          "p"
        );


      questionText.className =
        "teach_followup_question";


      questionText.textContent =
        "You: " +
        question;



      const answerText =

        document.createElement(
          "p"
        );


      answerText.className =
        "teach_followup_answer";


      answerText.textContent =
        answer;



      questionBlock.appendChild(
        questionText
      );


      questionBlock.appendChild(
        answerText
      );



      /*
      Insert ABOVE the input row so the
      question box stays at the bottom.
      */

      ui.teachBox.insertBefore(

        questionBlock,

        ui.questionRow

      );



      /*
      Clear question.
      */

      ui.input.value =
        "";


      ui.input.focus();



    } catch (error) {


      console.error(
        "Chat Teach Ask Error:",
        error
      );


      const errorMessage =

        document.createElement(
          "p"
        );


      errorMessage.className =
        "teach_followup_answer teach_error";


      errorMessage.textContent =
        "Could not answer that question.";


      ui.teachBox.insertBefore(

        errorMessage,

        ui.questionRow

      );


    } finally {


      ui.askButton.disabled =
        false;


      ui.input.disabled =
        false;


      ui.askButton.textContent =
        oldButtonText;

    }

  }



  /*
  ==================================================
  CLICK TEACH
  ==================================================
  */

  chatPage.addEventListener(

    "click",

    async function(event) {


      const button =

        event.target.closest(
          ".chat_teach_button"
        );



      if (!button) {

        return;

      }



      event.preventDefault();


      event.stopPropagation();



      try {


        /*
        ==================================================
        CURRENT ROOM
        ==================================================
        */

        const room =

          await window
            .ConversateFirebase
            .getCurrentRoom();



        if (!room) {

          console.error(
            "Teach: room not found."
          );


          return;

        }



        /*
        ==================================================
        REAL CHAT
        ==================================================
        */

        const chatIndex =

          Number(
            button.dataset.chatIndex
          );



        const chat =

          room.room_data?.[
            chatIndex
          ];



        if (!chat) {

          console.error(
            "Teach: chat not found."
          );


          return;

        }



        /*
        ==================================================
        BUBBLE
        ==================================================
        */

        const bubble =

          button.closest(
            ".message_bubble"
          );



        if (!bubble) {

          return;

        }



        /*
        ==================================================
        EXISTING TEACH BOX
        ==================================================
        */

        let teachBox =

          bubble.querySelector(
            ":scope > .chat_teach_box"
          );



        /*
        Clicking Teach again closes it.
        */

        if (

          teachBox

          &&

          teachBox.dataset.open ===
          "true"

        ) {


          teachBox.classList.remove(
            "visible"
          );


          teachBox.style.display =
            "none";


          teachBox.dataset.open =
            "false";


          return;

        }



        /*
        ==================================================
        REOPEN EXISTING BOX

        Don't call GPT again unnecessarily.
        ==================================================
        */

        if (
          teachBox
        ) {


          teachBox.style.display =
            "block";


          teachBox.classList.add(
            "visible"
          );


          teachBox.dataset.open =
            "true";


          return;

        }



        /*
        ==================================================
        CREATE NEW TEACH UI
        ==================================================
        */

        const ui =

          createTeachBox(
            bubble
          );



        teachBox =
          ui.teachBox;


        teachBox.dataset.open =
          "true";


        teachBox.style.display =
          "block";


        /*
        IMPORTANT:

        Your original Option Teach uses:

            teach_box visible

        So add visible here too.
        */

        teachBox.classList.add(
          "visible"
        );



        /*
        ==================================================
        LOAD teach.js
        ==================================================
        */

        if (
          !window.ConversateTeach
        ) {

          await import(
            "./teach.js"
          );

        }



        if (
          !window.ConversateTeach
        ) {

          throw new Error(
            "ConversateTeach failed to load."
          );

        }



        /*
        Convert the real message to something
        teach.js understands.
        */

        const teachItem =

          chatToTeachItem(
            chat
          );



        /*
        ==================================================
        FIRST EXPLANATION
        ==================================================
        */

        const result =

          await window
            .ConversateTeach
            .explain({

              room:
                room,

              chat:
                chat,

              option:
                teachItem

            });



        ui.answer.textContent =

          getExplanationText(
            result
          );



        /*
        ==================================================
        ASK BUTTON
        ==================================================
        */

        ui.askButton.addEventListener(

          "click",

          function(event) {


            event.preventDefault();


            event.stopPropagation();



            askQuestion({

              room:
                room,

              chat:
                chat,

              teachItem:
                teachItem,

              ui:
                ui

            });

          }

        );



        /*
        ENTER KEY ALSO ASKS
        ==================================================
        */

        ui.input.addEventListener(

          "keydown",

          function(event) {


            if (
              event.key !==
              "Enter"
            ) {

              return;

            }


            event.preventDefault();


            event.stopPropagation();



            askQuestion({

              room:
                room,

              chat:
                chat,

              teachItem:
                teachItem,

              ui:
                ui

            });

          }

        );



      } catch (error) {


        console.error(

          "Chat Teach Error:",

          error

        );

      }

    }

  );



  /*
  ==================================================
  EXISTING MESSAGES
  ==================================================
  */

  addTeachButtons();



  /*
  ==================================================
  FUTURE MESSAGES
  ==================================================

  renderChat() can create new message rows,
  so automatically add Teach to them.
  ==================================================
  */

  const observer =

    new MutationObserver(

      function() {

        addTeachButtons();

      }

    );



  observer.observe(

    chatPage,

    {

      childList:
        true,

      subtree:
        true

    }

  );


})();