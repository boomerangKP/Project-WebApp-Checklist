<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import { Plus, ListChecks } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal"; // ✅ 1. เรียกใช้ useSwal

// Import Components
import ChecklistTable from "@/components/admin/checklists/ChecklistTable.vue";
import ChecklistFormModal from "@/components/admin/checklists/ChecklistFormModal.vue";

// ✅ 2. ดึง Swal และฟังก์ชันสำเร็จรูปมาใช้
const { Swal, swalSuccess, swalConfirm } = useSwal();

// --- State ---
const loading = ref(false);
const saving = ref(false);
const checkItems = ref([]);

// --- Modal State ---
const showModal = ref(false);
const modalMode = ref("add");
const editingId = ref(null);
const formData = ref({});

// --- Fetch Data ---
const fetchData = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("check_items")
      .select("*")
      .order("check_items_order");
    if (error) throw error;
    checkItems.value = data || [];
  } catch (err) {
    Swal.fire("เกิดข้อผิดพลาด", err.message, "error");
  } finally {
    loading.value = false;
  }
};

// --- Actions ---
const openModal = (item = null) => {
  if (item) {
    modalMode.value = "edit";
    editingId.value = item.check_items_id;
    formData.value = item;
  } else {
    modalMode.value = "add";
    editingId.value = null;
    const maxOrder =
      checkItems.value.length > 0
        ? Math.max(...checkItems.value.map((i) => i.check_items_order))
        : 0;

    let maxCodeNum = 0;
    checkItems.value.forEach((i) => {
      if (i.check_items_code && i.check_items_code.startsWith("CHK-")) {
        const num = parseInt(i.check_items_code.replace("CHK-", ""));
        if (!isNaN(num) && num > maxCodeNum) maxCodeNum = num;
      }
    });
    const nextCode = `CHK-${String(maxCodeNum + 1).padStart(3, "0")}`;

    formData.value = { order: maxOrder + 1, code: nextCode };
  }
  showModal.value = true;
};

// 🔥 ฟังก์ชัน Save พร้อมเช็คข้อมูลซ้ำ
const handleSave = async (submitData) => {
  if (!submitData.check_items_name.trim()) {
    return Swal.fire("ข้อมูลไม่ครบ", "กรุณากรอกชื่อรายการ", "warning");
  }

  // 1. เช็คชื่อซ้ำ
  const isDuplicateName = checkItems.value.some(
    (item) =>
      item.check_items_name === submitData.check_items_name &&
      item.check_items_id !== editingId.value
  );

  // 2. เช็ครหัสซ้ำ
  const isDuplicateCode = submitData.check_items_code
    ? checkItems.value.some(
        (item) =>
          item.check_items_code === submitData.check_items_code &&
          item.check_items_id !== editingId.value
      )
    : false;

  // 3. เช็คลำดับซ้ำ
  const isDuplicateOrder = checkItems.value.some(
    (item) =>
      item.check_items_order === submitData.check_items_order &&
      item.check_items_id !== editingId.value
  );

  if (isDuplicateName) {
    return Swal.fire(
      "ข้อมูลซ้ำ",
      `ชื่อรายการ "${submitData.check_items_name}" มีอยู่ในระบบแล้ว`,
      "warning"
    );
  }

  if (isDuplicateCode) {
    return Swal.fire(
      "ข้อมูลซ้ำ",
      `รหัส "${submitData.check_items_code}" มีอยู่ในระบบแล้ว`,
      "warning"
    );
  }

  if (isDuplicateOrder) {
    return Swal.fire(
      "ลำดับซ้ำ",
      `ลำดับที่ "${submitData.check_items_order}" มีอยู่ในระบบแล้ว กรุณาเปลี่ยนเป็นลำดับอื่น`,
      "warning"
    );
  }

  // 4. ถามก่อนบันทึก (✅ ใช้ swalConfirm จาก useSwal)
  const isConfirmed = await swalConfirm(
    modalMode.value === "add" ? "ยืนยันการเพิ่มรายการ?" : "ยืนยันการแก้ไข?",
    "ตรวจสอบความถูกต้องก่อนบันทึก"
  );

  if (!isConfirmed) return;

  saving.value = true;
  try {
    if (modalMode.value === "add") {
      const { error } = await supabase.from("check_items").insert(submitData);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("check_items")
        .update(submitData)
        .eq("check_items_id", editingId.value);
      if (error) throw error;
    }

    showModal.value = false;
    await fetchData();
    // ✅ ใช้ swalSuccess จาก useSwal
    swalSuccess(modalMode.value === "add" ? "เพิ่มข้อมูลสำเร็จ" : "แก้ไขข้อมูลสำเร็จ");
  } catch (err) {
    if (err.message.includes("unique constraint")) {
      Swal.fire("บันทึกไม่สำเร็จ", "ข้อมูลซ้ำกับที่มีอยู่ในระบบ", "error");
    } else {
      Swal.fire("บันทึกไม่สำเร็จ", err.message, "error");
    }
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id) => {
  // ✅ ใช้ swalConfirm แบบกำหนดเอง (เพื่อให้ปุ่มลบเป็นสีแดง)
  const result = await Swal.fire({
    title: "ยืนยันการลบ?",
    text: "ข้อมูลที่ลบจะไม่สามารถกู้คืนได้",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบเลย!",
    cancelButtonText: "ยกเลิก",
    // ไม่ต้องกำหนด class ปุ่ม confirm/cancel เพราะ useSwal จัดการให้แล้ว
    // แต่ถ้าอยากได้สีแดงสำหรับปุ่มลบ useSwal จะเช็ค icon: 'warning' ให้เองอัตโนมัติ (ในโค้ด useSwal ล่าสุดที่ผมให้ไป)
  });

  if (!result.isConfirmed) return;

  try {
    loading.value = true;
    const { error } = await supabase
      .from("check_items")
      .delete()
      .eq("check_items_id", id);
    if (error) throw error;

    await fetchData();
    swalSuccess("ลบข้อมูลเรียบร้อย");
  } catch (err) {
    Swal.fire("ลบไม่สำเร็จ", err.message, "error");
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <ListChecks class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          รายการตรวจสอบ (Checklist)
        </h1>
        <p class="text-gray-500 dark:text-slate-400 text-sm mt-1">
          กำหนดหัวข้อมาตรฐานที่แม่บ้านต้องตรวจเช็ค
        </p>
      </div>

      <button
        @click="openModal()"
        class="bg-[#38b6ff] hover:bg-[#38b6ff]/90 dark:hover:bg-[#38b6ff]/80 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none transition-all active:scale-95"
      >
        <Plus class="w-5 h-5" /> เพิ่มรายการใหม่
      </button>
    </div>

    <ChecklistTable
      :items="checkItems"
      :loading="loading"
      @edit="openModal"
      @delete="handleDelete"
    />

    <ChecklistFormModal
      :isOpen="showModal"
      :mode="modalMode"
      :initialData="formData"
      :saving="saving"
      @close="showModal = false"
      @save="handleSave"
    />
  </div>
</template>

<style>
.swal2-container {
  z-index: 20000 !important;
}
</style>
