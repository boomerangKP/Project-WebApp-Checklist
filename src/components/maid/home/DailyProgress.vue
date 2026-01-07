<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Loader2, CheckCircle2, Clock, ListTodo } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'

// --- 1. ตั้งค่าตัวแปร ---
const loading = ref(true)
const stats = ref({ total: 0, waiting: 0, completed: 0 })
const currentEmpId = ref(null) // เปลี่ยนจากเก็บ User ID เป็น Employee ID (ตัวเลข)
let realtimeSubscription = null

// --- 2. ฟังก์ชันดึงข้อมูล (Fetch) ---
const fetchDailyProgress = async () => {
  try {
    // 2.1 ดึง User ที่ Login อยู่
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        console.log("No user login")
        return
    }

    // 🔥 2.2 ขั้นตอนสำคัญ: เอา Email ไปค้นหา employees_id (ตัวเลข) ในตาราง employees
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('employees_id')
      .eq('email', user.email)
      .single()

    if (empError || !employee) {
      console.error("ไม่พบข้อมูลพนักงาน:", empError)
      return
    }

    currentEmpId.value = employee.employees_id // ได้ ID ตัวเลขมาแล้ว (เช่น 1, 5, 10)

    // 2.3 หาวันที่ปัจจุบัน (แบบ Local Time เพื่อความชัวร์)
    // ใช้ en-CA จะได้ format YYYY-MM-DD ตรงกับ Database
    const today = new Date().toLocaleDateString('en-CA') 

    // 2.4 ดึงข้อมูลงาน โดยใช้ ID ตัวเลขที่ได้มา
    const { data, error } = await supabase
      .from('check_sessions') 
      .select('check_sessions_status')
      .eq('employees_id', currentEmpId.value) // ✅ ใช้ ID ตัวเลขค้นหา เจอแน่นอน
      .eq('check_sessions_date', today)

    if (error) throw error

    // 2.5 คำนวณตัวเลข
    const total = data.length
    
    // เช็คสถานะ (ปรับคำให้ตรงกับ Database ของคุณ)
    // ดูจาก Schema ของคุณ default คือ 'in_progress'
    const completed = data.filter(item => 
        item.check_sessions_status === 'completed' || 
        item.check_sessions_status === 'pass' ||
        item.check_sessions_status === 'approved' // เผื่อไว้หลายๆ คำ
    ).length 
    
    const waiting = total - completed

    stats.value = { total, waiting, completed }

  } catch (err) {
    console.error('Error fetching progress:', err)
  } finally {
    loading.value = false
  }
}

// --- 3. ฟังก์ชัน Realtime (ดักฟัง) ---
const subscribeToRealtime = () => {
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)

  realtimeSubscription = supabase
    .channel('daily-progress-updates')
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'check_sessions',
        // ถ้ากรองด้วย employees_id ได้จะดีมาก แต่ต้องแน่ใจว่าเป็นตัวเลข
      },
      (payload) => {
        // เช็คว่างานที่เปลี่ยน เป็นของพนักงานคนนี้ไหม (ถ้ามีข้อมูลใน payload)
        if (payload.new && currentEmpId.value && payload.new.employees_id === currentEmpId.value) {
           console.log('งานของฉันมีการเปลี่ยนแปลง!', payload)
           fetchDailyProgress()
        } else if (!currentEmpId.value) {
           // ถ้ายังไม่มี ID ก็โหลดใหม่ไปเลยกันเหนียว
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

const widthCompleted = computed(() => {
  const { total, completed } = stats.value
  return total === 0 ? 0 : (completed / total) * 100
})

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
        class="h-full bg-amber-400 transition-all duration-500"
        :style="{ width: `${widthWaiting}%` }"
      ></div>
    </div>

    <div class="grid grid-cols-3 gap-2 text-center">

      <div class="bg-gray-50 rounded-xl p-2 border border-gray-100 flex flex-col items-center justify-center min-h-[80px]">
        <ListTodo class="w-5 h-5 text-gray-400 mb-1" />
        <div class="text-lg font-bold text-gray-800 leading-none mb-1">
          {{ stats.total }}
        </div>
        <div class="text-[10px] text-gray-500">งานทั้งหมด</div>
      </div>

      <div class="bg-amber-50 rounded-xl p-2 border border-amber-100 flex flex-col items-center justify-center min-h-[80px]">
        <Clock class="w-5 h-5 text-amber-500 mb-1" />
        <div class="text-lg font-bold text-amber-600 leading-none mb-1">
          {{ stats.waiting }}
        </div>
        <div class="text-[10px] text-amber-600">กำลังทำ/รอตรวจ</div>
      </div>

      <div class="bg-emerald-50 rounded-xl p-2 border border-emerald-100 flex flex-col items-center justify-center min-h-[80px]">
        <CheckCircle2 class="w-5 h-5 text-emerald-500 mb-1" />
        <div class="text-lg font-bold text-emerald-600 leading-none mb-1">
          {{ stats.completed }}
        </div>
        <div class="text-[10px] text-emerald-600">เสร็จสิ้น</div>
      </div>

    </div>
  </div>
</template>