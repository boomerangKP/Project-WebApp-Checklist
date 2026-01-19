<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { ArrowLeft, RefreshCw } from "lucide-vue-next";
import Swal from "sweetalert2";

const router = useRouter();
const videoRef = ref(null);
const codeReader = new BrowserMultiFormatReader();
const isScanning = ref(true);
const statusMsg = ref("กำลังเตรียมกล้อง...");

// ฟังก์ชันเริ่มทำงาน
const startScan = async () => {
  try {
<<<<<<< HEAD
    statusMsg.value = "กำลังเปิดกล้อง...";
=======
    statusMsg.value = 'กำลังเปิดกล้อง...';
>>>>>>> development

    // ✅ แก้ไข: ไม่ต้อง Loop หา deviceId เอง ให้ Browser จัดการผ่าน Constraints
    // วิธีนี้แก้ปัญหา Android มีหลายกล้องแล้วเลือกผิดตัว
    const constraints = {
      video: {
<<<<<<< HEAD
        facingMode: "environment", // บังคับกล้องหลัง (Best Practice)
      },
    };

    // ใช้ decodeFromConstraints แทน decodeFromVideoDevice
    await codeReader.decodeFromConstraints(constraints, videoRef.value, (result, err) => {
      if (result && isScanning.value) {
        handleResult(result.getText());
      }
      // Error ยิบย่อยระหว่างสแกนปล่อยผ่านได้
    });
=======
        facingMode: 'environment' // บังคับกล้องหลัง (Best Practice)
      }
    };

    // ใช้ decodeFromConstraints แทน decodeFromVideoDevice
    await codeReader.decodeFromConstraints(
      constraints,
      videoRef.value,
      (result, err) => {
        if (result && isScanning.value) {
          handleResult(result.getText());
        }
        // Error ยิบย่อยระหว่างสแกนปล่อยผ่านได้
      }
    );

    statusMsg.value = 'พร้อมสแกน';
>>>>>>> development

    statusMsg.value = "พร้อมสแกน";
  } catch (err) {
    // ⚠️ ถ้าเปิดกล้องหลังด้วย Constraints ไม่ได้ ลอง Fallback ไปวิธีเดิม (เผื่อเครื่องเก่าจัดๆ)
    console.warn("Standard constraint failed, trying legacy method...", err);
    tryLegacyScan();
<<<<<<< HEAD
  }
};

// Fallback: วิธีเดิมของคุณ (ใช้เมื่อวิธี Constraints พังจริงๆ)
const tryLegacyScan = async () => {
  try {
    const videoInputDevices = await codeReader.listVideoInputDevices();
    if (videoInputDevices.length === 0) throw new Error("NotFound");

    // เลือกกล้องหลังแบบ Manual
    const selectedDeviceId =
      videoInputDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("environment")
      )?.deviceId || videoInputDevices[videoInputDevices.length - 1].deviceId;

    await codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.value, (result) => {
      if (result && isScanning.value) handleResult(result.getText());
    });
    statusMsg.value = "พร้อมสแกน (Legacy Mode)";
  } catch (finalErr) {
    handleError(finalErr);
=======
>>>>>>> development
  }
};

// Fallback: วิธีเดิมของคุณ (ใช้เมื่อวิธี Constraints พังจริงๆ)
const tryLegacyScan = async () => {
    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        if (videoInputDevices.length === 0) throw new Error('NotFound');

        // เลือกกล้องหลังแบบ Manual
        const selectedDeviceId = videoInputDevices.find(device =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('environment')
        )?.deviceId || videoInputDevices[videoInputDevices.length - 1].deviceId;

        await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.value,
            (result) => { if (result && isScanning.value) handleResult(result.getText()); }
        );
        statusMsg.value = 'พร้อมสแกน (Legacy Mode)';
    } catch (finalErr) {
        handleError(finalErr);
    }
}

const handleResult = (text) => {
  isScanning.value = false;
  if (navigator.vibrate) navigator.vibrate(200);

  let token = text;
  if (text.includes("/scan/")) {
    token = text.split("/scan/")[1];
  }

  router.replace({
<<<<<<< HEAD
    name: "scan-handler",
    params: { token: token },
=======
    name: 'scan-handler',
    params: { token: token }
>>>>>>> development
  });
};

const handleError = (err) => {
  let msg = err.message;
<<<<<<< HEAD
  let title = "ไม่สามารถเปิดกล้องได้";

  if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    msg = "กรุณากดอนุญาตให้ใช้งานกล้องที่ตัวเลือกของ Browser";
    title = "สิทธิ์ถูกปฏิเสธ";
  } else if (msg === "NotFound" || err.name === "NotFoundError") {
    msg = "ไม่พบอุปกรณ์กล้อง หรือกล้องถูกใช้งานโดยแอปอื่น";
=======
  let title = 'ไม่สามารถเปิดกล้องได้';

  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    msg = 'กรุณากดอนุญาตให้ใช้งานกล้องที่ตัวเลือกของ Browser';
    title = 'สิทธิ์ถูกปฏิเสธ';
  } else if (msg === 'NotFound' || err.name === 'NotFoundError') {
    msg = 'ไม่พบอุปกรณ์กล้อง หรือกล้องถูกใช้งานโดยแอปอื่น';
>>>>>>> development
  }

  Swal.fire({
    icon: "error",
    title: title,
    text: msg,
    confirmButtonText: "กลับหน้าหลัก",
    allowOutsideClick: false,
    confirmButtonColor: "#4f46e5",
  }).then(() => {
    router.back();
  });
};

const resetScanner = () => {
<<<<<<< HEAD
  window.location.reload();
=======
    window.location.reload();
>>>>>>> development
};

onMounted(() => {
  // Delay นิดนึงเพื่อให้ DOM render เสร็จชัวร์ๆ บน Mobile
  setTimeout(() => {
    startScan();
  }, 500);
});

onUnmounted(() => {
  // สำคัญมาก: ต้อง Reset เพื่อคืน Resource กล้องให้ OS
  codeReader.reset();
});
</script>

<template>
  <div class="fixed inset-0 bg-black z-50 flex flex-col">
<<<<<<< HEAD
    <div
      class="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-black/40 backdrop-blur-md"
    >
      <button
        @click="router.back()"
        class="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
      >
=======

    <div class="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-black/40 backdrop-blur-md">
      <button @click="router.back()" class="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
>>>>>>> development
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-white font-bold text-lg">สแกน QR Code</h1>
      <button
        @click="resetScanner"
        class="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
      >
        <RefreshCw class="w-6 h-6" />
      </button>
    </div>

    <div class="flex-1 bg-black relative flex flex-col justify-center overflow-hidden">
<<<<<<< HEAD
=======

>>>>>>> development
      <video
        ref="videoRef"
        class="w-full h-full object-cover"
        playsinline
        autoplay
        muted
      ></video>

      <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          class="w-64 h-64 border-4 border-green-500/50 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
        >
          <div class="absolute inset-x-0 top-1/2 h-0.5 bg-green-400 animate-pulse"></div>
        </div>
      </div>

      <div class="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
        <p
          class="text-white bg-black/50 px-4 py-2 rounded-full inline-block text-sm backdrop-blur"
        >
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
