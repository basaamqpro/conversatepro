export default async function handler(req, res) {

  /*
  ==================================================
  ALLOW ONLY POST
  ==================================================
  */

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }


  try {

    /*
    ==================================================
    GET PROMPT FROM FRONTEND
    ==================================================
    */

    const {
      prompt
    } = req.body || {};


    if (
      !prompt ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {

      return res.status(400).json({
        error: "A prompt is required."
      });

    }



    /*
    ==================================================
    OPENAI API KEY
    ==================================================
    */

    const apiKey =
      process.env.OPENAI_API_KEY;


    if (!apiKey) {

      return res.status(500).json({
        error:
          "OPENAI_API_KEY is not configured."
      });

    }



    /*
    ==================================================
    CALL OPENAI RESPONSES API
    ==================================================
    */

    const openAIResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${apiKey}`

          },


          body: JSON.stringify({

            /*
            Keep the same model used by
            the previous LingoGPT project.
            */

            model:
              "gpt-5.4-mini",


            /*
            All your frontend modules send
            their complete instruction as prompt.
            */

            input:
              prompt,


            /*
            Your tasks are mostly:
            translation,
            interpretation,
            JSON generation,
            short conversation.

            No heavy reasoning is required.
            */

            reasoning: {
              effort: "none"
            }

          })

        }
      );



    /*
    ==================================================
    READ OPENAI RESULT
    ==================================================
    */

    const data =
      await openAIResponse.json();



    /*
    ==================================================
    OPENAI ERROR
    ==================================================
    */

    if (!openAIResponse.ok) {

      console.error(
        "OpenAI API error:",
        data
      );


      return res
        .status(openAIResponse.status)
        .json({

          error:
            data?.error?.message ||
            "OpenAI request failed."

        });

    }



    /*
    ==================================================
    IMPORTANT

    Return the COMPLETE OpenAI response.

    Your files:

    results5.js
    interactPlus.js
    understandInput.js
    options.js
    teach.js

    already know how to extract:

    data.output
      → content
      → output_text

    So do NOT reduce this response
    to only plain text.
    ==================================================
    */

    return res
      .status(200)
      .json(data);


  } catch (error) {

    console.error(
      "/api/translate error:",
      error
    );


    return res
      .status(500)
      .json({

        error:
          error.message ||
          "Internal server error."

      });

  }

}