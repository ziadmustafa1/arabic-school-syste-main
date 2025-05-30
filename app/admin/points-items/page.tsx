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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, PenLine, Trash2, Search, Filter } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

// Define types
interface PointCategory {
  id: number;
  name: string;
  description: string | null;
  default_points: number;
  is_positive: boolean;
  is_mandatory: boolean;
}

interface PointCategoryItem {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  points: number;
  is_active: boolean;
}

export default function PointsCategoryItemsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // State variables
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<PointCategory[]>([])
  const [categoryItems, setCategoryItems] = useState<PointCategoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PointCategoryItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<PointCategory | null>(null)
  const [selectedItem, setSelectedItem] = useState<PointCategoryItem | null>(null)
  const [filterType, setFilterType] = useState<"all" | "positive" | "negative">("all")
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    description: "",
    points: 0,
    isActive: true
  })

  // Fetch categories and items on component mount
  useEffect(() => {
    fetchCategories()
    fetchCategoryItems()
  }, [])

  // Filter items when filter criteria change
  useEffect(() => {
    applyFilters()
  }, [categoryItems, filterType, categoryFilter, searchQuery])

  // Fetch categories from the database
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("point_categories")
        .select("*")
        .order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      toast({
        title: "خطأ في جلب فئات النقاط",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Fetch category items from the database
  const fetchCategoryItems = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("point_category_items")
        .select(`
          *,
          point_categories (
            id,
            name,
            is_positive,
            is_mandatory,
            default_points
          )
        `)
        .order("name")

      if (error) throw error
      
      // Transform the data to separate the categories
      const items = data?.map(item => ({
        id: item.id,
        category_id: item.category_id,
        name: item.name,
        description: item.description,
        points: item.points,
        is_active: item.is_active,
        category: item.point_categories
      })) || []

      setCategoryItems(items)
      setFilteredItems(items)
    } catch (error: any) {
      toast({
        title: "خطأ في جلب بنود النقاط",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters based on selected criteria
  const applyFilters = () => {
    let filtered = [...categoryItems]

    // Apply category type filter (positive/negative)
    if (filterType !== "all") {
      filtered = filtered.filter(item => {
        const category = categories.find(c => c.id === item.category_id)
        return filterType === "positive" ? category?.is_positive : !category?.is_positive
      })
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category_id === categoryFilter)
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query))
      )
    }

    setFilteredItems(filtered)
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === "points" ? parseInt(value) || 0 : value
    }))
  }

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      categoryId: "",
      name: "",
      description: "",
      points: 0,
      isActive: true
    })
    setSelectedItem(null)
  }

  // Open the form dialog for creating or editing
  const handleOpenForm = (item?: PointCategoryItem) => {
    if (item) {
      setSelectedItem(item)
      setFormData({
        categoryId: item.category_id.toString(),
        name: item.name,
        description: item.description || "",
        points: item.points,
        isActive: item.is_active
      })
    } else {
      resetForm()
    }
    setIsFormOpen(true)
  }

  // Open the delete confirmation dialog
  const handleOpenDelete = (item: PointCategoryItem) => {
    setSelectedItem(item)
    setIsDeleteDialogOpen(true)
  }

  // Save a new or edited category item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.categoryId || !formData.name) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const itemData = {
        category_id: parseInt(formData.categoryId),
        name: formData.name,
        description: formData.description || null,
        points: formData.points,
        is_active: formData.isActive
      }

      let result

      if (selectedItem) {
        // Update existing item
        result = await supabase
          .from("point_category_items")
          .update(itemData)
          .eq("id", selectedItem.id)
          .select()
      } else {
        // Create new item
        result = await supabase
          .from("point_category_items")
          .insert(itemData)
          .select()
      }

      if (result.error) throw result.error

      toast({
        title: selectedItem ? "تم تحديث البند بنجاح" : "تم إضافة البند بنجاح",
        description: `تم ${selectedItem ? "تحديث" : "إضافة"} بند "${formData.name}" بنجاح`,
      })

      resetForm()
      setIsFormOpen(false)
      fetchCategoryItems()
    } catch (error: any) {
      toast({
        title: "خطأ في حفظ البيانات",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete a category item
  const handleDelete = async () => {
    if (!selectedItem) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("point_category_items")
        .delete()
        .eq("id", selectedItem.id)

      if (error) throw error

      toast({
        title: "تم حذف البند بنجاح",
        description: `تم حذف بند النقاط "${selectedItem.name}" بنجاح`,
      })

      setIsDeleteDialogOpen(false)
      fetchCategoryItems()
    } catch (error: any) {
      toast({
        title: "خطأ في حذف البيانات",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || "غير معروف"
  }

  // Determine if a category is positive or negative
  const isCategoryPositive = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.is_positive ?? true
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">إدارة بنود النقاط</h1>
          <p className="text-sm text-muted-foreground">إدارة بنود النقاط المستخدمة في النظام</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
          <Plus className="ml-2 h-4 w-4" />
          إضافة بند جديد
        </Button>
      </div>

      {/* Filtering options */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Points Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="filterType">نوع النقاط</Label>
          <Tabs
            defaultValue="all"
            className="w-full"
            onValueChange={(value) => setFilterType(value as "all" | "positive" | "negative")}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="positive" className="text-green-600">إيجابي</TabsTrigger>
              <TabsTrigger value="negative" className="text-red-600">سلبي</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Category Filter */}
        <div className="space-y-2">
          <Label htmlFor="categoryFilter">تصنيف النقاط</Label>
          <Select 
            value={categoryFilter?.toString() || "all"} 
            onValueChange={(value) => setCategoryFilter(value === "all" ? null : parseInt(value))}
          >
            <SelectTrigger id="categoryFilter">
              <SelectValue placeholder="جميع التصنيفات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                  {category.is_positive ? " (إيجابي)" : " (سلبي)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Search */}
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="searchQuery">البحث في البنود</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="searchQuery"
              placeholder="البحث عن بند..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center rounded-md border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <div className="border-b bg-muted/40 px-4 py-3">
            <h2 className="text-lg font-semibold">بنود النقاط ({filteredItems.length})</h2>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-2">لا توجد نتائج</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery 
                  ? "لا توجد نتائج مطابقة للبحث" 
                  : filterType !== "all" 
                    ? filterType === "positive" 
                      ? "لا توجد بنود نقاط إيجابية" 
                      : "لا توجد بنود نقاط سلبية"
                    : categoryFilter 
                      ? "لا توجد بنود ضمن هذا التصنيف" 
                      : "لا توجد بنود نقاط مضافة"}
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: "600px" }} className="overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right py-3 px-4 text-sm font-medium">اسم البند</th>
                      <th className="text-right py-3 px-4 text-sm font-medium hidden md:table-cell">التصنيف</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">النوع</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">النقاط</th>
                      <th className="text-right py-3 px-4 text-sm font-medium hidden md:table-cell">الحالة</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="p-4 text-sm">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            {getCategoryName(item.category_id)}
                          </div>
                        </td>
                        <td className="p-4 text-sm hidden md:table-cell">{getCategoryName(item.category_id)}</td>
                        <td className="p-4 text-sm">
                          <span className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            isCategoryPositive(item.category_id)
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          )}>
                            {isCategoryPositive(item.category_id) ? "إيجابي" : "سلبي"}
                          </span>
                        </td>
                        <td className="p-4 text-sm">{item.points}</td>
                        <td className="p-4 text-sm hidden md:table-cell">
                          <span className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            item.is_active
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          )}>
                            {item.is_active ? "مفعل" : "غير مفعل"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenForm(item)}
                            >
                              <PenLine className="h-4 w-4" />
                              <span className="sr-only">تعديل</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">حذف</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog for Create/Edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "تعديل بند" : "إضافة بند جديد"}</DialogTitle>
            <DialogDescription>
              {selectedItem
                ? "قم بتعديل بيانات البند"
                : "أدخل بيانات البند الجديد"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="categoryId" className="mb-1 block">التصنيف</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData((prev) => ({ ...prev, categoryId: value }))}>
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                      {category.is_positive ? " (إيجابي)" : " (سلبي)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name" className="mb-1 block">اسم البند</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="أدخل اسم البند"
              />
            </div>
            <div>
              <Label htmlFor="description" className="mb-1 block">الوصف (اختياري)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="أدخل وصف البند"
              />
            </div>
            <div>
              <Label htmlFor="points">النقاط</Label>
              <Input
                id="points"
                name="points"
                type="number"
                min="0"
                placeholder="أدخل عدد النقاط"
                value={formData.points || ""}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleCheckboxChange}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="mr-2">مفعل</Label>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : selectedItem ? (
                  "تحديث"
                ) : (
                  "حفظ"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف البند "{selectedItem?.name}"؟
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/80" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 