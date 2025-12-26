<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { 
  Loader2, Download, Calendar as CalendarIcon, 
  Search, Eye, FileText, CheckCircle2, XCircle, Clock, ArrowRight
} from 'lucide-vue-next'

// --- State ---
const loading = ref(true)
const searchQuery = ref('')
const dateRange = ref('today') // today, yesterday, week, month, custom
const logs = ref([])
const stats = ref({ total: 0, pass: 0, fail: 0, staff: 0 })

// State สำหรับ Custom Date
const customStart = ref('')
const customEnd = ref('')

// --- Date Helpers (Thai Version) 🇹🇭 ---
const getDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 🔥 ฟังก์ชันแปลงวันที่เป็นไทย (พ.ศ.)
const formatThaiDate = (dateString, withTime = true) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    calendar: 'buddhist' // 👈 บังคับใช้พุทธศักราช
  }
  
  if (withTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }

  return date.toLocaleDateString('th-TH', options)
}

// ฟังก์ชันแปลงวันที่สำหรับแสดงผลข้าง Input
const displayThaiDateSimple = (isoDate) => {
    if (!isoDate) return ''
    const d = new Date(isoDate)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', calendar: 'buddhist' })
}

// ตั้งค่า Default วันที่ (เริ่มต้นคือวันนี้)
onMounted(() => {
  const todayStr = getDateString(new Date())
  customStart.value = todayStr
  customEnd.value = todayStr
  fetchData()
})

const getQueryDates = (range) => {
  const today = new Date()
  const end = getDateString(today)
  let start = end

  if (range === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    start = getDateString(d)
    return { start, end: start }
  } 
  else if (range === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    start = getDateString(d)
  } 
  else if (range === 'month') {
    const d = new Date()
    d.setDate(1)
    start = getDateString(d)
  }
  else if (range === 'custom') {
    return { start: customStart.value, end: customEnd.value }
  }
  
  return { start, end }
}

