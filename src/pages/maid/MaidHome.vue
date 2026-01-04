<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { supabase } from "@/lib/supabase";

// Components
import MaidHeader from "@/components/maid/home/MaidHeader.vue";
import DailyProgress from "@/components/maid/home/DailyProgress.vue";
import MaidActions from "@/components/maid/home/MaidActions.vue";
import LogoutConfirmModal from "@/components/ui/LogoutConfirmModal.vue";

const router = useRouter();
const userStore = useUserStore();

// State
const loading = ref(true);
const showLogoutModal = ref(false);
// ✅ กำหนดค่าเริ่มต้นให้ครบ เพื่อกัน Error NaN ใน DailyProgress
const todayStats = ref({ total: 0, waiting: 0, completed: 0, rejected: 0 });

// ตัวแปรเก็บการเชื่อมต่อ Realtime
let realtimeSubscription = null;

const user = computed(() => userStore.profile);

// --- 1. ดึงข้อมูลโปรไฟล์ ---
const fetchUserProfile = async () => {
  if (user.value) return;
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return router.replace("/login");

    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .eq("email", authUser.email)
      .single();

    if (employee) userStore.setProfile(employee);
  } catch (err) {
    console.error("Failed to fetch profile:", err);
  }
};

// --- 2. ดึงข้อมูลงานวันนี้ (คำนวณกราฟ) ---
const fetchTodayStats = async () => {
  if (!user.value?.employees_id) return;
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const { data } = await supabase
      .from("check_sessions")
      .select("check_sessions_status")
      .eq("employees_id", user.value.employees_id)
      .eq("check_sessions_date", todayStr);

    if (data) {
      const total = data.length;

      // 🟡 รอตรวจ: ส่งงานแล้ว รอหัวหน้ากด
      const waiting = data.filter(i => i.check_sessions_status === 'waiting').length;

      // 🟢 ผ่านแล้ว: หัวหน้าอนุมัติ หรือแก้ไขแล้ว
      const completed = data.filter(i => ['pass', 'approved', 'fixed'].includes(i.check_sessions_status)).length;

      // 🔴 ไม่ผ่าน: โดนตีกลับ (ถ้ามี)
      const rejected = data.filter(i => ['fail', 'rejected'].includes(i.check_sessions_status)).length;

      todayStats.value = { total, waiting, completed, rejected };
    }
  } catch (err) {
    console.error("Error stats:", err);
  }
};

// --- 3. 🔥 ระบบ Realtime (เฝ้าดูการเปลี่ยนแปลง) ---
const subscribeToChanges = () => {
  if (!user.value?.employees_id) return;

  // ตัดการเชื่อมต่อเก่าก่อน (ถ้ามี)
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription);

  realtimeSubscription = supabase
    .channel('maid-home-stats')
    .on(
      'postgres_changes',
      {
        event: '*', // ฟังทุกอย่าง (Update, Insert, Delete)
        schema: 'public',
        table: 'check_sessions',
        filter: `employees_id=eq.${user.value.employees_id}` // ฟังเฉพาะของตัวเอง
      },
      (payload) => {
        fetchTodayStats(); // โหลดข้อมูลใหม่ทันที
      }
    )
    .subscribe();
};

// --- Handlers ---
const handleLogoutConfirm = async () => {
  await supabase.auth.signOut();
  userStore.clearSession();
  window.location.replace("/login");
};

// --- Lifecycle ---
onMounted(async () => {
  loading.value = true;
  await fetchUserProfile();
  await fetchTodayStats();
  subscribeToChanges(); // เริ่มฟัง Realtime
  loading.value = false;
});

onUnmounted(() => {
  // ปิดการฟังเมื่อออกจากหน้า (สำคัญมาก)
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription);
});
</script>

<template>
  <LogoutConfirmModal v-model="showLogoutModal" @confirm="handleLogoutConfirm" />

  <div class="p-6 space-y-6 pb-24 min-h-screen bg-gray-50">

    <MaidHeader
      :user="user"
      @logout="showLogoutModal = true"
    />

    <DailyProgress
      :stats="todayStats"
      :loading="loading"
    />

    <MaidActions />

  </div>
</template>
