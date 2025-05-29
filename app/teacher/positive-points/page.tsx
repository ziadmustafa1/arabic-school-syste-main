"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { 
  Award, 
  Loader2, 
  Search,
  Check,
  Plus,
  AlertTriangle
} from "lucide-react"

type CategoryItem = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  points: number;
  is_active: boolean;
}

export default function PositivePointsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([])
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<CategoryItem[]>([])
  const [formData, setFormData] = useState({
    categoryId: "none",
    itemId: "none",
    points: 0,
    description: "",
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("id, full_name, user_code")
          .eq("role_id", 1) // Only students
          .order("full_name")

        if (studentsError) throw studentsError

        // Fetch positive point categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("point_categories")
          .select("*")
          .eq("is_positive", true)
          .order("name")

        if (categoriesError) throw categoriesError

        setStudents(studentsData || [])
        setCategories(categoriesData || [])

        // Fetch all category items
        const { data: itemsData, error: itemsError } = await supabase
          .from("point_category_items")
          .select("*")
          .order("name")

        if (itemsError) throw itemsError
        
        setCategoryItems(itemsData || [])
      } catch (error: any) {
        toast({
          title: "خطأ في تحميل البيانات",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "points" ? Number(value) : value,
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, categoryId: value, itemId: "none" }))
    
    // Filter category items for this category
    if (value && value !== "none") {
      const filteredItems = categoryItems.filter(
        item => item.category_id.toString() === value && item.is_active
      )
      setSelectedCategoryItems(filteredItems)
    } else {
      setSelectedCategoryItems([])
    }
    
    // If a category is selected, use its default points
    if (value && value !== "none") {
      const selectedCategory = categories.find((category) => category.id.toString() === value)
      if (selectedCategory) {
        setFormData((prev) => ({ ...prev, points: selectedCategory.default_points }))
      }
    } else {
      setFormData((prev) => ({ ...prev, points: 0 }))
    }
  }

  const handleItemSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, itemId: value }))
    
    // If an item is selected, use its points
    if (value && value !== "none") {
      const selectedItem = categoryItems.find((item) => item.id.toString() === value)
      if (selectedItem) {
        setFormData((prev) => ({ ...prev, points: selectedItem.points }))
      }
    } else {
      // If no item is selected but category is, use category default points
      if (formData.categoryId && formData.categoryId !== "none") {
        const selectedCategory = categories.find((category) => category.id.toString() === formData.categoryId)
        if (selectedCategory) {
          setFormData((prev) => ({ ...prev, points: selectedCategory.default_points }))
        }
      }
    }
  }

  const toggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId))
    } else {
      setSelectedStudents([...selectedStudents, studentId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedStudents.length === 0) {
      toast({
        title: "لم يتم اختيار طلاب",
        description: "يرجى اختيار طالب واحد على الأقل",
        variant: "destructive",
      })
      return
    }

    if (formData.categoryId === "none" && formData.points <= 0) {
      toast({
        title: "بيانات غير صالحة",
        description: "يرجى اختيار فئة نقاط أو إدخال قيمة للنقاط",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("يجب تسجيل الدخول")
      
      // Determine points to add based on category/item
      let pointsToAdd = formData.points
      let description = formData.description
      let categoryId = formData.categoryId !== "none" ? formData.categoryId : null
      
      // If item is selected, use item information
      if (formData.itemId !== "none") {
        const selectedItem = categoryItems.find((item) => item.id.toString() === formData.itemId)
        if (selectedItem) {
          pointsToAdd = selectedItem.points
          // Append item name to description if not already provided
          if (!description) {
            description = selectedItem.name
          }
        }
      } else if (formData.categoryId !== "none") {
        // If category but no item is selected
        const selectedCategory = categories.find((c) => c.id.toString() === formData.categoryId)
        if (selectedCategory && (!formData.points || formData.points === 0)) {
          pointsToAdd = selectedCategory.default_points
        }
      }

      // Create transactions for each student
      const transactions = selectedStudents.map((studentId) => ({
        user_id: studentId,
        points: pointsToAdd,
        is_positive: true,
        created_by: userData.user.id,
        description: description,
        category_id: categoryId,
      }))

      const { error: pointsError } = await supabase.from("points_transactions").insert(transactions)
      if (pointsError) throw pointsError

      // Add notifications for all students
      const notifications = selectedStudents.map((studentId) => ({
        user_id: studentId,
        title: "إضافة نقاط",
        content: `تم إضافة ${pointsToAdd} نقطة ${description ? `(${description})` : ""}`,
      }))

      await supabase.from("notifications").insert(notifications)

      toast({
        title: "تمت العملية بنجاح",
        description: `تم إضافة النقاط بنجاح لـ ${selectedStudents.length} طالب`,
      })

      // Reset form
      setFormData({
        categoryId: "none",
        itemId: "none",
        points: 0,
        description: "",
      })
      setSelectedStudents([])
    } catch (error: any) {
      toast({
        title: "خطأ في تنفيذ العملية",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.user_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إضافة نقاط إيجابية</h1>
          <p className="text-muted-foreground">
            إضافة نقاط إيجابية للطلاب بناءً على تميزهم والتزامهم بقوانين المدرسة
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Points Form */}
        <Card>
          <CardHeader>
            <CardTitle>إضافة نقاط</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">فئة النقاط</Label>
                <Select value={formData.categoryId} onValueChange={handleSelectChange}>
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="اختر فئة النقاط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فئة</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name} ({category.default_points} نقطة)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.categoryId !== "none" && selectedCategoryItems.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="itemId">البند</Label>
                  <Select value={formData.itemId} onValueChange={handleItemSelectChange}>
                    <SelectTrigger id="itemId">
                      <SelectValue placeholder="اختر البند" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون بند محدد</SelectItem>
                      {selectedCategoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} ({item.points} نقطة)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="points">
                  عدد النقاط {formData.categoryId !== "none" && "(اختياري، سيتم استخدام القيمة الافتراضية)"}
                </Label>
                <Input
                  id="points"
                  name="points"
                  type="number"
                  min="0"
                  value={formData.points}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="إضافة وصف للنقاط المضافة..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة النقاط
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Students Selection */}
        <Card>
          <CardHeader className="space-y-0 pb-3">
            <CardTitle className="text-lg">اختيار الطلاب</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن طالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="p-2 max-h-[350px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        selectedStudents.includes(student.id)
                          ? "bg-primary/20"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.user_code}
                        </div>
                      </div>
                      {selectedStudents.includes(student.id) && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-muted/50">
              <div className="text-sm">
                {selectedStudents.length} طالب محدد من أصل {students.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
