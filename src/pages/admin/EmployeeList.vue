<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

// --- Components ---
import EmployeeToolbar from "@/components/admin/employee/EmployeeToolbar.vue";
import EmployeeTable from "@/components/admin/employee/EmployeeTable.vue";
import EmployeeModal from "@/components/admin/EmployeeModal.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import ToastNotification from "@/components/ui/ToastNotification.vue";

// --- State: Data & UI ---
const employees = ref([]);
const loading = ref(true);
const submitting = ref(false);

// --- State: Filters & Pagination ---
const searchQuery = ref("");
const roleFilter = ref("all");
const statusFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 10;

// --- State: Modals ---
const showFormModal = ref(false);
const isEditing = ref(false);
const selectedEmployee = ref(null);

const showDeleteModal = ref(false);
const employeeToDelete = ref(null);

// --- State: Toast Notification ---
const toast = ref({ isOpen: false, title: "", message: "", type: "success" });

// Helper: Show Toast
const showToast = (title, message, type = "success") => {
  toast.value = { isOpen: true, title, message, type };
};

// --- 1. Fetch Data ---
const fetchEmployees = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    employees.value = data || [];
  } catch (err) {
    console.error("Fetch Error:", err);
    showToast("โหลดข้อมูลไม่สำเร็จ", err.message, "error");
  } finally {
    loading.value = false;
  }
};

// --- 2. Filter & Pagination Logic ---
const filteredEmployees = computed(() => {
  return employees.value.filter((emp) => {
    const fullName = `${emp.employees_firstname} ${emp.employees_lastname}`.toLowerCase();
    const search = searchQuery.value.toLowerCase();

    // 2.1 Search Condition
    const matchSearch =
      fullName.includes(search) ||
      (emp.employees_phone && emp.employees_phone.includes(search)) ||
      (emp.employees_code && emp.employees_code.toLowerCase().includes(search));

    // 2.2 Filter Condition
    // หมายเหตุ: ตรง emp.role ต้องดูดีๆ ว่าใน DB เก็บ 'maid'/'admin' จริงไหม (ถ้าจริงก็ถูกต้อง)
    const matchRole = roleFilter.value === "all" || emp.role === roleFilter.value;
    const matchStatus =
      statusFilter.value === "all" || emp.employees_status === statusFilter.value;

    return matchSearch && matchRole && matchStatus;
  });
});

// คำนวณหน้า
const totalPages = computed(() =>
  Math.ceil(filteredEmployees.value.length / itemsPerPage)
);
const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredEmployees.value.slice(start, start + itemsPerPage);
});

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

// --- 3. Actions Handlers ---
const openAdd = () => {
  isEditing.value = false;
  selectedEmployee.value = null;
  showFormModal.value = true;
};

const openEdit = (emp) => {
  isEditing.value = true;
  selectedEmployee.value = emp;
  showFormModal.value = true;
};

const openDelete = (emp) => {
  employeeToDelete.value = emp;
  showDeleteModal.value = true;
};

// --- 4. CRUD: Save (Insert/Update) ---
const handleSave = async (formData) => {
  submitting.value = true;
  try {
    // เตรียม Payload ให้ครบทุกคอลัมน์ใน DB
    const payload = {
      employees_firstname: formData.firstname,
      employees_lastname: formData.lastname,

      // Role & Position
      role: formData.role, // 'admin', 'maid'
      employees_position: formData.position, // 'ผู้ดูแลระบบ', 'แม่บ้าน'

      // Details
      employees_department: formData.department,
      employees_gender: formData.gender,
      employees_phone: formData.phone, // มาแบบมีขีดแล้ว (0xx-xxx-xxxx)

      // Email (Map 2 field)
      email: formData.email,
      employees_email: formData.email,

      employees_code: formData.code,
      updated_at: new Date(),
    };

    if (isEditing.value) {
      // --- Update ---
      const { error } = await supabase
        .from("employees")
        .update(payload)
        .eq("employees_id", selectedEmployee.value.employees_id);

      if (error) throw error;
      showToast("บันทึกสำเร็จ!", "แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว", "success");
    } else {
      // --- Insert ---
      const { error } = await supabase.from("employees").insert([
        {
          ...payload,
          employees_status: "active", // Default status
          created_at: new Date(),
        },
      ]);

      if (error) throw error;
      showToast("เพิ่มสำเร็จ!", "เพิ่มพนักงานใหม่เข้าระบบเรียบร้อยแล้ว", "success");
    }

    // Refresh & Close
    await fetchEmployees();
    showFormModal.value = false;
  } catch (err) {
    console.error("Save Error:", err);
    showToast("เกิดข้อผิดพลาด", err.message, "error");
  } finally {
    submitting.value = false;
  }
};

// --- 5. CRUD: Delete ---
const handleDeleteConfirm = async () => {
  if (!employeeToDelete.value) return;

  submitting.value = true;
  try {
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("employees_id", employeeToDelete.value.employees_id);

    if (error) throw error;

    // ลบออกจาก State ทันที (ไม่ต้องโหลดใหม่ให้เสียเวลา)
    employees.value = employees.value.filter(
      (e) => e.employees_id !== employeeToDelete.value.employees_id
    );

    showDeleteModal.value = false;
    showToast("ลบสำเร็จ!", "ข้อมูลพนักงานถูกลบออกจากระบบแล้ว", "success");
  } catch (err) {
    console.error("Delete Error:", err);
    showToast("ลบไม่สำเร็จ", err.message, "error");
  } finally {
    submitting.value = false;
  }
};

// Init Data
onMounted(() => {
  fetchEmployees();
});
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-800">จัดการพนักงาน</h1>

    <div
      class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col"
    >
      <EmployeeToolbar
        v-model:searchQuery="searchQuery"
        v-model:roleFilter="roleFilter"
        v-model:statusFilter="statusFilter"
        @add="openAdd"
      />
      <!--  ส่งค่าเข้าไป และรับค่ากลับมาอัปเดต(Two-way binding)  -->
      <EmployeeTable :employees="paginatedEmployees" :loading="loading"
      :currentPage="currentPage" :totalPages="totalPages"
      :totalItems="filteredEmployees.length" 
      v-model:itemsPerPage="itemsPerPage" @edit="openEdit"
      @delete="openDelete" @changePage="changePage" />
    </div>

    <EmployeeModal
      :is-open="showFormModal"
      :is-editing="isEditing"
      :employee-data="selectedEmployee"
      :loading="submitting"
      @close="showFormModal = false"
      @save="handleSave"
    />

    <ConfirmModal
      :is-open="showDeleteModal"
      title="ยืนยันการลบพนักงาน?"
      message="ข้อมูลพนักงานจะถูกลบออกจากระบบถาวร และไม่สามารถกู้คืนได้"
      confirm-text="ยืนยันลบ"
      variant="danger"
      :loading="submitting"
      @close="showDeleteModal = false"
      @confirm="handleDeleteConfirm"
    />

    <ToastNotification
      :is-open="toast.isOpen"
      :title="toast.title"
      :message="toast.message"
      :type="toast.type"
      @close="toast.isOpen = false"
    />
  </div>
</template>
