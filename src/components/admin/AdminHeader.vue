<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/stores/user";
import Notification from "@/components/admin/NotificationBell.vue";
import { useSwal } from "@/composables/useSwal";
// ✅ 1. เพิ่ม Moon, Sun เข้ามา
import { Menu, LogOut, ShieldCheck, Moon, Sun } from "lucide-vue-next";
// ✅ 2. Import Logic Theme (อย่าลืมสร้างไฟล์ useTheme.js ตามที่คุยกันก่อนหน้านี้นะครับ)
import { useTheme } from "@/composables/useTheme";

const route = useRoute();
const userStore = useUserStore();
const { swalConfirm } = useSwal();
// ✅ 3. เรียกใช้ฟังก์ชันสลับธีม
const { isDark, toggleTheme } = useTheme();

// ✅ Logic การแสดงชื่อหน้า (Breadcrumb แบบง่าย)
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
    default:
      return "ระบบบริหารจัดการสุขอนามัยอาคาร";
  }
});

// --- 🚪 Logout Logic ---
const onLogoutClick = async () => {
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
    class="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm z-30 relative transition-all"
  >
    <div class="flex items-center gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          {{ pageTitle }}
        </h1>
      </div>
    </div>

    <div class="flex items-center space-x-4">
      <button
        @click="toggleTheme"
        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300"
      >
        <Moon v-if="!isDark" class="w-5 h-5" />
        <Sun v-else class="w-5 h-5 text-yellow-400" />
      </button>

      <Notification />

      <div class="flex items-center border-l pl-6 border-gray-200 dark:border-slate-700">
        <div class="text-right mr-3 hidden sm:block">
          <div class="text-sm font-bold text-gray-800 dark:text-gray-200">
            {{ userStore.profile?.employees_firstname || "Admin" }}
            {{ userStore.profile?.employees_lastname || "" }}
          </div>
          <button
            @click="onLogoutClick"
            class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline flex items-center justify-end w-full gap-1"
          >
            Logout
            <LogOut class="w-3 h-3" />
          </button>
        </div>

        <div
          class="h-10 w-10 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-indigo-100 dark:border-slate-600 shadow-sm"
        >
          <img
            v-if="userStore.profile?.employees_photo"
            :src="userStore.profile.employees_photo"
            class="h-full w-full object-cover"
            alt="Profile"
          />
          <ShieldCheck v-else class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    </div>
  </header>
</template>
