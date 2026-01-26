<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import { MapPin, Plus } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal";

// Components
import LocationFilters from "@/components/admin/locations/LocationFilters.vue";
import LocationTable from "@/components/admin/locations/LocationTable.vue";
import LocationFormModal from "@/components/admin/locations/LocationFormModal.vue";

// --- State ---
const loading = ref(false);
const locations = ref([]);
const restroomTypes = ref([]);
const { swalConfirm, swalSuccess } = useSwal();

// Highlight State (เก็บ ID ตัวที่เพิ่งบันทึกเพื่อทำ Effect กะพริบ)
const highlightedId = ref(null);

// ✅ Table Ref (เพื่อสั่ง Reset หน้า)
const tableRef = ref(null);

// Filters
const filters = ref({
  search: "",
  building: "",
  floor: "",
  type: "",
});

// Modal State
const isModalOpen = ref(false);
const modalMode = ref("add"); // 'add' | 'edit'
const modalLoading = ref(false);
const editingItem = ref(null);
const tempModalBuilding = ref(""); // เก็บชื่อตึกชั่วคราวใน Modal เพื่อหา Floor list

// --- Fetch Data ---
const fetchData = async () => {
  loading.value = true;
  try {
    const [locsRes, typesRes] = await Promise.all([
      // เรียง ID จากมากไปน้อย (ตัวใหม่สุดอยู่บน)
      supabase
        .from("locations")
        .select("*, restroom_types(*)")
        .is("deleted_at", null) // ✅ กรองเฉพาะข้อมูลที่ยังไม่ถูกลบ (Soft Delete)
        .order("locations_id", { ascending: false }),
      supabase.from("restroom_types").select("*").eq("restroom_types_status", "active"),
    ]);
    locations.value = locsRes.data || [];
    restroomTypes.value = typesRes.data || [];
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    loading.value = false;
  }
};

// --- Computed Logic ---
const uniqueBuildings = computed(() => {
  return [...new Set(locations.value.map((l) => l.locations_building))].sort();
});

// ✅ สร้างรายการสำหรับ Search Auto-suggest (ชื่อจุดตรวจ + รหัส)
const allSearchSuggestions = computed(() => {
  const names = locations.value.map((l) => l.locations_name);
  const codes = locations.value.map((l) => l.locations_code);
  // รวมกันแล้วตัดตัวซ้ำออก
  return [...new Set([...names, ...codes])];
});

const getFloors = (bName) => {
  if (!bName) return [];
  const floors = locations.value
    .filter((l) => l.locations_building === bName)
    .map((l) => l.locations_floor);
  return [...new Set(floors)].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true })
  );
};

const filteredList = computed(() => {
  return locations.value.filter((item) => {
    const search = filters.value.search.toLowerCase();
    const matchSearch =
      item.locations_name.toLowerCase().includes(search) ||
      item.locations_code.toLowerCase().includes(search) ||
      item.locations_building.toLowerCase().includes(search);

    const matchBuilding = filters.value.building
      ? item.locations_building === filters.value.building
      : true;
    const matchFloor = filters.value.floor
      ? item.locations_floor === filters.value.floor
      : true;
    const matchType = filters.value.type
      ? item.restroom_types_id === filters.value.type
      : true;

    return matchSearch && matchBuilding && matchFloor && matchType;
  });
});

// ✅ ฟังก์ชัน Reset Filter และ Reset หน้าตาราง
const resetFilters = () => {
  filters.value = { search: "", building: "", floor: "", type: "" };
  if (tableRef.value) {
    tableRef.value.resetPage();
  }
};

// --- Actions ---

const openAddModal = () => {
  if (restroomTypes.value.length === 0) return alert("กรุณาเพิ่มประเภทห้องน้ำก่อน");
  modalMode.value = "add";
  editingItem.value = null;
  isModalOpen.value = true;
};

const openEditModal = (item) => {
  modalMode.value = "edit";
  editingItem.value = item;
  tempModalBuilding.value = item.locations_building;
  isModalOpen.value = true;
};

