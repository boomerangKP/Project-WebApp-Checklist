<script setup>
import { watch } from 'vue'
import { CheckCircle, AlertCircle, X } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  title: String,
  message: String,
  type: {
    type: String,
    default: 'success' // ค่าเริ่มต้นเป็นสีเขียว
  }
})

const emit = defineEmits(['close'])

// ตั้งเวลาปิดอัตโนมัติ 3 วินาที
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      emit('close')
    }, 3000)
  }
})
</script>

<template>
  <transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed top-5 right-5 z-[60] max-w-sm w-full bg-slate-900 border border-slate-700 shadow-lg rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <CheckCircle v-if="type === 'success'" class="h-6 w-6 text-green-400" />
            
            <AlertCircle v-else class="h-6 w-6 text-red-400" />
          </div>
          <div class="ml-3 w-0 flex-1 pt-0.5">
            <p class="text-sm font-medium text-white">{{ title }}</p>
            <p v-if="message" class="mt-1 text-sm text-slate-400">{{ message }}</p>
          </div>
          <div class="ml-4 flex flex-shrink-0">
            <button @click="$emit('close')" class="inline-flex rounded-md bg-slate-900 text-slate-400 hover:text-white focus:outline-none transition-colors">
              <span class="sr-only">Close</span>
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>