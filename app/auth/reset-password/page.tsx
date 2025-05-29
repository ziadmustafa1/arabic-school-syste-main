"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card"
import { AlertCircle, Loader2, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isResetMode, setIsResetMode] = useState(false)
  const supabase = createClient()
  
  // Check if we're in password reset mode (with hash params from email link)
  useEffect(() => {
    const checkResetMode = async () => {
      try {
        // Check if we have a hash in the URL
        if (window.location.hash) {
          setIsResetMode(true)
        } else {
          setError("رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية")
        }
      } catch (err) {
        console.error("Error checking reset mode:", err)
      }
    }
    
    checkResetMode()
  }, [])
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة")
      return
    }
    
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون على الأقل 6 أحرف")
      return
    }
    
    try {
      setLoading(true)
      setError("")
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) {
        console.error("Password update error:", error)
        setError(error.message || "حدث خطأ أثناء تحديث كلمة المرور")
        return
      }
      
      // Show success message
      setSuccessMessage("تم تحديث كلمة المرور بنجاح")
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
      
    } catch (error: any) {
      console.error("Password update error:", error)
      setError(error.message || "حدث خطأ أثناء تحديث كلمة المرور")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center flex-col p-4 bg-muted/40">
      <div className="text-center space-y-2 mb-10">
        <img src="/rased-logo.png" alt="راصد التحفيزية" className="mx-auto h-28 w-auto" />
        <h1 className="text-3xl font-bold">إعادة تعيين كلمة المرور</h1>
        <p className="text-muted-foreground">قم بتعيين كلمة مرور جديدة لحسابك</p>
      </div>
      
      <Card className="max-w-md w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">تعيين كلمة مرور جديدة</CardTitle>
          <CardDescription>
            أدخل كلمة المرور الجديدة التي ترغب في استخدامها
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="bg-green-50 border border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                {successMessage}
                <p className="mt-2">سيتم توجيهك لصفحة تسجيل الدخول...</p>
              </AlertDescription>
            </Alert>
          )}
          
          {!isResetMode && !successMessage && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. الرجاء طلب رابط جديد من
                <Link href="/auth/forgot-password" className="text-primary hover:underline mr-1 mr-2">
                  صفحة استعادة كلمة المرور
                </Link>
              </AlertDescription>
            </Alert>
          )}
          
          {isResetMode && !successMessage && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  يجب أن تكون كلمة المرور على الأقل 6 أحرف
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="********"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button
                className="w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري تحديث كلمة المرور...
                  </span>
                ) : (
                  "تغيير كلمة المرور"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            onClick={() => router.push("/auth/login")}
            className="w-full"
          >
            العودة إلى صفحة تسجيل الدخول
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 