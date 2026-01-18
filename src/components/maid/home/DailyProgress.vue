<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Loader2, CheckCircle2, Clock, ListTodo, AlertCircle } from 'lucide-vue-next' // ✅ เพิ่ม icon AlertCircle
import { supabase } from '@/lib/supabase'

// --- 1. ตั้งค่าตัวแปร ---
const loading = ref(true)
// ✅ เพิ่ม fixNeeded ใน stats
const stats = ref({ total: 0, waiting: 0, completed: 0, fixNeeded: 0 }) 
const currentEmpId = ref(null)
let realtimeSubscription = null

// --- 2. ฟังก์ชันดึงข้อมูล (Fetch) ---
const fetchDailyProgress = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('employees_id')
      .eq('email', user.email)
      .single()

    if (empError || !employee) return

    currentEmpId.value = employee.employees_id

    const today = new Date().toLocaleDateString('en-CA') 

    const { data, error } = await supabase
      .from('check_sessions') 
      .select('check_sessions_status')
      .eq('employees_id', currentEmpId.value)
      .eq('check_sessions_date', today)

    if (error) throw error

    // 2.5 คำนวณตัวเลข (Logic ใหม่ แบบมือโปร)
    const total = data.length
    
    // กลุ่ม 1: เสร็จแล้ว (ผ่าน/อนุมัติ)
    const completed = data.filter(item => 
        ['completed', 'pass', 'approved'].includes(item.check_sessions_status)
    ).length 

    // กลุ่ม 2: 🚨 ต้องแก้ไข (ไม่ผ่าน/ถูกตีกลับ) -> อันนี้สำคัญมากต้องแยก!
    const fixNeeded = data.filter(item => 
        ['rejected', 'fail'].includes(item.check_sessions_status)
    ).length

    // กลุ่ม 3: รอตรวจ (ที่เหลือทั้งหมด)
    // คือเอา Total ลบออกด้วย (เสร็จ + ต้องแก้)
    const waiting = total - completed - fixNeeded

    // อัปเดต state
    stats.value = { total, waiting, completed, fixNeeded }

  } catch (err) {
    console.error('Error fetching progress:', err)
  } finally {
    loading.value = false
  }
}

// --- 3. ฟังก์ชัน Realtime (เหมือนเดิม) ---
const subscribeToRealtime = () => {
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)

  realtimeSubscription = supabase
    .channel('daily-progress-updates')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'check_sessions' },
      (payload) => {
        if (payload.new && currentEmpId.value && payload.new.employees_id === currentEmpId.value) {
           fetchDailyProgress()
        } else if (!currentEmpId.value) {
           fetchDailyProgress()
        }
      }
    )
    .subscribe()
}

// --- 4. Lifecycle ---
onMounted(() => {
  fetchDailyProgress()
  subscribeToRealtime()
})

onUnmounted(() => {
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)
})

// --- 5. Computed (คำนวณกราฟ) ---
const progressPercent = computed(() => {
  const { total, completed } = stats.value
  if (!total) return 0
  return Math.round((completed / total) * 100)
})

// ความกว้างกราฟสีเขียว (เสร็จ)
const widthCompleted = computed(() => {
  const { total, completed } = stats.value
  return total === 0 ? 0 : (completed / total) * 100
})

// ✅ ความกว้างกราฟสีแดง (ต้องแก้) -> แทรกกลางเพื่อให้เห็นชัด
const widthFixNeeded = computed(() => {
  const { total, fixNeeded } = stats.value
  return total === 0 ? 0 : (fixNeeded / total) * 100
})

// ความกว้างกราฟสีเหลือง (รอ)
const widthWaiting = computed(() => {
  const { total, waiting } = stats.value
  return total === 0 ? 0 : (waiting / total) * 100
})
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden h-full flex flex-col justify-between">

    <div v-if="loading" class="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
    </div>

    <div class="flex justify-between items-end mb-4">
      <div>
        <h2 class="text-lg font-bold text-gray-800">สรุปงานวันนี้</h2>
        <p class="text-xs text-gray-500">ความคืบหน้าล่าสุด</p>
      </div>
      <div class="text-right">
        <span class="text-2xl font-black text-indigo-600">
          {{ progressPercent }}%
        </span>
      </div>
    </div>

    <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex mb-5">
      <div
        class="h-full bg-emerald-500 transition-all duration-500"
        :style="{ width: `${widthCompleted}%` }"
      ></div>
      <div
        class="h-full bg-red-500 transition-all duration-500"
        :style="{ width: `${widthFixNeeded}%` }"
      ></div>
      <div
        class="h-full bg-amber-400 transition-all duration-500"
        :style="{ width: `${widthWaiting}%` }"
      ></div>
    </div>

    <div class="grid grid-cols-2 gap-2 text-center">

      <div class="bg-gray-50 rounded-xl p-2 border border-gray-100 flex flex-col items-center justify-center min-h-[70px]">
        <ListTodo class="w-4 h-4 text-gray-400 mb-1" />
        <div class="text-lg font-bold text-gray-800 leading-none">
          {{ stats.total }}
        </div>
        <div class="text-[10px] text-gray-500">ทั้งหมด</div>
      </div>

      <div class="bg-emerald-50 rounded-xl p-2 border border-emerald-100 flex flex-col items-center justify-center min-h-[70px]">
        <CheckCircle2 class="w-4 h-4 text-emerald-500 mb-1" />
        <div class="text-lg font-bold text-emerald-600 leading-none">
          {{ stats.completed }}
        </div>
        <div class="text-[10px] text-emerald-600">ผ่านแล้ว</div>
      </div>

      <div class="bg-amber-50 rounded-xl p-2 border border-amber-100 flex flex-col items-center justify-center min-h-[70px]">
        <Clock class="w-4 h-4 text-amber-500 mb-1" />
        <div class="text-lg font-bold text-amber-600 leading-none">
          {{ stats.waiting }}
        </div>
        <div class="text-[10px] text-amber-600">รอตรวจ</div>
      </div>

      <div class="bg-red-50 rounded-xl p-2 border border-red-100 flex flex-col items-center justify-center min-h-[70px]">
        <AlertCircle class="w-4 h-4 text-red-500 mb-1" />
        <div class="text-lg font-bold text-red-600 leading-none">
          {{ stats.fixNeeded }}
        </div>
        <div class="text-[10px] text-red-600">ต้องแก้ไข</div>
      </div>

    </div>
  </div>
</template>