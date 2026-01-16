<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  Bell,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  CheckCheck,
  // ✅ เพิ่มไอคอน Role
  ShieldCheck,
  SprayCan,
  User
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
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
const containerRef = ref(null)

// --- Helper Functions ---
const timeSlots = ref([])
const fetchTimeSlots = async () => {
  const { data } = await supabase.from('time_slots').select('*').order('time_slots_order')
  if (data) timeSlots.value = data
}

const getSlotName = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const timeStr = date.toLocaleTimeString('en-GB', { hour12: false })
  const match = timeSlots.value.find(slot => timeStr >= slot.time_slots_start && timeStr < slot.time_slots_end)
  return match ? match.time_slots_name : dayjs(dateString).format('HH.mm น.')
}

// ✅ แก้ไข fetchNotifications ให้ดึง role มาด้วย
const fetchNotifications = async () => {
  const { data } = await supabase
    .from('notifications')
    .select(`*, employees (employees_photo, role)`) // เพิ่ม role
    .order('created_at', { ascending: false })
    .limit(20)
  if (data) notifications.value = data
}

// ✅ แก้ไข Realtime ให้ดึง role มาด้วย
const subscribeRealtime = () => {
  realtimeSubscription = supabase.channel('noti-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
      const newNoti = payload.new
      const { data: emp } = await supabase
        .from('employees')
        .select('employees_photo, role') // เพิ่ม role
        .eq('employees_id', newNoti.actor_id)
        .single()
      notifications.value.unshift({ ...newNoti, employees: emp })
    })
    .subscribe()
}

const handleClick = async (noti) => {
  showDropdown.value = false
  if (!noti.is_read) {
    noti.is_read = true
    supabase.from('notifications').update({ is_read: true }).eq('id', noti.id).then()
  }
  if (noti.link) router.push(noti.link)
}

const toggleDropdown = () => showDropdown.value = !showDropdown.value

// ✅ ฟังก์ชัน อ่านทั้งหมด
const markAllRead = async () => {
  if (unreadCount.value === 0) return

  // อัปเดตหน้าจอทันทีเพื่อให้รู้สึกเร็ว
  notifications.value.forEach(n => n.is_read = true)

  // อัปเดตลงฐานข้อมูล
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)

  // แจ้งเตือนเล็กๆ (Toast)
  const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true
  })
  Toast.fire({ icon: 'success', title: 'อ่านทั้งหมดแล้ว' })
}

// ✅ ฟังก์ชัน ลบทั้งหมด
const deleteAll = async () => {
  const result = await Swal.fire({
    title: 'ล้างประวัติแจ้งเตือน?',
    text: "ข้อความทั้งหมดจะหายไปและกู้คืนไม่ได้",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonColor: '#9ca3af',
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true
  })

  if (result.isConfirmed) {
    Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })

    try {
      const { error } = await supabase.from('notifications').delete().gt('id', 0)
      if (error) throw error
      notifications.value = []
      Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย!', timer: 1500, showConfirmButton: false })
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
  }
}

const parseMessage = (msg) => {
  const parts = (msg || '').split('|')
  return { location: parts[0] || 'จุดตรวจ', detail: parts[1] || '' }
}

const formatDate = (d) => dayjs(d).format('D MMM BB')
const timeAgo = (d) => dayjs(d).fromNow()

const handleClickOutside = (event) => {
  if (showDropdown.value && containerRef.value && !containerRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}

const handleScroll = (event) => {
  if (!showDropdown.value) return
  const isScrollingInside = containerRef.value && containerRef.value.contains(event.target)
  if (!isScrollingInside) showDropdown.value = false
}

// ✅ Helper: Role Config
const getRoleConfig = (role) => {
  const r = role ? role.toLowerCase() : 'user';
  switch (r) {
    case 'admin':
      return { type: 'icon', icon: ShieldCheck, class: 'bg-purple-100 text-purple-600' };
    case 'maid':
      return { type: 'icon', icon: SprayCan, class: 'bg-rose-100 text-rose-600' };
    case 'cleaner':
      return { type: 'emoji', icon: '🧹', class: 'bg-gray-200 text-lg' }; // 🧹 ไม้กวาด
    default:
      return { type: 'icon', icon: User, class: 'bg-gray-100 text-gray-500' };
  }
};

onMounted(() => {
  fetchTimeSlots()
  fetchNotifications()
  subscribeRealtime()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll, true)
})

