<script setup>
import { X, Loader2, Printer, Phone, Mail, MessageCircle } from "lucide-vue-next";
import princLogo from "@/assets/logo-header.png";

const props = defineProps({
  show: Boolean,
  isGenerating: Boolean,
  selectedCount: Number,
  selectedLocations: Array,
  qrDataUrls: Object,
});

const emit = defineEmits(["close", "confirm"]);

const handlePrint = () => {
  window.print();
};
</script>

<template>
  <div
    v-if="show"
    id="print-container"
    class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white w-full max-w-6xl h-full max-h-[95%] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print-modal-content"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 print:hidden"
      >
        <div>
          <h3 class="font-bold text-lg text-gray-800">
            ตัวอย่างก่อนพิมพ์
          </h3>
          <p class="text-sm text-gray-500">จำนวน {{ selectedCount }} รายการ</p>
        </div>
        <button
          @click="$emit('close')"
          class="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-8 bg-gray-100 custom-scrollbar print-scroll-area">
        <div
          v-if="isGenerating"
          class="flex flex-col items-center justify-center h-full text-gray-500 print:hidden"
        >
          <Loader2 class="w-10 h-10 animate-spin mb-3 text-indigo-600" />
          <p>กำลังสร้าง QR Code...</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print-grid-layout">
          <div
            v-for="loc in selectedLocations"
            :key="loc.locations_id"
            class="sticker-card relative bg-white border-2 border-gray-800 p-4 flex flex-col items-center text-center shadow-sm"
            style="aspect-ratio: 3/4"
          >
            <div
              class="w-full h-16 border border-gray-800 mb-2 flex items-center justify-center p-1"
            >
              <img
                :src="princLogo"
                alt="Princ Hospital Logo"
                class="max-h-full max-w-full object-contain"
              />
            </div>

            <div class="relative mb-2">
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 z-10">
                <span
                  class="text-xs font-bold text-gray-600 tracking-widest uppercase"
                  style="font-family: cursive, sans-serif"
                  >SCAN</span
                >
              </div>

              <div
                class="w-28 h-28 border border-gray-800 p-1 flex items-center justify-center"
              >
                <template v-if="qrDataUrls[loc.locations_id]">
                  <img
                    :src="qrDataUrls[loc.locations_id]"
                    class="w-full h-full object-contain"
                  />
                </template>
                <Loader2 v-else class="w-6 h-6 animate-spin text-gray-300" />
              </div>
            </div>

            <div class="flex-1 w-full space-y-0.5">
              <h2 class="text-xs font-bold text-gray-800 leading-tight">
                แบบประเมินความพึงพอใจ
              </h2>
              <p class="text-[10px] font-medium text-gray-600">ประเมินความสะอาด</p>

              <div class="mt-2 text-sm font-bold text-gray-900 leading-tight">
                ชั้น {{ loc.locations_floor }} <br/> อาคาร {{ loc.locations_building }}
              </div>
              <p class="text-[10px] text-gray-500 truncate w-full px-1" v-if="loc.locations_name">
                ({{ loc.locations_name }})
              </p>
            </div>

            <div class="mt-auto w-full flex justify-between items-end pt-2">
              <div
                class="text-[8px] text-gray-500 text-left leading-tight font-medium space-y-0"
              >
                <div class="flex items-center gap-1">
                  <Phone class="w-2 h-2" />
                  <span>045-244-999</span>
                </div>
                <div class="flex items-center gap-1">
                  <MessageCircle class="w-2 h-2" />
                  <span>@princubon</span>
                </div>
              </div>
              <div class="text-[7px] font-bold text-gray-800 text-right">
                <p class="text-red-500">**ส่งงานแม่บ้าน</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0 print:hidden"
      >
        <button
          @click="$emit('close')"
          class="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
        >
          ยกเลิก
        </button>
        <button
          @click="handlePrint"
          :disabled="isGenerating"
          class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer class="w-5 h-5" /> สั่งพิมพ์ (A4)
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

/* 🔥🔥🔥 CSS สำหรับการพิมพ์ 4 คอลัมน์ 🔥🔥🔥 */
@media print {
  body * { visibility: hidden; overflow: visible !important; }
  #print-container, #print-container * { visibility: visible; }

  #print-container {
    position: absolute; left: 0; top: 0; width: 100%; height: auto;
    background: white !important; padding: 0 !important; margin: 0 !important;
  }

  .print-modal-content, .print-scroll-area {
    box-shadow: none !important; border-radius: 0 !important;
    max-width: none !important; height: auto !important;
    overflow: visible !important; padding: 0 !important;
  }

  /* ✅ เปลี่ยนเป็น 4 Columns */
  .print-grid-layout {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important; /* 4 แถวแนวตั้ง */
    gap: 0.5cm !important; /* ลดระยะห่างลง */
    width: 100% !important;
    margin: 0 !important;
  }

  .sticker-card {
    break-inside: avoid;
    page-break-inside: avoid;
    border: 1px solid #1f2937 !important; /* ลดขอบบางลงนิดนึง */
    margin: 0 !important;
    padding: 0.5rem !important; /* ลด Padding */
    box-shadow: none !important;
  }
  
  /* ปรับลดขนาดตัวอักษรตอนพิมพ์เพื่อให้พอดีช่องเล็ก */
  .sticker-card h2 { font-size: 10px !important; }
  .sticker-card p { font-size: 9px !important; }
  .sticker-card .text-xl { font-size: 12px !important; } /* ชื่อชั้นอาคาร */
  
  /* ตั้งค่าหน้ากระดาษ */
  @page {
    size: A4 portrait;
    margin: 0.5cm; /* ลดขอบกระดาษเพื่อให้มีที่เหลือ */
  }
}
</style>