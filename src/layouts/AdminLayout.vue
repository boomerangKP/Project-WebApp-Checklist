<script setup>
import { ref } from "vue"; // เพิ่ม ref สำหรับจัดการ state ของ sidebar
import AdminSidebar from "@/components/admin/AdminSidebar.vue";
import AdminHeader from "@/components/admin/AdminHeader.vue";
// 👇 1. นำเข้า Component ตัวบล็อก
import MobileBlocker from "@/components/admin/MobileBlocker.vue";

// เพิ่ม state สำหรับควบคุมการเปิด/ปิด sidebar (เพื่อให้ responsive ทำงานสมบูรณ์แบบเดิม)
const isSidebarOpen = ref(false);
</script>

<template>
  <div
    class="flex h-screen bg-gray-100 dark:bg-slate-900 font-sans relative transition-colors duration-300"
  >
    <MobileBlocker />

    <AdminSidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <div
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300"
      :class="isSidebarOpen ? 'lg:ml-64' : ''"
    >
      <AdminHeader @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

      <main
        class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-slate-900 p-6 relative transition-colors duration-300 w-full"
      >
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* เพิ่ม style สำหรับ transition หน้า (ถ้าต้องการ) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