onUnmounted(() => {
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll, true)
})
</script>

<template>
  <div class="relative" ref="containerRef">
    <button @click="toggleDropdown" class="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 focus:outline-none">
      <Bell class="w-6 h-6" />
      <span v-if="unreadCount > 0" class="absolute top-0 right-0 flex h-4 w-4 transform translate-x-1 -translate-y-1">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white justify-center items-center font-bold shadow-sm border border-white">
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </span>
    </button>

    <div v-if="showDropdown" class="absolute right-0 mt-3 w-[400px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

      <div class="px-5 py-4 flex justify-between items-center bg-white border-b border-gray-100">
        <h3 class="font-bold text-gray-800 text-lg">การแจ้งเตือน</h3>

        <div class="flex items-center gap-2">
          <button v-if="notifications.length > 0" @click.stop="deleteAll"
            class="group flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="ลบประวัติทั้งหมด">
             <Trash2 class="w-3.5 h-3.5" />
             <span>ล้างประวัติ</span>
          </button>

          <div v-if="notifications.length > 0 && unreadCount > 0" class="h-4 w-[1px] bg-gray-200"></div>

          <button v-if="unreadCount > 0" @click.stop="markAllRead"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 transition-all">
            <CheckCheck class="w-3.5 h-3.5" />
            <span>อ่านทั้งหมด</span>
          </button>
        </div>
      </div>

      <div class="max-h-[450px] overflow-y-auto bg-gray-50/30 p-2 space-y-2 custom-scrollbar">
        <div v-if="notifications.length === 0" class="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
           <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
             <Bell class="w-6 h-6 opacity-30" />
           </div>
           <span>ไม่มีการแจ้งเตือน</span>
        </div>

        <div
          v-for="noti in notifications" :key="noti.id"
          @click="handleClick(noti)"
          class="relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md group"
          :class="noti.is_read ? 'bg-white border-gray-200 opacity-75 hover:opacity-100' : 'bg-[#E3EFFD] border-blue-200 shadow-sm'"
        >
          <div v-if="!noti.is_read" class="absolute top-3 right-3 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm ring-2 ring-white"></div>

          <div class="flex gap-4">
            <div class="w-[45%] flex gap-3 items-center border-r border-gray-300/50 pr-2">
               <div class="flex-shrink-0">

                 <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm relative">
                    <img v-if="noti.employees?.employees_photo" :src="noti.employees.employees_photo" class="w-full h-full object-cover" />

                    <div v-else
                         class="w-full h-full flex items-center justify-center border"
                         :class="getRoleConfig(noti.employees?.role).class"
                    >
                         <span v-if="getRoleConfig(noti.employees?.role).type === 'emoji'" class="leading-none pt-1">
                            {{ getRoleConfig(noti.employees?.role).icon }}
                         </span>
                         <component v-else :is="getRoleConfig(noti.employees?.role).icon" class="w-6 h-6" />
                    </div>
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
               <div class="flex items-center gap-1 text-[10px] text-gray-400 mt-1 truncate">
                  <MapPin class="w-3 h-3 flex-shrink-0" /> <span class="truncate">อาคาร {{ parseMessage(noti.message).detail }}</span>
               </div>
            </div>
          </div>

          <div class="absolute bottom-2 right-3 text-[10px] text-gray-400 font-medium group-hover:text-blue-600 transition-colors">
            {{ timeAgo(noti.created_at) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
