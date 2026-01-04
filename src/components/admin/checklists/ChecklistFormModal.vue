<script setup>
import { ref, reactive, watch } from 'vue'
import { X, Loader2, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  mode: { type: String, default: 'add' },
  initialData: { type: Object, default: () => ({}) },
  saving: Boolean
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  code: '', name: '', category: '', order: 1, 
  description: '', isRequired: true, status: 'active'
})

watch(() => props.isOpen, (val) => {
  if (val) {
    if (props.mode === 'edit' && props.initialData) {
      // โหมดแก้ไข
      form.code = props.initialData.check_items_code || ''
      form.name = props.initialData.check_items_name || ''
      form.category = props.initialData.check_items_category || ''
      form.order = props.initialData.check_items_order || 1
      form.description = props.initialData.check_items_description || ''
      form.isRequired = props.initialData.check_items_is_required ?? true
      form.status = props.initialData.check_items_status || 'active'
    } else {
      // โหมดเพิ่ม
      // 🔥 แก้ตรงนี้: ดึงค่า Code ที่ Auto Run มาใส่ (ถ้ามี)
      form.code = props.initialData?.code || '' 
      form.name = ''
      form.category = ''
      // ดึงค่า Order ที่ Auto Run มาใส่
      form.order = props.initialData?.order || 1
      form.description = ''
      form.isRequired = true
      form.status = 'active'
    }
  }
})

const handleSubmit = () => {
  emit('save', {
    check_items_code: form.code, check_items_name: form.name,
    check_items_category: form.category, check_items_order: form.order,
    check_items_description: form.description, check_items_is_required: form.isRequired,
    check_items_status: form.status
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
        
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h3 class="font-bold text-gray-800 text-lg flex items-center gap-2">
            <FileText class="w-5 h-5 text-[#38b6ff]" />
            {{ mode === 'add' ? 'เพิ่มรายการใหม่' : 'แก้ไขรายการ' }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="overflow-y-auto custom-scrollbar p-6">
          <form @submit.prevent="handleSubmit" id="checklistForm" class="space-y-5">
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="space-y-1.5 md:col-span-1">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">รหัส (Code)</label>
                <input 
                  type="text" 
                  v-model="form.code" 
                  placeholder="เช่น C01" 
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38b6ff] transition-all text-sm font-mono text-gray-600"
                >
              </div>
              <div class="space-y-1.5 md:col-span-3">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">ชื่อรายการ <span class="text-red-500">*</span></label>
                <input type="text" v-model="form.name" placeholder="เช่น พื้นสะอาด" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38b6ff] transition-all text-sm" required>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">หมวดหมู่</label>
                <input type="text" v-model="form.category" placeholder="เช่น ห้องน้ำ" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38b6ff] transition-all text-sm">
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">ลำดับ</label>
                <input type="number" v-model="form.order" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38b6ff] transition-all text-sm font-mono" required>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">คำอธิบาย</label>
              <textarea v-model="form.description" rows="3" placeholder="..." class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38b6ff] transition-all text-sm resize-none"></textarea>
            </div>

            <hr class="border-gray-100" />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">จำเป็นต้องตรวจ?</label>
                <div class="flex gap-2">
                  <button type="button" @click="form.isRequired = true" class="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all" :class="form.isRequired ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'"><AlertCircle class="w-4 h-4" /> จำเป็น</button>
                  <button type="button" @click="form.isRequired = false" class="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all" :class="!form.isRequired ? 'bg-gray-100 border-gray-300 text-gray-600 ring-1 ring-gray-300' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'">ไม่จำเป็น</button>
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</label>
                <div class="flex gap-2">
                  <button type="button" @click="form.status = 'active'" class="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all" :class="form.status === 'active' ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'"><CheckCircle2 class="w-4 h-4" /> ใช้งาน</button>
                  <button type="button" @click="form.status = 'inactive'" class="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all" :class="form.status === 'inactive' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-200' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'"><XCircle class="w-4 h-4" /> ปิดใช้งาน</button>
                </div>
              </div>
            </div>

          </form>
        </div>

        <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 flex-shrink-0">
          <button type="button" @click="$emit('close')" class="px-6 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">ยกเลิก</button>
          <button type="submit" form="checklistForm" :disabled="saving" class="px-6 py-2.5 bg-[#38b6ff] hover:bg-[#38b6ff]/90 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}</span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>