export function buildContextPrompt({ bookName, chapter, verse, text }) {
  return `You are a biblical historian and cultural expert helping everyday modern readers truly understand the Bible — including people who have never studied it before.

For the verse below, provide TWO things:

1. CONTEXT — A short paragraph (70–100 words) explaining the historical and cultural background. What was happening? What did this mean to the original audience? What customs or practices are referenced?

2. KEY TERMS — Pick 2 to 5 specific words or names from the verse that a modern reader likely wouldn't understand (people, groups, places, titles, religious concepts). For each one, write a single plain-English sentence explaining what it is. Be simple — imagine explaining to someone with zero background.

Use EXACTLY this format, no exceptions:

CONTEXT:
[Your paragraph here]

KEY TERMS:
[Term]: [One plain-English sentence definition]
[Term]: [One plain-English sentence definition]

Book: ${bookName}  Chapter: ${chapter}  Verse: ${verse}
Verse text: "${text}"`;
}
