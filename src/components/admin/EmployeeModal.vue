<script setup>
import { ref, watch, onMounted, onUnmounted,  } from "vue";
import {
  Loader2,
  X,
  RefreshCw,
  ChevronDown,
  Check,
  Camera,
  CheckCircle,
  RotateCcw,
  Trash2,
  Bell,
  Plus,
  Eye,
  EyeOff
} from "lucide-vue-next";
import { supabase } from "@/lib/supabase";
import { useSwal } from "@/composables/useSwal";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

const props = defineProps({
  isOpen: Boolean,
  isEditing: Boolean,
  employeeData: Object,
  loading: Boolean,
});

// สร้างตัวแปร state
const showPassword = ref(false);
const emit = defineEmits(["close", "save"]);
const { swalError, Swal } = useSwal();

const emailError = ref("");
const imagePreview = ref(null);
const isUploadingImage = ref(false);
const showCropper = ref(false);
const selectedImage = ref(null);
const cropperRef = ref(null);

const roleToPositionMap = {
  admin: "ผู้ดูแลระบบ",
  maid: "แม่บ้าน",
  user: "พนักงานทั่วไป",
  cleaner: "พนักงานทำความสะอาด",
  supervisor: "หัวหน้างาน",
};

const form = ref({
  code: "",
  firstname: "",
  lastname: "",
  gender: "",
  department: "",
  role: "maid",
  status: "active",
  phone: "",
  email: "",
  notification_email: "",
  employees_photo: null,
  password: "",
});

const isGeneratingCode = ref(false);
const activeDropdown = ref(null);

// ตัวเลือก (Options)
const genderOptions = [
  { value: "ชาย", label: "ชาย" },
  { value: "หญิง", label: "หญิง" },
  { value: "อื่นๆ", label: "อื่นๆ" },
];

const departmentOptions = ref([{ value: "แผนกซ่อมบำรุง", label: "แผนกซ่อมบำรุง" }]);

const roleOptions = ref([
  { value: "admin", label: "ผู้ดูแลระบบ" },
  { value: "maid", label: "แม่บ้าน" },
  { value: "user", label: "พนักงานทั่วไป" },
  { value: "cleaner", label: "พนักงานทำความสะอาด" },
  { value: "supervisor", label: "หัวหน้างาน" },
]);

const statusOptions = [
  { value: "active", label: "ปกติ" },
  { value: "inactive", label: "ไม่เคลื่อนไหว" },
  { value: "suspended", label: "ระงับ" },
];

const toggleDropdown = (name) => {
  activeDropdown.value = activeDropdown.value === name ? null : name;
};

const selectOption = (field, value) => {
  form.value[field] = value;
  activeDropdown.value = null;
};

const handleAddNew = async (field) => {
  if (field === "role") return;

  activeDropdown.value = null;
  const fieldLabel = "แผนก";

  const { value: text } = await Swal.fire({
    title: `เพิ่ม${fieldLabel}ใหม่`,
    input: "text",
    inputLabel: `ระบุชื่อ${fieldLabel}`,
    inputPlaceholder: `พิมพ์ชื่อ${fieldLabel}...`,
    showCancelButton: true,
    confirmButtonText: "เพิ่ม",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#4f46e5",
    inputValidator: (value) => {
      if (!value) {
        return "กรุณาระบุข้อมูล";
      }
    },
  });

  if (text) {
    const newValue = text.trim();
    const newOption = { value: newValue, label: newValue };

    if (field === "department") {
      if (!departmentOptions.value.find((o) => o.value === newValue)) {
        departmentOptions.value.push(newOption);
      }
      form.value.department = newValue;
    }
  }
};

const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) activeDropdown.value = null;
};

onMounted(() => window.addEventListener("click", handleClickOutside));
onUnmounted(() => window.removeEventListener("click", handleClickOutside));

const getLabel = (options, value, placeholder) => {
  const opts = Array.isArray(options) ? options : options.value;
  const found = opts.find((opt) => opt.value === value);
  return found ? found.label : value || placeholder;
};

