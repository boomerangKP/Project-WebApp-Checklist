<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, MapPin, Calendar, Clock,
  CheckCircle2, XCircle, AlertCircle, Loader2, User, FileText // ✅ เพิ่ม FileText
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const session = ref(null)
const results = ref([])

// --- Helper: แปลงวันที่ ---
const formatThaiDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' น.'
}

// --- Helper: เลือกสีตามสถานะ ---
const getStatusConfig = (status) => {
  switch (status) {
    case 'pass':
    case 'fixed':
    case 'approved':
      return { bg: 'bg-green-100 text-green-700', border: 'border-green-200', icon: CheckCircle2, text: 'ผ่านแล้ว' }
    case 'fail':
    case 'rejected':
      return { bg: 'bg-red-100 text-red-700', border: 'border-red-200', icon: AlertCircle, text: 'ต้องแก้ไข' }
    default:
      return { bg: 'bg-orange-100 text-orange-700', border: 'border-orange-200', icon: Clock, text: 'รอตรวจสอบ' }
  }
}

// --- Fetch Data ---
const fetchData = async () => {
  try {
    loading.value = true
    const sessionId = route.params.id

    const { data: sessionData, error: sessionError } = await supabase
      .from('check_sessions')
      .select(`*, locations(locations_name, locations_building, locations_floor), restroom_types(restroom_types_name)`)
      .eq('check_sessions_id', sessionId)
      .single()

    if (sessionError) throw sessionError
    session.value = sessionData

    const { data: resultData, error: resultError } = await supabase
      .from('check_results')
      .select(`*, check_items(check_items_name, check_items_description, check_items_order)`)
      .eq('check_sessions_id', sessionId)

    if (resultError) throw resultError
    results.value = resultData.sort((a, b) => a.check_items?.check_items_order - b.check_items?.check_items_order)

  } catch (err) {
    console.error(err)
    alert('ไม่พบข้อมูลงานนี้ หรือถูกลบไปแล้ว')
    router.back()
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-10">

    <div class="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
      <button @click="router.back()" class="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-lg font-bold text-gray-800">รายละเอียดงาน</h1>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center h-[60vh] text-gray-400 gap-2">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
      <span>กำลังโหลดข้อมูล...</span>
    </div>

    <main v-else class="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative overflow-hidden">
        <div class="absolute left-0 top-0 bottom-0 w-1.5" :class="getStatusConfig(session.check_sessions_status).bg.split(' ')[0].replace('bg-', 'bg-')"></div>

        <div class="flex justify-between items-start pl-2">
          <div>
            <h2 class="font-bold text-gray-800 text-xl leading-tight">{{ session.locations?.locations_name }}</h2>
            <div class="text-gray-500 text-sm mt-1 flex items-center gap-1">
               <MapPin class="w-3.5 h-3.5" />
               {{ session.locations?.locations_building }} ชั้น {{ session.locations?.locations_floor }}
            </div>
            <div class="text-indigo-600 text-sm font-medium mt-1">
               {{ session.restroom_types?.restroom_types_name }}
            </div>
          </div>

          <div class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border"
               :class="[getStatusConfig(session.check_sessions_status).bg, getStatusConfig(session.check_sessions_status).border]">
            <component :is="getStatusConfig(session.check_sessions_status).icon" class="w-4 h-4" />
            {{ getStatusConfig(session.check_sessions_status).text }}
          </div>
        </div>

        <div class="pt-4 border-t border-gray-100 flex flex-col gap-3 text-sm text-gray-500 pl-2">
          <div class="flex items-center gap-2">
            <Calendar class="w-4 h-4 text-gray-400" />
            <span>ส่งงานเมื่อ: <span class="text-gray-800 font-medium">{{ formatThaiDate(session.created_at) }}</span></span>
          </div>

          <div v-if="!['waiting', 'in_progress'].includes(session.check_sessions_status)"
               class="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg -ml-2 border border-green-100 w-fit">
             <CheckCircle2 class="w-4 h-4" />
             <span>ตรวจแล้วเมื่อ: <span class="font-bold">{{ formatThaiDate(session.updated_at) }}</span></span>
          </div>

          <div v-if="!['waiting', 'in_progress'].includes(session.check_sessions_status)" class="flex items-center gap-2">
             <User class="w-4 h-4 text-gray-400" />
             <span>ผู้ตรวจสอบ: <span class="text-gray-800 font-medium">หัวหน้างาน</span></span>
          </div>
        </div>
      </div>

      <div v-if="session.check_sessions_status === 'fail' || session.check_sessions_status === 'rejected' || session.supervisor_comment"
           class="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
        <div class="flex items-center gap-2 mb-2 text-red-700 font-bold">
           <AlertCircle class="w-5 h-5" />
           สิ่งที่ต้องแก้ไข / ความเห็นหัวหน้า
        </div>
        <p class="text-gray-700 text-sm bg-white p-3 rounded-xl border border-red-100">
           {{ session.supervisor_comment || 'ไม่ได้ระบุเหตุผล' }}
        </p>
      </div>

      <div class="space-y-3">
        <h3 class="font-bold text-gray-700 px-1 flex items-center justify-between">
           <span>ผลการตรวจสอบ</span>
           <span class="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-md">รวม {{ results.length }} รายการ</span>
        </h3>

        <div v-for="(item, index) in results" :key="item.check_results_id"
          class="bg-white p-4 rounded-xl shadow-sm border transition-all flex flex-col gap-3"
          :class="item.check_results_status === 'fail'
            ? 'border-red-300 ring-1 ring-red-100 bg-red-50/10'
            : 'border-gray-100'"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
               <div class="font-bold text-sm"
                    :class="item.check_results_status === 'fail' ? 'text-red-700' : 'text-gray-800'">
                  {{ index + 1 }}. {{ item.check_items?.check_items_name }}
               </div>
               <div class="text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {{ item.check_items?.check_items_description }}
               </div>
            </div>
            
            <div class="flex-shrink-0">
               <div v-if="['pass', 'fixed', '✓'].includes(item.check_results_status)"
                    class="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                  <CheckCircle2 class="w-4 h-4" />
                  <span class="text-xs font-bold">เรียบร้อย</span>
               </div>
               <div v-else
                    class="flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                  <XCircle class="w-4 h-4" />
                  <span class="text-xs font-bold">มีปัญหา</span>
               </div>
            </div>
          </div>

          <div v-if="item.check_results_detail" class="text-xs text-gray-600 bg-yellow-50 p-2.5 rounded-lg border border-yellow-100 flex items-start gap-2">
             <FileText class="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
             <div>
                <span class="font-bold text-yellow-700">หมายเหตุ:</span> {{ item.check_results_detail }}
             </div>
          </div>

        </div>
      </div>

    </main>
  </div>
</template>