// --- Fetch Logic ---
const fetchData = async () => {
  loading.value = true
  try {
    const { start, end } = getQueryDates(dateRange.value)
    
    let query = supabase
      .from('check_sessions')
      .select(`
        *,
        employees (employees_firstname, employees_lastname, employees_photo),
        locations (locations_name, locations_building, locations_floor)
      `)
      .order('created_at', { ascending: false })

    if (dateRange.value === 'today' || dateRange.value === 'yesterday') {
       query = query.eq('check_sessions_date', start)
    } else {
       query = query.gte('check_sessions_date', start).lte('check_sessions_date', end)
    }

    const { data, error } = await query

    if (error) throw error
    logs.value = data

    // คำนวณ Stats
    stats.value = {
      total: data.length,
      pass: data.filter(i => ['pass', 'approved', 'fixed'].includes(i.check_sessions_status)).length,
      fail: data.filter(i => ['fail', 'rejected'].includes(i.check_sessions_status)).length,
      staff: new Set(data.map(i => i.employees_id)).size
    }

  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// --- Excel Export ---
const handleExportExcel = () => {
  if (!logs.value || logs.value.length === 0) return alert('ไม่พบข้อมูลสำหรับ Export')

  const rows = logs.value.map(item => ({
    'รหัสงาน': item.check_sessions_id,
    'วันที่และเวลา': formatThaiDate(item.created_at), // 👈 ใช้แบบไทย
    'ชื่อพนักงาน': `${item.employees?.employees_firstname || ''} ${item.employees?.employees_lastname || ''}`.trim() || '-',
    'อาคาร': item.locations?.locations_building || '-',
    'ชั้น': item.locations?.locations_floor || '-',
    'สถานที่': item.locations?.locations_name || '-',
    'สถานะการตรวจ': getStatusLabel(item.check_sessions_status),
    'หมายเหตุ': item.check_sessions_note || '-'
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 30 }]
  
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reports")

  const { start, end } = getQueryDates(dateRange.value)
  // ชื่อไฟล์ก็เป็นวันที่ไทยง่ายๆ
  const fileName = `Report_Maid_${start}_to_${end}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

const getStatusColor = (status) => {
  switch (status) {
    case 'pass': case 'approved': case 'fixed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'fail': case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const getStatusLabel = (status) => {
  const map = { pass: 'เรียบร้อย', approved: 'อนุมัติแล้ว', fixed: 'แก้ไขแล้ว', fail: 'พบปัญหา', rejected: 'ปฏิเสธ', waiting: 'รอตรวจ', in_progress: 'กำลังทำ' }
  return map[status] || status
}

const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value
  const q = searchQuery.value.toLowerCase()
  return logs.value.filter(item => 
    item.employees?.employees_firstname.toLowerCase().includes(q) ||
    item.locations?.locations_name.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="space-y-6 pb-10">
    
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">รายงานผลการปฏิบัติงาน</h1>
        <p class="text-gray-500 text-sm mt-1">สรุปข้อมูลย้อนหลังและประวัติการทำงาน</p>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        
        <div class="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex-wrap">
          <div class="relative">
            <select v-model="dateRange" @change="fetchData" class="appearance-none bg-transparent text-gray-700 py-2 pl-3 pr-8 rounded-md text-sm font-medium focus:outline-none cursor-pointer hover:bg-gray-50">
              <option value="today">วันนี้</option>
              <option value="yesterday">เมื่อวาน</option>
              <option value="week">7 วันล่าสุด</option>
              <option value="month">เดือนนี้</option>
              <option value="custom">กำหนดเอง...</option>
            </select>
            <CalendarIcon class="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div v-if="dateRange === 'custom'" class="flex items-center gap-2 px-2 border-l border-gray-200 animate-in fade-in slide-in-from-left-2">
            
            <div class="flex flex-col">
                <input type="date" v-model="customStart" class="text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600">
                <span class="text-[10px] text-indigo-600 text-center font-medium">{{ displayThaiDateSimple(customStart) }}</span>
            </div>
            
            <ArrowRight class="w-3 h-3 text-gray-400 self-center mb-4" />
            
            <div class="flex flex-col">
                <input type="date" v-model="customEnd" class="text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600">
                <span class="text-[10px] text-indigo-600 text-center font-medium">{{ displayThaiDateSimple(customEnd) }}</span>
            </div>

            <button @click="fetchData" class="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-700 ml-1 self-center mb-4">ค้นหา</button>
          </div>
        </div>

        <button 
          @click="handleExportExcel" 
          class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-gray-200 transition-all active:scale-95 whitespace-nowrap"
        >
          <Download class="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-indigo-200 transition-all">
        <div class="flex justify-between items-start">
          <div class="p-2 bg-gray-50 rounded-lg group-hover:bg-indigo-50"><FileText class="w-5 h-5 text-gray-600 group-hover:text-indigo-600" /></div>
          <span class="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Total Tasks</span>
        </div>
        <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.total }}</h3><p class="text-xs text-gray-500 mt-1">รายการตรวจสอบทั้งหมด</p></div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-emerald-200 transition-all">
        <div class="flex justify-between items-start">
          <div class="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 class="w-5 h-5 text-emerald-600" /></div>
          <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+Completed</span>
        </div>
        <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.pass }}</h3><p class="text-xs text-gray-500 mt-1">งานที่เรียบร้อย</p></div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-rose-200 transition-all">
        <div class="flex justify-between items-start">
          <div class="p-2 bg-rose-50 rounded-lg"><XCircle class="w-5 h-5 text-rose-600" /></div>
          <span class="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Issues</span>
        </div>
        <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.fail }}</h3><p class="text-xs text-gray-500 mt-1">พบปัญหา / แจ้งซ่อม</p></div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-blue-200 transition-all">
        <div class="flex justify-between items-start">
          <div class="p-2 bg-blue-50 rounded-lg"><Clock class="w-5 h-5 text-blue-600" /></div>
          <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Active</span>
        </div>
        <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.staff }}</h3><p class="text-xs text-gray-500 mt-1">พนักงานปฏิบัติงาน</p></div>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div class="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 class="font-bold text-gray-800 text-lg">รายการตรวจสอบ</h2>
        <div class="relative w-full sm:w-64">
          <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, สถานที่..." class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all" />
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-medium">Job ID / วันที่ (Date)</th> <th class="px-6 py-4 font-medium">พนักงาน (Staff)</th>
              <th class="px-6 py-4 font-medium">สถานที่ (Location)</th>
              <th class="px-6 py-4 font-medium text-center">สถานะ (Status)</th>
              <th class="px-6 py-4 font-medium text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading"><td colspan="5" class="px-6 py-8 text-center text-gray-400"><Loader2 class="w-5 h-5 animate-spin inline mr-2" /> กำลังโหลด...</td></tr>
            <tr v-else-if="filteredLogs.length === 0"><td colspan="5" class="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
            <tr v-else v-for="log in filteredLogs" :key="log.check_sessions_id" class="hover:bg-gray-50/80 transition-colors">
              <td class="px-6 py-4">
                <div class="font-mono text-xs text-gray-400 mb-0.5">#{{ log.check_sessions_id.toString().padStart(6, '0') }}</div>
                <div class="text-sm font-medium text-gray-700">{{ formatThaiDate(log.created_at) }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <img :src="log.employees?.employees_photo || 'https://via.placeholder.com/40'" class="w-9 h-9 rounded-full object-cover border border-gray-200" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ log.employees?.employees_firstname }} {{ log.employees?.employees_lastname }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 font-medium">{{ log.locations?.locations_name }}</div>
                <div class="text-xs text-gray-500">{{ log.locations?.locations_building }} • ชั้น {{ log.locations?.locations_floor }}</div>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border" :class="getStatusColor(log.check_sessions_status)">
                  <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="log.check_sessions_status === 'fail' ? 'bg-rose-500' : 'bg-emerald-500'"></span>
                  {{ getStatusLabel(log.check_sessions_status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button class="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50"><Eye class="w-4 h-4" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>