<script setup>
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle } from 'lucide-vue-next'

defineProps({
  showConfirm: Boolean,
  showSuccess: Boolean,
  showWarning: Boolean,     // รับค่าเปิดกล่องแดง
  warningMessage: String,   // ข้อความแจ้งเตือน
  locationName: String,
  typeName: String,
  stats: Object
})

const emit = defineEmits(['closeConfirm', 'confirmSubmit', 'finish', 'closeWarning'])
</script>

<template>
  <div>
    <div v-if="showWarning" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl w-[80%] max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="p-6 text-center">
          <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
             <AlertCircle class="w-8 h-8 text-red-500" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">ข้อมูลไม่ครบถ้วน</h3>
          <p class="text-gray-500 mb-6 text-sm">{{ warningMessage }}</p>
          <button @click="emit('closeWarning')" class="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
             ตกลง
          </button>
        </div>
      </div>
    </div>

    <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl w-[90%] max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="p-6 text-center">
          <div class="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
             <AlertTriangle class="w-8 h-8 text-yellow-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-4">ยืนยันการส่งงาน?</h3>
          
          <div class="bg-gray-50 rounded-2xl p-5 text-left space-y-3 text-sm mb-6 border border-gray-100">
             <div class="flex justify-between items-start gap-4">
                <span class="text-gray-500 whitespace-nowrap">สถานที่:</span> 
                <span class="font-bold text-gray-800 text-right leading-tight">{{ locationName }}</span>
             </div>
             <div class="flex justify-between items-center gap-4">
                <span class="text-gray-500 whitespace-nowrap">ประเภท:</span> 
                <span class="font-bold text-gray-800 text-right">{{ typeName }}</span>
             </div>
             <div class="my-2 border-t border-gray-200"></div>
             <div class="flex justify-between items-center">
                <span class="text-gray-500">สรุปผลตรวจ:</span>
                <div class="flex gap-3 font-bold text-base">
                   <span class="text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                      <CheckCircle2 class="w-4 h-4"/> {{ stats.pass }} ผ่าน
                   </span>
                   <span v-if="stats.fail > 0" class="text-red-500 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                      <XCircle class="w-4 h-4"/> {{ stats.fail }} แก้ไข
                   </span>
                </div>
             </div>
          </div>

          <div class="flex gap-3">
             <button @click="emit('closeConfirm')" class="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors">ยกเลิก</button>
             <button @click="emit('confirmSubmit')" class="flex-1 py-3.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95">ยืนยันส่งงาน</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl w-[90%] max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="p-8 text-center">
          <div class="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
             <CheckCircle2 class="w-12 h-12 text-green-600" />
          </div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">บันทึกสำเร็จ!</h3>
          <p class="text-gray-500 mb-8 leading-relaxed">ขอบคุณสำหรับการปฏิบัติงาน<br>ข้อมูลถูกส่งเข้าระบบเรียบร้อยแล้ว</p>
          <button @click="emit('finish')" class="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800 shadow-xl transition-all active:scale-95">
             ตกลง (กลับหน้าหลัก)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>