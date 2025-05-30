"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { batchAddPoints } from "@/app/actions/points-enhanced"
import { getCategories } from "@/app/actions/points-categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import toast from "react-hot-toast";
import { Loader2, Plus, TrendingUp, TrendingDown, Users, Award } from "lucide-react"
import { MultiUserSelector } from "@/components/ui/multi-user-selector"
import { getCurrentUser } from "@/lib/utils/auth-compat"

// Add type definitions for the database response
type DbRestrictedPoint = {
  id: number
  user_id: string
  category_id: number
  points: number
  created_at: string
  is_resolved: boolean
  created_by: string
  users: {
    full_name: string
    user_code: string
  }
  point_categories: {
    name: string
  }
  point_category_items?: {
    id: number
    name: string
  }[]
}

type RestrictedPoint = {
  id: number
  user_id: string
  category_id: number
  points: number
  created_at: string
  is_resolved: boolean
  created_by: string
  user_full_name: string
  user_code: string
  category_name: string
  point_category_items?: {
    id: number
    name: string
  }[]
}

// Define a type for category data
interface Category {
  id: number;
  name: string;
  default_points: number;
  is_positive: boolean;
}

// Define a type for category item
interface CategoryItem {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  points: number;
  is_active: boolean;
}

export default function PointsManagementPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([])
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<CategoryItem[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    positivePoints: 0,
    negativePoints: 0,
    activeUsers: 0,
  })
  const [formData, setFormData] = useState({
    userCodes: "",
    points: 0,
    isPositive: true,
    categoryId: "",
    itemId: "",
    description: "",
  })
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Fetch categories directly from Supabase
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("point_categories")
          .select("*")
          .order("name");

        if (categoriesError) {
          console.error("Error fetching categories:", categoriesError);
          toast.error("حدث خطأ أثناء تحميل فئات النقاط");
        } else {
          setCategories(categoriesData || []);
        }

        // Fetch category items
        try {
          const { data: itemsData, error: itemsError } = await supabase
            .from("point_category_items")
            .select("*")
            .order("name");

          if (itemsError) {
            throw itemsError;
          }
          
          setCategoryItems(itemsData || []);
        } catch (itemsError: any) {
          console.error("Error fetching category items:", itemsError);
          toast.error(itemsError.message || "حدث خطأ أثناء تحميل بنود فئات النقاط");
        }

        try {
          // Attempt to fetch statistics
          const { data: statsData, error: statsError } = await supabase.rpc("get_points_system_stats")

          if (statsError) {
            console.error("Stats error:", statsError)
            // Set default stats values if RPC fails
            setStats({
              totalUsers: 0,
              totalPoints: 0,
              positivePoints: 0,
              negativePoints: 0,
              activeUsers: 0,
            })
          } else if (statsData && statsData[0]) {
            setStats({
              totalUsers: statsData[0].total_users || 0,
              totalPoints: statsData[0].total_points || 0,
              positivePoints: statsData[0].positive_points || 0,
              negativePoints: statsData[0].negative_points || 0,
              activeUsers: statsData[0].active_users || 0,
            })
          }
        } catch (statsError) {
          console.error("Error fetching stats:", statsError)
          // Set default stats values if RPC throws an exception
          setStats({
            totalUsers: 0,
            totalPoints: 0,
            positivePoints: 0,
            negativePoints: 0,
            activeUsers: 0,
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
          toast.error("حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, []) // Remove supabase from dependency array

  useEffect(() => {
    getCurrentUser().then(console.log);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "points" ? Number(value) : value,
    }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ 
      ...prev, 
      isPositive: checked,
      categoryId: "", // Reset category when switching type
      itemId: "", // Reset item when switching type
      points: 0 // Reset points when switching type
    }))
    setSelectedCategoryItems([]) // Reset selected items
  }

  const handleSelectChange = (value: string) => {
    if (value === "none") {
      setFormData(prev => ({ ...prev, categoryId: "", itemId: "" }));
      setSelectedCategoryItems([]);
      return;
    }
    
    if (value) {
      const selectedCategory = categories.find(category => category.id.toString() === value);
      
      // Filter items for this category
      const filteredItems = categoryItems.filter(
        item => item.category_id.toString() === value
      );
      setSelectedCategoryItems(filteredItems);
      
      if (selectedCategory) {
        setFormData(prev => ({ 
          ...prev, 
          categoryId: value,
          itemId: "",
          points: selectedCategory.default_points,
          isPositive: selectedCategory.is_positive
        }));
      } else {
        setFormData(prev => ({ ...prev, categoryId: value, itemId: "" }));
      }
    } else {
      setFormData(prev => ({ ...prev, categoryId: value, itemId: "" }));
      setSelectedCategoryItems([]);
    }
  }

  const handleItemSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, itemId: value }));
    
    // If an item is selected, use its points
    if (value && value !== "none") {
      const selectedItem = categoryItems.find(item => item.id.toString() === value);
      if (selectedItem) {
        setFormData(prev => ({ ...prev, points: selectedItem.points }));
      }
    } else if (formData.categoryId && formData.categoryId !== "none") {
      // If no item is selected but category is, use category default points
      const selectedCategory = categories.find(category => category.id.toString() === formData.categoryId);
      if (selectedCategory) {
        setFormData(prev => ({ ...prev, points: selectedCategory.default_points }));
      }
    }
  };

  const handleMultiUserChange = (userIds: string[]) => {
    setSelectedUserIds(userIds)
    // Also update formData.userCodes here for consistency, comma-separated
    setFormData(prev => ({ ...prev, userCodes: userIds.join(',') }));
  }

  const handleUserCodesChange = (codes: string) => {
    // This handler will be removed later when the textarea is replaced
    setFormData(prev => ({ ...prev, userCodes: codes }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Add more detailed validation messages
      if (selectedUserIds.length === 0) {
        toast.error("يرجى اختيار مستخدم واحد على الأقل")
        return
      }

      if (!formData.points || formData.points <= 0) {
        toast.error("يجب أن تكون قيمة النقاط أكبر من صفر")
        return
      }

      // Get user codes for the selected user IDs
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("user_code")
        .in("id", selectedUserIds)

      if (usersError) {
        throw new Error("حدث خطأ أثناء جلب بيانات المستخدمين")
      }

      if (!users || users.length === 0) {
        throw new Error("لم يتم العثور على بيانات المستخدمين المحددين")
      }

      const userCodes = users.map(user => user.user_code).filter(Boolean).join(',')

      // Log the data being sent for debugging
      console.log("Sending data:", {
        userCodes,
        points: formData.points,
        isPositive: formData.isPositive,
        categoryId: formData.categoryId,
        itemId: formData.itemId,
        description: formData.description
      })

      const formDataObj = new FormData()
      formDataObj.append("userCodes", userCodes)
      formDataObj.append("points", formData.points.toString())
      formDataObj.append("isPositive", formData.isPositive.toString())
      formDataObj.append("categoryId", formData.categoryId)
      formDataObj.append("itemId", formData.itemId)
      formDataObj.append("description", formData.description)

      const result = await batchAddPoints(formDataObj)

      if (!result.success) {
        console.error("Error from batchAddPoints:", result)
        throw new Error(result.message || "حدث خطأ غير معروف أثناء إضافة النقاط")
      }

      toast.success(result.message || "تمت إضافة/خصم النقاط للمستخدمين المحددين")

      // Reset form
      setFormData({
        userCodes: "",
        points: 0,
        isPositive: true,
        categoryId: "",
        itemId: "",
        description: "",
      })
      setSelectedUserIds([])
      setSelectedCategoryItems([])

      // Show additional info if there are missing user codes
      if (result.data?.missingUserCodes && result.data.missingUserCodes.length > 0) {
        toast.error(`لم يتم العثور على بعض رموز المستخدمين: ${result.data.missingUserCodes.join(", ")}`)
      }
      
      // Show additional info if points were successfully added
      if (result.data?.processedCount) {
        toast.success(`تم إضافة ${formData.isPositive ? "نقاط إيجابية" : "نقاط سلبية"} لـ ${result.data.processedCount} مستخدم بنجاح`)
      }
    } catch (error: any) {
      console.error("Error in handleSubmit:", error)
      toast.error(error.message || "حدث خطأ أثناء تنفيذ العملية. يرجى التحقق من البيانات والمحاولة مرة أخرى")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2">جاري تحميل البيانات...</span>
        </div>
    )
  }

  return (
    <div className="container mx-auto p-2 sm:p-4">
        <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-6">إدارة النقاط</h1>

        <div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4 mb-3 sm:mb-6">
          <Card>
            <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium">إجمالي المستخدمين</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <Users className="h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground" />
                <p className="text-lg sm:text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium">إجمالي النقاط</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <Award className="h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground" />
                <p className="text-lg sm:text-2xl font-bold">{stats.totalPoints}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium">النقاط الإيجابية</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5 text-green-500" />
                <p className="text-lg sm:text-2xl font-bold text-green-500">{stats.positivePoints}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium">النقاط السلبية</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <TrendingDown className="h-4 sm:h-5 w-4 sm:w-5 text-red-500" />
                <p className="text-lg sm:text-2xl font-bold text-red-500">{stats.negativePoints}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="add" className="mb-3 sm:mb-6">
          <TabsList className="mb-3 sm:mb-4 w-full flex flex-wrap">
            <TabsTrigger value="add" className="flex-1 text-xs sm:text-sm">إضافة نقاط</TabsTrigger>
            <TabsTrigger value="restrictions" className="flex-1 text-xs sm:text-sm">النقاط المقيدة</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs sm:text-sm">سجل النقاط</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <Card>
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
                <CardTitle className="text-sm sm:text-lg">إضافة/خصم نقاط متعددة</CardTitle>
                <CardDescription className="text-xs sm:text-sm">أضف أو اخصم نقاط لعدة مستخدمين دفعة واحدة</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-selector" className="text-sm">اختيار المستخدمين</Label>
                    <MultiUserSelector 
                      values={selectedUserIds}
                      onChange={handleMultiUserChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      اختر المستخدمين لإضافة نقاط للطلاب أو المعلمين أو أولياء الأمور.
                    </p>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryType" className="text-sm">فئة النقاط</Label>
                      <Select
                        value={formData.isPositive ? "positive" : "negative"}
                        onValueChange={(value) => handleSwitchChange(value === "positive")}
                      >
                        <SelectTrigger className="text-sm h-8 sm:h-9">
                          <SelectValue placeholder="اختر فئة النقاط" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive" className="text-sm text-green-600">دعم إيجابي</SelectItem>
                          <SelectItem value="negative" className="text-sm text-red-600">حسم سلبي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categoryId" className="text-sm">تصنيف النقاط</Label>
                      <Select
                        value={formData.categoryId || "none"}
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger className="text-sm h-8 sm:h-9">
                          <SelectValue placeholder="اختر تصنيف النقاط" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-sm">اختر التصنيف</SelectItem>
                          {categories
                            .filter(category => category.is_positive === formData.isPositive)
                            .map(category => (
                              <SelectItem key={category.id} value={category.id.toString()} className="text-sm">
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="itemId" className="text-sm">بند النقاط</Label>
                      <Select
                        value={formData.itemId || "none"}
                        onValueChange={handleItemSelectChange}
                        disabled={!formData.categoryId || formData.categoryId === "none"}
                      >
                        <SelectTrigger className="text-sm h-8 sm:h-9">
                          <SelectValue placeholder="اختر بند النقاط" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-sm">اختر البند</SelectItem>
                          {selectedCategoryItems.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()} className="text-sm">
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.categoryId && formData.categoryId !== "none" && selectedCategoryItems.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          لا توجد بنود مضافة لهذا التصنيف
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="points" className="text-sm">عدد النقاط {formData.categoryId && "(اختياري، سيتم استخدام القيمة الافتراضية)"}</Label>
                      <Input
                        id="points"
                        name="points"
                        type="number"
                        min="0"
                        placeholder="أدخل عدد النقاط"
                        value={formData.points || ""}
                        onChange={handleChange}
                        className="text-sm h-8 sm:h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 flex-row-reverse">
                        <Label htmlFor="isPositive" className="text-sm ml-2">إضافة نقاط (تشغيل) / خصم نقاط (إيقاف)</Label>
                        <Switch
                          id="isPositive"
                          checked={formData.isPositive}
                          onCheckedChange={handleSwitchChange}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.isPositive
                          ? "سيتم إضافة نقاط إيجابية للمستخدمين المحددين"
                          : "سيتم خصم نقاط من المستخدمين المحددين"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm">الوصف (اختياري)</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="أدخل وصفاً للعملية"
                        value={formData.description}
                        onChange={handleChange}
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center sm:justify-end px-3 sm:px-6 pb-3 pt-0">
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto text-sm h-8 sm:h-9"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>تنفيذ العملية</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions">
            <RestrictionsManagementView />
          </TabsContent>

          <TabsContent value="history">
            <PointsHistoryView />
          </TabsContent>
        </Tabs>
      </div>
  )
}

function PointsHistoryView() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [filter, setFilter] = useState({
    period: "week",
    category: "",
    type: "all",
  })

  useEffect(() => {
    fetchTransactions()
  }, [filter])

  async function fetchTransactions() {
    setIsLoading(true)
    try {
      let query = supabase
        .from("points_transactions")
        .select(`
          id,
          points,
          is_positive,
          description,
          created_at,
          users!points_transactions_user_id_fkey(id, full_name, user_code),
          creator:users!points_transactions_created_by_fkey(full_name),
          point_categories(id, name),
          item:point_category_items!points_transactions_item_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      // Apply period filter
      const now = new Date()
      let startDate: Date
      switch (filter.period) {
        case "day":
          startDate = new Date(now.setHours(0, 0, 0, 0))
          query = query.gte("created_at", startDate.toISOString())
          break
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7))
          query = query.gte("created_at", startDate.toISOString())
          break
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          query = query.gte("created_at", startDate.toISOString())
          break
        case "year":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1))
          query = query.gte("created_at", startDate.toISOString())
          break
      }

      // Apply category filter
      if (filter.category) {
        query = query.eq("category_id", filter.category)
      }

      // Apply type filter
      if (filter.type === "positive") {
        query = query.eq("is_positive", true)
      } else if (filter.type === "negative") {
        query = query.eq("is_positive", false)
      }

      const { data, error } = await query

      if (error) throw error

      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("حدث خطأ أثناء تحميل سجل النقاط. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
        <CardTitle className="text-base sm:text-lg">سجل معاملات النقاط</CardTitle>
        <CardDescription className="text-xs sm:text-sm">عرض سجل معاملات النقاط في النظام</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
        <div className="mb-4 sm:mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="w-full">
            <Label htmlFor="period" className="mb-2 block text-sm">
              الفترة الزمنية
            </Label>
            <Select value={filter.period} onValueChange={(value) => handleFilterChange("period", value)}>
              <SelectTrigger id="period" className="text-sm h-9">
                <SelectValue placeholder="اختر الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day" className="text-sm">اليوم</SelectItem>
                <SelectItem value="week" className="text-sm">آخر أسبوع</SelectItem>
                <SelectItem value="month" className="text-sm">آخر شهر</SelectItem>
                <SelectItem value="year" className="text-sm">آخر سنة</SelectItem>
                <SelectItem value="all_time" className="text-sm">الكل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Label htmlFor="type" className="mb-2 block text-sm">
              نوع المعاملة
            </Label>
            <Select value={filter.type} onValueChange={(value) => handleFilterChange("type", value)}>
              <SelectTrigger id="type" className="text-sm h-9">
                <SelectValue placeholder="اختر نوع المعاملة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">الكل</SelectItem>
                <SelectItem value="positive" className="text-sm">إيجابي</SelectItem>
                <SelectItem value="negative" className="text-sm">سلبي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Button
              variant="outline"
              className="mt-8 w-full text-sm h-9"
              onClick={() => {
                setFilter({
                  period: "week",
                  category: "",
                  type: "all",
                })
              }}
            >
              إعادة تعيين الفلتر
            </Button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد معاملات في السجل</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 sm:p-3 text-center">المستخدم</th>
                    <th className="p-2 sm:p-3 text-center">النقاط</th>
                    <th className="p-2 sm:p-3 text-center">الوصف</th>
                    <th className="p-2 sm:p-3 text-center">الفئة</th>
                    <th className="p-2 sm:p-3 text-center">البند</th>
                    <th className="p-2 sm:p-3 text-center">بواسطة</th>
                    <th className="p-2 sm:p-3 text-center">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t">
                      <td className="p-2 sm:p-3">
                        <div className="font-medium text-sm">{transaction.users?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{transaction.users?.user_code}</div>
                      </td>
                      <td className="p-2 sm:p-3 text-center">
                        <span
                          className={
                            transaction.is_positive
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {transaction.is_positive ? "+" : "-"}
                          {transaction.points}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3">{transaction.description || "-"}</td>
                      <td className="p-2 sm:p-3 text-start">{transaction.point_categories?.name || "-"}</td>
                      <td className="p-2 sm:p-3 text-center">{transaction.item?.name || "-"}</td>
                      <td className="p-2 sm:p-3">{transaction.creator?.full_name || "-"}</td>
                      <td className="p-2 sm:p-3 text-center whitespace-nowrap text-xs sm:text-sm">{formatDate(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RestrictionsManagementView() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [restrictions, setRestrictions] = useState<RestrictedPoint[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [selectedRestriction, setSelectedRestriction] = useState<number | null>(null)

  useEffect(() => {
    fetchRestrictions()
  }, [])

  async function fetchRestrictions() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("restricted_points")
        .select(`
          id,
          user_id,
          category_id,
          points,
          created_at,
          is_resolved,
          created_by,
          users:user_id(full_name, user_code),
          point_categories:category_id(name)
        `)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Transform the data for easier rendering
      const formattedData = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        category_id: item.category_id,
        points: item.points,
        created_at: item.created_at,
        is_resolved: item.is_resolved,
        created_by: item.created_by,
        user_full_name: item.users?.full_name || "غير معروف",
        user_code: item.users?.user_code || "غير معروف",
        category_name: item.point_categories?.name || "غير معروف"
      })) || []

      setRestrictions(formattedData)
    } catch (error) {
      console.error("Error fetching restrictions:", error)
      toast.error("حدث خطأ أثناء تحميل قيود النقاط. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  const resolveRestriction = async (restrictionId: number) => {
    setIsResolving(true)
    setSelectedRestriction(restrictionId)
    
    try {
      // Update the restriction to mark it as resolved
      const { error: updateError } = await supabase
        .from("restricted_points")
        .update({ is_resolved: true })
        .eq("id", restrictionId)
      
      if (updateError) throw updateError
      
      // Get the restriction details to notify the user
      const { data: restrictionData } = await supabase
        .from("restricted_points")
        .select(`
          user_id,
          points,
          category_id,
          point_categories:category_id(name)
        `)
        .eq("id", restrictionId)
        .single()
      
      if (restrictionData) {
        // Add a notification for the student
        await supabase.from("notifications").insert({
          user_id: restrictionData.user_id,
          title: "تم رفع القيد",
          content: `تم رفع القيد عن ${restrictionData.points} نقطة من فئة "${restrictionData.point_categories?.name || ''}" ويمكنك الآن دفع هذه النقاط.`
        })
      }
      
      toast.success("تم رفع القيد بنجاح")
      
      // Refresh the list
      fetchRestrictions()
    } catch (error) {
      console.error("Error resolving restriction:", error)
      toast.error("حدث خطأ أثناء محاولة رفع القيد. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsResolving(false)
      setSelectedRestriction(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
        <CardTitle className="text-base sm:text-lg">إدارة قيود النقاط</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          يمكنك من هنا عرض وإدارة قيود النقاط المفروضة على الطلاب ورفع القيود التي تم حلها
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
        {restrictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد قيود نقاط نشطة</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 sm:p-3 text-right">الطالب</th>
                    <th className="p-2 sm:p-3 text-right">فئة النقاط</th>
                    <th className="p-2 sm:p-3 text-right">النقاط</th>
                    <th className="p-2 sm:p-3 text-right hidden sm:table-cell">تاريخ القيد</th>
                    <th className="p-2 sm:p-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {restrictions.map((restriction) => (
                    <tr key={restriction.id} className="border-t">
                      <td className="p-2 sm:p-3">
                        <div className="font-medium text-sm">{restriction.user_full_name}</div>
                        <div className="text-xs text-muted-foreground">{restriction.user_code}</div>
                      </td>
                      <td className="p-2 sm:p-3 text-sm">{restriction.category_name}</td>
                      <td className="p-2 sm:p-3 text-destructive font-medium">{restriction.points}</td>
                      <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{formatDate(restriction.created_at)}</td>
                      <td className="p-2 sm:p-3">
                        <Button 
                          size="sm" 
                          onClick={() => resolveRestriction(restriction.id)}
                          disabled={isResolving && selectedRestriction === restriction.id}
                          className="text-xs h-8 w-full sm:w-auto"
                        >
                          {isResolving && selectedRestriction === restriction.id ? (
                            <>
                              <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                              جاري الرفع...
                            </>
                          ) : (
                            "رفع القيد"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

