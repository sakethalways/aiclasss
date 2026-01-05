// API endpoint for storing transcriptions to database
// This is called as transcription data comes in from the client

import { createClient } from "@/lib/supabase/server"
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

    const { lectureId, rawText, timestampMs } = await request.json()

    if (!lectureId || lectureId === "" || !rawText) {
      return NextResponse.json({ success: false }, { status: 200 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(lectureId)) {
      return NextResponse.json({ success: false }, { status: 200 })
    }

    const { data, error } = await supabase
      .from("transcriptions")
      .insert({
        lecture_id: lectureId,
        user_id: user.id,
        raw_text: rawText,
        timestamp_ms: timestampMs || 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Transcription API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save transcription" },
      { status: 500 },
    )
  }
}
