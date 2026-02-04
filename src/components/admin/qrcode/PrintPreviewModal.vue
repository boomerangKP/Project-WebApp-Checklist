<script setup>
import { ref } from "vue";
import { X, Loader2, Printer } from "lucide-vue-next"; // เอา LayoutGrid, Columns ออกเพราะไม่ได้ใช้แล้ว
import princLogo from "@/assets/logo-header.png";
import { usePrintQR } from "@/composables/usePrintQR";

const props = defineProps({
  show: Boolean,
  isGenerating: Boolean,
  selectedCount: Number,
  selectedLocations: Array,
  qrDataUrls: Object,
});

const emit = defineEmits(["close", "confirm"]);

const printableContent = ref(null);
const { printContent } = usePrintQR();

// ✅ 1. ล็อคเป็น 2 คอลัมน์ถาวร (เพราะ 10.5cm x 2 = 21cm เต็มหน้า A4 พอดี)
const gridColumns = ref(2);

const handlePrint = () => {
  // ส่งค่า gridColumns (2) ไปเหมือนเดิมเพื่อให้ Logic การพิมพ์ทำงานถูกต้อง
  printContent(printableContent.value, gridColumns.value);
};
</script>

<template>
  <div
    v-if="show"
    class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white dark:bg-slate-800 w-full max-w-6xl h-full max-h-[95%] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900 shrink-0"
      >
        <div>
          <h3 class="font-bold text-lg text-gray-800 dark:text-white">
            ตัวอย่างก่อนพิมพ์
          </h3>
          <p class="text-sm text-gray-500 dark:text-slate-400">
            จำนวน {{ selectedCount }} รายการ (ขนาด 10.5 x 14.85 ซม.)
          </p>
        </div>

        <button
          @click="$emit('close')"
          class="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-400 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div
        class="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-slate-900/50 custom-scrollbar flex justify-center"
      >
        <div
          v-if="isGenerating"
          class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400"
        >
          <Loader2
            class="w-10 h-10 animate-spin mb-3 text-indigo-600 dark:text-indigo-400"
          />
          <p>กำลังสร้าง QR Code...</p>
        </div>

        <div
          v-else
          ref="printableContent"
          class="grid grid-cols-2 gap-0 w-[21cm] bg-white shadow-sm"
        >
          <div
            v-for="loc in selectedLocations"
            :key="loc.locations_id"
            class="sticker-card border border-gray-200 p-3 flex flex-col items-center text-center bg-white relative overflow-hidden"
            style="width: 10.5cm; height: 14.85cm;"
          >
            <div
              class="logo-container w-full h-[60px] border border-gray-300 mb-2 flex items-center justify-center p-1"
            >
              <img
                :src="princLogo"
                alt="Princ Hospital Logo"
                class="max-h-full max-w-full object-contain"
              />
            </div>

            <div
              class="qr-section relative w-full flex flex-col items-center justify-center mb-2 flex-1"
            >
              <div
                class="absolute -top-2 bg-white px-2 z-10 text-[12px] font-bold text-gray-600 tracking-widest uppercase border border-white"
              >
                SCAN ME
              </div>

              <div
                class="qr-box border border-gray-900 p-1 flex items-center justify-center mt-2 w-[180px] h-[180px]"
              >
                <img
                  v-if="qrDataUrls[loc.locations_id]"
                  :src="qrDataUrls[loc.locations_id]"
                  class="w-full h-full object-contain"
                />
                <Loader2 v-else class="w-8 h-8 animate-spin text-gray-300" />
              </div>
            </div>

            <div
              class="flex-1 w-full flex flex-col items-center justify-start space-y-1"
            >
              <h2 class="text-[16px] font-bold text-black leading-tight">
                แบบประเมินความพึงพอใจ
              </h2>
              <p class="text-[12px] text-gray-600">ประเมินความสะอาด</p>

              <div class="mt-2 text-[18px] font-bold text-black leading-tight">
                ชั้น {{ loc.locations_floor }} <br />
                อาคาร {{ loc.locations_building }}
              </div>
              <p
                class="text-[14px] text-gray-500 truncate w-full px-2 mt-1"
                v-if="loc.locations_name"
              >
                ({{ loc.locations_name }})
              </p>
            </div>

            <div
              class="w-full flex justify-between items-end pt-2 mt-auto border-t border-dashed border-gray-200"
            >
              <div class="text-[10px] text-gray-500 text-left leading-tight space-y-0.5">
                <div class="flex items-center gap-1">
                  <span>📞 045-244-999</span>
                </div>
                <div class="flex items-center gap-1">
                  <span>💬 @princubon</span>
                </div>
              </div>
              <div class="text-[10px] font-bold text-red-600 text-right">
                **ส่งงานแม่บ้าน
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0"
      >
        <button
          @click="$emit('close')"
          class="px-5 py-2.5 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium transition-colors"
        >
          ยกเลิก
        </button>
        <button
          @click="handlePrint"
          :disabled="isGenerating"
          class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer class="w-5 h-5" /> สั่งพิมพ์ (A4)
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scrollbar Styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}

/* ✅ เพิ่ม CSS สำหรับการพิมพ์เพื่อให้แน่ใจว่าขนาดเป๊ะ
   เมื่อสั่งพิมพ์ background-color จะหายไป และจะพิมพ์ตามขนาดจริง
*/
@media print {
  .sticker-card {
    border: 1px solid #000; /* บังคับขอบตอนพิมพ์ */
    break-inside: avoid;
  }
}
</style>
