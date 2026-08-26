(function () {

  "use strict";

  function addTeachButtons() {

    document
      .querySelectorAll(".message_row .chat_actions")
      .forEach(function (actions) {

        // Don't add twice
        if (
          actions.querySelector(".chat_teach_button")
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

        actions.appendChild(button);

      });

  }


  // Existing messages
  addTeachButtons();


  // Future user/AI messages
  const chat =
    document.getElementById("chat_page_id");

  if (chat) {

    const observer =
      new MutationObserver(addTeachButtons);

    observer.observe(chat, {
      childList: true,
      subtree: true
    });

  }

})();