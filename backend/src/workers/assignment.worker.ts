import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";

import { Assignment } from "../models/assignment.model.js";
import { GeneratedPaper } from "../models/generatedPaper.model.js";

import { getIO } from "../websocket/socket.js";

import { grok } from "../ai/grok.js";

import {
  buildQuestionPrompt,
  buildSectionPrompt,
} from "../ai/prompts.js";

import { extractJSON } from "../ai/parser.js";

import {
  SectionsArraySchema,
  QuestionsArraySchema,
} from "../ai/schemas.js";

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const assignmentWorker = new Worker(
  "assignment-generation",

  async (job) => {
    try {
      const { assignmentId } = job.data;

      const io = getIO();

      const assignment =
        await Assignment.findById(
          assignmentId
        );

      if (!assignment) {
        console.log(
          "Assignment not found"
        );

        return;
      }

      /*
       --------------------------------
       START GENERATION
       --------------------------------
      */

      assignment.status =
        "generating";

      assignment.progress = 10;

      assignment.startedAt =
        new Date();

      assignment.generationLogs.push(
        "Initializing generation..."
      );

      await assignment.save();

      io.to(assignmentId).emit(
        "assignment:started",
        {
          progress: 10,
          message:
            "Initializing generation...",
        }
      );

      await delay(1000);

      /*
       --------------------------------
       PROCESS UPLOADED MATERIAL
       --------------------------------
      */
      if (
        assignment.uploadedMaterial &&
        assignment.uploadedMaterial.fileUrl &&
        !assignment.uploadedMaterial.extractedText
      ) {
        try {
          assignment.generationLogs.push(
            "Analyzing uploaded material..."
          );
          assignment.progress = 15;
          await assignment.save();

          io.to(assignmentId).emit("assignment:progress", {
            progress: 15,
            message: "Analyzing uploaded material...",
          });

          const fileUrl = assignment.uploadedMaterial.fileUrl;
          let fileResponse;
          try {
            fileResponse = await fetch(fileUrl);
          } catch (err: any) {
            const msg = `Failed to fetch uploaded file: ${err.message || err}`;
            assignment.generationLogs.push(msg);
            await assignment.save();
            io.to(assignmentId).emit("assignment:log", { message: msg });
            throw new Error(msg);
          }

          assignment.generationLogs.push(`Downloaded file from URL: ${fileUrl} (status=${fileResponse.status})`);
          await assignment.save();
          io.to(assignmentId).emit("assignment:log", { message: `Downloaded file (status ${fileResponse.status})` });

          if (!fileResponse.ok) {
            const msg = `Failed to download file from URL: ${fileResponse.status} ${fileResponse.statusText}`;
            assignment.generationLogs.push(msg);
            await assignment.save();
            io.to(assignmentId).emit("assignment:log", { message: msg });
            throw new Error(msg);
          }

          const arrayBuffer = await fileResponse.arrayBuffer();
          assignment.generationLogs.push(`Downloaded file size: ${arrayBuffer.byteLength} bytes`);
          await assignment.save();
          io.to(assignmentId).emit("assignment:log", { message: `Downloaded file size: ${arrayBuffer.byteLength} bytes` });
          
          let mimeType = "image/jpeg";
          const lowerUrl = fileUrl.toLowerCase();
          if (lowerUrl.includes(".png")) {
            mimeType = "image/png";
          } else if (lowerUrl.includes(".pdf")) {
            mimeType = "application/pdf";
          } else if (lowerUrl.includes(".webp")) {
            mimeType = "image/webp";
          } else if (lowerUrl.includes(".txt")) {
            mimeType = "text/plain";
          } else if (lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg")) {
            mimeType = "image/jpeg";
          }

          if (mimeType === "text/plain") {
            const extractedText = Buffer.from(arrayBuffer).toString("utf-8");
            assignment.uploadedMaterial.extractedText = extractedText;
            assignment.generationLogs.push("Successfully loaded reference text file.");
          } else {
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (geminiApiKey) {
              const base64Data = Buffer.from(arrayBuffer).toString("base64");
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

              assignment.generationLogs.push(`Sending file to Gemini for analysis (mime=${mimeType}, base64Length=${base64Data.length})`);
              await assignment.save();
              io.to(assignmentId).emit("assignment:log", { message: "Sending uploaded file to Gemini for analysis" });

              let geminiRes;
              try {
                geminiRes = await fetch(geminiUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{
                      parts: [
                        { inlineData: { mimeType, data: base64Data } },
                        { text: "Analyze this uploaded document/image carefully. Extract all the textual content, key concepts, formulas, and educational reference material in full detail so it can be used to generate exam questions. Return the extracted text directly." }
                      ]
                    }]
                  }),
                });
              } catch (err: any) {
                const msg = `Gemini request failed: ${err.message || err}`;
                assignment.generationLogs.push(msg);
                await assignment.save();
                io.to(assignmentId).emit("assignment:log", { message: msg });
                throw err;
              }

              assignment.generationLogs.push(`Gemini response status: ${geminiRes.status}`);
              await assignment.save();
              io.to(assignmentId).emit("assignment:log", { message: `Gemini response status: ${geminiRes.status}` });

              if (geminiRes.ok) {
                const resJson = await geminiRes.json() as any;
                assignment.generationLogs.push(`Gemini returned structured response. Candidates: ${resJson.candidates?.length || 0}`);
                await assignment.save();
                io.to(assignmentId).emit("assignment:log", { message: `Gemini returned ${resJson.candidates?.length || 0} candidates` });

                const extractedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
                if (extractedText) {
                  assignment.uploadedMaterial.extractedText = extractedText;
                  assignment.generationLogs.push("Successfully processed uploaded material using Gemini.");
                } else {
                  const raw = JSON.stringify(resJson).slice(0, 2000);
                  assignment.generationLogs.push("Warning: Gemini returned empty extraction content.");
                  assignment.generationLogs.push(`Gemini raw response (truncated): ${raw}`);
                }
              } else {
                let errorBody = "";
                try {
                  errorBody = await geminiRes.text();
                } catch (e) {
                  errorBody = String(e);
                }
                assignment.generationLogs.push(`Warning: Gemini processing failed with status ${geminiRes.status}: ${errorBody}`);
                await assignment.save();
                io.to(assignmentId).emit("assignment:log", { message: `Gemini failed: ${geminiRes.status}` });
              }
            } else {
              assignment.generationLogs.push("Warning: Uploaded file requires Gemini API key for analysis, but GEMINI_API_KEY is not set.");
              await assignment.save();
              io.to(assignmentId).emit("assignment:log", { message: "GEMINI_API_KEY not set" });
            }
          }
          await assignment.save();
        } catch (err: any) {
          console.error("Error extracting material:", err);
          assignment.generationLogs.push(`Warning: Uploaded material analysis bypassed: ${err.message || err}`);
          await assignment.save();
        }
      }

      /*
       --------------------------------
       GENERATE SECTIONS
       --------------------------------
      */

      assignment.generationLogs.push(
        "Generating sections..."
      );

      assignment.progress = 25;

      await assignment.save();

      io.to(assignmentId).emit(
        "assignment:progress",
        {
          progress: 25,
          message:
            "Generating sections...",
        }
      );

      const sectionResponse =
        await grok.chat.completions.create(
          {
            model:
              "llama-3.3-70b-versatile",

            messages: [
              {
                role: "user",

                content:
                  buildSectionPrompt(
                    assignment
                  ),
              },
            ],

            temperature: 0.7,
          }
        );

      const sectionContent =
        sectionResponse.choices[0]
          .message.content || "";

      const parsedSections =
        extractJSON(
          sectionContent
        );

      const validatedSections =
        SectionsArraySchema.parse(
          parsedSections
        );

      /*
       --------------------------------
       EMIT SECTIONS
       --------------------------------
      */

      for (const section of validatedSections) {
        io.to(assignmentId).emit(
          "assignment:section-created",
          section
        );

        await delay(500);
      }

      /*
       --------------------------------
       CREATE GENERATED PAPER
       --------------------------------
      */

      const generatedPaper =
        await GeneratedPaper.create({
          assignmentId,

          sections:
            validatedSections.map(
              (section) => ({
                ...section,

                questions: [],
              })
            ),

          metadata: {
            model:
              "llama-3.3-70b-versatile",

            generatedAt:
              new Date(),
          },
        });

      /*
       --------------------------------
       GENERATE QUESTIONS
       --------------------------------
      */

      assignment.progress = 50;

      assignment.generationLogs.push(
        "Generating questions..."
      );

      await assignment.save();

      io.to(assignmentId).emit(
        "assignment:progress",
        {
          progress: 50,
          message:
            "Generating questions...",
        }
      );

      for (
        let i = 0;
        i <
        validatedSections.length;
        i++
      ) {
        const section =
          validatedSections[i];

        const config =
          assignment
            .questionConfigs[i];

        if (!config) continue;

        assignment.generationLogs.push(
          `Generating questions for ${section.title}`
        );

        await assignment.save();

        io.to(
          assignmentId
        ).emit(
          "assignment:progress",
          {
            progress:
              50 +
              Math.floor(
                (i /
                  validatedSections.length) *
                  30
              ),

            message: `Generating ${section.title}`,
          }
        );

        const questionResponse =
          await grok.chat.completions.create(
            {
              model:
                "llama-3.3-70b-versatile",

              messages: [
                {
                  role:
                    "user",

                  content:
                    buildQuestionPrompt(
                      section.title,
                      config,
                      assignment.instructions || "",
                      assignment.uploadedMaterial?.extractedText
                    ),
                },
              ],

              temperature: 0.8,
            }
          );

        const questionContent =
          questionResponse
            .choices[0]
            .message.content ||
          "";

        const parsedQuestions =
          extractJSON(
            questionContent
          );

        const validatedQuestions =
          QuestionsArraySchema.parse(
            parsedQuestions
          );

        /*
         --------------------------------
         STREAM QUESTIONS
         --------------------------------
        */

        for (const question of validatedQuestions) {
          generatedPaper.sections[
            i
          ].questions.push(
            question as any
          );

          await generatedPaper.save();

          io.to(
            assignmentId
          ).emit(
            "assignment:question-generated",
            {
              sectionTitle:
                section.title,

              question,
            }
          );

          await delay(1200);
        }
      }

      /*
       --------------------------------
       FINALIZATION
       --------------------------------
      */

      assignment.progress = 90;

      assignment.generationLogs.push(
        "Finalizing paper..."
      );

      await assignment.save();

      io.to(assignmentId).emit(
        "assignment:progress",
        {
          progress: 90,
          message:
            "Finalizing paper...",
        }
      );

      await delay(1000);

      /*
       --------------------------------
       COMPLETE
       --------------------------------
      */

      assignment.status =
        "completed";

      assignment.progress = 100;

      assignment.completedAt =
        new Date();

      assignment.generatedPaperId =
        generatedPaper._id as any;

      assignment.generationDuration =
        assignment.completedAt.getTime() -
        assignment.startedAt!.getTime();

      assignment.generationLogs.push(
        "Assignment generated successfully."
      );

      await assignment.save();

      io.to(assignmentId).emit(
        "assignment:completed",
        generatedPaper
      );

      console.log(
        `Assignment ${assignmentId} completed`
      );
    } catch (error: any) {
      console.error(
        "Worker Error:",
        error
      );

      const assignmentId =
        job.data.assignmentId;

      const io = getIO();

      await Assignment.findByIdAndUpdate(
        assignmentId,
        {
          status: "failed",

          errorMessage:
            error.message,

          progress: 0,
        }
      );

      io.to(assignmentId).emit(
        "assignment:failed",
        {
          message:
            error.message ||
            "Generation failed",
        }
      );
    }
  },

  {
    connection:
      redisConnection as any,
  }
);