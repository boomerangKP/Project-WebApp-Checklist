<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

// --- Components ---
import EmployeeToolbar from "@/components/admin/employee/EmployeeToolbar.vue";
import EmployeeTable from "@/components/admin/employee/EmployeeTable.vue";
import EmployeeModal from "@/components/admin/EmployeeModal.vue";
import ToastNotification from "@/components/ui/ToastNotification.vue";
import { useSwal } from "@/composables/useSwal";

// ✅ 1. Import Store เข้ามา
import { useUserStore } from "@/stores/user";

// --- State: Data & UI ---
const employees = ref([]);
const loading = ref(true);
const submitting = ref(false);

// ✅ 2. เรียกใช้ Store
const userStore = useUserStore();

// --- State: Filters & Pagination ---
const searchQuery = ref("");
const roleFilter = ref("all");
const statusFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = ref(10);

// --- State: Modals ---
const showFormModal = ref(false);
const isEditing = ref(false);
const selectedEmployee = ref(null);

// --- State: Toast Notification ---
const toast = ref({ isOpen: false, title: "", message: "", type: "success" });

const showToast = (title, message, type = "success") => {
  toast.value = { isOpen: true, title, message, type };
};

const { swalConfirm, swalSuccess } = useSwal();

// --- 1. Fetch Data ---
const fetchEmployees = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("employees")
      // ระบุคอลัมน์ชัดเจน
      .select(
        "employees_id, employees_code, employees_firstname, employees_lastname, employees_position, employees_department, employees_gender, employees_phone, employees_status, email, role, notification_email, employees_photo, created_at"
      )
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
const allSearchSuggestions = computed(() => {
  if (!employees.value) return [];
  const names = employees.value.map(
    (e) => `${e.employees_firstname} ${e.employees_lastname}`
  );
  const phones = employees.value.map((e) => e.employees_phone).filter(Boolean);
  const codes = employees.value.map((e) => e.employees_code).filter(Boolean);
  const emails = employees.value.map((e) => e.email).filter(Boolean);
  return [...new Set([...names, ...phones, ...codes, ...emails])];
});

const filteredEmployees = computed(() => {
  return employees.value.filter((emp) => {
    const fullName = `${emp.employees_firstname} ${emp.employees_lastname}`.toLowerCase();
    const search = searchQuery.value.toLowerCase();

    const matchSearch =
      fullName.includes(search) ||
      (emp.employees_phone && emp.employees_phone.includes(search)) ||
      (emp.employees_code && emp.employees_code.toLowerCase().includes(search));

    const matchRole = roleFilter.value === "all" || emp.role === roleFilter.value;
    const matchStatus =
      statusFilter.value === "all" || emp.employees_status === statusFilter.value;

    return matchSearch && matchRole && matchStatus;
  });
});

const totalPages = computed(() =>
  Math.ceil(filteredEmployees.value.length / itemsPerPage.value)
);
const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredEmployees.value.slice(start, start + itemsPerPage.value);
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

const openDelete = async (emp) => {
  const confirm = await swalConfirm(
    "ยืนยันการลบพนักงาน?",
    `คุณต้องการลบคุณ ${emp.employees_firstname} ${emp.employees_lastname} ออกจากระบบใช่หรือไม่? ข้อมูลนี้จะไม่สามารถกู้คืนได้`,
    "ลบข้อมูล"
  );

  if (confirm) {
    await handleDeleteConfirm(emp);
  }
};

// --- 4. CRUD: Save (Insert/Update) ---
const handleSave = async (formData) => {
  submitting.value = true;
  try {
    const payload = {
      employees_code: formData.code,
      employees_firstname: formData.firstname,
      employees_lastname: formData.lastname,
      employees_status: formData.status,
      role: formData.role,
      employees_position: formData.position,
      employees_department: formData.department,
      employees_gender: formData.gender,
      employees_phone: formData.phone,
      email: formData.email ? formData.email.toLowerCase() : "",
      updated_at: new Date(),
      // ✅ ส่งรูปและอีเมลแจ้งเตือน
      employees_photo: formData.employees_photo,
      notification_email: formData.notification_email || null,
    };

    if (isEditing.value) {
      const { error } = await supabase
        .from("employees")
        .update(payload)
        .eq("employees_id", selectedEmployee.value.employees_id);

      if (error) throw error;
      await swalSuccess("บันทึกสำเร็จ!", "แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว");

      // 🔥🔥🔥 3. พระเอกของเรา: เช็คว่าถ้าแก้ข้อมูลตัวเอง ให้โหลด Profile ใหม่ทันที!
      if (
        userStore.profile &&
        selectedEmployee.value.employees_id === userStore.profile.employees_id
      ) {
        console.log("Updating current user profile...");
        await userStore.fetchUserProfile(); // สั่ง Store ดึงข้อมูลใหม่จาก Server
      }
    } else {
      const { error } = await supabase.from("employees").insert([
        {
          ...payload,
          employees_status: "active",
          created_at: new Date(),
        },
      ]);

      if (error) throw error;
      await swalSuccess("เพิ่มสำเร็จ!", "เพิ่มพนักงานใหม่เข้าระบบเรียบร้อยแล้ว");
    }

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
const handleDeleteConfirm = async (empToDelete) => {
  submitting.value = true;
  try {
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("employees_id", empToDelete.employees_id);

    if (error) throw error;

    employees.value = employees.value.filter(
      (e) => e.employees_id !== empToDelete.employees_id
    );

    await swalSuccess("ลบสำเร็จ!", "ข้อมูลพนักงานถูกลบออกจากระบบแล้ว");

    if (paginatedEmployees.value.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
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
    <h1 class="text-2xl font-bold text-gray-800 dark:text-white">จัดการพนักงาน</h1>

    <div
      class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300"
    >
      <EmployeeToolbar
        v-model:searchQuery="searchQuery"
        v-model:roleFilter="roleFilter"
        v-model:statusFilter="statusFilter"
        :search-suggestions="allSearchSuggestions"
        @add="openAdd"
      />
      <EmployeeTable
        :employees="paginatedEmployees"
        :loading="loading"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :totalItems="filteredEmployees.length"
        v-model:itemsPerPage="itemsPerPage"
        @edit="openEdit"
        @delete="openDelete"
        @changePage="changePage"
      />
    </div>

    <EmployeeModal
      :is-open="showFormModal"
      :is-editing="isEditing"
      :employee-data="selectedEmployee"
      :loading="submitting"
      @close="showFormModal = false"
      @save="handleSave"
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
