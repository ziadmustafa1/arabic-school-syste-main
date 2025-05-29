"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, RefreshCw, Database, Key, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function StorageDebugPage() {
  const [loading, setLoading] = useState(true)
  const [buckets, setBuckets] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creatingBucket, setCreatingBucket] = useState(false)
  const supabase = createClient()

  const fetchBuckets = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError("يجب تسجيل الدخول للوصول إلى هذه الصفحة")
        return
      }

      // Get list of storage buckets
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.error("Error fetching buckets:", bucketsError)
        setError(bucketsError.message || "حدث خطأ أثناء جلب بيانات مجلدات التخزين")
        return
      }
      
      setBuckets(bucketsData || [])

    } catch (err: any) {
      console.error("Storage debug error:", err)
      setError(err.message || "حدث خطأ غير متوقع")
    } finally {
      setLoading(false)
    }
  }

  const createAvatarsBucket = async () => {
    try {
      setCreatingBucket(true)
      
      const response = await fetch('/api/storage-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "فشل إنشاء مجلد التخزين")
      }
      
      toast({
        title: "تم إنشاء/التحقق من مجلد التخزين",
        description: "تم إنشاء مجلد التخزين بنجاح أو التأكد من وجوده",
      })
      
      // Refresh buckets list
      await fetchBuckets()
      
    } catch (err: any) {
      console.error("Error creating bucket:", err)
      toast({
        title: "خطأ في إنشاء مجلد التخزين",
        description: err.message || "حدث خطأ أثناء إنشاء مجلد التخزين",
        variant: "destructive",
      })
    } finally {
      setCreatingBucket(false)
    }
  }

  const fixAvatarsBucketPermissions = async () => {
    try {
      setCreatingBucket(true)
      
      toast({
        title: "جاري إصلاح صلاحيات مجلد الصور",
        description: "يرجى الانتظار..."
      })
      
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        throw new Error(bucketsError.message)
      }
      
      const avatarsBucket = bucketsData?.find(bucket => bucket.name === 'avatars')
      
      if (!avatarsBucket) {
        throw new Error("مجلد الصور الشخصية غير موجود")
      }
      
      // Create a test file to verify access
      const testFileContent = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello" in bytes
      const testFilePath = `test-${Date.now()}.txt`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(testFilePath, testFileContent)
      
      if (uploadError) {
        console.log("Upload test failed:", uploadError)
      } else {
        console.log("Upload test succeeded, cleaning up test file")
        await supabase.storage.from('avatars').remove([testFilePath])
      }
      
      // Use server-side API to ensure the bucket is working
      const response = await fetch('/api/upload-avatar/test', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || "فشل اختبار الصلاحيات")
      }
      
      toast({
        title: "تم التحقق من الصلاحيات",
        description: data.message || "تم التحقق من صلاحيات مجلد الصور الشخصية بنجاح",
      })
      
      // Refresh buckets list
      await fetchBuckets()
      
    } catch (err: any) {
      console.error("Error checking permissions:", err)
      toast({
        title: "خطأ في التحقق من الصلاحيات",
        description: err.message || "حدث خطأ أثناء التحقق من صلاحيات مجلد الصور",
        variant: "destructive",
      })
    } finally {
      setCreatingBucket(false)
    }
  }

  useEffect(() => {
    fetchBuckets()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">تصحيح مجلدات التخزين</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              مجلدات التخزين
            </CardTitle>
            <CardDescription>
              قائمة بمجلدات التخزين المتاحة في المشروع
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : buckets.length > 0 ? (
              <div className="space-y-4">
                {buckets.map((bucket) => (
                  <div key={bucket.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-lg">{bucket.name}</h3>
                      <Badge variant={bucket.public ? "default" : "secondary"}>
                        {bucket.public ? "عام" : "خاص"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">المعرّف: </span>
                        <span>{bucket.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">تم إنشاؤه في: </span>
                        <span>{new Date(bucket.created_at).toLocaleDateString("ar-SA")}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <Key className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">
                        {bucket.owner ? `المالك: ${bucket.owner}` : "مملوك للخدمة"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد مجلدات تخزين متاحة
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-2">
            <Button
              onClick={fetchBuckets}
              variant="outline"
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`ml-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث القائمة
            </Button>
            
            <Button
              onClick={createAvatarsBucket}
              disabled={creatingBucket || loading}
              className="w-full"
            >
              {creatingBucket ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="ml-2 h-4 w-4" />
              )}
              إنشاء/فحص مجلد الصور الشخصية
            </Button>
            
            <Button
              onClick={fixAvatarsBucketPermissions}
              disabled={creatingBucket || loading}
              className="w-full"
              variant="secondary"
            >
              <Key className="ml-2 h-4 w-4" />
              إصلاح صلاحيات مجلد الصور الشخصية
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 