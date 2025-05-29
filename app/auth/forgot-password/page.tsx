"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card"
import { AlertCircle, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError("الرجاء إدخال عنوان البريد الإلكتروني")
      return
    }
    
    try {
      setLoading(true)
      setError("")
      
      // Request password reset email through Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) {
        console.error("Password reset error:", error)
        setError(error.message || "حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور")
        return
      }
      
      // Show success message
      setSuccessMessage(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}. الرجاء التحقق من البريد الإلكتروني الخاص بك.`)
      setEmail("")
      
    } catch (error: any) {
      console.error("Password reset error:", error)
      setError(error.message || "حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center flex-col p-4 bg-muted/40">
      <div className="text-center space-y-2 mb-10">
        <img src="/rased-logo.png" alt="راصد التحفيزية" className="mx-auto h-28 w-auto" />
        <h1 className="text-3xl font-bold">استعادة كلمة المرور</h1>
        <p className="text-muted-foreground">الرجاء إدخال بريدك الإلكتروني لاستعادة كلمة المرور</p>
      </div>
      
      <Card className="max-w-md w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">نسيت كلمة المرور؟</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وسنرسل إليك رابطاً لإعادة تعيين كلمة المرور
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
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                placeholder="example@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || !!successMessage}
                required
              />
            </div>
            
            <Button
              className="w-full"
              type="submit"
              disabled={loading || !!successMessage}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري إرسال الرابط...
                </span>
              ) : (
                "إرسال رابط إعادة التعيين"
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button variant="ghost" onClick={() => router.push("/auth/login")} className="w-full">
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة إلى تسجيل الدخول
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}