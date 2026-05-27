export const buildSectionPrompt = (
  assignment: any
) => {
  return `
Generate an exam paper structure.

Requirements:
- Create sections
- Add instructions
- Organize by question types

Return ONLY valid JSON.

Format:

[
  {
    "title": "Section A",
    "instruction": "Attempt all questions"
  }
]

Assignment Data:
${JSON.stringify(assignment)}
`;
};
export const buildQuestionPrompt = (
  sectionTitle: string,
  config: any,
  instructions: string,
  extractedText?: string
) => {
  return `
Generate ${config.count} questions.

Section:
${sectionTitle}

Question Type:
${config.type}

Marks per Question:
${config.marks}

Instructions:
${instructions}

${extractedText ? `Source Material/Reference Text to generate questions from:\n${extractedText}\n` : ""}

Requirements:
- The "difficulty" field must be strictly one of: "easy", "moderate", or "hard". Do NOT use "medium" or any other values.
- If the "type" is "MCQ" (Multiple Choice Question), you MUST provide an "options" field containing an array of exactly 4 distinct choices to select from. The correct choice must be clearly indicated and explained in the "answer" field.
- For non-MCQ questions (e.g. Short Answer), the "options" field should be omitted or null.
- Include a detailed "answer" field containing the complete correct answer/solution/marking scheme explanation for the question.
- Return ONLY valid JSON matching the format below.

Format:

[
  {
    "question": "Question text here",
    "difficulty": "easy",
    "marks": ${config.marks},
    "type": "${config.type}",
    "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "answer": "Detailed correct option choice or solution explanation here."
  }
]
`;
};