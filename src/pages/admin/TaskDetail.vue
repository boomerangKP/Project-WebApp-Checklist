<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Clock, MapPin, Calendar, CheckCircle2, XCircle,
  Loader2, Check, Building, RotateCcw
} from 'lucide-vue-next'

// Import Component 2 ตัว (ตัวเดิม กับ ตัวใหม่)
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ResetConfirmModal from '@/components/ui/ResetConfirmModal.vue' // <--- ตัวใหม่

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

// Data State
const session = ref(null)
const checkResults = ref([])
const loading = ref(true)
const submitting = ref(false)

// State สำหรับ Modal ปกติ (Approve/Reject)
const modalConfig = ref({
  isOpen: false,
  type: '',
  title: '',
  message: '',
  variant: 'success',
  requireReason: false
})

// State สำหรับ Modal ตัวใหม่ (Reset) แยกออกมาเลย
const showResetModal = ref(false)

// --- 1. ดึงข้อมูล ---
const fetchTaskDetail = async () => {
  loading.value = true
  try {
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

    const { data: resultData, error: resultError } = await supabase
      .from('check_results')
      .select(`*, check_items ( check_items_name, check_items_description )`)
      .eq('check_sessions_id', taskId)
      .order('check_results_id', { ascending: true })

    if (resultError) throw resultError
    checkResults.value = resultData
  } catch (err) {
    console.error('Error:', err)
    router.push('/admin/check')
  } finally {
    loading.value = false
  }
}

// --- 2. เปิด Modal ปกติ (Approve/Reject) ---
const openApproveModal = () => {
  modalConfig.value = {
    isOpen: true,
    type: 'approve',
    title: 'ยืนยันการตรวจสอบ ?',
    message: 'งานนี้จะได้รับการตรวจสอบเรียบร้อยแล้ว',
    variant: 'success',
    requireReason: false
  }
}

const openRejectModal = () => {
  modalConfig.value = {
    isOpen: true,
    type: 'reject',
    title: 'ส่งกลับเพื่อแก้ไข ?',
    message: 'กรุณาบอกเหตุผลที่ต้องส่งกลับ',
    variant: 'danger',
    requireReason: true
  }
}

// --- 3. Handle Confirm ปกติ ---
const handleMainConfirm = async (reason) => {
  const status = modalConfig.value.type === 'approve' ? 'approved' : 'rejected'
  await updateStatusInDB(status, reason)
  modalConfig.value.isOpen = false
}

// --- 4. Handle Reset (สำหรับ Modal ตัวใหม่) ---
const handleResetConfirm = async () => {
  // บันทึกสถานะเป็น 'waiting' (ล้างค่า)
  await updateStatusInDB('waiting', null)
  showResetModal.value = false // ปิด Modal ตัวใหม่
}

// --- Logic บันทึกลง Database (ใช้ร่วมกันได้) ---
const updateStatusInDB = async (status, reasonInput) => {
  submitting.value = true
  try {
    const updates = {
      check_sessions_status: status,
      updated_at: new Date()
    }
    // ถ้าส่งกลับแก้ไข บันทึกเหตุผล
    if (status === 'rejected' && reasonInput) {
       updates.supervisor_comment = reasonInput
    }
    // ถ้า Reset ให้ล้างเหตุผลเดิมด้วย (optional)
    if (status === 'waiting') {
       updates.supervisor_comment = null
    }

    const { error } = await supabase
      .from('check_sessions')
      .update(updates)
      .eq('check_sessions_id', taskId)

    if (error) throw error

    session.value.check_sessions_status = status
    session.value.supervisor_comment = (status === 'rejected') ? reasonInput : null

  } catch (err) {
    alert('Error: ' + err.message)
  } finally {
    submitting.value = false
  }
}

