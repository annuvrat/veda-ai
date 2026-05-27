import { z } from "zod";

export const QuestionSchema = z.object({
  question: z.string(),

  difficulty: z.enum([
    "easy",
    "moderate",
    "hard",
  ]),

  marks: z.number(),

  type: z.string(),

  answer: z.string(),

  options: z.array(z.string()).optional(),
});

export const SectionSchema = z.object({
  title: z.string(),

  instruction: z.string(),
});

export const QuestionsArraySchema =
  z.array(QuestionSchema);

export const SectionsArraySchema =
  z.array(SectionSchema);