// API endpoint for generating AI content from transcripts
import { createClient } from "@/lib/supabase/server"
import { generateAllContent } from "@/lib/gemini-service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lectureId, transcript, title, description } = await request.json()

    if (!lectureId || !transcript) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[API] Generating content for lecture ${lectureId}. Transcript length: ${transcript.length} chars, Word count: ${transcript.split(/\s+/).filter(w => w).length}`)

    // Verify lecture belongs to user
    const { data: lecture, error: lectureError } = await supabase
      .from("lectures")
      .select("id")
      .eq("id", lectureId)
      .eq("user_id", user.id)
      .single()

    if (lectureError || !lecture) {
      return NextResponse.json({ error: "Lecture not found" }, { status: 404 })
    }

    // Delete existing content to allow regeneration
    await Promise.all([
      supabase.from("summaries").delete().eq("lecture_id", lectureId).eq("user_id", user.id),
      supabase.from("flashcards").delete().eq("lecture_id", lectureId).eq("user_id", user.id),
      supabase.from("exam_questions").delete().eq("lecture_id", lectureId).eq("user_id", user.id),
    ])

    // Generate all content with proper error handling
    const generatedContent = await generateAllContent(transcript)
    const { summary, keyPoints, flashcards, examQuestions } = generatedContent

    console.log(
      `[API] Generated content: ${summary.length} char summary, ${flashcards.length} flashcards, ${examQuestions.length} questions`
    )

    // Save summary to database
    const { error: summaryError } = await supabase.from("summaries").insert({
      lecture_id: lectureId,
      user_id: user.id,
      summary_text: summary,
      key_points: keyPoints,
    })

    if (summaryError) throw summaryError

    // Save flashcards to database
    const flashcardInserts = flashcards.map((card) => ({
      lecture_id: lectureId,
      user_id: user.id,
      question: card.question,
      answer: card.answer,
      difficulty_level: card.difficulty_level,
    }))

    if (flashcardInserts.length > 0) {
      const { error: flashcardError } = await supabase.from("flashcards").insert(flashcardInserts)
      if (flashcardError) throw flashcardError
    }

    // Save exam questions to database
    const questionInserts = examQuestions.map((q) => ({
      lecture_id: lectureId,
      user_id: user.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }))

    if (questionInserts.length > 0) {
      const { error: questionError } = await supabase.from("exam_questions").insert(questionInserts)
      if (questionError) throw questionError
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        keyPoints,
        flashcardsCount: flashcards.length,
        questionsCount: examQuestions.length,
      },
    })
  } catch (error) {
    console.error("Content generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate content" },
      { status: 500 },
    )
  }
}
