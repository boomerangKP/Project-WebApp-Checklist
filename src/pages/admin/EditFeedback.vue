<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import { MessageSquareQuote, Plus } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal";

// Components
import TopicFilters from "@/components/admin/feedback/TopicFilters.vue";
import TopicTable from "@/components/admin/feedback/TopicTable.vue";
import TopicFormModal from "@/components/admin/feedback/TopicFormModal.vue";

// --- State ---
const loading = ref(false);
const topics = ref([]);

const { Swal, swalConfirm, swalSuccess } = useSwal();

const highlightedId = ref(null);
const tableRef = ref(null);

// Filters
const filters = ref({
  search: "",
  status: "all",
});

// Modal State
const isModalOpen = ref(false);
const modalMode = ref("add");
const modalLoading = ref(false);
const editingItem = ref(null);

const allSearchSuggestions = computed(() => {
  return topics.value.map((t) => t.name);
});

// --- Fetch Data (แก้ไขตรงนี้) ---
const fetchData = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("feedback_topics")
      .select("*")
      .is("deleted_at", null) // ✅ กรองเฉพาะข้อมูลที่ยังไม่ถูกลบ
      .order("ordering", { ascending: true });

    if (error) throw error;
    topics.value = data || [];
  } catch (error) {
    console.error("Error fetching data:", error);
    Swal.fire("ดึงข้อมูลไม่สำเร็จ", error.message, "error");
  } finally {
    loading.value = false;
  }
};

// --- Computed Logic ---
const filteredList = computed(() => {
  return topics.value.filter((item) => {
    const search = filters.value.search.toLowerCase();
    const matchSearch =
      item.name.toLowerCase().includes(search) ||
      (item.description && item.description.toLowerCase().includes(search));

    let matchStatus = true;
    if (filters.value.status === "active") matchStatus = item.is_active === true;
    if (filters.value.status === "inactive") matchStatus = item.is_active === false;

    return matchSearch && matchStatus;
  });
});

// --- Actions ---
const resetFilters = () => {
  filters.value = { search: "", status: "all" };
  if (tableRef.value && tableRef.value.resetPage) {
    tableRef.value.resetPage();
  }
};

const openAddModal = () => {
  modalMode.value = "add";
  const maxOrder =
    topics.value.length > 0 ? Math.max(...topics.value.map((t) => t.ordering)) : 0;
  editingItem.value = { ordering: maxOrder + 1, is_active: true };
  isModalOpen.value = true;
};

const openEditModal = (item) => {
  modalMode.value = "edit";
  editingItem.value = { ...item };
  isModalOpen.value = true;
};

// Save Data
const handleSave = async (formData) => {
  if (!formData.name) {
    return Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบถ้วน",
      text: "กรุณากรอกชื่อหัวข้อการประเมิน",
      confirmButtonText: "ตกลง",
    });
  }

  modalLoading.value = true;
  try {
    const payload = {
      name: formData.name,
      description: formData.description,
      ordering: parseInt(formData.ordering) || 0,
      is_active: formData.is_active,
    };

    let resultData = null;
    let error = null;

    if (modalMode.value === "add") {
      const res = await supabase
        .from("feedback_topics")
        .insert(payload)
        .select()
        .single();
      error = res.error;
      resultData = res.data;
    } else {
      const res = await supabase
        .from("feedback_topics")
        .update(payload)
        .eq("id", formData.id)
        .select()
        .single();
      error = res.error;
      resultData = res.data;
    }

    if (error) throw error;

    await fetchData();
    isModalOpen.value = false;

    if (resultData) {
      highlightedId.value = resultData.id;
      setTimeout(() => {
        highlightedId.value = null;
      }, 3000);
    }

    await swalSuccess(modalMode.value === "add" ? "เพิ่มหัวข้อสำเร็จ" : "แก้ไขเรียบร้อย");
  } catch (err) {
    console.error("Save error:", err);
    Swal.fire({
      icon: "error",
      title: "บันทึกไม่สำเร็จ",
      text: err.message,
      confirmButtonText: "ตกลง",
    });
  } finally {
    modalLoading.value = false;
  }
};

// 🔥 Delete Data (แก้ไขเป็น Soft Delete)
const handleDelete = async (id) => {
  const isConfirmed = await swalConfirm(
    "ลบหัวข้อนี้?",
    "ข้อมูลจะถูกซ่อนไว้ (Soft Delete) และสามารถกู้คืนได้โดย Admin",
    "ลบเลย"
  );

  if (isConfirmed) {
    try {
      loading.value = true;

      // ✅ เปลี่ยนจาก .delete() เป็น .update()
      const { error } = await supabase
        .from("feedback_topics")
        .update({
          is_active: false, // ปิดการใช้งาน
          deleted_at: new Date(), // บันทึกเวลาที่ลบ
        })
        .eq("id", id);

      if (error) throw error;

      await fetchData();
      await swalSuccess("ลบข้อมูลเรียบร้อย");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: err.message,
        confirmButtonText: "ตกลง",
      });
    } finally {
      loading.value = false;
    }
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <MessageSquareQuote class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          จัดการแบบประเมิน
        </h1>
        <p class="text-gray-500 dark:text-slate-400 text-sm mt-1">
          หัวข้อที่ใช้ในการประเมินความพึงพอใจ ({{ filteredList.length }} รายการ)
        </p>
      </div>

      <button
        @click="openAddModal"
        class="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all active:scale-95"
      >
        <Plus class="w-5 h-5" /> เพิ่มหัวข้อใหม่
      </button>
    </div>

    <TopicFilters
      v-model:search="filters.search"
      v-model:status="filters.status"
      :search-suggestions="allSearchSuggestions"
      @reset="resetFilters"
    />

    <TopicTable
      ref="tableRef"
      :items="filteredList"
      :loading="loading"
      :highlightId="highlightedId"
      @edit="openEditModal"
      @delete="handleDelete"
    />

    <TopicFormModal
      :isOpen="isModalOpen"
      :mode="modalMode"
      :initialData="editingItem"
      :loading="modalLoading"
      @close="isModalOpen = false"
      @save="handleSave"
    />
  </div>
</template>
