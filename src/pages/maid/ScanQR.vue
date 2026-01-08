<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { ArrowLeft, Camera, AlertCircle } from 'lucide-vue-next'
import { useSwal } from '@/composables/useSwal'

const router = useRouter()
const { swalError } = useSwal()

// State
const hasPermission = ref(null)
const isScanning = ref(true)
const errorMessage = ref('')
let html5QrCode = null

// ✅ Config: คำนวณ qrbox ตามขนาดหน้าจอ
const getQrBoxSize = (viewfinderWidth, viewfinderHeight) => {
  const minEdgePercentage = 0.70;
  const minSize = Math.min(viewfinderWidth, viewfinderHeight);
  const boxSize = Math.floor(minSize * minEdgePercentage);
  return { width: boxSize, height: boxSize };
}

const config = {
  fps: 10,
  qrbox: getQrBoxSize,
  formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
  aspectRatio: undefined
}

// 🔥 แก้ไขฟังก์ชันนี้: เปลี่ยนวิธีเรียกกล้อง
const startScanner = async () => {
  try {
    // เช็คก่อนว่ามีกล้องไหม (แต่ยังไม่ต้องเลือก ID)
    const devices = await Html5Qrcode.getCameras()

    if (devices && devices.length) {
      hasPermission.value = true
      html5QrCode = new Html5Qrcode("qr-reader")

      // ✅ วิธีแก้: ไม่ต้องหา ID จากชื่อแล้ว ให้ใช้ Config บังคับ "กล้องหลัง" (environment) เลย
      // แบบนี้ชัวร์กว่าสำหรับมือถือครับ
      const cameraConfig = { facingMode: "environment" };

      // เริ่มสแกน
      await html5QrCode.start(
        cameraConfig, // ส่ง object นี้ไปแทน ID
        config,
        onScanSuccess,
        onScanFailure
      )

    } else {
      hasPermission.value = false
      errorMessage.value = 'ไม่พบกล้องในอุปกรณ์นี้'
      swalError('ไม่พบกล้อง', 'อุปกรณ์นี้ไม่มีกล้อง')
    }
  } catch (err) {
    hasPermission.value = false
    errorMessage.value = 'กรุณาอนุญาตการเข้าถึงกล้อง'
    console.error(err)
  }
}

const onScanSuccess = (decodedText, decodedResult) => {
  if (!isScanning.value) return
  isScanning.value = false

  if (navigator.vibrate) navigator.vibrate(200);

  let token = decodedText;

  if (decodedText.includes('/scan/')) {
    const parts = decodedText.split('/scan/');
    if (parts.length > 1) {
      token = parts[1];
    }
  }

  stopCamera().then(() => {
    console.log(`Scan Token: ${token}`)
    router.push({
      name: 'scan-handler',
      params: { token: token }
    })
  })
}

const onScanFailure = (error) => {
  // console.warn(error)
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
  <div class="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">

    <div class="absolute top-0 left-0 right-0 p-4 pt-safe z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
      <button @click="router.back()" class="p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 transition-all">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-white font-bold text-lg drop-shadow-md">สแกน QR Code</h1>
      <div class="w-12"></div>
    </div>

    <div class="flex-1 relative bg-black w-full h-full">

      <div id="qr-reader"></div>

      <div v-if="hasPermission" class="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">

        <div class="relative z-10 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
             :style="{ width: '70vw', height: '70vw', maxWidth: '300px', maxHeight: '300px' }">

          <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl"></div>
          <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl"></div>
          <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl"></div>
          <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl"></div>

          <div class="absolute top-0 left-0 w-full h-0.5 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)] animate-scan"></div>
        </div>

        <p class="relative z-20 mt-8 text-white/90 text-sm font-medium bg-black/60 px-6 py-2 rounded-full backdrop-blur-md border border-white/10">
          วาง QR Code ในกรอบ
        </p>
      </div>

      <div v-if="hasPermission === false" class="absolute inset-0 z-30 flex flex-col items-center justify-center text-white bg-gray-900 p-8 text-center">
        <div class="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <AlertCircle class="w-10 h-10 text-red-500" />
        </div>
        <h3 class="text-xl font-bold mb-2">เข้าถึงกล้องไม่ได้</h3>
        <p class="text-gray-400 mb-8">{{ errorMessage }}</p>
        <button @click="router.back()" class="bg-indigo-600 px-8 py-3 rounded-xl text-white font-bold w-full max-w-xs">
          กลับหน้าหลัก
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
:deep(#qr-reader) {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  position: absolute;
  top: 0;
  left: 0;
}

:deep(#qr-reader video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

:deep(#qr-reader__dashboard_section_csr),
:deep(#qr-reader__dashboard_section_swaplink) {
  display: none !important;
}

.pt-safe {
  padding-top: max(1rem, env(safe-area-inset-top));
}

@keyframes scan {
  0% { top: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
.animate-scan {
  animation: scan 2s ease-in-out infinite;
}
</style>
