const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  error?: {
    message?: string
  }
}

interface Flashcard {
  question: string
  answer: string
  difficulty_level: string
}

interface ExamQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
}

async function callGeminiAPI(prompt: string, retries = 0): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set")
  }

  const maxRetries = 2
  const retryDelay = 2000 * (retries + 1)

  try {
    console.log(`[GeminiService] Making API call (attempt ${retries + 1}/${maxRetries + 1})`)

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[GeminiService] API error (${response.status}):`, errorBody)

      if (response.status === 429) {
        if (retries < maxRetries) {
          console.log(`[GeminiService] Rate limited. Waiting ${retryDelay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return callGeminiAPI(prompt, retries + 1)
        }
        throw new Error("Gemini API quota exceeded. Please try again in a few minutes.")
      }

      if (response.status === 400) {
        console.error(`[GeminiService] Bad request - full error:`, errorBody)
        try {
          const errorJson = JSON.parse(errorBody)
          throw new Error(`Gemini API error: ${errorJson.error?.message || errorBody}`)
        } catch (e) {
          throw new Error(`Gemini API error: Invalid request (${errorBody.substring(0, 100)})`)
        }
      }

      if (response.status === 404) {
        throw new Error("Gemini model not found. Check your API key and region settings.")
      }

      throw new Error(`Gemini API error: ${response.status} - ${errorBody.substring(0, 100)}`)
    }

    const data: GeminiResponse = await response.json()

    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error("Empty response from Gemini API")
    }

    console.log("[GeminiService] API call successful")
    return text
  } catch (error) {
    console.error("[GeminiService] Error:", error)
    throw error
  }
}

async function generateSummary(transcript: string): Promise<{ summary: string; keyPoints: string[] }> {
  // Trim transcript to prevent token overflow
  const trimmedTranscript = transcript.substring(0, 8000)
  
  const prompt = `Analyze this lecture transcript and provide:
1. A comprehensive summary (3-4 paragraphs)
2. 5-7 key points (bullet list)

Transcript:
${trimmedTranscript}

Format your response EXACTLY as follows:
SUMMARY:
[Your 3-4 paragraph summary here]

KEY POINTS:
• [First key point]
• [Second key point]
• [Continue with remaining points]

Generate content in English regardless of the original lecture language.`

  try {
    console.log("[GeminiService] Generating summary...")
    const response = await callGeminiAPI(prompt)
    
    // Parse response
    const summaryMatch = response.match(/SUMMARY:\s*([\s\S]*?)(?:KEY POINTS:|$)/)
    const keyPointsMatch = response.match(/KEY POINTS:\s*([\s\S]*)$/)
    
    const summary = (summaryMatch?.[1] || "").trim()
    let keyPoints: string[] = []
    
    if (keyPointsMatch?.[1]) {
      keyPoints = keyPointsMatch[1]
        .split(/\n/)
        .map(line => line.replace(/^[•\-*]\s*/, "").trim())
        .filter(line => line.length > 0)
        .slice(0, 7)
    }

    if (!summary) {
      throw new Error("Failed to parse summary from response")
    }

    console.log(`[GeminiService] Generated summary (${summary.length} chars) and ${keyPoints.length} key points`)
    return { summary, keyPoints }
  } catch (error) {
    console.error("[GeminiService] Summary generation failed:", error)
    throw error
  }
}

async function generateFlashcards(transcript: string): Promise<Flashcard[]> {
  // Trim transcript to prevent token overflow
  const trimmedTranscript = transcript.substring(0, 8000)
  // Calculate wordCount from trimmed transcript for accurate card count
  const wordCount = trimmedTranscript.split(/\s+/).filter(w => w).length
  // More aggressive ratio: 1 card per 40-50 words (was 80)
  const cardCount = Math.ceil(wordCount / 50)
  // Ensure minimum 5 cards for any content, max 20
  const targetCards = Math.min(Math.max(cardCount, 5), 20)

  console.log(`[GeminiService] Flashcard generation - Original: ${transcript.length} chars, Trimmed: ${trimmedTranscript.length} chars, Words: ${wordCount}, Target cards: ${targetCards}`)

  const prompt = `Create ${targetCards} study flashcards from this lecture. Each flashcard should test understanding of key concepts.

Transcript:
${trimmedTranscript}

For each flashcard, provide:
- A clear question
- A concise answer (1-2 sentences)
- A difficulty level (EASY, MEDIUM, or HARD)

Generate exactly ${targetCards} flashcards. Format EXACTLY as follows (one per line, separated by ---):

QUESTION: [Your question here]
ANSWER: [Your answer here]
DIFFICULTY: EASY
---
QUESTION: [Next question]
ANSWER: [Next answer]
DIFFICULTY: MEDIUM
---

Generate content in English regardless of the original lecture language. IMPORTANT: Use exactly this format with --- as separator.`

  try {
    console.log(`[GeminiService] Generating ${targetCards} flashcards...`)
    const response = await callGeminiAPI(prompt)
    
    console.log(`[GeminiService] Flashcard response length: ${response.length} chars`)
    
    const flashcards: Flashcard[] = []
    const blocks = response.split("---").filter(b => b.trim())

    console.log(`[GeminiService] Found ${blocks.length} flashcard blocks to parse`)

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
        console.log(`[GeminiService] Parsed flashcard ${i + 1}: ${flashcard.question.substring(0, 50)}...`)
      } else {
        console.log(`[GeminiService] Failed to parse flashcard block ${i + 1}`)
      }
    }

    if (flashcards.length === 0) {
      console.error(`[GeminiService] No flashcards parsed. Response preview:`, response.substring(0, 300))
      throw new Error(`No flashcards parsed from response`)
    }

    console.log(`[GeminiService] Successfully generated ${flashcards.length} flashcards`)
    return flashcards
  } catch (error) {
    console.error("[GeminiService] Flashcard generation failed:", error)
    throw error
  }
}

