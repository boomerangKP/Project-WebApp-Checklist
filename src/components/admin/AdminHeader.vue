<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue"; // ✅ เพิ่ม ref, lifecycle hooks
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/stores/user";
import Notification from "@/components/admin/NotificationBell.vue";
import { useSwal } from "@/composables/useSwal";
import { Menu, LogOut, ShieldCheck, Moon, Sun, User } from "lucide-vue-next"; // ✅ เพิ่ม icon User
import { useTheme } from "@/composables/useTheme";

const emit = defineEmits(["toggle-sidebar"]);

const route = useRoute();
const userStore = useUserStore();
const { swalConfirm } = useSwal();
const { isDark, toggleTheme } = useTheme();

// ✅ State สำหรับ Profile Dropdown
const isProfileOpen = ref(false);
const profileMenuRef = ref(null); // เอาไว้อ้างอิงตัวเมนูเพื่อเช็คการคลิกข้างนอก

const toggleProfile = () => {
  isProfileOpen.value = !isProfileOpen.value;
};

// ✅ ฟังก์ชันปิดเมนูเมื่อคลิกที่อื่น (Click Outside)
const handleClickOutside = (event) => {
  if (profileMenuRef.value && !profileMenuRef.value.contains(event.target)) {
    isProfileOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

const pageTitle = computed(() => {
  const name = route.name || "";
  switch (name) {
    case "admin-dashboard":
      return "แดชบอร์ด";
    case "check-tasks":
      return "ตรวจสอบงาน";
    case "admin-employees":
      return "ข้อมูลพนักงาน";
    case "admin-report":
      return "รายงานผล";
    case "admin-locations":
      return "จัดการข้อมูล";
    case "admin-checklists":
      return "จัดการข้อมูล";
    case "admin-qrcodeprinter":
      return "จัดการข้อมูล";
    case "report-satisfaction":
      return "รายงานผล";
    case "admin-editfeedback":
      return "จัดการข้อมูล";
    case "task-detail":
      return "รายละเอียดงาน";
    default:
      return "ระบบบริหารจัดการสุขอนามัยอาคาร";
  }
});

const onLogoutClick = async () => {
  isProfileOpen.value = false; // ปิดเมนูก่อน
  const isConfirmed = await swalConfirm(
    "ยืนยันการออกจากระบบ?",
    "คุณต้องการออกจากระบบใช่หรือไม่",
    "ออกจากระบบ",
    "warning"
  );

  if (isConfirmed) {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.clear();
    sessionStorage.clear();
    userStore.clearSession();
    window.location.replace("/login");
  }
};
</script>

<template>
  <header
    class="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 shadow-sm z-30 relative transition-all sticky top-0"
  >
    <div class="flex items-center gap-3 lg:gap-4">
      <button
        @click="$emit('toggle-sidebar')"
        class="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
      >
        <Menu class="w-6 h-6" />
      </button>

      <div>
        <h1
          class="text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight truncate max-w-[200px] sm:max-w-none"
        >
          {{ pageTitle }}
        </h1>
      </div>
    </div>

    <div class="flex items-center space-x-2 lg:space-x-4">
      <button
        @click="toggleTheme"
        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300"
      >
        <Moon v-if="!isDark" class="w-5 h-5" />
        <Sun v-else class="w-5 h-5 text-yellow-400" />
      </button>

      <Notification />

      <div
        ref="profileMenuRef"
        class="relative flex items-center border-l pl-3 lg:pl-6 border-gray-200 dark:border-slate-700 ml-2 lg:ml-0"
      >
        <div @click="toggleProfile" class="flex items-center cursor-pointer group">
          <div class="text-right mr-3 hidden sm:block">
            <div
              class="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
            >
              {{ userStore.profile?.employees_firstname || "Admin" }}
              {{ userStore.profile?.employees_lastname || "" }}
            </div>

            <div class="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {{ userStore.profile?.employees_position || "-" }}
              <span class="mx-1 text-gray-300">|</span>
              {{ userStore.profile?.employees_department || "-" }}
            </div>
          </div>

          <div
            class="h-9 w-9 lg:h-10 lg:w-10 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-indigo-100 dark:border-slate-600 shadow-sm flex-shrink-0 group-hover:ring-2 ring-indigo-200 dark:ring-indigo-900 transition-all"
          >
            <img
              v-if="userStore.profile?.employees_photo"
              :src="userStore.profile.employees_photo"
              class="h-full w-full object-cover"
              alt="Profile"
            />
            <ShieldCheck
              v-else
              class="w-5 h-5 lg:w-6 lg:h-6 text-indigo-600 dark:text-indigo-400"
            />
          </div>
        </div>

        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="isProfileOpen"
            class="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 origin-top-right"
          >
            <div
              class="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 sm:hidden"
            >
              <p class="text-sm font-bold text-gray-900 dark:text-white truncate">
                {{ userStore.profile?.employees_firstname || "Admin" }}
                {{ userStore.profile?.employees_lastname || "" }}
              </p>

              <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                {{ userStore.profile?.employees_position || "Administrator" }}
                <span class="mx-1 opacity-50">|</span>
                {{ userStore.profile?.employees_department || "-" }}
              </p>
            </div>

            <div class="p-1">
              <button
                @click="onLogoutClick"
                class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
              >
                <LogOut class="w-4 h-4" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>
