<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "@/lib/supabase";
import { Monitor, LogOut } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const showBlocker = ref(false);

const CHECK_WIDTH = 1024;

// ✅ เช็คชื่อ Route ให้ตรงกับใน router/index.js เป๊ะๆ นะครับ
const ALLOWED_MOBILE_PAGES = [
  "admin-dashboard",
  "task-detail",
  // "check-tasks-scan" // เผื่อมีหน้าสแกน QR
];

const checkScreenSize = () => {
  const isMobile = window.innerWidth < CHECK_WIDTH;

  if (!isMobile) {
    showBlocker.value = false;
    return;
  }

  // ✅ Logic: ถ้าเป็นมือถือ AND (ไม่ได้อยู่ในหน้าที่อนุญาต) => บล็อก
  // ใช้ includes เช็คว่าชื่อ Route ปัจจุบัน อยู่ใน list ที่อนุญาตไหม
  if (route.name && ALLOWED_MOBILE_PAGES.includes(route.name)) {
    showBlocker.value = false;
  } else {
    showBlocker.value = true;
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.replace("/login");
};

// เช็คทุกครั้งที่เปลี่ยนหน้า
watch(() => route.name, checkScreenSize);

onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenSize);
});
</script>

<template>
  <div
    v-if="showBlocker"
    class="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300"
  >
    <div
      class="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center border border-gray-100 dark:border-slate-700"
    >
      <div
        class="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6"
      >
        <Monitor class="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
      </div>

      <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-2">
        เปิดบนคอมพิวเตอร์เท่านั้น
      </h2>
      <p class="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-sm">
        เมนูนี้มีข้อมูลซับซ้อน เพื่อประสบการณ์ที่ดีที่สุด<br />กรุณาใช้งานผ่าน Desktop
        หรือ iPad แนวนอน
      </p>

      <div class="space-y-3 w-full">
        <button
          @click="router.push('/admin')"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
        >
          กลับไปหน้าแดชบอร์ด
        </button>

        <button
          @click="handleLogout"
          class="w-full py-3 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
        >
          <LogOut class="w-5 h-5" />
          ออกจากระบบ
        </button>
      </div>
    </div>

    <p class="text-slate-500 text-xs mt-8">Prince Hospital Ubon Ratchathani</p>
  </div>
</template>
