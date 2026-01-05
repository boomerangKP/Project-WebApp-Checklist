<script setup>
import { ref, watch } from 'vue'
import { X, Save, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  mode: String, // 'add' | 'edit'
  initialData: Object,
  loading: Boolean
})

const emit = defineEmits(['close', 'save'])

const form = ref({
  id: null,
  name: '',
  description: '',
  ordering: 1,
  is_active: true
})

// Sync ข้อมูลเมื่อเปิด Modal หรือ initialData เปลี่ยน
watch(() => props.initialData, (newVal) => {
  if (newVal) {
    form.value = {
      id: newVal.id || null,
      name: newVal.name || '',
      description: newVal.description || '',
      ordering: newVal.ordering || 1,
      is_active: newVal.is_active !== undefined ? newVal.is_active : true
    }
  } else {
    // Reset form
    form.value = { id: null, name: '', description: '', ordering: 1, is_active: true }
  }
}, { immediate: true })

const submit = () => {
  emit('save', form.value)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
      
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 class="font-bold text-lg text-gray-800">
          {{ mode === 'add' ? 'เพิ่มหัวข้อประเมิน' : 'แก้ไขหัวข้อประเมิน' }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-1 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto">
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">หัวข้อการประเมิน <span class="text-red-500">*</span></label>
          <input 
            v-model="form.name"
            type="text" 
            placeholder="เช่น ความสะอาดของพื้น, กลิ่นภายในห้องน้ำ"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">คำอธิบายเพิ่มเติม (Optional)</label>
          <textarea 
            v-model="form.description"
            rows="2"
            placeholder="เช่น พื้นแห้งสนิท ไม่มีคราบน้ำขัง..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ลำดับการแสดงผล</label>
            <input 
              v-model.number="form.ordering"
              type="number" 
              min="1"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <div class="flex items-center gap-3 mt-2">
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.is_active" class="sr-only peer">
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span class="ms-3 text-sm font-medium text-gray-700">{{ form.is_active ? 'ใช้งาน' : 'ปิดใช้งาน' }}</span>
              </label>
            </div>
          </div>
        </div>

      </div>

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
        <button 
          @click="$emit('close')"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          ยกเลิก
        </button>
        <button 
          @click="submit"
          :disabled="loading"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <span>{{ mode === 'add' ? 'บันทึกข้อมูล' : 'บันทึกการแก้ไข' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>