<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  Save
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

// --- State ---
const loading = ref(true)
const submitting = ref(false)

// ตัวเลือก Dropdown
const locations = ref([])
const restroomTypes = ref([])

// ค่าที่เลือก (Form Data)
const selectedLocation = ref('')
const selectedType = ref('')

// รายการ Checklist (ดึงจาก DB)
const checkListItems = ref([])

// วันที่และเวลา (Auto Display)
const currentDate = new Date().toLocaleDateString('th-TH', {
  year: 'numeric', month: 'long', day: 'numeric'
})
const currentTime = ref(new Date().toLocaleTimeString('th-TH', {
  hour: '2-digit', minute: '2-digit'
}))

// --- Fetch Data ---
const fetchInitialData = async () => {
  try {
    loading.value = true

    // 1. ดึงรายการสถานที่ (Locations)
    const { data: locs } = await supabase
      .from('locations')
      .select('locations_id, locations_name, locations_building, locations_floor')
      .eq('locations_status', 'active')
      .order('locations_name')
    locations.value = locs || []

    // 2. ดึงประเภทห้องน้ำ (Restroom Types)
    const { data: types } = await supabase
      .from('restroom_types')
      .select('*')
      .eq('restroom_types_status', 'active')
    restroomTypes.value = types || []

    // 3. ดึง Checklist 9 รายการ
    const { data: items } = await supabase
      .from('check_items')
      .select('*')
      .eq('check_items_status', 'active')
      .order('check_items_order') // เรียงตามลำดับ 1-9

    // แปลงข้อมูลเพื่อใช้ในหน้าเว็บ (เพิ่ม status = 'pass' เป็นค่าเริ่มต้น)
    checkListItems.value = items.map(item => ({
      ...item,
      status: 'pass', // default ให้ผ่านหมดก่อน เพื่อความเร็วแม่บ้าน
      photo: null     // (อนาคต) เก็บไฟล์รูป
    }))

  } catch (error) {
    console.error('Error loading data:', error)
    alert('โหลดข้อมูลล้มเหลว กรุณาลองใหม่')
  } finally {
    loading.value = false
  }
}

// --- Actions ---
const toggleStatus = (index) => {
  // สลับสถานะ: pass -> fail -> pass
  const current = checkListItems.value[index].status
  checkListItems.value[index].status = current === 'pass' ? 'fail' : 'pass'
}

const triggerCamera = (index) => {
  alert(`เปิดกล้องสำหรับรายการ: ${checkListItems.value[index].check_items_name} \n(ฟีเจอร์นี้จะมาในเฟสถัดไป)`)
}

const submitWork = async () => {
  // Validations
  if (!selectedLocation.value) return alert('กรุณาเลือกสถานที่ / ตึก / ชั้น')
  if (!selectedType.value) return alert('กรุณาเลือกประเภทห้องน้ำ')

  if (!confirm('ยืนยันการส่งงาน?')) return

  try {
    submitting.value = true

    // 1. สร้าง Session หลัก (Header)
    const sessionData = {
      locations_id: selectedLocation.value,
      restroom_types_id: selectedType.value,
      employees_id: userStore.profile.employees_id,
      check_sessions_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      check_sessions_time_start: new Date().toLocaleTimeString('en-GB'), // HH:mm:ss
      check_sessions_status: checkListItems.value.some(i => i.status === 'fail') ? 'fail' : 'pass'
    }

    const { data: session, error: sessionError } = await supabase
      .from('check_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (sessionError) throw sessionError

    // 2. สร้าง Results ย่อย 9 รายการ (Details)
    const resultsData = checkListItems.value.map(item => ({
      check_sessions_id: session.check_sessions_id,
      check_items_id: item.check_items_id,
      check_results_status: item.status,
      // check_results_photo: item.photo (อนาคต)
    }))

    const { error: resultsError } = await supabase
      .from('check_results')
      .insert(resultsData)

    if (resultsError) throw resultsError

    // 3. สำเร็จ!
    alert('บันทึกงานเรียบร้อย!')
    router.replace('/maid/home')

  } catch (err) {
    console.error('Submit error:', err)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchInitialData()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">

    <header class="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
      <button @click="router.back()" class="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-lg font-bold text-gray-800">บันทึกงาน (Manual)</h1>
    </header>

    <div v-if="loading" class="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
      <span>กำลังดึงรายการ...</span>
    </div>

    <main v-else class="p-4 space-y-6">

      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 class="font-bold text-gray-800 flex items-center gap-2">
          <MapPin class="w-5 h-5 text-indigo-500" />
          ระบุสถานที่ปฏิบัติงาน
        </h2>

        <div class="space-y-1">
          <label class="text-sm text-gray-500">อาคาร / ชั้น</label>
          <div class="relative">
            <select
              v-model="selectedLocation"
              class="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            >
              <option value="" disabled>-- กรุณาเลือกสถานที่ --</option>
              <option v-for="loc in locations" :key="loc.locations_id" :value="loc.locations_id">
                {{ loc.locations_name }} ({{ loc.locations_building }} ชั้น {{ loc.locations_floor }})
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-sm text-gray-500">ประเภทห้องน้ำ</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="type in restroomTypes"
              :key="type.restroom_types_id"
              @click="selectedType = type.restroom_types_id"
              class="py-2 px-4 rounded-xl border transition-all text-sm font-medium"
              :class="selectedType === type.restroom_types_id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
            >
              {{ type.restroom_types_name }}
            </button>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center gap-1">
            <Calendar class="w-4 h-4" /> {{ currentDate }}
          </div>
          <div class="flex items-center gap-1">
            <Clock class="w-4 h-4" /> {{ currentTime }}
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="font-bold text-gray-700 px-1">รายการตรวจสอบ ({{ checkListItems.length }})</h3>

        <div
          v-for="(item, index) in checkListItems"
          :key="item.check_items_id"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 transition-all"
          :class="item.status === 'fail' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'"
        >
          <div class="flex-1">
            <div class="font-bold text-gray-800 text-lg">{{ index + 1 }}. {{ item.check_items_name }}</div>
            <div class="text-sm text-gray-500 mt-1 leading-relaxed">{{ item.check_items_description }}</div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-gray-50">

            <button
              @click="toggleStatus(index)"
              class="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition-all active:scale-95"
              :class="item.status === 'pass'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'"
            >
              <component :is="item.status === 'pass' ? CheckCircle2 : XCircle" class="w-5 h-5" />
              <span class="font-bold">{{ item.status === 'pass' ? 'เรียบร้อย' : 'มีปัญหา' }}</span>
            </button>

            <button
              @click="triggerCamera(index)"
              class="ml-3 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 active:scale-95 transition-colors"
            >
              <Camera class="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

    </main>

    <div class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-20">
      <button
        @click="submitWork"
        :disabled="submitting || loading"
        class="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-2xl shadow-green-200 shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Loader2 v-if="submitting" class="w-6 h-6 animate-spin" />
        <Save v-else class="w-6 h-6" />
        {{ submitting ? 'กำลังส่งข้อมูล...' : 'ส่งงาน (Submit Task)' }}
      </button>
    </div>

  </div>
</template>
