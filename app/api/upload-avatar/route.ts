import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  console.log("Starting avatar upload process")

  try {
    // Get authentication status using server-side client
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error("Authentication error:", sessionError)
      return NextResponse.json({ 
        success: false, 
        error: "Authentication required",
        message: "يجب تسجيل الدخول لرفع صورة شخصية"
      }, { status: 401 })
    }

    // Get user ID and email
    const userId = session.user.id
    const userEmail = session.user.email

    // Ensure form data is sent
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ 
        success: false,
        error: "No file provided",
        message: "لم يتم تقديم أي ملف"
      }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: "Invalid file type",
        message: "يرجى اختيار صورة بتنسيق JPEG أو PNG أو GIF أو WebP"
      }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: "File too large",
        message: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت"
      }, { status: 400 })
    }

    // Create admin client for storage operations
    console.log("Creating admin client for storage")
    const adminSupabase = await createAdminClient()
    
    // Ensure the avatars bucket exists
    console.log("Checking if avatars bucket exists")
    const { data: buckets } = await adminSupabase.storage.listBuckets()
    
    if (!buckets?.some(bucket => bucket.name === 'avatars')) {
      console.log("Creating avatars bucket")
      const { error: createBucketError } = await adminSupabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      })
      
      if (createBucketError) {
        console.error("Error creating bucket:", createBucketError)
        return NextResponse.json({
          success: false,
          error: createBucketError.message,
          message: "حدث خطأ في إنشاء مجلد التخزين"
        }, { status: 500 })
      }
    }

    // Ensure bucket has correct permissions
    try {
      // Set bucket to public for reads
      const { error: updateError } = await adminSupabase.storage.updateBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      })
      
      if (updateError) {
        console.warn("Error updating bucket:", updateError)
        // Continue anyway
      }
    } catch (err) {
      console.warn("Error setting bucket permissions:", err)
      // Continue anyway
    }

    // Create a unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `profiles/${fileName}`
    
    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)
    
    // Upload file using admin client
    console.log("Uploading file to storage")
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({
        success: false,
        error: uploadError.message,
        message: "حدث خطأ أثناء رفع الصورة"
      }, { status: 500 })
    }
    
    // Get public URL
    console.log("Getting public URL")
    const { data: urlData } = adminSupabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    
    if (!urlData?.publicUrl) {
      console.error("Could not get public URL")
      return NextResponse.json({
        success: false,
        error: "Could not get public URL",
        message: "لم نتمكن من الحصول على رابط للصورة"
      }, { status: 500 })
    }
    
    // Try to update user metadata with the new avatar URL, using client auth
    console.log("Updating user metadata with new avatar URL:", urlData.publicUrl)
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: urlData.publicUrl }
    })
    
    if (updateError) {
      console.error("Error updating user metadata with client auth:", updateError)
      console.log("Attempting alternative update method...")
      
      // Try to update with admin client if available
      try {
        const { data, error } = await adminSupabase.from('users')
          .update({ avatar_url: urlData.publicUrl })
          .eq('id', userId)
        
        if (error) {
          console.error("Error updating user in database:", error)
          // Continue anyway, the frontend will handle it
        }
      } catch (err) {
        console.error("Alternative update failed:", err)
        // Continue anyway
      }
    }
    
    // Success response with the URL
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      message: "تم تحميل الصورة بنجاح"
    })
    
  } catch (error: any) {
    console.error("Avatar upload error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
      message: "حدث خطأ غير متوقع أثناء تحميل الصورة"
    }, { status: 500 })
  }
} 