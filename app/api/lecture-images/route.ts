import { createClient } from "@/lib/supabase/server"
import { put, del } from "@vercel/blob"
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const lectureId = formData.get("lectureId") as string

    if (!file || !lectureId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check image limit
    const { data: existingImages, error: countError } = await supabase
      .from("lecture_images")
      .select("id")
      .eq("lecture_id", lectureId)
      .eq("user_id", user.id)

    if (countError) throw countError

    if (existingImages && existingImages.length >= 5) {
      return NextResponse.json({ error: "Maximum 5 images per lecture" }, { status: 400 })
    }

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

    // Upload to Vercel Blob
    const fileName = `${lectureId}/${Date.now()}-${file.name}`
    const blob = await put(fileName, file, {
      access: "public",
    })

    // Save to database
    const { data: imageData, error: insertError } = await supabase
      .from("lecture_images")
      .insert({
        lecture_id: lectureId,
        user_id: user.id,
        file_path: blob.url,
        file_size: file.size,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ success: true, data: imageData })
  } catch (error) {
    console.error("[v0] Image upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
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

    const { imageId, lectureId } = await request.json()

    if (!imageId || !lectureId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify image belongs to user
    const { data: image, error: imageError } = await supabase
      .from("lecture_images")
      .select("file_path")
      .eq("id", imageId)
      .eq("user_id", user.id)
      .single()

    if (imageError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // Delete from Blob storage
    try {
      await del(image.file_path)
    } catch (e) {
      console.error("[v0] Failed to delete blob:", e)
      // Continue anyway to delete from database
    }

    // Delete from database
    const { error: deleteError } = await supabase.from("lecture_images").delete().eq("id", imageId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Image delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete image" },
      { status: 500 },
    )
  }
}
