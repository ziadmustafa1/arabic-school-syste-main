import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  console.log("Testing avatar upload permissions")

  try {
    // Create admin client for storage operations
    console.log("Creating admin client for storage")
    const adminSupabase = await createAdminClient()
    
    // Ensure the avatars bucket exists
    console.log("Checking if avatars bucket exists")
    const { data: buckets, error: bucketsError } = await adminSupabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError)
      return NextResponse.json({ 
        success: false, 
        error: bucketsError.message,
        message: "خطأ في قراءة مجلدات التخزين"
      }, { status: 500 })
    }
    
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
          message: "خطأ في إنشاء مجلد الصور"
        }, { status: 500 })
      }
    } else {
      // Update the existing bucket to be public
      console.log("Updating avatars bucket to be public")
      const { error: updateError } = await adminSupabase.storage.updateBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      })
      
      if (updateError) {
        console.error("Error updating bucket:", updateError)
        return NextResponse.json({
          success: false,
          error: updateError.message,
          message: "خطأ في تحديث إعدادات مجلد الصور"
        }, { status: 500 })
      }
    }
    
    // Create a test file to verify access
    console.log("Testing file upload to bucket")
    const testFileContent = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello" in bytes
    const testFilePath = `test-${Date.now()}.txt`
    
    const { error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(testFilePath, testFileContent, {
        contentType: 'text/plain',
        upsert: true
      })
    
    if (uploadError) {
      console.error("Upload test failed:", uploadError)
      return NextResponse.json({
        success: false,
        error: uploadError.message,
        message: "فشل في اختبار تحميل الملفات"
      }, { status: 500 })
    }
    
    // Get URL for the test file to verify public access
    const { data: urlData } = adminSupabase.storage
      .from('avatars')
      .getPublicUrl(testFilePath)
    
    // Clean up test file
    console.log("Cleaning up test file")
    await adminSupabase.storage.from('avatars').remove([testFilePath])
    
    return NextResponse.json({
      success: true,
      message: "تم التحقق من صلاحيات مجلد الصور الشخصية بنجاح",
      test_url: urlData?.publicUrl || null
    })
    
  } catch (error: any) {
    console.error("Avatar permissions test error:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
      message: "حدث خطأ غير متوقع أثناء اختبار الصلاحيات"
    }, { status: 500 })
  }
} 