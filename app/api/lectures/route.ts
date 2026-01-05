import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, transcript, subject_id } = await request.json()

    if (!title || !transcript) {
      return NextResponse.json({ error: "Title and transcript are required" }, { status: 400 })
    }

    // If subject_id is provided and not null, verify it belongs to the user
    if (subject_id && typeof subject_id === 'string') {
      const { data: subject, error: subjectError } = await supabase
        .from("subjects")
        .select("id")
        .eq("id", subject_id)
        .eq("user_id", user.id)
        .single()

      if (subjectError || !subject) {
        return NextResponse.json({ error: "Subject not found or does not belong to you" }, { status: 404 })
      }
    }

    // Audio blob handling via Vercel Blob can be added later
    const { data, error } = await supabase
      .from("lectures")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        transcript: transcript.trim(),
        audio_url: null,
        duration_ms: null,
        subject_id: subject_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[API] Database error saving lecture:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log(`[API] Lecture created successfully - ID: ${data.id}, Subject: ${subject_id || 'none'}`)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("[API] Lecture creation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
