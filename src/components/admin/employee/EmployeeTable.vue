<script setup>
import { ref } from 'vue'
import { MoreHorizontal, Edit, Trash2, Mail, Phone, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

const props = defineProps({
  employees: {
    type: Array,
    default: () => []
  },
  loading: Boolean,
  currentPage: Number,
  totalPages: Number,
  totalItems: Number,
  itemsPerPage: Number
})

const emit = defineEmits(['edit', 'delete', 'changePage', 'update:itemsPerPage'])

const activeMenuId = ref(null)

// Toggle เมนู
const toggleMenu = (id) => {
  activeMenuId.value = activeMenuId.value === id ? null : id
}

// ปิดเมนู
const closeMenu = () => {
  activeMenuId.value = null
}

const handleEdit = (emp) => {
  emit('edit', emp)
  closeMenu()
}

const handleDelete = (emp) => {
  emit('delete', emp)
  closeMenu()
}

// Helper Functions
const getRoleLabel = (r) => r === 'admin' ? 'ผู้ดูแลระบบ' : (r === 'maid' ? 'แม่บ้าน' : r)
const getStatusColor = (s) => s === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-gray-50 border-gray-200'
</script>

<template>
  <div @click="closeMenu" class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-260px)] relative">
    
    <div class="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse">
        
        <thead class="sticky top-0 z-5 bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider shadow-sm">
          <tr>
            <th class="px-6 py-4 whitespace-nowrap">พนักงาน</th>
            <th class="px-6 py-4 whitespace-nowrap">ตำแหน่ง</th>
            <th class="px-6 py-4 whitespace-nowrap">ข้อมูลติดต่อ</th>
            <th class="px-6 py-4 whitespace-nowrap">สถานะ</th>
            <th class="px-6 py-4 text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-if="loading">
            <td colspan="5" class="px-6 py-20 text-center text-gray-400">
              <div class="flex flex-col items-center justify-center gap-3">
                 <Loader2 class="w-8 h-8 animate-spin text-indigo-500" /> 
                 <span>กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="!employees || employees.length === 0">
            <td colspan="5" class="px-6 py-20 text-center text-gray-400 bg-gray-50/30">
              <div class="flex flex-col items-center justify-center gap-2">
                <span class="text-4xl opacity-50">📄</span><span>ไม่พบข้อมูลพนักงาน</span>
              </div>
            </td>
          </tr>

          <tr v-else v-for="emp in employees" :key="emp.employees_id" class="hover:bg-gray-50 transition-colors group">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                  <img v-if="emp.employees_photo" :src="emp.employees_photo" class="h-full w-full object-cover"/>
                  <div v-else class="h-full w-full flex items-center justify-center text-sm font-bold text-indigo-300 select-none bg-indigo-50">
                    {{ emp.employees_firstname?.charAt(0) || '?' }}
                  </div>
                </div>
                <div>
                  <div class="font-bold text-gray-900 text-sm whitespace-nowrap">{{ emp.employees_firstname }} {{ emp.employees_lastname }}</div>
                  <div class="text-xs text-gray-400 font-mono mt-0.5">{{ emp.employees_code || '-' }}</div>
                </div>
              </div>
            </td>
            
            <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                {{ getRoleLabel(emp.role) }}
              </span>
            </td>
            
            <td class="px-6 py-4">
              <div class="flex flex-col gap-1 text-sm text-gray-600">
                <div v-if="emp.employees_phone" class="flex items-center gap-2 whitespace-nowrap"><Phone class="w-3 h-3 text-gray-400" /> {{ emp.employees_phone }}</div>
                <div v-if="emp.email" class="flex items-center gap-2 whitespace-nowrap"><Mail class="w-3 h-3 text-gray-400" /> {{ emp.email }}</div>
              </div>
            </td>
            
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap" :class="getStatusColor(emp.employees_status)">
                <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>{{ emp.employees_status === 'active' ? 'ใช้งาน' : 'ระงับ' }}
              </span>
            </td>
            
            <td class="px-6 py-4 text-right relative">
              <div class="relative inline-block text-left">
                <button type="button" @click.stop="toggleMenu(emp.employees_id)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none">
                  <MoreHorizontal class="w-5 h-5" />
                </button>
                
                <div v-if="activeMenuId === emp.employees_id" class="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                  <button type="button" @click.stop="handleEdit(emp)" class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors">
                    <Edit class="w-4 h-4" /> แก้ไขข้อมูล
                  </button>
                  <div class="h-px bg-gray-100 my-0"></div>
                  <button type="button" @click.stop="handleDelete(emp)" class="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                    <Trash2 class="w-4 h-4" /> ลบพนักงาน
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sticky bottom-0 z-20 bg-white border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <span class="whitespace-nowrap">
          แสดง {{ totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }} ถึง {{ Math.min(currentPage * itemsPerPage, totalItems) }} จาก <span class="font-bold text-gray-900">{{ totalItems }}</span> รายการ
        </span>
        
        <div class="flex items-center gap-2">
          <span class="hidden sm:inline">แสดง:</span>
          <select 
            :value="itemsPerPage" 
            @change="$emit('update:itemsPerPage', Number($event.target.value))"
            class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button type="button" @click="$emit('changePage', 1)" :disabled="currentPage === 1" class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"><ChevronsLeft class="w-4 h-4" /></button>
        <button type="button" @click="$emit('changePage', currentPage - 1)" :disabled="currentPage === 1" class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"><ChevronLeft class="w-4 h-4" /></button>
        
        <span class="px-3 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg min-w-[32px] text-center select-none border border-indigo-100">{{ currentPage }}</span>
        
        <button type="button" @click="$emit('changePage', currentPage + 1)" :disabled="currentPage === totalPages" class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"><ChevronRight class="w-4 h-4" /></button>
        <button type="button" @click="$emit('changePage', totalPages)" :disabled="currentPage === totalPages" class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"><ChevronsRight class="w-4 h-4" /></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scrollbar สวยๆ */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  border: 2px solid #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>