const resetForm = () => {
  form.value = {
    code: "",
    firstname: "",
    lastname: "",
    gender: "",
    department: "",
    role: "maid",
    status: "active",
    phone: "",
    email: "",
    notification_email: "",
    employees_photo: null,
    password: "",
  };
  imagePreview.value = null;
  emailError.value = "";
  selectedImage.value = null;
  showCropper.value = false;
};

const generateNextCode = async () => {
  if (props.isEditing) return;
  isGeneratingCode.value = true;
  try {
    const { data } = await supabase
      .from("employees")
      .select("employees_code")
      .order("employees_id", { ascending: false })
      .limit(1)
      .single();
    let nextCode = "001";
    if (data && data.employees_code) {
      const currentNum = parseInt(data.employees_code, 10);
      if (!isNaN(currentNum)) nextCode = String(currentNum + 1).padStart(3, "0");
    }
    form.value.code = nextCode;
  } catch {
    form.value.code = "001";
  } finally {
    isGeneratingCode.value = false;
  }
};

const deleteOldImage = async (oldUrl) => {
  if (!oldUrl) return;
  try {
    const fileName = oldUrl.split("/").pop();
    const { error } = await supabase.storage.from("avatars").remove([fileName]);
    if (error) console.error("Failed delete:", error);
  } catch (err) {
    console.error("Error delete:", err);
  }
};

const onFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.match("image.*"))
    return swalError("ไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์รูปภาพเท่านั้น");
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result;
    showCropper.value = true;
    event.target.value = null;
  };
  reader.readAsDataURL(file);
};

const confirmCrop = () => {
  if (!cropperRef.value) return;

  const { canvas } = cropperRef.value.getResult({
    width: 500,
    height: 500,
  });

  if (!canvas) return;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = canvas.width;
  finalCanvas.height = canvas.height;
  const ctx = finalCanvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  ctx.drawImage(canvas, 0, 0);

  imagePreview.value = finalCanvas.toDataURL("image/jpeg", 0.8);
  showCropper.value = false;
  isUploadingImage.value = true;

  finalCanvas.toBlob(
    (blob) => {
      if (blob) processAndUpload(blob);
    },
    "image/jpeg",
    0.8
  );
};

const cancelCrop = () => {
  showCropper.value = false;
  selectedImage.value = null;
};

