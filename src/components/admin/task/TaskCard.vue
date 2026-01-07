<script setup>
// ✅ เพิ่ม Building เข้าไปใน import
import { Clock, CheckCircle2, Edit3, Calendar, MapPin, CheckSquare, Building } from 'lucide-vue-next'

defineProps({
  task: Object,
  isSelectionMode: Boolean,
  isSelected: Boolean
})

defineEmits(['click', 'toggleSelect'])
</script>

<template>
  <div 
    class="bg-white rounded-xl shadow-sm border p-5 flex flex-col md:flex-row items-center gap-6 transition-all relative group"
    :class="isSelected ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 hover:shadow-md'"
  >
    <div 
      v-if="isSelectionMode && task.status === 'waiting'" 
      @click.stop="$emit('toggleSelect', task.id)"
      class="absolute top-0 left-0 bottom-0 w-16 flex items-center justify-center cursor-pointer z-10 md:static md:w-auto md:h-auto md:pr-4"
    >
      <div class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
        :class="isSelected ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white border-gray-300 hover:border-blue-400'">
         <CheckSquare v-if="isSelected" class="w-4 h-4 text-white" />
      </div>
    </div>

    <div 
      class="flex-1 flex flex-col md:flex-row items-center gap-6 w-full cursor-pointer transition-all"
      :class="{'pl-8 md:pl-0': isSelectionMode && task.status === 'waiting'}" 
      @click="$emit('click', task.id)"
    >
      <div class="flex items-center gap-4 w-full md:w-1/4 min-w-[200px]">
        <img v-if="task.maidPhoto" :src="task.maidPhoto" class="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
        <div v-else class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">🧹</div>
        <div>
          <div class="font-bold text-lg text-gray-800">{{ task.maidName }}</div>
          <div class="text-sm text-gray-400">{{ task.maidRole }}</div>
        </div>
      </div>

      <div class="hidden md:block w-px h-12 bg-gray-200"></div>

      <div class="flex-1 w-full space-y-2">
        <div class="text-xl font-bold text-gray-800">{{ task.location }}</div>
        
        <div class="flex items-center gap-4 text-gray-500 text-sm">
          <div class="flex items-center gap-1"><Calendar class="w-4 h-4" /> {{ task.date }}</div>
          <div class="flex items-center gap-1"><Clock class="w-4 h-4" /> {{ task.time }}</div>
        </div>
        
        <div class="flex items-center gap-1 text-gray-500 text-sm">
            <Building class="w-4 h-4" /> {{ task.floor }}
        </div>
      </div>

      <div class="w-full md:w-auto flex flex-col items-end gap-2" @click.stop>
         <div v-if="task.status === 'waiting'" class="px-4 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold flex items-center gap-1"><Clock class="w-4 h-4"/>  รอตรวจสอบ</div>
         <div v-else-if="task.status === 'approved'" class="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-1"><CheckCircle2 class="w-4 h-4"/> ตรวจสอบแล้ว</div>
         <div v-else class="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-bold flex items-center gap-1"><Edit3 class="w-4 h-4"/> ส่งแก้ไข</div>
      </div>
    </div>
  </div>
</template>