async function generateExamQuestions(transcript: string): Promise<ExamQuestion[]> {
  // Trim transcript to prevent token overflow
  const trimmedTranscript = transcript.substring(0, 8000)
  // Calculate wordCount from trimmed transcript for accurate question count
  const wordCount = trimmedTranscript.split(/\s+/).filter(w => w).length
  // More aggressive ratio: 1 question per 75-100 words (was 150)
  const questionCount = Math.ceil(wordCount / 90)
  // Ensure minimum 3 questions for any content, max 15
  const targetQuestions = Math.min(Math.max(questionCount, 3), 15)

  console.log(`[GeminiService] Exam questions generation - Original: ${transcript.length} chars, Trimmed: ${trimmedTranscript.length} chars, Words: ${wordCount}, Target questions: ${targetQuestions}`)

  const prompt = `Create ${targetQuestions} multiple-choice exam questions based on this lecture.

Transcript:
${trimmedTranscript}

For each question, provide:
- A clear question
- Four answer options (A, B, C, D)
- The correct answer (A, B, C, or D)
- A brief explanation

Generate exactly ${targetQuestions} questions. Format EXACTLY as follows (separated by ---):

QUESTION: [Your question here]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
ANSWER: A
EXPLANATION: [Brief explanation why A is correct]
---
QUESTION: [Next question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
ANSWER: B
EXPLANATION: [Brief explanation]
---

Generate content in English regardless of the original lecture language. IMPORTANT: Use exactly this format with --- as separator.`

  try {
    console.log(`[GeminiService] Generating ${targetQuestions} exam questions...`)
    const response = await callGeminiAPI(prompt)
    
    console.log(`[GeminiService] Exam questions response length: ${response.length} chars`)
    
    const questions: ExamQuestion[] = []
    const blocks = response.split("---").filter(b => b.trim())

    console.log(`[GeminiService] Found ${blocks.length} question blocks to parse`)

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
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
        questions.push(question)
        console.log(`[GeminiService] Parsed question ${i + 1}: ${question.question_text.substring(0, 50)}...`)
      } else {
        console.log(`[GeminiService] Failed to parse question block ${i + 1}`)
      }
    }

    if (questions.length === 0) {
      console.error(`[GeminiService] No exam questions parsed. Response preview:`, response.substring(0, 300))
      throw new Error(`No exam questions parsed from response`)
    }

    console.log(`[GeminiService] Successfully generated ${questions.length} exam questions`)
    return questions
  } catch (error) {
    console.error("[GeminiService] Exam question generation failed:", error)
    throw error
  }
}

export async function generateAllContent(transcript: string): Promise<{
  summary: string
  keyPoints: string[]
  flashcards: Flashcard[]
  examQuestions: ExamQuestion[]
}> {
  console.log("[GeminiService] Starting content generation pipeline...")
  
  try {
    // Generate summary first (most important)
    const { summary, keyPoints } = await generateSummary(transcript)
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate flashcards
    const flashcards = await generateFlashcards(transcript)
    
    // Add delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate exam questions
    const examQuestions = await generateExamQuestions(transcript)

    console.log("[GeminiService] Content generation completed successfully")
    
    return {
      summary,
      keyPoints,
      flashcards,
      examQuestions,
    }
  } catch (error) {
    console.error("[GeminiService] Content generation failed:", error)
    throw error
  }
}

export async function generateFlashcardsOnly(transcript: string): Promise<Flashcard[]> {
  return generateFlashcards(transcript)
}

export async function generateExamQuestionsOnly(transcript: string): Promise<ExamQuestion[]> {
  return generateExamQuestions(transcript)
}
