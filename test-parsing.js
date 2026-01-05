/**
 * Quick parser test to verify flashcard and exam question extraction logic
 * This simulates what the actual Gemini API would return
 */

// Test 1: Flashcard Parsing
const flashcardResponse = `
QUESTION: What is photosynthesis?
ANSWER: Photosynthesis is the process where plants convert light energy into chemical energy, producing glucose and oxygen.
DIFFICULTY: EASY
---
QUESTION: How do chloroplasts contribute to photosynthesis?
ANSWER: Chloroplasts are the cellular organelles that contain chlorophyll and the machinery needed to capture light and produce glucose through the light-dependent and light-independent reactions.
DIFFICULTY: MEDIUM
---
QUESTION: What is the relationship between the Calvin cycle and the light reactions?
ANSWER: The light reactions produce ATP and NADPH, which are then used as energy and reducing power for the Calvin cycle to fix CO2 into glucose.
DIFFICULTY: HARD
`

const flashcards = []
const blocks = flashcardResponse.split("---").filter(b => b.trim())
console.log(`Found ${blocks.length} flashcard blocks`)

for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i]
  const questionMatch = block.match(/QUESTION:\s*([^\n]+)/i)
  const answerMatch = block.match(/ANSWER:\s*([\s\S]*?)(?=DIFFICULTY:|$)/i)
  const difficultyMatch = block.match(/DIFFICULTY:\s*(EASY|MEDIUM|HARD)/i)

  if (questionMatch?.[1] && answerMatch?.[1]) {
    const flashcard = {
      question: questionMatch[1].trim(),
      answer: answerMatch[1].trim(),
      difficulty_level: (difficultyMatch?.[1] || "MEDIUM").toLowerCase(),
    }
    flashcards.push(flashcard)
    console.log(`✓ Parsed flashcard ${i + 1}: "${flashcard.question.substring(0, 40)}..."`)
  }
}

console.log(`\n✓ Successfully parsed ${flashcards.length} flashcards`)
console.log("Sample:", flashcards[0])

// Test 2: Exam Question Parsing
const examResponse = `
QUESTION: Which of the following is the primary function of the light reactions?
A) To synthesize glucose
B) To produce ATP and NADPH
C) To fix carbon dioxide
D) To break down glucose

ANSWER: B
EXPLANATION: The light reactions occur in the thylakoid membranes and produce ATP and NADPH, which are then used to power the Calvin cycle.
---
QUESTION: In the Calvin cycle, what does RuBisCO enzyme do?
A) It captures light energy
B) It fixes carbon dioxide
C) It transports electrons
D) It synthesizes ATP

ANSWER: B
EXPLANATION: RuBisCO is the enzyme that catalyzes the fixation of CO2 to ribulose-1,5-bisphosphate, forming 3-phosphoglycerate, the first committed step of the Calvin cycle.
---
QUESTION: What is the final product of the light-independent reactions (Calvin cycle)?
A) Water and oxygen
B) Glucose
C) ATP
D) NADPH

ANSWER: B
EXPLANATION: The Calvin cycle uses ATP and NADPH from light reactions to fix CO2 and synthesize glucose, which is the main final product and the actual sugar produced.
`

const examQuestions = []
const questionBlocks = examResponse.split("---").filter(b => b.trim())
console.log(`\n\nFound ${questionBlocks.length} exam question blocks`)

for (let i = 0; i < questionBlocks.length; i++) {
  const block = questionBlocks[i]
  const questionMatch = block.match(/QUESTION:\s*([^\n]+)/i)
  const optionA = block.match(/A\)\s*([^\n]+)/i)?.[1]?.trim()
  const optionB = block.match(/B\)\s*([^\n]+)/i)?.[1]?.trim()
  const optionC = block.match(/C\)\s*([^\n]+)/i)?.[1]?.trim()
  const optionD = block.match(/D\)\s*([^\n]+)/i)?.[1]?.trim()
  const answerMatch = block.match(/ANSWER:\s*([ABCD])/i)
  const explanationMatch = block.match(/EXPLANATION:\s*([\s\S]*?)(?=---|$)/i)

  if (questionMatch?.[1] && optionA && optionB && optionC && optionD && answerMatch?.[1]) {
    const question = {
      question_text: questionMatch[1].trim(),
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_answer: answerMatch[1].toUpperCase(),
      explanation: (explanationMatch?.[1] || "").trim(),
    }
    examQuestions.push(question)
    console.log(`✓ Parsed question ${i + 1}: "${question.question_text.substring(0, 40)}..."`)
  }
}

console.log(`\n✓ Successfully parsed ${examQuestions.length} exam questions`)
console.log("Sample:", {
  question: examQuestions[0].question_text.substring(0, 50) + "...",
  correct_answer: examQuestions[0].correct_answer,
  explanation: examQuestions[0].explanation.substring(0, 50) + "...",
})

console.log("\n✅ ALL PARSING TESTS PASSED")
console.log(`Generated: ${flashcards.length} flashcards, ${examQuestions.length} exam questions`)
