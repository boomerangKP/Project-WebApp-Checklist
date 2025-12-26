<script setup>
import { X, RotateCcw } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  locations: Array // รับรายการสถานที่มาจากหน้าหลัก
})

const emit = defineEmits(['close', 'apply'])

// --- State เก็บค่าตัวกรอง (Local State) ---
// เราสร้างตัวแปรในนี้ เพื่อให้ user กดเล่นได้จนพอใจ ก่อนกด "นำไปใช้"
import { ref, watch } from 'vue'

const selectedStatus = ref('all') // all, waiting, pass, fail
const selectedPeriod = ref('today') // today, 7days, month, all
const selectedLocation = ref('')

// ถ้ามีการเปิด Modal ขึ้นมาใหม่ อาจจะอยากให้ Reset ค่า หรือ Sync ค่าเดิมกลับมา
// ในที่นี้ขอทำแบบ Simple คือเปิดมาเป็นค่าว่าง หรือค่า Default
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // ถ้าต้องการจำค่าล่าสุด อาจต้องรับ props modelValue เข้ามา
  }
})

// --- Action ---
const resetFilter = () => {
  selectedStatus.value = 'all'
  selectedPeriod.value = 'today' // หรือ all ตามชอบ
  selectedLocation.value = ''
}

const applyFilter = () => {
  emit('apply', {
    status: selectedStatus.value,
    period: selectedPeriod.value,
    location: selectedLocation.value
  })
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">

    <div @click="$emit('close')" class="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity"></div>

    <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl pointer-events-auto transform transition-transform animate-in slide-in-from-bottom-10 sm:fade-in">

      <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <h3 class="text-xl font-bold text-gray-800">กรองประวัติงาน</h3>
        <button @click="$emit('close')" class="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="space-y-6">

        <div class="space-y-2">
          <label class="font-bold text-gray-700">สถานะ:</label>
          <div class="flex flex-wrap gap-2">
             <button
               @click="selectedStatus = 'all'"
               class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
               :class="selectedStatus === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'"
             >ทั้งหมด</button>

             <button
               @click="selectedStatus = 'pass'"
               class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1"
               :class="selectedStatus === 'pass' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'"
             >ผ่าน</button>

             <button
               @click="selectedStatus = 'waiting'"
               class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1"
               :class="selectedStatus === 'waiting' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'"
             >รอตรวจ</button>

             <button
               @click="selectedStatus = 'fail'"
               class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1"
               :class="selectedStatus === 'fail' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'"
             >แก้ไข</button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="font-bold text-gray-700">ช่วงเวลา:</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="p in [
                {k: 'today', l: 'วันนี้'},
                {k: '7days', l: '7 วันล่าสุด'},
                {k: 'month', l: 'เดือนนี้'},
                {k: 'all', l: 'ทั้งหมด'}
              ]"
              :key="p.k"
              @click="selectedPeriod = p.k"
              class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              :class="selectedPeriod === p.k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'"
            >
              {{ p.l }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="font-bold text-gray-700">สถานที่:</label>
          <div class="relative">
            <select v-model="selectedLocation" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
              <option value="">ทุกสถานที่</option>
              <option v-for="loc in locations" :key="loc.locations_id" :value="loc.locations_id">
                {{ loc.locations_name }} ({{ loc.locations_building }})
              </option>
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
          </div>
        </div>

      </div>

      <div class="mt-8 flex gap-3">
        <button @click="resetFilter" class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors flex justify-center items-center gap-2">
          <RotateCcw class="w-4 h-4" /> รีเซ็ต
        </button>
        <button @click="applyFilter" class="flex-[2] py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">
          นำไปใช้
        </button>
      </div>

    </div>
  </div>
</template>