const processAndUpload = async (fileBlob) => {
  try {
    if (
      form.value.employees_photo &&
      form.value.employees_photo !== props.employeeData?.employees_photo
    ) {
      await deleteOldImage(form.value.employees_photo);
    }

    imagePreview.value = URL.createObjectURL(fileBlob);
    const fileName = `avatar_${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, fileBlob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    form.value.employees_photo = data.publicUrl;

  } catch (error) {
    console.error("Upload Error:", error);
    swalError("อัปโหลดไม่สำเร็จ", "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    imagePreview.value = null;
  } finally {
    isUploadingImage.value = false;
  }
};

const removeImage = async () => {
  if (form.value.employees_photo) {
    if (form.value.employees_photo !== props.employeeData?.employees_photo) {
      await deleteOldImage(form.value.employees_photo);
    }
  }
  form.value.employees_photo = null;
  imagePreview.value = null;
};

const handleEmailInput = (e) => {
  const value = e.target.value;
  form.value.email = value;
  emailError.value = /[A-Z]/.test(value)
    ? "กรุณากรอกอีเมลด้วยตัวพิมพ์เล็ก (a-z) เท่านั้น"
    : "";
};

const handlePhoneInput = (e) => {
  form.value.phone = e.target.value.replace(/\D/g, "").slice(0, 10);
};

watch(
  () => props.employeeData,
  async (newData) => {
    if (props.isEditing && newData) {
      form.value = {
        code: newData.employees_code,
        firstname: newData.employees_firstname,
        lastname: newData.employees_lastname,
        gender: newData.employees_gender || "",
        department: newData.employees_department || "",
        role: (newData.role || "maid").toLowerCase(),
        status: newData.employees_status || "active",
        phone: newData.employees_phone ? newData.employees_phone.replace(/-/g, "") : "",
        email: newData.employees_email || newData.email,
        notification_email: newData.notification_email || "",
        employees_photo: newData.employees_photo || null,
        password: "", // ✅ เมื่อแก้ไข ไม่ต้องดึง password มาแสดง
      };

      if (
        form.value.department &&
        !departmentOptions.value.find((o) => o.value === form.value.department)
      ) {
        departmentOptions.value.push({
          value: form.value.department,
          label: form.value.department,
        });
      }

      imagePreview.value = newData.employees_photo || null;
      emailError.value = "";
    }
  },
  { immediate: true }
);

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && !props.isEditing) {
      resetForm();
      generateNextCode();
    }
  }
);

const handleSubmit = async () => {
  if (!form.value.code) return swalError("ข้อผิดพลาด", "ไม่พบรหัสพนักงาน");
  if (!form.value.firstname.trim())
    return swalError("ข้อมูลไม่ครบ", "กรุณากรอก ชื่อจริง");
  if (!form.value.lastname.trim()) return swalError("ข้อมูลไม่ครบ", "กรุณากรอก นามสกุล");
  if (!form.value.gender) return swalError("ข้อมูลไม่ครบ", "กรุณาเลือก เพศ");
  if (!form.value.department.trim()) return swalError("ข้อมูลไม่ครบ", "กรุณาเลือก แผนก");
  if (!form.value.role) return swalError("ข้อมูลไม่ครบ", "กรุณาเลือก บทบาท");
  if (!form.value.status) return swalError("ข้อมูลไม่ครบ", "กรุณาเลือก สถานะ");
  if (!form.value.email.trim()) return swalError("ข้อมูลไม่ครบ", "กรุณากรอก อีเมล");
  if (emailError.value)
    return swalError("ข้อมูลไม่ถูกต้อง", "กรุณาแก้ไขรูปแบบอีเมลให้ถูกต้อง");
  if (!form.value.phone.trim())
    return swalError("ข้อมูลไม่ครบ", "กรุณากรอก เบอร์โทรศัพท์");
  if (form.value.phone.length !== 10)
    return swalError("ข้อมูลไม่ถูกต้อง", "เบอร์โทรศัพท์ต้องมี 10 หลักถ้วน");

  // ✅ Logic: ตรวจสอบรหัสผ่านเฉพาะกรณีสร้างใหม่ (ถ้าแก้ไข จะว่างได้)
  if (!props.isEditing) {
    if (!form.value.password) return swalError("ข้อมูลไม่ครบ", "กรุณากำหนดรหัสผ่าน");
    if (form.value.password.length < 6) return swalError("ข้อมูลไม่ถูกต้อง", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  } else {
    // กรณีแก้ไข: ถ้ากรอกรหัสผ่านใหม่ ต้องเช็คความยาว
    if (form.value.password && form.value.password.length < 6) {
      return swalError("ข้อมูลไม่ถูกต้อง", "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
    }
  }

  if (props.isEditing && props.employeeData.employees_photo) {
    if (form.value.employees_photo !== props.employeeData.employees_photo) {
      await deleteOldImage(props.employeeData.employees_photo);
    }
  }

  const finalRole = form.value.role.toLowerCase();
  const finalPosition = roleToPositionMap[finalRole] || "พนักงานทั่วไป";
  const formattedPhone = form.value.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

  emit("save", {
    ...form.value,
    role: finalRole,
    position: finalPosition,
    phone: formattedPhone,
    status: form.value.status,
    email: form.value.email.toLowerCase(),
    notification_email: finalRole === "admin" ? form.value.notification_email : null,
    employees_photo: form.value.employees_photo,
    password: form.value.password, // ✅ ส่ง password ไปด้วย
  });
};
</script>

<template>
  <div>
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans"
      >
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          @click="$emit('close')"
        ></div>

        <div
          class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh] animate-fade-in-up border border-gray-100 dark:border-slate-700"
        >
          <div
            class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 rounded-t-2xl shrink-0"
          >
            <h3 class="text-lg font-bold text-gray-800 dark:text-white">
              {{ isEditing ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่" }}
            </h3>
            <button
              @click="$emit('close')"
              class="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-full p-2 transition-all"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="overflow-y-auto p-6 custom-scrollbar">
            <div class="flex flex-col items-center justify-center mb-6 gap-3">
              <div
                v-if="showCropper"
                class="w-full bg-gray-100 dark:bg-slate-900 rounded-xl p-2 border-2 border-dashed border-indigo-300 dark:border-indigo-700 animate-in fade-in zoom-in-95"
              >
                <div class="h-64 w-full bg-slate-800 rounded-lg overflow-hidden relative">
                  <Cropper
                    ref="cropperRef"
                    :src="selectedImage"
                    :stencil-props="{ aspectRatio: 1, class: 'circle-stencil' }"
                    image-class="object-contain"
                    class="h-full"
                  />
                </div>
                <div class="flex gap-2 mt-2">
                  <button
                    @click="cancelCrop"
                    class="flex-1 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <RotateCcw class="w-3 h-3 inline mr-1" /> ยกเลิก
                  </button>
                  <button
                    @click="confirmCrop"
                    class="flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
                  >
                    <CheckCircle class="w-3 h-3 inline mr-1" /> ยืนยันรูปนี้
                  </button>
                </div>
              </div>
              <div v-else class="relative group">
                <div
                  class="w-24 h-24 rounded-full border-4 border-white dark:border-slate-600 shadow-lg overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center relative"
                  :class="{
                    'border-indigo-100 dark:border-indigo-900 ring-2 ring-indigo-500': isUploadingImage,
                  }"
                >
                  <img
                    v-if="imagePreview"
                    :src="imagePreview"
                    class="w-full h-full object-cover"
                    alt="Profile"
                  />
                  <div v-else class="text-gray-300 dark:text-slate-500">
                    <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div
                    v-if="isUploadingImage"
                    class="absolute inset-0 bg-black/50 flex items-center justify-center z-10"
                  >
                    <Loader2 class="w-6 h-6 text-white animate-spin" />
                  </div>
                </div>
                <label
                  class="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95 z-20"
                >
                  <Camera class="w-4 h-4" />
                  <input
                    type="file"
                    class="hidden"
                    accept="image/*"
                    @change="onFileSelect"
                    :disabled="isUploadingImage"
                  />
                </label>
                <button
                  v-if="imagePreview"
                  @click="removeImage"
                  type="button"
                  class="absolute top-0 right-[-10px] bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-sm transition-transform hover:scale-110 z-20"
                  title="ลบรูปภาพ"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
              <p v-if="!showCropper" class="text-xs text-gray-400 dark:text-slate-500">
                รูปโปรไฟล์
              </p>
            </div>

            <form id="employeeForm" @submit.prevent="handleSubmit" class="space-y-4">
              <div class="space-y-1">
                <label
                  class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex justify-between"
                >
                  รหัสพนักงาน (Auto) <span class="text-red-500">*</span>
                  <span
                    v-if="isGeneratingCode"
                    class="text-indigo-500 text-[10px] flex items-center gap-1"
                    ><Loader2 class="w-3 h-3 animate-spin" /> ...</span
                  >
                </label>
                <div class="relative">
                  <input
                    v-model="form.code"
                    type="text"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-gray-400 font-mono font-bold focus:ring-0 cursor-not-allowed"
                    placeholder="001"
                    readonly
                  />
                  <button
                    type="button"
                    v-if="!isEditing"
                    @click="generateNextCode"
                    class="absolute right-2 top-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="รันเลขใหม่"
                  >
                    <RefreshCw
                      class="w-4 h-4"
                      :class="{ 'animate-spin': isGeneratingCode }"
                    />
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label
                    class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                    >ชื่อจริง <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.firstname"
                    type="text"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="กรุณากรอกชื่อจริง"
                  />
                </div>
                <div class="space-y-1">
                  <label
                    class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                    >นามสกุล <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.lastname"
                    type="text"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="กรุณากรอกนามสกุล"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1 relative custom-dropdown-container">
                  <label
                    class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                    >เพศ <span class="text-red-500">*</span></label
                  >
                  <button
                    type="button"
                    @click="toggleDropdown('gender')"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-left bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all flex items-center justify-between"
                    :class="{
                      'ring-2 ring-indigo-500 border-indigo-500':
                        activeDropdown === 'gender',
                    }"
                  >
                    <span
                      :class="
                        form.gender
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-500'
                      "
                      >{{ getLabel(genderOptions, form.gender, "เลือกเพศ") }}</span
                    >
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 dark:text-gray-500"
                      :class="{ 'rotate-180': activeDropdown === 'gender' }"
                    />
                  </button>

                  <div
                    v-if="activeDropdown === 'gender'"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="p-1">
                      <div
                        v-for="option in genderOptions"
                        :key="option.value"
                        @click="selectOption('gender', option.value)"
                        class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200"
                      >
                        <span>{{ option.label }}</span
                        ><Check
                          v-if="form.gender === option.value"
                          class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-1 relative custom-dropdown-container">
                  <label
                    class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                    >แผนก <span class="text-red-500">*</span></label
                  >
                  <div
                    @click="toggleDropdown('department')"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-left bg-white dark:bg-slate-900 cursor-pointer flex items-center justify-between hover:border-indigo-500 transition-colors"
                    :class="{
                      'ring-2 ring-indigo-500 border-indigo-500':
                        activeDropdown === 'department',
                    }"
                  >
                    <span
                      :class="
                        form.department
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-500'
                      "
                      >{{
                        getLabel(departmentOptions, form.department, "เลือกแผนก")
                      }}</span
                    >
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 dark:text-gray-500"
                      :class="{ 'rotate-180': activeDropdown === 'department' }"
                    />
                  </div>

                  <div
                    v-if="activeDropdown === 'department'"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      <div
                        v-for="option in departmentOptions"
                        :key="option.value"
                        @click="selectOption('department', option.value)"
                        class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200"
                      >
                        <span>{{ option.label }}</span>
                        <Check
                          v-if="form.department === option.value"
                          class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                        />
                      </div>

                      <div
                        class="border-t border-gray-100 dark:border-slate-700 mt-1 pt-1"
                      >
                        <div
                          @click="handleAddNew('department')"
                          class="px-3 py-2 rounded-md text-indigo-600 dark:text-indigo-400 text-sm cursor-pointer flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 font-medium"
                        >
                          <Plus class="w-4 h-4" /> เพิ่มแผนกใหม่...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1 relative custom-dropdown-container">
                  <label
                    class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                    >บทบาท (Role) <span class="text-red-500">*</span></label
                  >
                  <div
                    @click="toggleDropdown('role')"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-left bg-white dark:bg-slate-900 cursor-pointer flex items-center justify-between hover:border-indigo-500 transition-colors"
                    :class="{
                      'ring-2 ring-indigo-500 border-indigo-500':
                        activeDropdown === 'role',
                    }"
                  >
                    <span
                      :class="
                        form.role
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-500'
                      "
                      >{{ getLabel(roleOptions, form.role, "เลือกบทบาท") }}</span
                    >
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 dark:text-gray-500"
                      :class="{ 'rotate-180': activeDropdown === 'role' }"
                    />
                  </div>
                  <div
                    v-if="activeDropdown === 'role'"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      <div
                        v-for="option in roleOptions"
                        :key="option.value"
                        @click="selectOption('role', option.value)"
                        class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200"
                      >
                        <span>{{ option.label }}</span>
                        <Check
                          v-if="form.role === option.value"
                          class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                      </div>
                  </div>
                </div>

                <div class="space-y-1 relative custom-dropdown-container">
                  <label
                    class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                    >สถานะ (Status) <span class="text-red-500">*</span></label
                  >
                  <button
                    type="button"
                    @click="toggleDropdown('status')"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-left bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all flex items-center justify-between"
                    :class="{
                      'ring-2 ring-indigo-500 border-indigo-500':
                        activeDropdown === 'status',
                    }"
                  >
                    <span
                      :class="
                        form.status
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-500'
                      "
                      >{{ getLabel(statusOptions, form.status, "เลือกสถานะ") }}</span
                    >
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 dark:text-gray-500"
                      :class="{ 'rotate-180': activeDropdown === 'status' }"
                    />
                  </button>
                  <div
                    v-if="activeDropdown === 'status'"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="p-1">
                      <div
                        v-for="option in statusOptions"
                        :key="option.value"
                        @click="selectOption('status', option.value)"
                        class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200"
                      >
                        <span>{{ option.label }}</span>
                        <Check
                          v-if="form.status === option.value"
                          class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <label
                  class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                  >อีเมล (Login) <span class="text-red-500">*</span></label
                >
                <input
                  :value="form.email"
                  @input="handleEmailInput"
                  type="email"
                  class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none transition-all dark:bg-slate-900 dark:text-white bg-white"
                  :class="
                    emailError
                      ? 'border-red-500 focus:ring-red-200 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300'
                      : 'border-gray-300 dark:border-slate-600 focus:ring-indigo-500'
                  "
                  placeholder="กรอกอีเมลสำหรับเข้าสู่ระบบ"
                />
                <p
                  v-if="emailError"
                  class="text-xs text-red-500 mt-1 font-medium animate-pulse"
                >
                  {{ emailError }}
                </p>
              </div>

              <div class="space-y-1">
                <label
                  class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                  >รหัสผ่าน (Password)
                  <span v-if="!isEditing" class="text-red-500">*</span>
                  <span v-else class="text-gray-400 font-normal text-[10px] ml-1">(เว้นว่างหากไม่ต้องการเปลี่ยน)</span>
                </label>

                <div class="relative">
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    :placeholder="isEditing ? 'กรอกเพื่อเปลี่ยนรหัสผ่านใหม่' : 'กำหนดรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)'"
                  />

                  <button
                    v-show="form.password"
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all focus:outline-none animate-in fade-in zoom-in-95 duration-200"
                    tabindex="-1"
                  >
                    <Eye v-if="!showPassword" class="w-4 h-4" />
                    <EyeOff v-else class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                v-if="form.role === 'admin'"
                class="space-y-1 animate-in fade-in slide-in-from-top-1"
              >
                <label
                  class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1"
                >
                  <Bell class="w-3 h-3" /> อีเมลรับแจ้งเตือน (Notification)
                </label>
                <input
                  v-model="form.notification_email"
                  type="email"
                  class="w-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  placeholder="notification@gmail.com"
                />
                <p class="text-[10px] text-gray-400 dark:text-slate-500">
                  ระบุอีเมลสำหรับรับแจ้งเตือนจากระบบ
                </p>
              </div>

              <div class="space-y-1">
                <label
                  class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"
                  >เบอร์โทร (10 หลัก) <span class="text-red-500">*</span></label
                >
                <input
                  :value="form.phone"
                  @input="handlePhoneInput"
                  type="tel"
                  inputmode="numeric"
                  maxlength="10"
                  class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="กรอกหมายเลขโทรศัพท์ 10 หลัก"
                />
              </div>
            </form>
          </div>

          <div
            class="p-4 border-t border-gray-100 dark:border-slate-700 flex gap-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-2xl shrink-0"
          >
            <button
              type="button"
              @click="$emit('close')"
              class="flex-1 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="employeeForm"
              :disabled="loading"
              class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm shadow-indigo-200 dark:shadow-none flex justify-center items-center gap-2 transition-all disabled:opacity-70 active:scale-95"
            >
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              <span>{{ isEditing ? "บันทึก" : "เพิ่มพนักงาน" }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

:deep(.vue-advanced-cropper__stencil) {
  border-radius: 50% !important;
}
</style>
