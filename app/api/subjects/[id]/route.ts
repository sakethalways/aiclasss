import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: subject, error } = await supabase
      .from("subjects")
      .select("id, name, description, color, icon, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ data: subject }, { status: 200 })
  } catch (error) {
    console.error("Error fetching subject:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subject" },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify subject belongs to user
    const { data: existingSubject, error: fetchError } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    const { name, description, color, icon } = await request.json()

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color !== undefined) updateData.color = color
    if (icon !== undefined) updateData.icon = icon

    const { data: subject, error } = await supabase
      .from("subjects")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
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

    console.log(`[API] Updated subject: ${id}`)
    return NextResponse.json({ data: subject }, { status: 200 })
  } catch (error) {
    console.error("Error updating subject:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subject" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify subject belongs to user
    const { data: existingSubject, error: fetchError } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    const { error } = await supabase.from("subjects").delete().eq("id", id).eq("user_id", user.id)

    if (error) throw error

    console.log(`[API] Deleted subject: ${id}`)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error deleting subject:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete subject" },
      { status: 500 },
    )
  }
}
