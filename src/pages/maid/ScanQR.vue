<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { ArrowLeft, RefreshCw } from 'lucide-vue-next';
import Swal from 'sweetalert2';

const router = useRouter();
const videoRef = ref(null);
const codeReader = new BrowserMultiFormatReader();
const isScanning = ref(true);
const statusMsg = ref('กำลังเตรียมกล้อง...');

// ฟังก์ชันเริ่มทำงาน
const startScan = async () => {
  try {
    statusMsg.value = 'กำลังค้นหากล้อง...';
    
    // 1. ดึงรายการกล้อง
    const videoInputDevices = await codeReader.listVideoInputDevices();
    
    if (videoInputDevices.length === 0) {
      throw new Error('NotFound');
    }

    // 2. เลือกกล้องหลัง (Priority: Back > Environment > Rear > ตัวสุดท้าย)
    let selectedDeviceId = videoInputDevices[0].deviceId; 

    const backCamera = videoInputDevices.find(device => 
      device.label.toLowerCase().includes('back') || 
      device.label.toLowerCase().includes('environment') ||
      device.label.toLowerCase().includes('rear')
    );

    if (backCamera) {
      selectedDeviceId = backCamera.deviceId;
    } else if (videoInputDevices.length > 1) {
      selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
    }

    statusMsg.value = 'กำลังเปิดกล้อง...';

    // 3. เริ่มสแกน
    await codeReader.decodeFromVideoDevice(
      selectedDeviceId,
      videoRef.value,
      (result, err) => {
        if (result && isScanning.value) {
          handleResult(result.getText());
        }
        // Error ยิบย่อยตอนกำลังสแกน (เช่นภาพเบลอ) ปล่อยผ่าน
      }
    );
    
    statusMsg.value = 'พร้อมสแกน';

  } catch (err) {
    handleError(err);
  }
};

const handleResult = (text) => {
  isScanning.value = false; // หยุดการทำงานซ้ำ
  
  // สั่นแจ้งเตือน
  if (navigator.vibrate) navigator.vibrate(200);

  // ตัด Token
  let token = text;
  if (text.includes('/scan/')) {
    token = text.split('/scan/')[1];
  }

  // ส่งไปหน้าตรวจสอบ (scan-handler)
  router.replace({ 
    name: 'scan-handler', 
    params: { token: token } 
  });
};

const handleError = (err) => {
  let msg = err.message;
  let title = 'ไม่สามารถเปิดกล้องได้';
  
  // แปลงข้อความ Error ให้ User เข้าใจง่าย
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    msg = 'กรุณากดอนุญาตให้ใช้งานกล้องที่ตัวเลือกของ Browser';
    title = 'สิทธิ์ถูกปฏิเสธ';
  } else if (msg === 'NotFound') {
    msg = 'ไม่พบอุปกรณ์กล้องในเครื่องนี้';
  } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    msg = 'ระบบสแกนต้องใช้งานผ่าน HTTPS เท่านั้น';
    title = 'ความปลอดภัย';
  }

  // ใช้ SweetAlert2 แจ้งเตือนแล้วดีดกลับ
  Swal.fire({
    icon: 'error',
    title: title,
    text: msg,
    confirmButtonText: 'กลับหน้าหลัก',
    allowOutsideClick: false,
    confirmButtonColor: '#4f46e5'
  }).then(() => {
    router.back();
  });
};

const resetScanner = () => {
    window.location.reload(); 
};

onMounted(() => {
  setTimeout(() => {
     startScan();
  }, 500);
});

onUnmounted(() => {
  codeReader.reset();
});
</script>

<template>
  <div class="fixed inset-0 bg-black z-50 flex flex-col">
    
    <div class="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-black/40 backdrop-blur-md">
      <button @click="router.back()" class="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-white font-bold text-lg">สแกน QR Code</h1>
      <button @click="resetScanner" class="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
        <RefreshCw class="w-6 h-6" />
      </button>
    </div>

    <div class="flex-1 bg-black relative flex flex-col justify-center overflow-hidden">
      
      <video 
        ref="videoRef" 
        class="w-full h-full object-cover"
      ></video>

      <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div class="w-64 h-64 border-4 border-green-500/50 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
           <div class="absolute inset-x-0 top-1/2 h-0.5 bg-green-400 animate-pulse"></div>
        </div>
      </div>

      <div class="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
         <p class="text-white bg-black/50 px-4 py-2 rounded-full inline-block text-sm backdrop-blur">
           {{ statusMsg }}
         </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.pt-safe {
  padding-top: max(1rem, env(safe-area-inset-top));
}
</style>