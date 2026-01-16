<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const debugLog = ref('รอเริ่มการทำงาน...') // ตัวแปรเก็บ Log ไว้โชว์หน้าจอ
const errorMsg = ref('')

// ฟังก์ชันวาดกรอบสีเขียวๆ เวลาเจอ QR Code (จะได้รู้ว่ามันมองเห็นไหม)
const paintBoundingBox = (detectedCodes, ctx) => {
  for (const detectedCode of detectedCodes) {
    const { boundingBox: { x, y, width, height } } = detectedCode
    ctx.lineWidth = 5
    ctx.strokeStyle = '#00ff00' // สีเขียว
    ctx.strokeRect(x, y, width, height)
  }
}

// เมื่อสแกนเจอ
const onDetect = (detectedCodes) => {
  const result = detectedCodes[0]?.rawValue
  if (result) {
    debugLog.value = `เจอแล้ว! ข้อมูล: ${result}` // ขึ้นบอกหน้าจอเลย
    
    // สั่นเตือน
    if (navigator.vibrate) navigator.vibrate(200)

    // ตัด Token
    const token = result.includes('/scan/') ? result.split('/scan/')[1] : result
    
    // หน่วงเวลานิดนึงให้พี่เห็นข้อความว่าเจอแล้ว ก่อนดีดไปหน้าอื่น
    setTimeout(() => {
      router.replace({ name: 'scan-handler', params: { token: token } })
    }, 500)
  }
}

// ฟังก์ชันเช็ค Error (สำคัญมาก! มันจะบอกว่าทำไมเงียบ)
const onError = (error) => {
  const errName = error.name
  let thMsg = ''

  if (errName === 'NotAllowedError') thMsg = 'คุณกดไม่อนุญาตให้ใช้กล้อง (Block)'
  else if (errName === 'NotFoundError') thMsg = 'ไม่พบกล้องในเครื่อง'
  else if (errName === 'NotSupportedError') thMsg = 'เว็บนี้ต้องเปิดผ่าน HTTPS เท่านั้น (Secure Context)'
  else if (errName === 'NotReadableError') thMsg = 'กล้องพัง หรือมีแอปอื่นใช้อยู่'
  else if (errName === 'StreamApiNotSupportedError') thMsg = 'Browser นี้ไม่รองรับการสแกน'
  else thMsg = error.message

  debugLog.value = `ERROR: ${errName}`
  errorMsg.value = thMsg
}

const onCameraReady = () => {
  debugLog.value = 'กล้องพร้อมใช้งาน... กรุณาจ่อ QR Code'
}
</script>

<template>
  <div class="fixed inset-0 bg-black z-50 flex flex-col">
    
    <button @click="router.back()" class="absolute top-4 left-4 z-20 p-3 bg-black/50 rounded-full text-white">
      <ArrowLeft class="w-8 h-8" />
    </button>

    <div class="flex-1 bg-gray-900 relative flex flex-col justify-center">
      
      <qrcode-stream 
        @detect="onDetect" 
        @error="onError"
        @camera-on="onCameraReady"
        :track="paintBoundingBox"
        class="w-full h-full"
      >
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div v-if="errorMsg" class="bg-red-600 text-white p-6 rounded-xl text-center mx-4">
             <h2 class="text-xl font-bold mb-2">ใช้งานไม่ได้</h2>
             <p>{{ errorMsg }}</p>
             <p class="text-sm mt-2 opacity-80">({{ debugLog }})</p>
           </div>
        </div>
      </qrcode-stream>

      <div class="absolute bottom-0 left-0 right-0 bg-white p-4 z-30">
        <p class="font-bold text-red-600">สถานะระบบ:</p>
        <p class="text-gray-800 break-words font-mono text-sm">{{ debugLog }}</p>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
/* สำคัญ: บังคับให้เห็นภาพทั้งหมด ไม่มีการ Crop (ยอมมีขอบดำดีกว่าสแกนไม่ติด) */
:deep(video) {
  object-fit: contain !important;
}
</style>