(function () {

  "use strict";

  const chatPage =
    document.getElementById("chat_page_id");

  if (!chatPage) return;


  /*
  ==========================================
  ADD TEACH BUTTONS
  ==========================================
  */

  function addTeachButtons() {

    document
      .querySelectorAll(
        "#chat_page_id > .message_row"
      )
      .forEach(function (row, index) {

        const actions =
          row.querySelector(".chat_actions");

        if (!actions) return;


        if (
          actions.querySelector(
            ".chat_teach_button"
          )
        ) {
          return;
        }


        const button =
          document.createElement("button");

        button.type =
          "button";

        button.className =
          "teach_option_button chat_teach_button";

        button.textContent =
          "Teach";

        /*
        Remember which real chat this is.
        */

        button.dataset.chatIndex =
          index;


        actions.appendChild(button);

      });

  }



  /*
  ==========================================
  CHAT → TEACH ITEM
  ==========================================

  teach.js already understands an option.

  So make the real message look like
  an option.
  ==========================================
  */

  function chatToTeachItem(chat) {

    const targetFlow =
      chat.target_flow ||
      chat.targetFlow ||
      [];


    const sourceText =

      chat.interpreted_source_text ||

      chat.interaction_text ||

      chat.prompts_and_answers?.[
        chat.prompts_and_answers.length - 1
      ]?.user_prompt ||

      targetFlow
        .map(item => item.source || "")
        .join(" ")
        .trim();


    const targetText =

      chat.interpreted_target_text ||

      targetFlow
        .map(item => item.target || "")
        .join(" ")
        .trim();


    return {

      option_idx:
        "chat_" + chat.chat_idx,

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
        chat.source_flow || [],

      source_flow:
        chat.source_flow || [],

      groups:
        chat.groups || []

    };

  }



  /*
  ==========================================
  CLICK TEACH
  ==========================================
  */

  chatPage.addEventListener(
    "click",

    async function (event) {

      const button =
        event.target.closest(
          ".chat_teach_button"
        );


      if (!button) return;


      event.preventDefault();
      event.stopPropagation();


      try {

        /*
        Get current Firebase room.
        */

        const room =
          await window
            .ConversateFirebase
            .getCurrentRoom();


        if (!room) {
          console.error(
            "Teach: room not found"
          );
          return;
        }


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
            "Teach: chat not found"
          );
          return;
        }


        /*
        Find/create Teach box.
        */

        const bubble =
          button.closest(
            ".message_bubble"
          );


        let teachBox =
          bubble.querySelector(
            ".chat_teach_box"
          );


        if (!teachBox) {

          teachBox =
            document.createElement("div");

          /*
          Reuse existing Teach CSS.
          */

          teachBox.className =
            "teach_box chat_teach_box";

          bubble.appendChild(
            teachBox
          );

        }


        /*
        Clicking Teach again closes it.
        */

        if (
          teachBox.dataset.open ===
          "true"
        ) {

          teachBox.style.display =
            "none";

          teachBox.dataset.open =
            "false";

          return;

        }


        teachBox.style.display =
          "block";

        teachBox.dataset.open =
          "true";

        teachBox.textContent =
          "Teaching...";


        /*
        Load teach.js if index.html
        normally lazy-loads it.
        */

        if (
          !window.ConversateTeach
        ) {

          await import(
            "./teach.js"
          );

        }


        const teachItem =
          chatToTeachItem(chat);


        /*
        SAME teach.js used by Options.
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


        /*
        teach.js returns the explanation.
        */

        teachBox.textContent =

          result?.explanation ||

          result?.answer ||

          result?.text ||

          result ||

          "No explanation returned.";


      } catch (error) {

        console.error(
          "Chat Teach Error:",
          error
        );

      }

    }

  );



  /*
  ==========================================
  EXISTING MESSAGES
  ==========================================
  */

  addTeachButtons();



  /*
  ==========================================
  FUTURE MESSAGES
  ==========================================
  */

  const observer =
    new MutationObserver(
      addTeachButtons
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