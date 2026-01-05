// API endpoint for managing lecture notes
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

    const { lectureId, content } = await request.json()

    if (!lectureId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: existingNote } = await supabase
      .from("lecture_notes")
      .select("id")
      .eq("lecture_id", lectureId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingNote) {
      // Update existing note
      const { data, error } = await supabase
        .from("lecture_notes")
        .update({ content })
        .eq("id", existingNote.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data })
    } else {
      // Create new note
      const { data, error } = await supabase
        .from("lecture_notes")
        .insert({
          lecture_id: lectureId,
          user_id: user.id,
          content,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data })
    }
  } catch (error) {
    console.error("Notes API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save notes" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lectureId = searchParams.get("lectureId")

    if (!lectureId) {
      return NextResponse.json({ error: "Missing lectureId" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("lecture_notes")
      .select("*")
      .eq("lecture_id", lectureId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return NextResponse.json({ data: data || null })
  } catch (error) {
    console.error("Notes GET error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notes" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lectureId, noteId } = await request.json()

    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId" }, { status: 400 })
    }

    const { error } = await supabase.from("lecture_notes").delete().eq("id", noteId).eq("user_id", user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notes DELETE error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete notes" },
      { status: 500 },
    )
  }
}
