<script setup>
import { ref, watch } from 'vue'
import { Loader2, X, RefreshCw } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useSwal } from '@/composables/useSwal'

const props = defineProps({
  isOpen: Boolean,
  isEditing: Boolean,
  employeeData: Object,
  loading: Boolean
})

const emit = defineEmits(['close', 'save'])

const { swalError } = useSwal()

// State สำหรับแจ้งเตือน Error ของ Email
const emailError = ref('')

// Map สำหรับแปลง Role เป็น Position อัตโนมัติ
const roleToPositionMap = {
  'admin': 'ผู้ดูแลระบบ',
  'maid': 'แม่บ้าน',
  'user': 'พนักงานทั่วไป',
  'cleaner': 'พนักงานทำความสะอาด'
}

const form = ref({
  code: '',
  firstname: '',
  lastname: '',
  gender: '',
  department: '',
  role: 'maid',
  // ✅ 1. เพิ่ม State Status
  status: 'active',
  phone: '',
  email: '',
})

const isGeneratingCode = ref(false)

const resetForm = () => {
  form.value = {
    code: '',
    firstname: '',
    lastname: '',
    gender: '',
    department: '',
    role: 'maid',
    // ✅ 2. Reset Status เป็น active เสมอ
    status: 'active',
    phone: '',
    email: '',
  }
  emailError.value = ''
}

const generateNextCode = async () => {
  if (props.isEditing) return
  isGeneratingCode.value = true
  try {
    const { data } = await supabase
      .from('employees')
      .select('employees_code')
      .order('employees_id', { ascending: false })
      .limit(1)
      .single()

    let nextCode = '001'
    if (data && data.employees_code) {
      const currentNum = parseInt(data.employees_code, 10)
      if (!isNaN(currentNum)) {
        nextCode = String(currentNum + 1).padStart(3, '0')
      }
    }
    form.value.code = nextCode
  } catch (err) {
    form.value.code = '001'
  } finally {
    isGeneratingCode.value = false
  }
}

const handleEmailInput = (e) => {
  const value = e.target.value
  form.value.email = value
  if (/[A-Z]/.test(value)) {
    emailError.value = 'กรุณากรอกอีเมลด้วยตัวพิมพ์เล็ก (a-z) เท่านั้น'
  } else {
    emailError.value = ''
  }
}

watch(() => props.employeeData, async (newData) => {
  if (props.isEditing && newData) {
    form.value = {
      code: newData.employees_code,
      firstname: newData.employees_firstname,
      lastname: newData.employees_lastname,
      gender: newData.employees_gender || '',
      department: newData.employees_department || '',
      role: (newData.role || 'maid').toLowerCase(),
      // ✅ 3. โหลดค่า Status เดิมมาแสดง
      status: newData.employees_status || 'active',
      phone: newData.employees_phone ? newData.employees_phone.replace(/-/g, '') : '',
      email: newData.employees_email || newData.email,
    }
    emailError.value = ''
  }
}, { immediate: true })

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (!props.isEditing) {
      resetForm()
      generateNextCode()
    }
  }
})

const handlePhoneInput = (e) => {
  let value = e.target.value.replace(/\D/g, '').slice(0, 10)
  form.value.phone = value
}

const handleSubmit = async () => {
  if (!form.value.code) return swalError('ข้อผิดพลาด', 'ไม่พบรหัสพนักงาน')
  if (!form.value.firstname.trim()) return swalError('ข้อมูลไม่ครบ', 'กรุณากรอก ชื่อจริง')
  if (!form.value.lastname.trim()) return swalError('ข้อมูลไม่ครบ', 'กรุณากรอก นามสกุล')
  if (!form.value.gender) return swalError('ข้อมูลไม่ครบ', 'กรุณาเลือก เพศ')
  if (!form.value.department.trim()) return swalError('ข้อมูลไม่ครบ', 'กรุณาเลือก แผนก')
  if (!form.value.role) return swalError('ข้อมูลไม่ครบ', 'กรุณาเลือก บทบาท')
  if (!form.value.status) return swalError('ข้อมูลไม่ครบ', 'กรุณาเลือก สถานะ') // ✅ เช็ค Status
  if (!form.value.email.trim()) return swalError('ข้อมูลไม่ครบ', 'กรุณากรอก อีเมล')

  if (emailError.value) return swalError('ข้อมูลไม่ถูกต้อง', 'กรุณาแก้ไขรูปแบบอีเมลให้ถูกต้อง')

  if (!form.value.phone.trim()) return swalError('ข้อมูลไม่ครบ', 'กรุณากรอก เบอร์โทรศัพท์')
  if (form.value.phone.length !== 10) {
    return swalError('ข้อมูลไม่ถูกต้อง', 'เบอร์โทรศัพท์ต้องมี 10 หลักถ้วน')
  }

  const finalRole = form.value.role.toLowerCase()
  const finalPosition = roleToPositionMap[finalRole] || 'พนักงานทั่วไป'
  const formattedPhone = form.value.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')

  emit('save', {
    ...form.value,
    role: finalRole,
    position: finalPosition,
    phone: formattedPhone,
    status: form.value.status, // ✅ 4. ส่งค่า Status กลับไปบันทึก
    email: form.value.email.toLowerCase()
  })
}
</script>

