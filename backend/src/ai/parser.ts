export const extractJSON = (
  content: string
) => {
  const match =
    content.match(/\[[\s\S]*\]/);

  if (!match) {
    throw new Error(
      "No valid JSON found"
    );
  }

  return JSON.parse(match[0]);
};