// Helpers
const formatDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'
const getRoleName = (r) => (r === 'maid' || r === 'user') ? 'พนักงานทำความสะอาด' : (r === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน')
const isCompleted = computed(() => ['approved', 'rejected'].includes(session.value?.check_sessions_status))

onMounted(() => { if (taskId) fetchTaskDetail() })
</script>

<template>
  <div class="space-y-4">

    <button @click="router.back()" class="flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium border border-gray-300 bg-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 w-fit">
      <ArrowLeft class="w-5 h-5 mr-2" /> ย้อนกลับ
    </button>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="w-10 h-10 text-gray-400 animate-spin" /></div>

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
            :class="{'bg-[#FBBF24]': !isCompleted, 'bg-[#4ADE80]': session.check_sessions_status === 'approved', 'bg-[#F87171]': session.check_sessions_status === 'rejected'}">
            {{ session.check_sessions_status === 'approved' ? 'อนุมัติแล้ว' : (session.check_sessions_status === 'rejected' ? 'ส่งแก้ไข' : 'รอตรวจสอบ') }}
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 border-b border-gray-100 bg-gray-50"><h3 class="text-lg font-bold text-gray-800">รายการตรวจสอบ</h3></div>
          <div class="p-5 space-y-3">
            <div v-for="(item, index) in checkResults" :key="item.check_results_id" class="bg-white rounded-lg p-3 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div class="font-bold text-gray-800 text-base mb-1">{{ index + 1 }}. {{ item.check_items?.check_items_name }}</div>
                <div class="text-gray-500 text-xs font-light">{{ item.check_items?.check_items_description || '-' }}</div>
              </div>
              <div v-if="['pass','true'].includes(item.check_results_status)" class="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-md font-bold text-xs"><Check class="w-3 h-3"/> เรียบร้อย</div>
              <div v-else-if="['fail','false'].includes(item.check_results_status)" class="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-md font-bold text-xs"><XCircle class="w-3 h-3"/> ไม่ผ่าน</div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1 space-y-3 sticky top-2 h-fit z-10">
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
                <CheckCircle2 v-if="session.check_sessions_status === 'approved'" class="w-8 h-8 text-green-500 mx-auto mb-1" />
                <XCircle v-else class="w-8 h-8 text-red-500 mx-auto mb-1" />
                <div class="font-bold text-gray-700 text-sm">{{ session.check_sessions_status === 'approved' ? 'ตรวจสอบแล้วเรียบร้อย' : 'ส่งกลับแก้ไขแล้ว' }}</div>
                <div class="text-xs text-gray-400">เมื่อ: {{ formatDate(session.updated_at) }}</div>
                <div v-if="session.check_sessions_status === 'rejected' && session.supervisor_comment" class="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded text-left">
                  <b>เหตุผล:</b> {{ session.supervisor_comment }}
                </div>
             </div>

             <button @click="showResetModal = true" class="text-xs text-red-500 hover:text-red-700 font-bold underline flex items-center justify-center gap-1 w-full transition-colors">
                <RotateCcw class="w-3 h-3" /> ต้องการเปลี่ยนแปลงผลตรวจ?
             </button>
          </div>

          <div v-else class="space-y-2">
            <button @click="openApproveModal" :disabled="submitting" class="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-base py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
              <CheckCircle2 class="w-5 h-5" /> ตรวจสอบ
            </button>
            <button @click="openRejectModal" :disabled="submitting" class="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-base py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
              <XCircle class="w-5 h-5" /> ส่งกลับแก้ไข
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      :is-open="modalConfig.isOpen"
      :title="modalConfig.title"
      :message="modalConfig.message"
      :variant="modalConfig.variant"
      :require-reason="modalConfig.requireReason"
      :loading="submitting"
      @close="modalConfig.isOpen = false"
      @confirm="handleMainConfirm"
    />

    <ResetConfirmModal
      :is-open="showResetModal"
      :loading="submitting"
      @close="showResetModal = false"
      @confirm="handleResetConfirm"
    />

  </div>
</template>
