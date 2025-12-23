<script setup>
import { ref, watch } from 'vue'
import { Loader2, X, RefreshCw } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  isOpen: Boolean,
  isEditing: Boolean,
  employeeData: Object,
  loading: Boolean
})

const emit = defineEmits(['close', 'save'])

const form = ref({
  code: '',
  firstname: '',
  lastname: '',
  gender: '',
  department: '',
  position: 'แม่บ้าน',
  role: 'maid',
  phone: '',
  email: '',
})

const isGeneratingCode = ref(false)

// --- ฟังก์ชันล้างค่าในฟอร์ม (Reset) ---
const resetForm = () => {
  form.value = {
    code: '',
    firstname: '',
    lastname: '',
    gender: '',
    department: '',
    position: 'แม่บ้าน', // ค่าเริ่มต้น
    role: 'maid',       // ค่าเริ่มต้น
    phone: '',
    email: '',
  }
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

// Watch เมื่อมีการส่งข้อมูลพนักงานเข้ามา (ใช้ตอนกดแก้ไข)
watch(() => props.employeeData, async (newData) => {
  if (props.isEditing && newData) {
    form.value = {
      code: newData.employees_code,
      firstname: newData.employees_firstname,
      lastname: newData.employees_lastname,
      gender: newData.employees_gender || '',
      department: newData.employees_department || '',
      position: newData.employees_position || 'แม่บ้าน',
      role: newData.role || 'maid',
      phone: newData.employees_phone ? newData.employees_phone.replace(/-/g, '') : '',
      email: newData.employees_email || newData.email,
    }
  }
}, { immediate: true })

// Watch เมื่อเปิด/ปิด Modal (จุดสำคัญ: สั่ง Reset เมื่อเปิดหน้าเพิ่มใหม่)
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (!props.isEditing) {
      // ถ้าเปิดมาเพื่อ "เพิ่มใหม่" -> ล้างค่าเก่าทิ้ง แล้วเจนรหัสใหม่
      resetForm()
      generateNextCode()
    }
  }
})

const handlePhoneInput = (e) => {
  let value = e.target.value.replace(/\D/g, '').slice(0, 10)
  form.value.phone = value
}

const handleSubmit = () => {
  if (!form.value.code) return alert('ไม่พบรหัสพนักงาน')
  if (!form.value.firstname.trim()) return alert('กรุณากรอก ชื่อจริง')
  if (!form.value.lastname.trim()) return alert('กรุณากรอก นามสกุล')
  if (!form.value.gender) return alert('กรุณาเลือก เพศ')
  if (!form.value.department.trim()) return alert('กรุณาเลือก แผนก')
  if (!form.value.position) return alert('กรุณาเลือก ตำแหน่ง')
  if (!form.value.role) return alert('กรุณาเลือก บทบาท')
  if (!form.value.email.trim()) return alert('กรุณากรอก อีเมล')
  if (!form.value.phone.trim()) return alert('กรุณากรอก เบอร์โทรศัพท์')

  if (form.value.phone.length !== 10) {
    return alert('เบอร์โทรศัพท์ต้องมี 10 หลักถ้วน')
  }

  const formattedPhone = form.value.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')

  emit('save', {
    ...form.value,
    phone: formattedPhone
  })
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>

    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh] animate-fade-in-up">

      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
        <h3 class="text-lg font-bold text-gray-800">
          {{ isEditing ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่' }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="overflow-y-auto p-6">
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
              <button type="button" v-if="!isEditing" @click="generateNextCode" class="absolute right-2 top-2 text-gray-400 hover:text-indigo-600" title="รันเลขใหม่">
                <RefreshCw class="w-4 h-4" :class="{'animate-spin': isGeneratingCode}" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">ชื่อจริง <span class="text-red-500">*</span></label>
              <input v-model="form.firstname" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="กรุณากรอกชื่อจริง">
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">นามสกุล <span class="text-red-500">*</span></label>
              <input v-model="form.lastname" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="กรุณากรอกนามสกุล">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">เพศ <span class="text-red-500">*</span></label>
              <select v-model="form.gender" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white">
                <option value="" disabled>เลือกเพศ</option>
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">แผนก <span class="text-red-500">*</span></label>
              <select v-model="form.department" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white">
                <option value="" disabled>เลือกแผนก</option>
                <option value="แผนกซ่อมบำรุง">แผนกซ่อมบำรุง</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">ตำแหน่ง (แสดงผล) <span class="text-red-500">*</span></label>
              <select v-model="form.position" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white">
                <option value="" disabled>เลือกตำแหน่ง</option>
                <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ</option>
                <option value="แม่บ้าน">แม่บ้าน</option>
                <option value="พนักงานทั่วไป">พนักงานทั่วไป</option>
                <option value="พนักงานทำความสะอาด">พนักงานทำความสะอาด</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">บทบาท (สิทธิ์) <span class="text-red-500">*</span></label>
              <select v-model="form.role" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white">
                <option value="" disabled>เลือกบทบาท</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                <option value="maid">User (ผู้ใช้งานทั่วไป)</option>
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">อีเมล <span class="text-red-500">*</span></label>
            <input v-model="form.email" type="email" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="example@mail.com">
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">เบอร์โทร (10 หลัก) <span class="text-red-500">*</span></label>
            <input :value="form.phone" @input="handlePhoneInput" type="tel" inputmode="numeric" maxlength="10" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0812345678">
          </div>

        </form>
      </div>

      <div class="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-2xl shrink-0">
        <button type="button" @click="$emit('close')" class="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors">
          ยกเลิก
        </button>
        <button type="submit" form="employeeForm" :disabled="loading" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-70">
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <span>{{ isEditing ? 'บันทึก' : 'เพิ่มพนักงาน' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
