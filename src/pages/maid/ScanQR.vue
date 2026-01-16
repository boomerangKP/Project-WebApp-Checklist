<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QrScanner from 'qr-scanner' // ✅ ใช้ตัวใหม่ เร็วแรง
import { ArrowLeft, Flashlight, ScanLine, AlertCircle } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const router = useRouter()
const videoElem = ref(null) // อ้างอิง element video
const scanner = ref(null)   // ตัวแปรเก็บ object scanner
const hasFlash = ref(false) // เครื่องมีไฟฉายไหม
const isFlashOn = ref(false) // ไฟฉายเปิดอยู่ไหม
const errorMessage = ref('')
const hasPermission = ref(true)

// ฟังก์ชันเมื่อสแกนเจอ
const onDecode = (result) => {
  if (result && result.data) {
    // 1. หยุดสแกนทันที
    if (scanner.value) {
      scanner.value.stop()
    }

    // 2. สั่นตอบสนอง (ถ้าเครื่องรองรับ)
    if (navigator.vibrate) navigator.vibrate(200)

    // 3. ดึง Token ออกจาก URL
    const rawData = result.data
    // รองรับทั้ง link เต็ม (https://.../scan/xyz) และ token เพียวๆ (xyz)
    const token = rawData.includes('/scan/') ? rawData.split('/scan/')[1] : rawData

    console.log('Scanned Token:', token)

    // 4. ส่งไปหน้า Handler
    router.replace({ 
      name: 'scan-handler', 
      params: { token: token } 
    })
  }
}

// ฟังก์ชันเปิด/ปิดไฟฉาย
const toggleFlash = async () => {
  if (scanner.value && hasFlash.value) {
    isFlashOn.value = !isFlashOn.value
    await scanner.value.toggleFlash()
  }
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  try {
    // เริ่มต้น Scanner
    scanner.value = new QrScanner(
      videoElem.value,
      onDecode,
      {
        onDecodeError: (error) => { /* ไม่ต้องทำอะไรถ้าสแกนไม่เจอ */ },
        highlightScanRegion: true,     // ไฮไลท์กรอบสแกน (ช่วยเรื่อง UX)
        highlightCodeOutline: true,    // วาดเส้นรอบ QR (ช่วยเรื่อง UX)
        maxScansPerSecond: 25,         // เร่งความเร็วการจับภาพ (ทำให้รู้สึกลื่น)
        returnDetailedScanResult: true // ขอข้อมูลละเอียด
      }
    )

    // สั่งเปิดกล้อง
    await scanner.value.start()

    // เช็คว่ามีไฟฉายไหม (ต้องทำหลัง start แล้ว)
    hasFlash.value = await scanner.value.hasFlash()
    hasPermission.value = true

  } catch (error) {
    console.error('Camera Error:', error)
    hasPermission.value = false
    errorMessage.value = 'ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตใน Browser'
    
    // ถ้าเป็นบนมือถือบางทีต้องรอนิดนึง
    if (error.name === 'NotAllowedError') {
       errorMessage.value = 'คุณปิดกั้นการเข้าถึงกล้อง กรุณากดอนุญาต'
    }
  }
})

onUnmounted(() => {
  // สำคัญ: ต้องทำลาย Scanner ทิ้งเมื่อเปลี่ยนหน้า
  if (scanner.value) {
    scanner.value.destroy()
    scanner.value = null
  }
})
</script>

<template>
  <div class="fixed inset-0 bg-black flex flex-col z-50">
    
    <div class="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
      <button @click="goBack" class="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-white font-medium text-lg tracking-wide drop-shadow-md">สแกนจุดตรวจ</h1>
      
      <button v-if="hasFlash" @click="toggleFlash" 
        class="p-3 rounded-full transition-all border border-white/10"
        :class="isFlashOn ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-white/10 text-white backdrop-blur-md'"
      >
        <Flashlight class="w-6 h-6" :class="{'fill-current': isFlashOn}" />
      </button>
      <div v-else class="w-12"></div> </div>

    <div class="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
      
      <video ref="videoElem" class="w-full h-full object-cover"></video>

      <div v-if="hasPermission" class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div class="relative w-72 h-72 border-2 border-white/20 rounded-3xl overflow-hidden">
          
          <div class="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl"></div>
          <div class="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl"></div>
          <div class="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl"></div>
          <div class="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl"></div>
          
          <div class="absolute inset-x-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-scan-line"></div>
        </div>

        <div class="absolute bottom-20 left-0 right-0 text-center">
          <p class="inline-flex items-center gap-2 text-white/90 text-sm bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
            <ScanLine class="w-4 h-4" /> วาง QR Code ในกรอบ
          </p>
        </div>
      </div>

      <div v-else class="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center z-30">
        <div class="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <AlertCircle class="w-10 h-10 text-red-500" />
        </div>
        <h3 class="text-xl font-bold mb-2">เข้าถึงกล้องไม่ได้</h3>
        <p class="text-gray-400 mb-8">{{ errorMessage }}</p>
        <button @click="goBack" class="bg-indigo-600 px-8 py-3 rounded-xl text-white font-bold w-full max-w-xs shadow-lg shadow-indigo-500/30">
          กลับหน้าหลัก
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Animation เส้นสแกน */
@keyframes scan-line {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.animate-scan-line {
  animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* รองรับ Safe Area ของ iPhone (ติ่งหน้าจอ) */
.pt-safe {
  padding-top: max(1rem, env(safe-area-inset-top));
}
</style>