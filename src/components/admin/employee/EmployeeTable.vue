<script setup>
import { ref } from 'vue'
import { MoreHorizontal, Edit, Trash2, Mail, Phone, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

const props = defineProps({
  employees: {
    type: Array,
    default: () => [] // ป้องกันกรณี employees เป็น undefined
  },
  loading: Boolean,
  currentPage: Number,
  totalPages: Number,
  totalItems: Number,
  itemsPerPage: Number
})

const emit = defineEmits(['edit', 'delete', 'changePage', 'update:itemsPerPage'])

const activeMenuId = ref(null)

// Toggle เมนู: ถ้าเปิดตัวเดิมอยู่ให้ปิด ถ้าไม่ใช่ให้เปิดตัวใหม่
const toggleMenu = (id) => {
  activeMenuId.value = activeMenuId.value === id ? null : id
}

// ปิดเมนูทั้งหมด
const closeMenu = () => {
  activeMenuId.value = null
}

// Wrapper สำหรับการกดแก้ไข (ส่งค่าแล้วปิดเมนู)
const handleEdit = (emp) => {
  emit('edit', emp)
  closeMenu()
}

// Wrapper สำหรับการกดลบ (ส่งค่าแล้วปิดเมนู)
const handleDelete = (emp) => {
  emit('delete', emp)
  closeMenu()
}

// Helper Functions
const getRoleLabel = (r) => r === 'admin' ? 'ผู้ดูแลระบบ' : (r === 'maid' ? 'แม่บ้าน' : r)
const getStatusColor = (s) => s === 'active' ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
</script>

<template>
  <div @click="closeMenu" class="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
    
    <div class="overflow-x-auto flex-1 pb-20"> <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
          <tr class="border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider font-semibold">
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
            <td colspan="5" class="px-6 py-20 text-center text-gray-400">
              <div class="flex flex-col items-center justify-center gap-2">
                <span class="text-4xl">📄</span><span>ไม่พบข้อมูลพนักงาน</span>
              </div>
            </td>
          </tr>

          <tr v-else v-for="emp in employees" :key="emp.employees_id" class="hover:bg-gray-50 transition-colors group">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                  <img v-if="emp.employees_photo" :src="emp.employees_photo" class="h-full w-full object-cover"/>
                  <div v-else class="h-full w-full flex items-center justify-center text-lg font-bold text-gray-400 select-none bg-indigo-50 text-indigo-300">
                    {{ emp.employees_firstname?.charAt(0) || '?' }}
                  </div>
                </div>
                <div>
                  <div class="font-bold text-gray-900 text-sm whitespace-nowrap">{{ emp.employees_firstname }} {{ emp.employees_lastname }}</div>
                  <div class="text-xs text-gray-400 font-mono mt-0.5">{{ emp.employees_code || '-' }}</div>
                </div>
              </div>
            </td>
            
            <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{{ getRoleLabel(emp.role) }}</td>
            
            <td class="px-6 py-4">
              <div class="flex flex-col gap-1 text-sm text-gray-600">
                <div v-if="emp.employees_phone" class="flex items-center gap-1.5 whitespace-nowrap"><Phone class="w-3 h-3 text-gray-400" /> {{ emp.employees_phone }}</div>
                <div v-if="emp.email" class="flex items-center gap-1.5 whitespace-nowrap"><Mail class="w-3 h-3 text-gray-400" /> {{ emp.email }}</div>
              </div>
            </td>
            
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap" :class="getStatusColor(emp.employees_status)">
                <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>{{ emp.employees_status }}
              </span>
            </td>
            
            <td class="px-6 py-4 text-right relative"> <div class="relative inline-block text-left">
                <button type="button" @click.stop="toggleMenu(emp.employees_id)" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none active:bg-gray-200">
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

    <div class="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between bg-white gap-4 rounded-b-lg">
      
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <span class="whitespace-nowrap">
          แสดง {{ totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }} ถึง {{ Math.min(currentPage * itemsPerPage, totalItems) }} จาก {{ totalItems }} รายการ
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
        <button type="button" @click="$emit('changePage', 1)" :disabled="currentPage === 1" class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsLeft class="w-4 h-4 text-gray-600" /></button>
        <button type="button" @click="$emit('changePage', currentPage - 1)" :disabled="currentPage === 1" class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft class="w-4 h-4 text-gray-600" /></button>
        
        <span class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg min-w-[40px] text-center select-none">{{ currentPage }}</span>
        
        <button type="button" @click="$emit('changePage', currentPage + 1)" :disabled="currentPage === totalPages" class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight class="w-4 h-4 text-gray-600" /></button>
        <button type="button" @click="$emit('changePage', totalPages)" :disabled="currentPage === totalPages" class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsRight class="w-4 h-4 text-gray-600" /></button>
      </div>
    </div>
  </div>
</template>