// API endpoint to get the full transcript of a lecture
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lectureId = params.id

    // Get all transcriptions for this lecture
    const { data: transcriptions, error } = await supabase
      .from("transcriptions")
      .select("raw_text")
      .eq("lecture_id", lectureId)
      .order("timestamp_ms", { ascending: true })

    if (error) throw error

    // Combine all transcriptions
    const fullTranscript = transcriptions?.map((t) => t.raw_text).join(" ") || ""

    return NextResponse.json({ fullTranscript })
  } catch (error) {
    console.error("Error fetching transcript:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transcript" },
      { status: 500 },
    )
  }
}
