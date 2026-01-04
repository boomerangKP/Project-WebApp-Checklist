<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { ArrowLeft, Flashlight, Camera } from 'lucide-vue-next'
import { useSwal } from '@/composables/useSwal' // ถ้ามีใช้ swal

const router = useRouter()
const { swalError } = useSwal()

// State
const hasPermission = ref(null) // null=unknown, true=yes, false=no
const isScanning = ref(true)
const cameraId = ref(null)

let html5QrCode = null

// ตั้งค่า QR Code
const config = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
  formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
}

// เริ่มต้นกล้อง
const startScanner = async () => {
  try {
    // 1. ขออนุญาตใช้กล้อง
    const devices = await Html5Qrcode.getCameras()

    if (devices && devices.length) {
      hasPermission.value = true
      // เลือกกล้องหลัง (ตัวสุดท้ายมักจะเป็นกล้องหลัง)
      cameraId.value = devices[devices.length - 1].id

      html5QrCode = new Html5Qrcode("qr-reader")

      await html5QrCode.start(
        { facingMode: "user" }, // บังคับใช้กล้องหลัง
        config,
        onScanSuccess,
        onScanFailure
      )
    } else {
      hasPermission.value = false
      swalError('ไม่พบกล้อง', 'อุปกรณ์นี้ไม่มีกล้อง หรือเบราว์เซอร์ไม่รองรับ')
    }
  } catch (err) {
    hasPermission.value = false
    console.error(err)
    swalError('เข้าถึงกล้องไม่ได้', 'กรุณากดอนุญาตให้ใช้งานกล้องในตั้งค่าของ Browser')
  }
}

// ✅ เมื่อสแกนสำเร็จ
const onScanSuccess = (decodedText, decodedResult) => {
  if (!isScanning.value) return

  // หยุดสแกนชั่วคราวกันเบิ้ล
  isScanning.value = false

  // เสียง Beep (ถ้าต้องการ)
  // const audio = new Audio('/beep.mp3'); audio.play();

  console.log(`Scan result: ${decodedText}`, decodedResult)

  // 👉 Logic การจัดการข้อมูล QR Code
  // สมมติว่า QR Code เก็บเป็น ID ของสถานที่ เช่น "LOC-101" หรือ JSON
  // ลูกพี่ต้องแก้ตรงนี้ให้ตรงกับข้อมูลใน QR Code จริงๆ

  // ตัวอย่าง: ส่ง ID ไปหน้า ManualEntry เพื่อบันทึกงาน
  // สมมติ decodedText คือ locations_id

  stopCamera().then(() => {
    router.push({
      name: 'maid-manual', // ชื่อ Route หน้าบันทึกงาน
      query: { locationId: decodedText } // ส่งค่าไปทาง Query
    })
  })
}

const onScanFailure = (error) => {
  // ไม่ต้องทำอะไร ปล่อยผ่าน (มันจะ error ถ้ารูปไม่ชัด)
  // console.warn(`Scan error = ${error}`);
}

const stopCamera = async () => {
  if (html5QrCode && html5QrCode.isScanning) {
    await html5QrCode.stop()
    html5QrCode.clear()
  }
}

onMounted(() => {
  startScanner()
})

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div class="min-h-screen bg-black flex flex-col relative overflow-hidden">

    <div class="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
      <button @click="router.back()" class="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-white font-bold text-lg tracking-wide drop-shadow-md">สแกน QR Code</h1>
      <div class="w-10"></div> </div>

    <div class="flex-1 relative flex items-center justify-center bg-gray-900">

      <div id="qr-reader" class="w-full h-full object-cover"></div>

      <div v-if="hasPermission" class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 mask-overlay"></div>

        <div class="relative w-64 h-64 border-2 border-transparent">
          <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
          <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
          <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
          <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>

          <div class="absolute top-0 left-0 w-full h-1 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,1)] animate-scan"></div>
        </div>

        <p class="absolute mt-80 text-white/80 text-sm font-medium bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-sm">
          วาง QR Code ให้ตรงกรอบ
        </p>
      </div>

      <div v-if="hasPermission === false" class="absolute inset-0 z-30 flex flex-col items-center justify-center text-white bg-gray-900 p-6 text-center">
        <Camera class="w-16 h-16 text-gray-500 mb-4" />
        <h3 class="text-xl font-bold mb-2">เปิดกล้องไม่ได้</h3>
        <p class="text-gray-400 mb-6">กรุณาอนุญาตให้แอปเข้าถึงกล้องถ่ายรูปในตั้งค่าของเบราว์เซอร์</p>
        <button @click="router.back()" class="bg-indigo-600 px-6 py-2 rounded-lg text-white font-bold">กลับหน้าหลัก</button>
      </div>

    </div>

  </div>
</template>

<style scoped>
/* CSS ซ่อน UI ของ Library html5-qrcode ที่เราไม่ต้องการ */
:deep(#qr-reader) {
  border: none !important;
}
:deep(#qr-reader video) {
  object-fit: cover;
  width: 100% !important;
  height: 100% !important;
  border-radius: 0;
}

/* Animation เส้นสแกน */
@keyframes scan {
  0% { top: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
.animate-scan {
  animation: scan 2s linear infinite;
}

/* Mask เจาะรูตรงกลาง */
.mask-overlay {
  /* ใช้ clip-path หรือ box-shadow เพื่อเจาะรู */
  /* วิธีง่ายสุด: ใช้ box-shadow ขนาดใหญ่มากเพื่อบังส่วนนอก */
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}
</style>
