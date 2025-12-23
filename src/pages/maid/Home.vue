<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
// 👇 เพิ่ม PenSquare (ไอคอนรูปปากกา)
import { QrCode, FileText, LogOut, Loader2, PenSquare } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const showLogoutModal = ref(false) // ตัวแปรคุม Modal

// ✅ ใช้ computed ดึงค่าจาก Store
const user = computed(() => userStore.profile)

// ข้อมูลสถิติ
const todayStats = ref({ completed: 0, total: 0 })

const progressPercent = computed(() => {
  if (todayStats.value.total === 0) return 0
  return (todayStats.value.completed / todayStats.value.total) * 100
})

// --- ฟังก์ชันกู้ข้อมูล Profile ---
const fetchUserProfile = async () => {
  if (user.value) return
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return router.replace('/login')

    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', authUser.email)
      .single()

    if (error || !employee) throw error
    userStore.setProfile(employee)
  } catch (err) {
    console.error('Failed to fetch profile:', err)
  }
}

// --- ฟังก์ชันดึงสถิติงาน ---
const fetchTodayStats = async () => {
  if (!user.value?.employees_id) return
  loading.value = true
  try {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('check_sessions')
      .select('check_sessions_status')
      .eq('employees_id', user.value.employees_id)
      .eq('check_sessions_date', todayStr)

    if (error) throw error
    if (data) {
      const total = data.length
      const completed = data.filter(item => item.check_sessions_status !== 'waiting').length
      todayStats.value = { completed, total }
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
  } finally {
    loading.value = false
  }
}

// --- ปุ่ม Logout (เปิด Modal) ---
const onLogoutClick = () => {
  showLogoutModal.value = true
}

// --- ยืนยัน Logout (ทำงานจริง) ---
const handleLogoutConfirm = async () => {
  try {
    await supabase.auth.signOut()
    userStore.clearSession()
    window.location.replace('/login')
  } catch (err) {
    console.error('Logout error:', err)
    window.location.replace('/login')
  }
}

// --- Actions ---
const goToScan = () => alert('เปิดกล้องสแกน QR Code (Coming Soon)')
const goToHistory = () => router.push('/maid/history')

// 👇 ฟังก์ชันไปหน้าบันทึกเอง (แก้ไขแล้ว)
const goToManualRecord = () => {
  // ลิงก์ไปยัง route ที่เราตั้งชื่อไว้ว่า 'maid-manual-record'
  router.push({ name: 'maid-manual-record' })
}

const getRoleLabel = (role) => {
  if (role === 'maid') return 'พนักงานทำความสะอาด'
  if (role === 'admin') return 'ผู้ดูแลระบบ'
  return 'พนักงานทั่วไป'
}

onMounted(async () => {
  loading.value = true
  await fetchUserProfile()
  await fetchTodayStats()
  loading.value = false
})
</script>

<template>
  <LogoutConfirmModal
      v-model="showLogoutModal"
      @confirm="handleLogoutConfirm"
  />

  <div class="p-6 space-y-6 pb-24">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100 flex-shrink-0">
          <img
            v-if="user?.employees_photo"
            :src="user.employees_photo"
            class="h-full w-full object-cover"
          />
          <div v-else class="h-full w-full flex items-center justify-center text-2xl">🧹</div>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-800">
            {{ user?.employees_firstname || 'กำลังโหลด...' }} {{ user?.employees_lastname || '' }}
          </h1>
          <p class="text-sm text-gray-500 font-medium">
            {{ getRoleLabel(user?.role) }}
          </p>
        </div>
      </div>

      <button
        @click="onLogoutClick"
        class="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors shadow-sm"
      >
        <LogOut class="w-5 h-5" />
      </button>
    </div>

    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
      <div v-if="loading" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
        <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
      </div>

      <h2 class="text-lg font-bold text-gray-800 mb-3">งานวันนี้</h2>

      <div class="h-4 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          class="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>

      <div class="flex justify-between items-center text-gray-600 font-medium">
        <span>สำเร็จแล้ว {{ todayStats.completed }} จาก {{ todayStats.total }} จุด</span>
        <span class="text-green-600 font-bold text-sm">{{ Math.round(progressPercent) }}%</span>
      </div>
    </div>

    <button
      @click="goToScan"
      class="w-full bg-indigo-600 active:bg-indigo-700 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-4 transition-transform active:scale-95"
    >
      <div class="bg-white/20 p-3 rounded-xl">
        <QrCode class="w-10 h-10 text-white" />
      </div>
      <div class="text-left">
        <div class="text-lg font-bold">สแกน QR Code</div>
        <div class="text-indigo-100 text-sm">เพื่อส่งงาน / เริ่มงาน</div>
      </div>
    </button>

    <div class="grid grid-cols-2 gap-4">

      <button
        @click="goToHistory"
        class="bg-white p-4 h-32 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center gap-3 active:bg-gray-50 transition-colors"
      >
        <div class="bg-gray-100 p-3 rounded-full">
          <FileText class="w-6 h-6 text-gray-700" />
        </div>
        <span class="font-bold text-gray-700">ประวัติการส่งงาน</span>
      </button>

      <button
        @click="goToManualRecord"
        class="bg-white p-4 h-32 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center gap-3 active:bg-gray-50 transition-colors"
      >
        <div class="bg-orange-50 p-3 rounded-full">
          <PenSquare class="w-6 h-6 text-orange-600" />
        </div>
        <span class="font-bold text-gray-700">บันทึกเอง</span>
      </button>

    </div>

  </div>
</template>