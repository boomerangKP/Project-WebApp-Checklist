<script setup>
import { ref } from 'vue'
import {
  Edit, Trash2, Loader2, AlertCircle, Copy, Check,
  X, FileText, Info, ChevronRight
} from 'lucide-vue-next'

defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean
})

const emit = defineEmits(['edit', 'delete'])

// --- Copy Logic ---
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

// --- Side Drawer Logic ---
const selectedItem = ref(null)
const openDrawer = (item) => {
  selectedItem.value = item
}
const closeDrawer = () => {
  selectedItem.value = null
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[calc(100vh-220px)] overflow-hidden font-noto relative">

    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <table class="w-full text-left border-collapse">
        <thead class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 shadow-sm">
          <tr>
            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Code</th>
            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-auto">รายการตรวจสอบ</th>
            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-24">จำเป็น</th>
            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-24">ลำดับ</th>
            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">สถานะ</th>
            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-24">จัดการ</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-20 text-center">
              <div class="flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
                <span class="text-sm">กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="items.length === 0">
            <td colspan="6" class="px-6 py-20 text-center text-gray-400 bg-gray-50/30 text-sm">
              ไม่พบรายการตรวจสอบในระบบ
            </td>
          </tr>

          <tr v-else v-for="item in items" :key="item.check_items_id"
              class="hover:bg-gray-50 transition-colors group cursor-pointer"
              @click="openDrawer(item)"
          >
            <td class="px-6 py-4 whitespace-nowrap align-top" @click.stop>
              <button
                @click="copyToClipboard(item.check_items_code, item.check_items_id)"
                class="group/btn flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 bg-white shadow-sm hover:shadow-md w-full max-w-[140px]"
                :class="copiedId === item.check_items_id
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'"
              >
                <span class="font-mono text-xs font-bold tracking-wide truncate flex-1 text-left">
                  {{ item.check_items_code }}
                </span>
                <Check v-if="copiedId === item.check_items_id" class="w-3 h-3 flex-shrink-0" />
                <Copy v-else class="w-3 h-3 opacity-30 group-hover/btn:opacity-100 flex-shrink-0 transition-opacity" />
              </button>
            </td>

            <td class="px-6 py-4 align-top">
              <div class="flex flex-col">
                <span class="text-sm font-bold text-gray-900 line-clamp-2">{{ item.check_items_name }}</span>
                <div class="flex items-center gap-1 mt-1 text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                   <span>คลิกเพื่อดูรายละเอียด</span>
                   <ChevronRight class="w-3 h-3" />
                </div>
              </div>
            </td>

            <td class="px-6 py-4 text-center align-top pt-5">
               <div v-if="item.check_items_is_required" class="flex justify-center" title="จำเป็นต้องระบุ">
                    <AlertCircle class="w-4 h-4 text-red-500" />
               </div>
               <span v-else class="text-gray-300 text-xs">-</span>
            </td>

            <td class="px-6 py-4 text-center align-top pt-4">
              <div class="inline-flex items-center justify-center text-sm font-bold text-gray-600 ">
                {{ item.check_items_order }}
              </div>
            </td>

            <td class="px-6 py-4 text-center align-top pt-5">
              <div class="flex items-center justify-center gap-1.5">
                <div class="w-2 h-2 rounded-full"
                     :class="item.check_items_status === 'active' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-gray-300'">
                </div>
                <span class="text-sm font-medium text-gray-700">
                  {{ item.check_items_status === 'active' ? 'ปกติ' : 'ปิด' }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 text-right align-top pt-4" @click.stop>
              <div class="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <button @click="$emit('edit', item)" class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="แก้ไข">
                  <Edit class="w-4 h-4" />
                </button>
                <button @click="$emit('delete', item.check_items_id)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="ลบ">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && items.length > 0" class="border-t border-gray-200 p-3 bg-gray-50 flex justify-between items-center text-xs text-gray-500 shrink-0 z-20">
        <div>แสดงทั้งหมด <span class="font-bold text-gray-700">{{ items.length }}</span> รายการ</div>
    </div>

    <Teleport to="body">
      <div v-if="selectedItem" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog">
         
         <div class="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" @click="closeDrawer"></div>

         <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">

           <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
               <h3 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                 <FileText class="w-5 h-5 text-indigo-600" /> รายละเอียด
               </h3>
               <button @click="closeDrawer" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-all">
                 <X class="w-5 h-5" />
               </button>
           </div>

           <div class="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">

               <div>
                   <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อรายการตรวจสอบ</label>
                   <h2 class="text-xl font-bold text-gray-900 mt-1">{{ selectedItem.check_items_name }}</h2>
               </div>

               <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                   <label class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <Info class="w-3 h-3" /> วิธีการตรวจสอบ / คำอธิบาย
                   </label>
                   <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {{ selectedItem.check_items_description || 'ไม่มีคำอธิบาย' }}
                   </p>
               </div>

               <div class="grid grid-cols-2 gap-4">
                   <div class="p-3 border border-gray-100 rounded-lg">
                      <label class="text-xs text-gray-400">รหัส (Code)</label>
                      <div class="font-mono text-sm font-semibold text-gray-700 mt-0.5 break-all">{{ selectedItem.check_items_code || '-' }}</div>
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
                         <span class="text-sm font-medium">{{ selectedItem.check_items_status === 'active' ? 'ใช้งานปกติ' : 'ปิดใช้งาน' }}</span>
                      </div>
                   </div>
               </div>

               <div v-if="selectedItem.check_items_is_required" class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                   <AlertCircle class="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                   <div>
                      <h4 class="text-sm font-bold text-orange-700">จำเป็นต้องตรวจสอบ (Required)</h4>
                      <p class="text-xs text-orange-600 mt-1">รายการนี้แม่บ้านต้องระบุผลการตรวจสอบเสมอ ห้ามข้าม</p>
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
    </Teleport>

  </div>
</template>

<style scoped>
/* Scrollbar สวยๆ */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>