// 🔥 บันทึกข้อมูล (Save)
const handleSave = async (formData) => {
  // 1. Validation เบื้องต้น
  if (
    !formData.name ||
    !formData.building ||
    !formData.floor ||
    !formData.code ||
    !formData.typeId
  ) {
    return alert("❌ กรุณากรอกข้อมูลให้ครบถ้วน");
  }

  modalLoading.value = true;
  try {
    const payload = {
      locations_code: formData.code,
      locations_name: formData.name,
      locations_building: formData.building,
      locations_floor: formData.floor,
      restroom_types_id: formData.typeId,
      locations_status: formData.status,
    };

    let resultData = null;
    let error = null;

    // 2. เรียก Supabase (Insert / Update)
    if (modalMode.value === "add") {
      // .select().single() เพื่อขอข้อมูลตัวใหม่กลับมา (เอา ID ไปทำ highlight)
      const res = await supabase.from("locations").insert(payload).select().single();
      error = res.error;
      resultData = res.data;
    } else {
      const res = await supabase
        .from("locations")
        .update(payload)
        .eq("locations_id", formData.id)
        .select()
        .single();
      error = res.error;
      resultData = res.data;
    }

    if (error) throw error;

    // 3. ถ้าผ่าน: โหลดข้อมูลใหม่ + ปิด Modal
    await fetchData();
    isModalOpen.value = false;

    // ✨ Effect: สั่ง Highlight ตัวล่าสุด (3 วินาที)
    if (resultData) {
      highlightedId.value = resultData.locations_id;
      setTimeout(() => {
        highlightedId.value = null;
      }, 3000);
    }

    // ✅ แจ้งเตือนผู้ใช้
    const msg = modalMode.value === "add" ? "เพิ่มข้อมูลสำเร็จ" : "แก้ไขข้อมูลสำเร็จ";
    await swalSuccess(msg);
  } catch (err) {
    console.error("Save error:", err);
    let msg = err.message;
    // ดัก Error Code ที่เจอบ่อย
    if (err.code === "23505") msg = "รหัส Code นี้มีอยู่แล้ว (ห้ามซ้ำ)";
    if (err.code === "42501") msg = "ไม่มีสิทธิ์บันทึกข้อมูล (ติด RLS Policy)";

    alert(`❌ บันทึกไม่สำเร็จ: ${msg}`);
  } finally {
    modalLoading.value = false;
  }
};

// 🔥 ลบข้อมูล (Soft Delete)
const handleDelete = async (id) => {
  const isConfirmed = await swalConfirm(
    "ยืนยันการลบ?",
    "ข้อมูลจะถูกซ่อนไว้ (Soft Delete) และสามารถกู้คืนได้โดย Admin", // เปลี่ยนข้อความให้ชัดเจน
    "ลบเลย!"
  );

  if (isConfirmed) {
    try {
      loading.value = true;
      // ✅ Soft Delete: อัปเดตสถานะและเวลาที่ลบ แทนการลบจริง
      const { error } = await supabase
        .from("locations")
        .update({
          locations_status: "inactive", // เปลี่ยนสถานะเป็นไม่ใช้งาน
          deleted_at: new Date(), // บันทึกเวลาที่ลบ
        })
        .eq("locations_id", id);

      if (error) throw error;

      await fetchData();

      // ✅ แจ้งเตือนเมื่อลบสำเร็จ
      await swalSuccess("ลบข้อมูลเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Delete error:", err);
      alert("ลบไม่สำเร็จ: " + err.message);
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
          <MapPin class="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> จัดการสถานที่
        </h1>
        <p class="text-gray-500 dark:text-slate-400 text-sm mt-1">
          รายการจุดตรวจทั้งหมดในระบบ ({{ filteredList.length }} รายการ)
        </p>
      </div>

      <button
        @click="openAddModal"
        class="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all active:scale-95"
      >
        <Plus class="w-5 h-5" /> เพิ่มจุดตรวจใหม่
      </button>
    </div>

    <LocationFilters
      v-model:search="filters.search"
      v-model:building="filters.building"
      v-model:floor="filters.floor"
      v-model:type="filters.type"
      :uniqueBuildings="uniqueBuildings"
      :floors="getFloors(filters.building)"
      :restroomTypes="restroomTypes"
      :search-suggestions="allSearchSuggestions"
      @reset="resetFilters"
    />

    <LocationTable
      ref="tableRef"
      :items="filteredList"
      :loading="loading"
      :highlightId="highlightedId"
      @edit="openEditModal"
      @delete="handleDelete"
    />

    <LocationFormModal
      :isOpen="isModalOpen"
      :mode="modalMode"
      :initialData="editingItem"
      :restroomTypes="restroomTypes"
      :uniqueBuildings="uniqueBuildings"
      :floorsByBuilding="getFloors(tempModalBuilding)"
      :loading="modalLoading"
      @update:building="(val) => (tempModalBuilding = val)"
      @close="isModalOpen = false"
      @save="handleSave"
    />
  </div>
</template>
