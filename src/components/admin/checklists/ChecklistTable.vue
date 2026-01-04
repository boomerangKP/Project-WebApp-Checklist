<script setup>
import { ref } from 'vue'
import { 
  Edit, Trash2, Loader2, AlertCircle, Copy, Check, 
  X, FileText, Info, Building, Calendar 
} from 'lucide-vue-next'

defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean
})

const emit = defineEmits(['edit', 'delete'])

// --- Copy Code ---
const copiedId = ref(null)
const copyToClipboard = async (text, id) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => { copiedId.value = null }, 1500)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

// --- Side Drawer Logic (หน้าต่างสไลด์ข้าง) ---
const selectedItem = ref(null) // เก็บ Item ที่กำลังเปิดดู
const openDrawer = (item) => {
  selectedItem.value = item
}
const closeDrawer = () => {
  selectedItem.value = null
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
    
    <div class="overflow-x-auto min-h-[300px]">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-white text-gray-500 text-xs uppercase font-bold border-b border-gray-100 tracking-wider">
            <th class="px-6 py-4 w-32">รหัส (Code)</th>
            <th class="px-6 py-4 min-w-[200px]">รายการตรวจสอบ</th>
            <th class="px-6 py-4 text-center w-32">หมวดหมู่</th>
            <th class="px-6 py-4 text-center w-24">จำเป็น</th>
            <th class="px-6 py-4 text-center w-24">ลำดับ</th>
            <th class="px-6 py-4 text-center w-28">สถานะ</th>
            <th class="px-6 py-4 text-right w-24">จัดการ</th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-50">
          <tr v-if="loading">
            <td colspan="7" class="px-6 py-20 text-center text-gray-400">
              <div class="flex flex-col items-center justify-center gap-2">
                <Loader2 class="w-6 h-6 animate-spin text-indigo-500" /> 
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>
          
          <tr v-else-if="items.length === 0">
            <td colspan="7" class="px-6 py-20 text-center text-gray-400 bg-gray-50/30">
              ยังไม่มีรายการตรวจสอบในระบบ
            </td>
          </tr>

          <tr v-else v-for="item in items" :key="item.check_items_id" 
              class="hover:bg-gray-50/60 transition-colors group cursor-pointer"
              @click="openDrawer(item)"
          >
            <td class="px-6 py-4 align-top" @click.stop>
              <div v-if="item.check_items_code">
                <button 
                  @click="copyToClipboard(item.check_items_code, item.check_items_id)"
                  class="group/btn flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 w-full bg-white shadow-sm hover:shadow-md"
                  :class="copiedId === item.check_items_id 
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50' 
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'"
                >
                  <span class="font-mono text-xs font-bold tracking-wide truncate">
                    {{ item.check_items_code }}
                  </span>
                  <div class="ml-auto">
                     <Check v-if="copiedId === item.check_items_id" class="w-3 h-3" />
                     <Copy v-else class="w-3 h-3 opacity-30 group-hover/btn:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
              <span v-else class="text-gray-300 text-sm">-</span>
            </td>

            <td class="px-6 py-4 align-top">
              <div class="flex items-start justify-between gap-2">
                 <span class="text-sm font-semibold text-gray-900 line-clamp-2">{{ item.check_items_name }}</span>
                 <Info v-if="item.check_items_description" class="w-4 h-4 text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div class="text-xs text-gray-400 mt-1">คลิกเพื่อดูรายละเอียด</div>
            </td>

            <td class="px-6 py-4 text-center align-top">
              <span v-if="item.check_items_category" class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
                {{ item.check_items_category }}
              </span>
              <span v-else class="text-gray-300">-</span>
            </td>

            <td class="px-6 py-4 text-center align-top">
               <div v-if="item.check_items_is_required" class="flex justify-center">
                  <AlertCircle class="w-5 h-5 text-orange-500" />
               </div>
               <span v-else class="text-gray-300">-</span>
            </td>

            <td class="px-6 py-4 text-center text-sm text-gray-500 font-mono align-top pt-5">
              {{ item.check_items_order }}
            </td>

            <td class="px-6 py-4 text-center align-top pt-5">
              <div class="flex justify-center items-center">
                  <div 
                    class="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm"
                    :class="item.check_items_status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'"
                  ></div>
              </div>
            </td>

            <td class="px-6 py-4 text-right align-top pt-4" @click.stop>
              <div class="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button @click="$emit('edit', item)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit class="w-4 h-4" />
                </button>
                <button @click="$emit('delete', item.check_items_id)" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedItem" class="fixed inset-0 z-[100] flex justify-end" role="dialog">
       <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="closeDrawer"></div>

       <div class="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
          
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
             <h3 class="font-bold text-lg text-gray-800 flex items-center gap-2">
               <FileText class="w-5 h-5 text-indigo-600" /> รายละเอียด
             </h3>
             <button @click="closeDrawer" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all">
               <X class="w-5 h-5" />
             </button>
          </div>

          <div class="p-6 overflow-y-auto flex-1 space-y-6">
             
             <div>
                <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อรายการ</label>
                <h2 class="text-xl font-bold text-gray-900 mt-1">{{ selectedItem.check_items_name }}</h2>
             </div>

             <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <label class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                   <Info class="w-3 h-3" /> คำอธิบายเพิ่มเติม
                </label>
                <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                   {{ selectedItem.check_items_description || 'ไม่มีคำอธิบาย' }}
                </p>
             </div>

             <div class="grid grid-cols-2 gap-4">
                <div class="p-3 border border-gray-100 rounded-lg">
                   <label class="text-xs text-gray-400">รหัส (Code)</label>
                   <div class="font-mono text-sm font-semibold text-gray-700 mt-0.5">{{ selectedItem.check_items_code || '-' }}</div>
                </div>
                <div class="p-3 border border-gray-100 rounded-lg">
                   <label class="text-xs text-gray-400">หมวดหมู่</label>
                   <div class="text-sm font-semibold text-blue-600 mt-0.5">{{ selectedItem.check_items_category || '-' }}</div>
                </div>
                <div class="p-3 border border-gray-100 rounded-lg">
                   <label class="text-xs text-gray-400">ลำดับการแสดงผล</label>
                   <div class="text-sm font-semibold text-gray-700 mt-0.5">{{ selectedItem.check_items_order }}</div>
                </div>
                <div class="p-3 border border-gray-100 rounded-lg">
                   <label class="text-xs text-gray-400">สถานะ</label>
                   <div class="flex items-center gap-2 mt-0.5">
                      <div class="w-2 h-2 rounded-full" :class="selectedItem.check_items_status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'"></div>
                      <span class="text-sm font-medium">{{ selectedItem.check_items_status === 'active' ? 'Active' : 'Inactive' }}</span>
                   </div>
                </div>
             </div>

             <div v-if="selectedItem.check_items_is_required" class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <AlertCircle class="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                   <h4 class="text-sm font-bold text-orange-700">จำเป็นต้องตรวจสอบ</h4>
                   <p class="text-xs text-orange-600 mt-1">รายการนี้ถูกระบุว่าจำเป็น (Required) ผู้ตรวจสอบต้องลงข้อมูลเสมอ</p>
                </div>
             </div>

          </div>

          <div class="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
             <button @click="$emit('edit', selectedItem); closeDrawer()" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
               แก้ไขข้อมูล
             </button>
             <button @click="closeDrawer" class="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
               ปิด
             </button>
          </div>

       </div>
    </div>

  </div>
</template>