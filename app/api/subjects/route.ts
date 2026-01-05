import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: subjects, error } = await supabase
      .from("subjects")
      .select("id, name, description, color, icon, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: subjects }, { status: 200 })
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subjects" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, color = "#3B82F6", icon = "BookOpen" } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 })
    }

    const { data: subject, error } = await supabase
      .from("subjects")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color,
        icon,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          { error: "You already have a subject with this name" },
          { status: 409 },
        )
      }
      throw error
    }

    console.log(`[API] Created subject: ${subject.id} for user ${user.id}`)
    return NextResponse.json({ data: subject }, { status: 201 })
  } catch (error) {
    console.error("Error creating subject:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subject" },
      { status: 500 },
    )
  }
}
