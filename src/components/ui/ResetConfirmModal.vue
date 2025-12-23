<script setup>
import { Loader2, AlertTriangle } from 'lucide-vue-next'

defineProps({
  isOpen: Boolean,
  loading: Boolean
})

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4">

    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative z-10 animate-fade-in-up border-t-4 border-red-500">

      <div class="flex flex-col items-center text-center space-y-4">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle class="w-6 h-6 text-red-600" />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-bold text-gray-900">ต้องการเริ่มตรวจใหม่?</h3>
          <p class="text-gray-500 text-sm leading-relaxed">
            ผลการตรวจเดิม (ตรวจสอบแล้ว/แก้ไข) จะถูกล้างค่า <br>
            และสถานะจะกลับไปเป็น <b>"รอตรวจสอบ"</b>
          </p>
        </div>

        <div class="flex gap-3 w-full mt-4">
          <button
            @click="$emit('close')"
            class="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>

          <button
            @click="$emit('confirm')"
            :disabled="loading"
            class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span v-else>ยืนยันล้างค่า</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(10px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.2s ease-out forwards;
}
</style>
