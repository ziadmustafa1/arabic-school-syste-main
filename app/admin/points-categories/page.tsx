"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
} from "@/app/actions/points-categories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PointCategory = {
  id: number;
  name: string;
  description: string | null;
  default_points: number;
  is_positive: boolean;
  is_mandatory: boolean;
  is_restricted: boolean;
  created_at: string;
};

export default function PointsCategoriesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<PointCategory | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_points: "",
    is_positive: true,
    is_mandatory: true,
    is_restricted: false,
  });
  const [filterType, setFilterType] = useState<"all" | "positive" | "negative">(
    "all"
  );

  useEffect(() => {
    fetchCategories();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const result = await getCategories();

      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء جلب فئات النقاط");
      }

      setCategories(result.data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast.error(error.message || "حدث خطأ في جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "default_points" ? Number(value) : value,
    }));
  };

  const handleSwitchChange = (field: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const handleOpenForm = (category?: PointCategory) => {
    if (category) {
      setSelectedCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
        default_points: category.default_points.toString(),
        is_positive: category.is_positive,
        is_mandatory: category.is_mandatory ?? true,
        is_restricted: category.is_restricted ?? false,
      });
    } else {
      setSelectedCategory(null);
      setFormData({
        name: "",
        description: "",
        default_points: "",
        is_positive: true,
        is_mandatory: true,
        is_restricted: false,
      });
    }
    setIsFormDialogOpen(true);
  };

  const handleOpenDelete = (category: PointCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.default_points) {
        throw new Error("يرجى ملء جميع الحقول المطلوبة");
      }

      if (!userId) {
        throw new Error("لم يتم تحديد المستخدم الحالي");
      }

      const categoryData = {
        id: selectedCategory?.id,
        name: formData.name.trim(),
        description: formData.description ? formData.description.trim() : "",
        default_points: parseInt(formData.default_points.toString()),
        is_positive: formData.is_positive,
        is_mandatory: formData.is_mandatory,
        is_restricted: formData.is_restricted,
        created_by: userId,
      };

      const result = selectedCategory
        ? await updateCategory(categoryData)
        : await createCategory(categoryData);

      if (!result.success) {
        throw new Error(result.error || "حدث خطأ غير معروف");
      }

      toast.success(
        `تم ${selectedCategory ? "تحديث" : "إنشاء"} فئة النقاط "${formData.name}" بنجاح`
      );

      setIsFormDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error("Error in form submission:", error);
      toast.error(error.message || "حدث خطأ غير معروف أثناء حفظ البيانات");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      // First check if category has any transactions
      const { count, error: checkError } = await supabase
        .from('points_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', selectedCategory.id);

      if (checkError) throw checkError;

      if (count && count > 0) {
        toast.error("لا يمكن حذف هذه الفئة لأنها مرتبطة بسجلات نقاط. يمكنك تعطيل الفئة بدلاً من حذفها.");
        return;
      }

      const result = await deleteCategory(selectedCategory.id);

      if (!result.success) {
        throw new Error(result.error || "حدث خطأ أثناء حذف الفئة");
      }

      toast.success(`تم حذف فئة النقاط "${selectedCategory.name}" بنجاح`);

      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "حدث خطأ غير معروف أثناء حذف الفئة");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a filtered categories getter
  const filteredCategories = categories.filter((category) => {
    if (filterType === "all") return true;
    if (filterType === "positive") return category.is_positive;
    if (filterType === "negative") return !category.is_positive;
    return true;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة فئات النقاط</h1>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة فئة جديدة
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Tabs
            defaultValue="all"
            className="mb-4"
            onValueChange={(value) =>
              setFilterType(value as "all" | "positive" | "negative")
            }
          >
            <TabsList className="mb-2">
              <TabsTrigger value="all">جميع الفئات</TabsTrigger>
              <TabsTrigger value="positive" className="text-green-600">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  الفئات الإيجابية
                </span>
              </TabsTrigger>
              <TabsTrigger value="negative" className="text-red-600">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  الفئات السلبية
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="rounded-md border overflow-hidden">
            {/* عرض الجدول على الشاشات الكبيرة */}
            <div className="hidden lg:block">
              <div className="overflow-auto">
                <div className="grid grid-cols-12 border-b bg-muted/50 p-4 font-medium min-w-[1000px]">
                  <div className="col-span-2">اسم الفئة</div>
                  <div className="col-span-3">الوصف</div>
                  <div className="col-span-1">النقاط</div>
                  <div className="col-span-1">النوع</div>
                  <div className="col-span-1">إجباري</div>
                  <div className="col-span-1">مقيد</div>
                  <div className="col-span-3 text-left">الإجراءات</div>
                </div>
                {filteredCategories.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {filterType === "all"
                      ? "لا توجد فئات نقاط مضافة"
                      : filterType === "positive"
                      ? "لا توجد فئات نقاط إيجابية"
                      : "لا توجد فئات نقاط سلبية"}
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className="grid grid-cols-12 border-b p-4 last:border-0 min-w-[1000px]"
                    >
                      <div className="col-span-2 font-medium">
                        {category.name}
                      </div>
                      <div className="col-span-3 text-muted-foreground">
                        {category.description || "-"}
                      </div>
                      <div className="col-span-1">
                        {category.default_points}
                      </div>
                      <div className="col-span-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            category.is_positive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {category.is_positive ? "إيجابي" : "سلبي"}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            category.is_mandatory
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {category.is_mandatory ? "إجباري" : "اختياري"}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            category.is_restricted
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {category.is_restricted ? "مقيد" : "غير مقيد"}
                        </span>
                      </div>
                      <div className="col-span-3 flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(category)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">تعديل</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(category)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">حذف</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* عرض البطاقات على الشاشات المتوسطة */}
            <div className="hidden md:block lg:hidden">
              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {filterType === "all"
                    ? "لا توجد فئات نقاط مضافة"
                    : filterType === "positive"
                    ? "لا توجد فئات نقاط إيجابية"
                    : "لا توجد فئات نقاط سلبية"}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredCategories.map((category) => (
                    <div key={category.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenForm(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            النقاط:{" "}
                          </span>
                          <span className="text-sm font-medium">
                            {category.default_points}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              category.is_positive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {category.is_positive ? "إيجابي" : "سلبي"}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              category.is_mandatory
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                          >
                            {category.is_mandatory ? "إجباري" : "اختياري"}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              category.is_restricted
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                          >
                            {category.is_restricted ? "مقيد" : "غير مقيد"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* عرض البطاقات على الشاشات الصغيرة */}
            <div className="block md:hidden">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  {filterType === "all"
                    ? "لا توجد فئات نقاط مضافة"
                    : filterType === "positive"
                    ? "لا توجد فئات نقاط إيجابية"
                    : "لا توجد فئات نقاط سلبية"}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredCategories.map((category) => (
                    <div key={category.id} className="p-4 space-y-3">
                      {/* اسم الفئة والإجراءات */}
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-base">
                          {category.name}
                        </h3>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* الوصف */}
                      {category.description && (
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      )}

                      {/* النقاط */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          النقاط:
                        </span>
                        <span className="text-sm font-bold">
                          {category.default_points}
                        </span>
                      </div>

                      {/* الحالات */}
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            category.is_positive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {category.is_positive ? "إيجابي" : "سلبي"}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            category.is_mandatory
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {category.is_mandatory ? "إجباري" : "اختياري"}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            category.is_restricted
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {category.is_restricted ? "مقيد" : "غير مقيد"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? "تعديل فئة النقاط" : "إضافة فئة نقاط جديدة"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? "قم بتعديل بيانات فئة النقاط"
                : "أدخل بيانات فئة النقاط الجديدة لإضافتها إلى النظام"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الفئة</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="أدخل اسم الفئة"
                  required
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="أدخل وصف الفئة"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_points">النقاط الافتراضية</Label>
                <Input
                  id="default_points"
                  name="default_points"
                  type="number"
                  min="0"
                  required
                  placeholder="أدخل عدد النقاط الافتراضية"
                  value={formData.default_points || ""}
                  onChange={handleChange}
                  className="text-start ltr"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-4 space-x-reverse">
                  <Label htmlFor="is_positive" className="flex flex-col space-y-1">
                    <span>نوع النقاط</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      {formData.is_positive ? "إضافة نقاط (إيجابي)" : "خصم نقاط (سلبي)"}
                    </span>
                  </Label>
                  <Switch
                    id="is_positive"
                    checked={formData.is_positive}
                    onCheckedChange={(checked) => handleSwitchChange("is_positive", checked)}
                  />
                </div>

                {/* Only show mandatory/restricted options for negative categories */}
                {!formData.is_positive && (
                  <>
                    <div className="flex items-center justify-between space-x-4 space-x-reverse">
                      <Label htmlFor="is_mandatory" className="flex flex-col space-y-1">
                        <span>إلزامية الدفع</span>
                        <span className="font-normal text-sm text-muted-foreground">
                          {formData.is_mandatory ? "إجباري (تخصم تلقائياً)" : "اختياري (يمكن الدفع في أي وقت)"}
                        </span>
                      </Label>
                      <Switch
                        id="is_mandatory"
                        checked={formData.is_mandatory}
                        onCheckedChange={(checked) => handleSwitchChange("is_mandatory", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-4 space-x-reverse">
                      <Label htmlFor="is_restricted" className="flex flex-col space-y-1">
                        <span>تقييد الدفع</span>
                        <span className="font-normal text-sm text-muted-foreground">
                          {formData.is_restricted ? "مقيد (يحتاج موافقة الإداري)" : "غير مقيد (يمكن الدفع مباشرة)"}
                        </span>
                      </Label>
                      <Switch
                        id="is_restricted"
                        checked={formData.is_restricted}
                        onCheckedChange={(checked) => handleSwitchChange("is_restricted", checked)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : selectedCategory ? (
                  "حفظ التغييرات"
                ) : (
                  "إضافة الفئة"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف فئة النقاط "{selectedCategory?.name}
              "؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "تأكيد الحذف"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
