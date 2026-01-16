<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader' // ✅ พระเอกตัวจริง
import { ArrowLeft, Flashlight } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const router = useRouter()
const torchActive = ref(false) // สถานะไฟฉาย
const cameraReady = ref(false) // เช็คว่ากล้องพร้อมหรือยัง

// ฟังก์ชันเมื่อสแกนเจอ (Library นี้ส่งค่ามาเป็น Array อัตโนมัติ)
const onDetect = (detectedCodes) => {
  // เอาค่าแรกที่เจอ
  const result = detectedCodes[0]?.rawValue

  if (result) {
    // 1. สั่นแจ้งเตือน
    if (navigator.vibrate) navigator.vibrate(200)

    // 2. ตัด Token (เผื่อมาเป็น Link)
    const token = result.includes('/scan/') ? result.split('/scan/')[1] : result

    // 3. ไปหน้าตรวจสอบทันที (ไม่ต้อง pause เพราะเดี๋ยว component ถูกทำลายเอง)
    router.replace({ 
      name: 'scan-handler', 
      params: { token: token } 
    })
  }
}

// จัดการ Error (ใช้ Swal ตามที่ขอ)
const onError = (error) => {
  let msg = 'ไม่สามารถใช้งานกล้องได้'
  
  if (error.name === 'NotAllowedError') {
    msg = 'กรุณากด "อนุญาต" เพื่อให้แอปใช้กล้องถ่ายรูป'
  } else if (error.name === 'NotFoundError') {
    msg = 'ไม่พบกล้องในอุปกรณ์นี้'
  } else if (error.name === 'NotSupportedError') {
    msg = 'ต้องใช้งานผ่าน HTTPS เท่านั้น'
  } else if (error.name === 'NotReadableError') {
    msg = 'กล้องถูกใช้งานโดยแอปอื่นอยู่'
  } else if (error.name === 'OverconstrainedError') {
    msg = 'กล้องไม่รองรับความละเอียดที่ต้องการ'
  }

  Swal.fire({
    icon: 'error',
    title: 'เกิดข้อผิดพลาด',
    text: msg,
    confirmButtonText: 'กลับ',
    allowOutsideClick: false
  }).then(() => {
    router.back()
  })
}

const onCameraReady = () => {
  cameraReady.value = true
}
</script>

<template>
  <div class="fixed inset-0 bg-black z-50 flex flex-col">
    
    <div class="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-black/40 backdrop-blur-sm">
      <button @click="router.back()" class="p-3 bg-white/10 rounded-full text-white">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-white font-bold text-lg">สแกน QR Code</h1>
      
      <button :disabled="!cameraReady" @click="torchActive = !torchActive" class="p-3 rounded-full transition-all" 
        :class="torchActive ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'">
        <Flashlight class="w-6 h-6" :class="{'fill-current': torchActive}" />
      </button>
    </div>

    <div class="flex-1 bg-black relative overflow-hidden">
      
      <qrcode-stream 
        @detect="onDetect" 
        @error="onError"
        @camera-on="onCameraReady"
        :torch="torchActive"
        class="w-full h-full"
      >
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div class="w-64 h-64 border-2 border-red-500/80 rounded-xl relative">
              <div class="absolute inset-x-0 h-0.5 bg-red-500 top-1/2 -translate-y-1/2 animate-pulse"></div>
           </div>
        </div>
        
        <div class="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
           <p class="text-white/80 text-sm bg-black/50 inline-block px-4 py-2 rounded-lg backdrop-blur-md">
             ถือกล้องให้นิ่ง เพื่อโฟกัส
           </p>
        </div>

      </qrcode-stream>
      
    </div>
  </div>
</template>

<style scoped>
.pt-safe {
  padding-top: max(1rem, env(safe-area-inset-top));
}
</style>