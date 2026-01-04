<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2' // ✅ Import SweetAlert2
import {
  ArrowLeft, Clock, MapPin, Calendar, CheckCircle2, XCircle,
  Loader2, Check, Building, RotateCcw, MessageSquare
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

// --- State ---
const session = ref(null)
const checkResults = ref([])
const loading = ref(true)
const submitting = ref(false)

// --- 1. Fetch Data (ดึงข้อมูลงาน) ---
const fetchTaskDetail = async () => {
  loading.value = true
  try {
    // ดึงข้อมูล Session + พนักงาน + สถานที่
    const { data: sessionData, error: sessionError } = await supabase
      .from('check_sessions')
      .select(`
        *,
        employees ( employees_firstname, employees_lastname, employees_photo, role ),
        locations ( locations_name, locations_building, locations_floor )
      `)
      .eq('check_sessions_id', taskId)
      .single()

    if (sessionError) throw sessionError
    session.value = sessionData

    // ดึงรายการ Checklist ผลการตรวจ
    const { data: resultData, error: resultError } = await supabase
      .from('check_results')
      .select(`*, check_items ( check_items_name, check_items_description )`)
      .eq('check_sessions_id', taskId)
      .order('check_results_id', { ascending: true })

    if (resultError) throw resultError
    checkResults.value = resultData

  } catch (err) {
    console.error('Error fetching task:', err)
    Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลงานได้', 'error')
    router.push('/admin/check')
  } finally {
    loading.value = false
  }
}

// --- 2. Action Handlers (จัดการปุ่มกดด้วย SweetAlert2) ---

// ✅ อนุมัติ (Approve)
const handleApprove = async () => {
  const result = await Swal.fire({
    title: 'ยืนยันการตรวจสอบ?',
    text: "งานนี้จะได้รับการอนุมัติว่าเรียบร้อยแล้ว",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#22c55e', // สีเขียว
    cancelButtonColor: '#9ca3af',  // สีเทา
    confirmButtonText: 'ยืนยัน, อนุมัติเลย!',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true
  })

  if (result.isConfirmed) {
    await updateStatusInDB('approved', null)
    Swal.fire({
      icon: 'success',
      title: 'เรียบร้อย!',
      text: 'งานได้รับการอนุมัติแล้ว',
      timer: 1500,
      showConfirmButton: false
    })
  }
}

// ❌ ส่งกลับแก้ไข (Reject)
const handleReject = async () => {
  const result = await Swal.fire({
    title: 'ส่งกลับเพื่อแก้ไข?',
    text: "กรุณาระบุเหตุผลที่ต้องส่งกลับงานนี้:",
    icon: 'warning',
    input: 'textarea',
    inputPlaceholder: 'พิมพ์เหตุผลที่นี่... (เช่น พื้นยังไม่สะอาด)',
    inputAttributes: {
      'aria-label': 'Type your message here'
    },
    showCancelButton: true,
    confirmButtonColor: '#ef4444', // สีแดง
    cancelButtonColor: '#9ca3af',
    confirmButtonText: 'ยืนยันส่งกลับ',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
    preConfirm: (reason) => {
      if (!reason) {
        Swal.showValidationMessage('กรุณาระบุเหตุผลด้วยครับ')
      }
      return reason
    }
  })

  if (result.isConfirmed) {
    await updateStatusInDB('rejected', result.value)
    Swal.fire({
      icon: 'success',
      title: 'ส่งกลับแล้ว!',
      text: 'งานถูกส่งกลับไปแก้ไขเรียบร้อย',
      timer: 1500,
      showConfirmButton: false
    })
  }
}

// 🔄 รีเซ็ต (Reset)
const handleReset = async () => {
  const result = await Swal.fire({
    title: 'ต้องการเปลี่ยนแปลงผลตรวจ?',
    text: "สถานะงานจะถูกรีเซ็ตกลับเป็น 'รอตรวจสอบ'",
    icon: 'info',
    showCancelButton: true,
    confirmButtonColor: '#3b82f6', // สีฟ้า
    cancelButtonColor: '#9ca3af',
    confirmButtonText: 'ใช่, รีเซ็ตเลย',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true
  })

  if (result.isConfirmed) {
    await updateStatusInDB('waiting', null)
    Swal.fire({
      icon: 'success',
      title: 'รีเซ็ตสำเร็จ!',
      text: 'สถานะกลับมาเป็นรอตรวจสอบแล้ว',
      timer: 1500,
      showConfirmButton: false
    })
  }
}

// --- 3. Database Update Logic ---
const updateStatusInDB = async (status, reasonInput) => {
  submitting.value = true
  try {
    const updates = {
      check_sessions_status: status,
      updated_at: new Date()
    }

    // ถ้า Reject ให้บันทึกเหตุผล
    if (status === 'rejected' && reasonInput) {
       updates.supervisor_comment = reasonInput
    }
    // ถ้ารีเซ็ตเป็น waiting ให้ลบเหตุผลเดิมทิ้ง
    if (status === 'waiting') {
       updates.supervisor_comment = null
    }

    const { error } = await supabase
      .from('check_sessions')
      .update(updates)
      .eq('check_sessions_id', taskId)

    if (error) throw error

    // อัปเดตข้อมูลในหน้าจอทันที ไม่ต้องโหลดใหม่
    session.value.check_sessions_status = status
    session.value.supervisor_comment = (status === 'rejected') ? reasonInput : null

  } catch (err) {
    console.error('Update error:', err)
    Swal.fire('Error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error')
  } finally {
    submitting.value = false
  }
}

// --- Helpers ---
const formatDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'
const getRoleName = (r) => (r === 'maid' || r === 'user') ? 'พนักงานทำความสะอาด' : (r === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน')
const isCompleted = computed(() => ['approved', 'rejected'].includes(session.value?.check_sessions_status))

onMounted(() => { if (taskId) fetchTaskDetail() })
</script>

<template>
  <div class="space-y-4 pb-10">

    <button @click="router.back()" class="flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium border border-gray-300 bg-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 w-fit">
      <ArrowLeft class="w-5 h-5 mr-2" /> ย้อนกลับ
    </button>

    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="w-10 h-10 text-indigo-500 animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative">

      <div class="lg:col-span-2 space-y-4">
        <h2 class="text-xl font-bold text-gray-800">รายละเอียดรายการ</h2>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div class="space-y-2">
            <h3 class="text-lg font-bold text-gray-800">{{ session.locations?.locations_name || 'ไม่ระบุสถานที่' }}</h3>
            <div class="flex flex-wrap gap-3 text-gray-500 text-sm">
              <div class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Calendar class="w-4 h-4"/> {{ formatDate(session.check_sessions_date) }}</div>
              <div class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Clock class="w-4 h-4"/> {{ session.check_sessions_time_start?.substring(0,5) }} น.</div>
              <div class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Building class="w-4 h-4"/> {{ session.locations?.locations_building || '-' }}</div>
              <div class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><MapPin class="w-4 h-4"/> ชั้น {{ session.locations?.locations_floor || '-' }}</div>
            </div>
          </div>
          
          <div class="px-4 py-1.5 rounded-full font-bold text-white flex items-center gap-2 text-sm shadow-sm"
            :class="{
              'bg-yellow-400': !isCompleted, 
              'bg-green-500': session.check_sessions_status === 'approved', 
              'bg-red-400': session.check_sessions_status === 'rejected'
            }">
            {{ session.check_sessions_status === 'approved' ? 'อนุมัติแล้ว' : (session.check_sessions_status === 'rejected' ? 'ส่งแก้ไข' : 'รอตรวจสอบ') }}
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 border-b border-gray-100 bg-gray-50">
            <h3 class="text-lg font-bold text-gray-800">รายการตรวจสอบ</h3>
          </div>
          <div class="p-5 space-y-3">
            <div v-for="(item, index) in checkResults" :key="item.check_results_id" 
              class="bg-white rounded-lg p-3 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors"
              :class="{
                'border-l-4 border-l-red-500': ['fail','false'].includes(item.check_results_status), 
                'border-l-4 border-l-green-500': ['pass','true'].includes(item.check_results_status)
              }"
            >
              <div class="flex-1">
                <div class="font-bold text-gray-800 text-base mb-1">{{ index + 1 }}. {{ item.check_items?.check_items_name }}</div>
                <div class="text-gray-500 text-xs font-light">{{ item.check_items?.check_items_description || '-' }}</div>
                
                <div v-if="item.check_results_detail" class="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded-md border border-yellow-100 flex items-start gap-2">
                   <MessageSquare class="w-3 h-3 mt-0.5 text-yellow-600 shrink-0" />
                   <span><span class="font-bold text-yellow-600">หมายเหตุ:</span> {{ item.check_results_detail }}</span>
                </div>
              </div>
              
              <div v-if="['pass','true'].includes(item.check_results_status)" class="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-md font-bold text-xs shrink-0">
                <Check class="w-3 h-3"/> เรียบร้อย
              </div>
              <div v-else-if="['fail','false'].includes(item.check_results_status)" class="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-md font-bold text-xs shrink-0">
                <XCircle class="w-3 h-3"/> ไม่ผ่าน
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1 space-y-3 sticky top-4 h-fit z-10">
        <h2 class="text-xl font-bold text-gray-800">ผู้รับผิดชอบ</h2>
        
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col items-center text-center">
          <div class="relative mb-3">
            <img v-if="session.employees?.employees_photo" :src="session.employees.employees_photo" class="w-20 h-20 rounded-full object-cover border-4 border-gray-50 shadow-sm"/>
            <div v-else class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl border-4 border-gray-50">🧹</div>
          </div>
          <div class="font-bold text-lg text-gray-800">{{ session.employees?.employees_firstname }} {{ session.employees?.employees_lastname }}</div>
          <div class="text-gray-400 font-light mt-0.5 text-xs">{{ getRoleName(session.employees?.role) }}</div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 class="text-lg font-bold text-gray-800 mb-3 text-center">ผลการตรวจ</h3>

          <div v-if="isCompleted" class="text-center space-y-3">
             <div class="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <CheckCircle2 v-if="session.check_sessions_status === 'approved'" class="w-10 h-10 text-green-500 mx-auto mb-2" />
                <XCircle v-else class="w-10 h-10 text-red-500 mx-auto mb-2" />
                
                <div class="font-bold text-gray-700 text-sm">
                  {{ session.check_sessions_status === 'approved' ? 'ตรวจสอบแล้วเรียบร้อย' : 'ส่งกลับแก้ไขแล้ว' }}
                </div>
                <div class="text-xs text-gray-400 mt-1">เมื่อ: {{ formatDate(session.updated_at) }}</div>
                
                <div v-if="session.check_sessions_status === 'rejected' && session.supervisor_comment" class="mt-3 text-xs text-red-600 bg-red-50 p-3 rounded-lg text-left border border-red-100">
                  <b class="block mb-1">เหตุผล:</b> {{ session.supervisor_comment }}
                </div>
             </div>

             <button @click="handleReset" class="text-xs text-indigo-500 hover:text-indigo-700 font-bold underline flex items-center justify-center gap-1 w-full transition-colors pt-2">
                <RotateCcw class="w-3 h-3" /> ต้องการเปลี่ยนแปลงผลตรวจ?
             </button>
          </div>

          <div v-else class="space-y-3">
            <button @click="handleApprove" :disabled="submitting" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-base py-3 px-4 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <CheckCircle2 class="w-5 h-5" /> ตรวจสอบ (อนุมัติ)
            </button>
            <button @click="handleReject" :disabled="submitting" class="w-full bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-bold text-base py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <XCircle class="w-5 h-5" /> ส่งกลับแก้ไข
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>