<script setup>
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,           // เปิด/ปิด
  title: String,             // หัวข้อ
  message: String,           // ข้อความอธิบาย
  confirmText: {             // ข้อความปุ่มยืนยัน
    type: String,
    default: 'ยืนยัน'
  },
  cancelText: {              // ข้อความปุ่มยกเลิก
    type: String,
    default: 'ยกเลิก'
  },
  variant: {                 // ธีมสี: 'success' (เขียว), 'danger' (แดง)
    type: String,
    default: 'success'
  },
  loading: Boolean,          // หมุนๆ ตอนโหลด
  requireReason: Boolean     // ต้องการช่องกรอกเหตุผลไหม?
})

const emit = defineEmits(['close', 'confirm'])
const reason = ref('')

// ถ้า Modal ปิด ให้เคลียร์ค่าเหตุผลทิ้ง
watch(() => props.isOpen, (newVal) => {
  if (!newVal) reason.value = ''
})

const handleConfirm = () => {
  // ส่งค่ากลับไปให้แม่ (ถ้ามีเหตุผลก็ส่งไปด้วย)
  emit('confirm', reason.value)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4">

    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative z-10 animate-fade-in-up">

      <h3 class="text-xl font-bold text-gray-900 mb-2">{{ title }}</h3>
      <p class="text-gray-500 text-sm mb-4 leading-relaxed">
        {{ message }}
      </p>

      <textarea
        v-if="requireReason"
        v-model="reason"
        placeholder="ระบุเหตุผล..."
        class="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:border-transparent outline-none mb-6 resize-none h-24 transition-all"
        :class="variant === 'danger' ? 'focus:ring-red-500' : 'focus:ring-green-500'"
      ></textarea>

      <div class="flex gap-3" :class="{ 'mt-6': !requireReason }">
        <button
          @click="$emit('close')"
          class="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          {{ cancelText }}
        </button>

        <button
          @click="handleConfirm"
          :disabled="loading || (requireReason && !reason.trim())"
          class="flex-1 py-2.5 text-white rounded-lg font-bold shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="variant === 'danger'
            ? 'bg-[#ef4444] hover:bg-[#dc2626]'
            : 'bg-[#22c55e] hover:bg-[#16a34a]'"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <span v-else>{{ confirmText }}</span>
        </button>
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
