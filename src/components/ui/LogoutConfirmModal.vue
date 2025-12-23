<script setup>
import { AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, required: true }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const closeModal = () => emit('update:modelValue', false)

const handleConfirm = () => {
  emit('confirm')
  closeModal()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 text-center">
          <div class="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">ยืนยันการออกจากระบบ?</h3>
          <p class="text-sm text-gray-500">คุณต้องการออกจากระบบใช่หรือไม่</p>
        </div>
        <div class="bg-gray-50 px-6 py-4 flex gap-3">
          <button @click="closeModal" class="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            ยกเลิก
          </button>
          <button @click="handleConfirm" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 shadow-sm shadow-red-200 transition-colors">
            ออกจากระบบ
          </button>
        </div>
      </div>

    </div>
  </Teleport>
</template>