<template>
  <div>
    <Teleport to="body">

      <div v-if="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans">

        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          @click="$emit('close')"
        ></div>

        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh] animate-fade-in-up border border-gray-100">

          <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl shrink-0">
            <h3 class="text-lg font-bold text-gray-800">
              {{ isEditing ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่' }}
            </h3>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 hover:bg-white rounded-full p-2 transition-all">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="overflow-y-auto p-6 custom-scrollbar">
            <form id="employeeForm" @submit.prevent="handleSubmit" class="space-y-4">

              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 uppercase flex justify-between">
                  รหัสพนักงาน (Auto) <span class="text-red-500">*</span>
                  <span v-if="isGeneratingCode" class="text-indigo-500 text-[10px] flex items-center gap-1">
                    <Loader2 class="w-3 h-3 animate-spin" /> ...
                  </span>
                </label>
                <div class="relative">
                  <input v-model="form.code" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600 font-mono font-bold focus:ring-0 cursor-not-allowed" placeholder="001" readonly>
                  <button type="button" v-if="!isEditing" @click="generateNextCode" class="absolute right-2 top-2 text-gray-400 hover:text-indigo-600 transition-colors" title="รันเลขใหม่">
                    <RefreshCw class="w-4 h-4" :class="{'animate-spin': isGeneratingCode}" />
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs font-bold text-gray-500 uppercase">ชื่อจริง <span class="text-red-500">*</span></label>
                  <input v-model="form.firstname" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="กรุณากรอกชื่อจริง">
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-bold text-gray-500 uppercase">นามสกุล <span class="text-red-500">*</span></label>
                  <input v-model="form.lastname" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="กรุณากรอกนามสกุล">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs font-bold text-gray-500 uppercase">เพศ <span class="text-red-500">*</span></label>
                  <select v-model="form.gender" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white transition-all">
                    <option value="" disabled>เลือกเพศ</option>
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-bold text-gray-500 uppercase">แผนก <span class="text-red-500">*</span></label>
                  <select v-model="form.department" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white transition-all">
                    <option value="" disabled>เลือกแผนก</option>
                    <option value="แผนกซ่อมบำรุง">แผนกซ่อมบำรุง</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs font-bold text-gray-500 uppercase">บทบาท (Role) <span class="text-red-500">*</span></label>
                  <select v-model="form.role" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white transition-all">
                    <option value="" disabled>เลือกบทบาท</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                    <option value="maid">Maid (แม่บ้าน)</option>
                    <option value="user">General Staff (พนักงานทั่วไป)</option>
                    <option value="cleaner">Cleaner (พนักงานทำความสะอาด)</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-bold text-gray-500 uppercase">สถานะ (Status) <span class="text-red-500">*</span></label>
                  <select v-model="form.status" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white transition-all">
                    <option value="active">ปกติ (Active)</option>
                    <option value="inactive">ไม่เคลื่อนไหว (Inactive)</option>
                    <option value="suspended">ระงับ (Suspended)</option>
                  </select>
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 uppercase">อีเมล <span class="text-red-500">*</span></label>
                <input
                  :value="form.email"
                  @input="handleEmailInput"
                  type="email"
                  class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none transition-all"
                  :class="emailError ? 'border-red-500 focus:ring-red-200 bg-red-50 text-red-900' : 'border-gray-300 focus:ring-indigo-500'"
                  placeholder="example@mail.com"
                >
                <p v-if="emailError" class="text-xs text-red-500 mt-1 font-medium animate-pulse">
                  {{ emailError }}
                </p>
              </div>

              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 uppercase">เบอร์โทร (10 หลัก) <span class="text-red-500">*</span></label>
                <input :value="form.phone" @input="handlePhoneInput" type="tel" inputmode="numeric" maxlength="10" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="0812345678">
              </div>

            </form>
          </div>

          <div class="p-4 border-t border-gray-100 flex gap-3 bg-gray-50/50 rounded-b-2xl shrink-0">
            <button type="button" @click="$emit('close')" class="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors bg-white">
              ยกเลิก
            </button>
            <button type="submit" form="employeeForm" :disabled="loading" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm shadow-indigo-200 flex justify-center items-center gap-2 transition-all disabled:opacity-70 active:scale-95">
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              <span>{{ isEditing ? 'บันทึก' : 'เพิ่มพนักงาน' }}</span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
