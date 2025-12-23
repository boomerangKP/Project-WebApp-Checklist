<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { Bell, Calendar, Clock, MapPin } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(buddhistEra)
dayjs.extend(relativeTime)
dayjs.locale('th')

const router = useRouter()
const notifications = ref([])
const showDropdown = ref(false)
const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)
let realtimeSubscription = null

// 🔥 เพิ่มตัวแปรเก็บ Time Slots
const timeSlots = ref([])

// --- Helper: ดึงข้อมูลรอบเวลา ---
const fetchTimeSlots = async () => {
  const { data } = await supabase.from('time_slots').select('*').order('time_slots_order')
  if (data) timeSlots.value = data
}

// --- Helper: แปลงเวลาเป็นชื่อรอบ (เช่น 10.00 - 11.00 น.) ---
const getSlotName = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const timeStr = date.toLocaleTimeString('en-GB', { hour12: false }) 
  
  // หาว่าเวลานี้ ตกอยู่ในช่องไหน
  const match = timeSlots.value.find(slot => 
    timeStr >= slot.time_slots_start && timeStr < slot.time_slots_end
  )
  
  // ถ้าเจอให้ใช้ชื่อรอบ ถ้าไม่เจอให้โชว์เวลาเดิม
  return match ? match.time_slots_name : dayjs(dateString).format('HH.mm น.')
}

// --- 1. ดึงแจ้งเตือน ---
const fetchNotifications = async () => {
  const { data } = await supabase
    .from('notifications')
    .select(`*, employees (employees_photo)`)
    .order('created_at', { ascending: false })
    .limit(10)
  if (data) notifications.value = data
}

// --- 2. ฟัง Realtime ---
const subscribeRealtime = () => {
  realtimeSubscription = supabase
    .channel('noti-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
      const newNoti = payload.new
      const { data: emp } = await supabase.from('employees').select('employees_photo').eq('employees_id', newNoti.actor_id).single()
      notifications.value.unshift({ ...newNoti, employees: emp })
    })
    .subscribe()
}

// --- 3. Action ---
const handleClick = async (noti) => {
  showDropdown.value = false 

  if (!noti.is_read) {
    noti.is_read = true
    supabase.from('notifications').update({ is_read: true }).eq('id', noti.id).then()
  }

  if (noti.link) {
    router.push(noti.link)
  }
}

const toggleDropdown = () => showDropdown.value = !showDropdown.value
const markAllRead = async () => {
  notifications.value.forEach(n => n.is_read = true)
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
}

const parseMessage = (msg) => {
  const parts = (msg || '').split('|')
  return { location: parts[0] || 'จุดตรวจ', detail: parts[1] || '' }
}

const formatDate = (d) => dayjs(d).format('D MMM BB')
// const formatTime = (d) => dayjs(d).format('HH.mm น.') // ไม่ใช้แล้ว
const timeAgo = (d) => dayjs(d).fromNow()

onMounted(() => { 
  fetchTimeSlots() // โหลดตารางเวลามาก่อน
  fetchNotifications()
  subscribeRealtime() 
})

onUnmounted(() => { if (realtimeSubscription) supabase.removeChannel(realtimeSubscription) })
</script>

<template>
  <div class="relative">
    <button @click="toggleDropdown" class="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 focus:outline-none">
      <Bell class="w-6 h-6" />
      <span v-if="unreadCount > 0" class="absolute top-0 right-0 flex h-4 w-4 transform translate-x-1 -translate-y-1">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white justify-center items-center font-bold shadow-sm border border-white">
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </span>
    </button>

    <div v-if="showDropdown" class="absolute right-0 mt-3 w-[400px] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div class="px-5 py-4 flex justify-between items-center bg-white border-b border-gray-100">
        <h3 class="font-bold text-gray-800 text-lg">ข้อความแจ้งเตือน</h3>
        <button v-if="unreadCount > 0" @click.stop="markAllRead" class="text-sm text-blue-600 hover:underline">อ่านทั้งหมด</button>
      </div>

      <div class="max-h-[450px] overflow-y-auto bg-gray-50/30 p-2 space-y-2">
        <div v-if="notifications.length === 0" class="p-8 text-center text-gray-400 text-sm">ไม่มีการแจ้งเตือน</div>

        <div
          v-for="noti in notifications" :key="noti.id"
          @click="handleClick(noti)"
          class="relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md group"
          :class="noti.is_read ? 'bg-white border-gray-200' : 'bg-[#E3EFFD] border-blue-200'"
        >
          <div v-if="!noti.is_read" class="absolute top-3 right-3 w-2 h-2 bg-blue-600 rounded-full shadow-sm"></div>

          <div class="flex gap-4">
            <div class="w-[45%] flex gap-3 items-center border-r border-gray-300/50 pr-2">
               <div class="flex-shrink-0">
                  <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <img :src="noti.employees?.employees_photo || 'https://via.placeholder.com/150'" class="w-full h-full object-cover" />
                  </div>
               </div>
               <div class="min-w-0">
                  <h4 class="font-bold text-gray-900 text-sm truncate">{{ noti.title }}</h4>
                  <p class="text-[10px] text-gray-500">พนักงานทำความสะอาด</p>
               </div>
            </div>

            <div class="flex-1 flex flex-col justify-center pl-1">
               <h4 class="font-bold text-gray-900 text-sm">{{ parseMessage(noti.message).location }}</h4>
               <div class="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                  <span class="flex items-center gap-0.5"><Calendar class="w-3 h-3" /> {{ formatDate(noti.created_at) }}</span>
                  <span class="flex items-center gap-0.5"><Clock class="w-3 h-3" /> {{ getSlotName(noti.created_at) }}</span>
               </div>
               <div class="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                  <MapPin class="w-3 h-3" /> {{ parseMessage(noti.message).detail }}
               </div>
            </div>
          </div>

          <div class="absolute bottom-2 right-3 text-[10px] text-gray-400 font-medium group-hover:text-blue-600">
            {{ timeAgo(noti.created_at) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDropdown" class="fixed inset-0 z-30" @click="showDropdown = false"></div>
  </div>
</template>