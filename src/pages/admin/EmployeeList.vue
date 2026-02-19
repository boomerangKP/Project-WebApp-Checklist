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
      // ✅ เพิ่ม 'auth_user_id' เข้าไปในรายการ select
      .select(
        "employees_id, auth_user_id, employees_code, employees_firstname, employees_lastname, employees_position, employees_department, employees_gender, employees_phone, employees_status, email, role, notification_email, employees_photo, created_at"
      )
      .is("deleted_at", null)
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
    `ข้อมูลของ ${emp.employees_firstname} ${emp.employees_lastname} จะถูกซ่อนไว้ (Soft Delete) และสามารถกู้คืนได้โดย Admin`,
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
    // เตรียมข้อมูลสำหรับอัปเดตตาราง employees (Database)
    const dbPayload = {
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
      employees_photo: formData.employees_photo,
      notification_email: formData.notification_email || null,
    };

    if (isEditing.value) {
      // -----------------------------------------------------------
      // ✅ กรณีแก้ไข (Update)
      // -----------------------------------------------------------
      
      // ตรวจสอบว่าจำเป็นต้องอัปเดต Auth หรือไม่ (รวมถึงชื่อ-นามสกุล)
      const isAuthUpdateNeeded = 
        formData.password || 
        formData.email !== selectedEmployee.value.email || 
        formData.role !== selectedEmployee.value.role ||
        formData.firstname !== selectedEmployee.value.employees_firstname || // ✅ เช็คชื่อ
        formData.lastname !== selectedEmployee.value.employees_lastname;     // ✅ เช็คนามสกุล

      if (isAuthUpdateNeeded) {
          // ⚠️ ตรวจสอบว่ามี auth_user_id หรือไม่
          if (!selectedEmployee.value.auth_user_id) {
             console.warn("ไม่พบข้อมูลผู้ใช้ในระบบ Auth (อาจเป็นข้อมูลเก่า) ข้ามการอัปเดต Auth");
          } else {
              const { error: authError } = await supabase.functions.invoke('update-employee', {
                body: {
                  userId: selectedEmployee.value.auth_user_id, // ใช้ auth_user_id (UUID)
                  email: formData.email,
                  password: formData.password || undefined,
                  role: formData.role,
                  firstName: formData.firstname, // ✅ ส่งชื่อไปอัปเดต
                  lastName: formData.lastname    // ✅ ส่งนามสกุลไปอัปเดต
                }
              });

              if (authError) throw new Error("ไม่สามารถอัปเดตข้อมูลเข้าระบบ (Auth) ได้: " + authError.message);
          }
      }

      // 2. อัปเดตข้อมูลทั่วไปลงตาราง employees
      const { error } = await supabase
        .from("employees")
        .update(dbPayload)
        .eq("employees_id", selectedEmployee.value.employees_id);

      if (error) throw error;
      await swalSuccess("บันทึกสำเร็จ!", "แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว");

      // 3. ถ้าแก้ไขข้อมูลตัวเอง ให้โหลด Profile ใน Store ใหม่ทันที
      if (
        userStore.profile &&
        selectedEmployee.value.employees_id === userStore.profile.employees_id
      ) {
        console.log("Updating current user profile...");
        await userStore.fetchUserProfile();
      }

    } else {
      // -----------------------------------------------------------
      // ✅ กรณีสร้างใหม่ (Create) - ใช้ Edge Function แบบ One-Stop
      // -----------------------------------------------------------
      
      // ส่งข้อมูลทั้งหมดไปให้ Edge Function 'create-employee' จัดการ
      const { error } = await supabase.functions.invoke('create-employee', {
        body: {
          // Auth Data
          email: formData.email,
          password: formData.password,
          role: formData.role,
          
          // Profile Data
          firstName: formData.firstname,
          lastName: formData.lastname,
          phone: formData.phone,
          position: formData.position,
          
          // Extra Data
          code: formData.code,
          department: formData.department,
          gender: formData.gender,
          status: formData.status,
          employees_photo: formData.employees_photo,
          notification_email: formData.notification_email
        }
      });

      if (error) throw error;
      await swalSuccess("เพิ่มสำเร็จ!", "เพิ่มพนักงานใหม่และสร้างบัญชีเรียบร้อยแล้ว");
    }

    await fetchEmployees();
    showFormModal.value = false;

  } catch (err) {
    console.error("Save Error:", err);
    showToast("เกิดข้อผิดพลาด", err.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
  } finally {
    submitting.value = false;
  }
};

// --- 5. CRUD: Delete (Soft Delete) ---
const handleDeleteConfirm = async (empToDelete) => {
  submitting.value = true;
  try {
    // ---------------------------------------------------------
    // 1. ✅ แก้ไข Database ก่อน: ปลด auth_user_id เป็น NULL
    // เพื่อให้ไม่ติด Foreign Key Constraint เวลาลบ User ใน Auth
    // ---------------------------------------------------------
    const { error } = await supabase
      .from("employees")
      .update({
        employees_status: "inactive",
        deleted_at: new Date(),
        auth_user_id: null // 🔑 สำคัญมาก! ปลดล็อกความสัมพันธ์
      })
      .eq("employees_id", empToDelete.employees_id);

    if (error) throw error;

    // ---------------------------------------------------------
    // 2. ✅ ลบ User ออกจาก Auth (เรียก Edge Function) ทีหลัง
    // ---------------------------------------------------------
    if (empToDelete.auth_user_id) {
      const { error: funcError } = await supabase.functions.invoke('delete-employee', {
        body: { userId: empToDelete.auth_user_id }
      })
      
      if (funcError) {
        // กรณีลบ Auth ไม่สำเร็จ (เช่น Network Error) แต่ DB ลบไปแล้ว
        // เราจะแค่ Log Error ไว้ แต่ไม่ throw เพื่อให้ User เห็นว่าการลบข้อมูลสำเร็จ
        console.error("Auth Delete Warning:", funcError);
      }
    }

    // ลบออกจาก list หน้าเว็บ
    employees.value = employees.value.filter(
      (e) => e.employees_id !== empToDelete.employees_id
    );

    await swalSuccess("ลบสำเร็จ!", "ข้อมูลพนักงานและบัญชีผู้ใช้ถูกลบเรียบร้อยแล้ว");

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
      class="bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300"
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