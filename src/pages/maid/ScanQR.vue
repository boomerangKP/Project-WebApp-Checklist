<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QrScanner from 'qr-scanner'
import { ArrowLeft, Flashlight } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const router = useRouter()
const videoElem = ref(null)
const scanner = ref(null)
const hasFlash = ref(false)
const isFlashOn = ref(false)

// ฟังก์ชันเมื่อสแกนเจอ
const onDecode = (result) => {
  // 1. รับค่าผลลัพธ์ (รองรับทั้งแบบ Object และ String เผื่อ Version ต่างกัน)
  const rawData = result?.data || result

  if (rawData) {
    console.log('⚡ Scanned:', rawData) // เช็คใน Console ว่าอ่านค่ามาไหม

    // 2. หยุดสแกนทันที
    if (scanner.value) {
      scanner.value.stop()
    }

    // 3. สั่นแจ้งเตือน
    if (navigator.vibrate) navigator.vibrate(200)

    // 4. ตัดเอาแค่ Token
    const token = rawData.includes('/scan/') ? rawData.split('/scan/')[1] : rawData

    // 5. ส่งไปหน้า Handler
    router.replace({ 
      name: 'scan-handler', 
      params: { token: token } 
    })
  }
}

const toggleFlash = async () => {
  if (scanner.value && hasFlash.value) {
    isFlashOn.value = !isFlashOn.value
    await scanner.value.toggleFlash()
  }
}

const goBack = () => {
  if (scanner.value) scanner.value.stop()
  router.back()
}

onMounted(async () => {
  try {
    // ตั้งค่า Scanner แบบเน้นประสิทธิภาพสูงสุด
    scanner.value = new QrScanner(
      videoElem.value,
      onDecode,
      {
        // ✅ สแกนทุก 100ms (เร็วมาก)
        maxScansPerSecond: 10, 
        
        // ✅ บังคับกล้องหลัง
        preferredCamera: 'environment',

        // ✅ ไม่ตีกรอบ (สแกนทั้งจอ) จะได้จับภาพง่ายขึ้น
        highlightScanRegion: false,
        highlightCodeOutline: true, 
        
        // ✅ รับค่าแบบละเอียด
        returnDetailedScanResult: true
      }
    )

    await scanner.value.start()
    hasFlash.value = await scanner.value.hasFlash()

  } catch (error) {
    console.error('Camera Error:', error)
    Swal.fire({
      icon: 'error',
      title: 'เปิดกล้องไม่ได้',
      text: 'กรุณาอนุญาตให้เข้าถึงกล้อง หรือลองเปลี่ยน Browser',
      confirmButtonText: 'กลับ'
    }).then(() => router.back())
  }
})

onUnmounted(() => {
  if (scanner.value) {
    scanner.value.destroy()
    scanner.value = null
  }
})
</script>

<template>
  <div class="fixed inset-0 bg-black z-50 flex flex-col">
    
    <div class="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-black/40 backdrop-blur-sm">
      <button @click="goBack" class="p-3 bg-white/10 rounded-full text-white">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-white font-bold text-lg">สแกน QR Code</h1>
      <button v-if="hasFlash" @click="toggleFlash" class="p-3 rounded-full" 
        :class="isFlashOn ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'">
        <Flashlight class="w-6 h-6" :class="{'fill-current': isFlashOn}" />
      </button>
      <div v-else class="w-12"></div>
    </div>

    <div class="flex-1 bg-black relative">
      <video ref="videoElem" class="w-full h-full object-cover"></video>

      <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div class="w-64 h-64 border-2 border-white/50 rounded-lg flex items-center justify-center">
          <div class="w-60 h-0.5 bg-red-500/50"></div>
        </div>
      </div>
      
      <p class="absolute bottom-10 left-0 right-0 text-center text-white/80 text-sm bg-black/50 py-2">
        ถือกล้องให้นิ่งและขยับเข้า-ออกเพื่อโฟกัส
      </p>
    </div>
  </div>
</template>

<style scoped>
.pt-safe {
  padding-top: max(1rem, env(safe-area-inset-top));
}
</style>