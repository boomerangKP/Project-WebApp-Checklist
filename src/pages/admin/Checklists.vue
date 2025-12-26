<script setup>
import { ref, onMounted, reactive } from 'vue'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Search, Edit, Trash2, X, Save, 
  Loader2, CheckCircle2, XCircle, ListChecks 
} from 'lucide-vue-next'

// --- State ---
const loading = ref(false)
const saving = ref(false) // ใช้แทน modalLoading
const checkItems = ref([])
const searchQuery = ref('')

// --- Modal State ---
const showModal = ref(false)
const modalMode = ref('add') // 'add' | 'edit'
const editingId = ref(null)

// --- Form Data (ผูกกับ Modal โดยตรง) ---
const form = reactive({
  order: 1,
  name: '',
  status: 'active'
})

// --- Fetch Data ---
const fetchData = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('check_items')
      .select('*')
      .order('check_items_order')
    
    if (error) throw error
    checkItems.value = data || []
  } catch (err) {
    console.error(err)
    alert('ไม่สามารถดึงข้อมูลได้: ' + err.message)
  } finally {
    loading.value = false
  }
}

// --- Actions ---

// เปิด Modal (เพิ่ม หรือ แก้ไข)
const openModal = (item = null) => {
  if (item) {
    // โหมดแก้ไข
    modalMode.value = 'edit'
    editingId.value = item.check_items_id
    form.order = item.check_items_order
    form.name = item.check_items_name
    form.status = item.check_items_status
  } else {
    // โหมดเพิ่ม
    modalMode.value = 'add'
    editingId.value = null
    // Auto-running Order (หาเลขลำดับถัดไป)
    const maxOrder = checkItems.value.length > 0 
      ? Math.max(...checkItems.value.map(i => i.check_items_order)) 
      : 0
    form.order = maxOrder + 1
    form.name = ''
    form.status = 'active'
  }
  showModal.value = true
}

// ปิด Modal
const closeModal = () => {
  showModal.value = false
}

// บันทึกข้อมูล (Save)
const handleSave = async () => {
  if (!form.name.trim()) return alert('กรุณากรอกชื่อรายการ')
  
  saving.value = true
  try {
    const payload = {
      check_items_order: form.order,
      check_items_name: form.name,
      check_items_status: form.status
    }

    if (modalMode.value === 'add') {
      const { error } = await supabase.from('check_items').insert(payload)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('check_items')
        .update(payload)
        .eq('check_items_id', editingId.value)
      if (error) throw error
    }

    // สำเร็จ
    closeModal()
    await fetchData()

  } catch (err) {
    alert('บันทึกไม่สำเร็จ: ' + err.message)
  } finally {
    saving.value = false
  }
}

// ลบข้อมูล
const handleDelete = async (id) => {
  if (!confirm('⚠️ ยืนยันการลบรายการนี้?')) return
  
  try {
    loading.value = true
    const { error } = await supabase.from('check_items').delete().eq('check_items_id', id)
    if (error) throw error
    await fetchData()
  } catch (err) {
    alert('ลบไม่สำเร็จ: ' + err.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6 pb-10">
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ListChecks class="w-8 h-8 text-indigo-600" /> รายการตรวจสอบ (Checklist)
        </h1>
        <p class="text-gray-500 text-sm mt-1 ml-10">กำหนดหัวข้อมาตรฐานที่แม่บ้านต้องตรวจเช็ค</p>
      </div>
      
      <button 
        @click="openModal()" 
        class="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
      >
        <Plus class="w-5 h-5" /> เพิ่มรายการใหม่
      </button>
    </div>

    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-end">
         </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th class="px-6 py-4 font-medium w-24">ลำดับ</th>
              <th class="px-6 py-4 font-medium">รายการที่ต้องตรวจ</th>
              <th class="px-6 py-4 font-medium text-center w-32">สถานะ</th>
              <th class="px-6 py-4 font-medium text-right w-32">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading">
              <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                <Loader2 class="w-6 h-6 animate-spin mx-auto mb-2" /> กำลังโหลดข้อมูล...
              </td>
            </tr>
            <tr v-else-if="checkItems.length === 0">
              <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                ยังไม่มีรายการตรวจสอบในระบบ
              </td>
            </tr>
            <tr v-else v-for="item in checkItems" :key="item.check_items_id" class="hover:bg-gray-50 transition-colors group">
              <td class="px-6 py-4 text-sm font-medium text-gray-900">
                <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">#{{ item.check_items_order }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 font-medium">
                {{ item.check_items_name }}
              </td>
              <td class="px-6 py-4 text-center">
                <span 
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
                  :class="item.check_items_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="item.check_items_status === 'active' ? 'bg-green-500' : 'bg-gray-400'"></span>
                  {{ item.check_items_status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click="openModal(item)" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="แก้ไข">
                  <Edit class="w-4 h-4" />
                </button>
                <button @click="handleDelete(item.check_items_id)" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="font-bold text-gray-800 text-lg">
            {{ modalMode === 'add' ? 'เพิ่มรายการใหม่' : 'แก้ไขรายการ' }}
          </h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleSave" class="p-6 space-y-5">
          
          <div class="space-y-1.5">
            <label class="text-sm font-semibold text-gray-700">ลำดับการแสดงผล</label>
            <input 
              type="number" 
              v-model="form.order" 
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-mono"
              required
            >
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-semibold text-gray-700">ชื่อรายการตรวจสอบ <span class="text-red-500">*</span></label>
            <input 
              type="text" 
              v-model="form.name" 
              placeholder="เช่น พื้นสะอาด, กระจกเงา, ถังขยะ"
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              required
            >
          </div>

          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700">สถานะการใช้งาน</label>
            <div class="flex gap-3">
              <button 
                type="button"
                @click="form.status = 'active'"
                class="flex-1 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all"
                :class="form.status === 'active' ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'"
              >
                <CheckCircle2 class="w-4 h-4" /> ใช้งาน
              </button>
              <button 
                type="button"
                @click="form.status = 'inactive'"
                class="flex-1 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all"
                :class="form.status === 'inactive' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'"
              >
                <XCircle class="w-4 h-4" /> ปิดใช้งาน
              </button>
            </div>
          </div>

          <div class="pt-4 flex gap-3">
            <button type="button" @click="closeModal" class="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors">ยกเลิก</button>
            <button type="submit" :disabled="saving" class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}</span>
            </button>
          </div>

        </form>
      </div>
    </div>

  </div>
</template>