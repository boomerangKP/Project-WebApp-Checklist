<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2"; 

import MaidHeader from "@/components/maid/home/MaidHeader.vue";
import DailyProgress from "@/components/maid/home/DailyProgress.vue";
import MaidActions from "@/components/maid/home/MaidActions.vue";

const router = useRouter();
const userStore = useUserStore();

// State (เหลือแค่ loading ของหน้าจอหลัก)
const loading = ref(true);

const user = computed(() => userStore.profile);

// --- 1. โหลดข้อมูล User Profile (คงไว้เหมือนเดิม) ---
const fetchUserProfile = async () => {
  if (!userStore.profile) {
    await userStore.fetchProfile();
  }
};

// --- 2. ฟังก์ชัน Logout (คงไว้เหมือนเดิม) ---
const handleLogout = () => {
  Swal.fire({
    title: 'ยืนยันการออกจากระบบ?',
    text: "คุณต้องการออกจากระบบใช่หรือไม่",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#9ca3af',
    confirmButtonText: 'ใช่, ออก',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'กำลังออก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      await supabase.auth.signOut();
      userStore.clearSession();
      
      Swal.close();
      window.location.replace("/login");
    }
  });
};

// --- Lifecycle ---
onMounted(async () => {
  loading.value = true;
  await fetchUserProfile();
  // ❌ ลบ fetchTodayStats() ออก (DailyProgress ทำเองแล้ว)
  // ❌ ลบ subscribeToChanges() ออก (DailyProgress ทำเองแล้ว)
  loading.value = false;
});

// ❌ ลบ onUnmounted ของ Realtime ออก (DailyProgress จัดการเองแล้ว)
</script>

<template>
  <div class="p-6 space-y-6 pb-24 min-h-screen bg-gray-50">

    <MaidHeader
      :user="user"
      @logout="handleLogout"
    />

    <DailyProgress />

    <MaidActions />

  </div>
</template>