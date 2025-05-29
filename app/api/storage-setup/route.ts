import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

// Route that sets up storage buckets needed by the application
export async function POST(req: NextRequest) {
  console.log("Starting storage setup process")

  try {
    // Create admin client for storage management
    console.log("Creating admin client for Supabase")
    const supabase = await createAdminClient()
    
    // Get existing buckets
    console.log("Fetching existing storage buckets")
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError)
      return NextResponse.json({ 
        success: false, 
        error: bucketsError.message,
        details: bucketsError,
        message: "حدث خطأ أثناء محاولة الحصول على قائمة مجلدات التخزين"
      }, { status: 500 })
    }
    
    console.log("Existing buckets:", buckets?.map(b => b.name) || "none")
    
    const existingBuckets = buckets?.map(bucket => bucket.name) || []
    const results = []
    
    // Create avatars bucket if it doesn't exist
    if (!existingBuckets.includes('avatars')) {
      console.log("Creating 'avatars' bucket")
      try {
        const { data, error } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
        })
        
        if (error) {
          console.error("Error creating avatars bucket:", error)
          results.push({ 
            bucket: 'avatars', 
            success: false, 
            error: error.message,
            details: error 
          })
        } else {
          console.log("Successfully created 'avatars' bucket")
          results.push({ bucket: 'avatars', success: true })
          
          // Update public bucket access
          try {
            console.log("Ensuring bucket is public")
            
            // Update bucket to ensure it's public
            const { error: updateError } = await supabase.storage.updateBucket('avatars', {
              public: true,
              fileSizeLimit: 5242880, // 5MB
              allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
            })
            
            if (updateError) {
              console.error("Error updating bucket visibility:", updateError)
            } else {
              console.log("Successfully updated bucket to be public")
            }
          } catch (policyErr) {
            console.error("Error updating bucket visibility:", policyErr)
          }
        }
      } catch (bucketError: any) {
        console.error("Unexpected error creating bucket:", bucketError)
        results.push({ 
          bucket: 'avatars', 
          success: false, 
          error: bucketError.message || "Unexpected error",
          details: bucketError
        })
      }
    } else {
      console.log("Avatars bucket already exists")
      results.push({ bucket: 'avatars', success: true, message: 'already exists' })
      
      // Ensure the bucket is public
      try {
        console.log("Ensuring existing bucket is public")
        const { error: updateError } = await supabase.storage.updateBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
        })
        
        if (updateError) {
          console.error("Error updating bucket visibility:", updateError)
        } else {
          console.log("Successfully updated bucket to be public")
        }
      } catch (err) {
        console.error("Error ensuring bucket is public:", err)
      }
    }
    
    console.log("Storage setup completed successfully")
    return NextResponse.json({ 
      success: true, 
      results,
      message: "تم إعداد مجلدات التخزين بنجاح"
    })
  } catch (error: any) {
    console.error("Fatal error setting up storage:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Unknown error",
      details: error,
      message: "حدث خطأ غير متوقع أثناء إعداد مجلدات التخزين"
    }, { status: 500 })
  }
} 