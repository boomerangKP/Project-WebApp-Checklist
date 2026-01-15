<script setup>
import {
  Clock,
  CheckCircle2,
  Edit3,
  Calendar,
  MapPin,
  CheckSquare,
  Building,
  UserCheck,
  ShieldCheck,
  SprayCan,
  User
} from 'lucide-vue-next'

defineProps({
  task: Object,
  isSelectionMode: Boolean,
  isSelected: Boolean
})

defineEmits(['click', 'toggleSelect'])

// Helper: จัดรูปแบบวันที่และเวลาแบบย่อ
const formatCheckTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }) + ' น.'
}

// ✅ Helper 1: แปลง Role เป็นภาษาไทย (เพิ่มใหม่)
const getRoleLabel = (role) => {
  const r = role ? role.toLowerCase() : 'user'
  if (r === 'admin') return 'ผู้ดูแลระบบ'
  if (r === 'maid') return 'แม่บ้าน'
  if (r === 'cleaner') return 'พนักงานทำความสะอาด'
  return 'พนักงานทั่วไป'
}

// ✅ Helper 2: เลือกไอคอนและสีตาม Role
const getRoleConfig = (role) => {
  const r = role ? role.toLowerCase() : 'user'

  switch (r) {
    case 'admin':
      return { type: 'icon', icon: ShieldCheck, class: 'bg-purple-100 text-purple-600 border-purple-200' }
    case 'maid':
      return { type: 'icon', icon: SprayCan, class: 'bg-rose-100 text-rose-600 border-rose-200' }
    case 'cleaner':
      return { type: 'emoji', icon: '🧹', class: 'bg-gray-200 text-xl border-transparent' }
    default:
      return { type: 'icon', icon: User, class: 'bg-gray-100 text-gray-500 border-gray-200' }
  }
}
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-sm border p-3 flex flex-col md:flex-row items-center gap-3 transition-all relative group"
    :class="isSelected ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 hover:shadow-md'"
  >
    <div
      v-if="isSelectionMode && task.status === 'waiting'"
      @click.stop="$emit('toggleSelect', task.id)"
      class="absolute top-0 left-0 bottom-0 w-12 flex items-center justify-center cursor-pointer z-10 md:static md:w-auto md:h-auto md:pr-2"
    >
      <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
        :class="isSelected ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white border-gray-300 hover:border-blue-400'">
          <CheckSquare v-if="isSelected" class="w-3.5 h-3.5 text-white" />
      </div>
    </div>

    <div
      class="flex-1 flex flex-col md:flex-row items-center gap-3 w-full cursor-pointer transition-all"
      :class="{'pl-8 md:pl-0': isSelectionMode && task.status === 'waiting'}"
      @click="$emit('click', task.id)"
    >
      <div class="flex items-center gap-3 w-full md:w-1/4 min-w-[180px]">

        <div class="relative flex-shrink-0">
           <img
             v-if="task.maidPhoto"
             :src="task.maidPhoto"
             class="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
           />

           <div v-else
                class="w-12 h-12 rounded-full flex items-center justify-center border"
                :class="getRoleConfig(task.maidRole).class"
           >
              <span v-if="getRoleConfig(task.maidRole).type === 'emoji'" class="leading-none pt-1">
                 {{ getRoleConfig(task.maidRole).icon }}
              </span>

              <component v-else :is="getRoleConfig(task.maidRole).icon" class="w-6 h-6" />
           </div>
        </div>

        <div>
          <div class="font-bold text-base text-gray-800 leading-tight">{{ task.maidName }}</div>
          <div class="text-xs text-gray-400">{{ getRoleLabel(task.maidRole) }}</div>
        </div>
      </div>

      <div class="hidden md:block w-px h-10 bg-gray-200"></div>

      <div class="flex-1 w-full space-y-1.5">
        <div class="text-base font-bold text-gray-800">{{ task.location }}</div>

        <div class="flex flex-wrap items-center gap-3 text-gray-500 text-xs">
          <div class="flex items-center gap-1"><Calendar class="w-3.5 h-3.5" /> {{ task.date }}</div>
          <div class="flex items-center gap-1"><Clock class="w-3.5 h-3.5" />ส่งเมื่อเวลา: {{ task.time }}</div>
          <div class="flex items-center gap-1"><Building class="w-3.5 h-3.5" /> อาคาร {{ task.floor }}</div>
        </div>

        <div v-if="task.checkedAt" class="flex items-center gap-1 text-indigo-600 text-xs font-bold pt-1">
            <UserCheck class="w-3.5 h-3.5" />
            <span>ตรวจเมื่อ: {{ formatCheckTime(task.checkedAt) }}</span>
        </div>
      </div>

      <div class="w-full md:w-auto flex flex-col items-end gap-1" @click.stop>
         <div v-if="task.status === 'waiting'" class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap"><Clock class="w-3.5 h-3.5"/> รอตรวจ</div>
         <div v-else-if="task.status === 'approved'" class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap"><CheckCircle2 class="w-3.5 h-3.5"/> ตรวจแล้ว</div>
         <div v-else class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap"><Edit3 class="w-3.5 h-3.5"/> แก้ไข</div>
      </div>
    </div>
  </div>
</template>
