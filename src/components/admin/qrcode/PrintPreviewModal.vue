<script setup>
import { ref } from "vue";
import { X, Loader2, Printer, LayoutGrid, Columns } from "lucide-vue-next"; // เอา RectangleVertical ออก
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

// ✅ 1. ตั้งค่า Default เป็น 3 (เหมือนเดิม)
const gridColumns = ref(3);

const handlePrint = () => {
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
            จำนวน {{ selectedCount }} รายการ
          </p>
        </div>

        <div class="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 mx-4">
            <button 
                @click="gridColumns = 2"
                class="p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium"
                :class="gridColumns === 2 ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'"
                title="2 คอลัมน์"
            >
                <Columns class="w-4 h-4" />
                <span class="hidden sm:inline">2 คอลัมน์</span>
            </button>
            <button 
                @click="gridColumns = 3"
                class="p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium"
                :class="gridColumns === 3 ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'"
                title="3 คอลัมน์"
            >
                <LayoutGrid class="w-4 h-4" />
                <span class="hidden sm:inline">3 คอลัมน์</span>
            </button>
        </div>

        <button
          @click="$emit('close')"
          class="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-400 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div
        class="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-slate-900/50 custom-scrollbar"
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
          class="grid gap-6 w-full max-w-[21cm] mx-auto bg-white p-8 shadow-sm transition-all duration-300"
          :class="{
              'grid-cols-2': gridColumns === 2,
              'grid-cols-3': gridColumns === 3
          }"
        >
          <div
            v-for="loc in selectedLocations"
            :key="loc.locations_id"
            class="sticker-card border border-gray-900 p-2 flex flex-col items-center text-center bg-white aspect-[3/4] relative overflow-hidden"
          >
            <div
              class="logo-container w-full h-[50px] border border-gray-300 mb-1 flex items-center justify-center p-1"
            >
              <img
                :src="princLogo"
                alt="Princ Hospital Logo"
                class="max-h-full max-w-full object-contain"
              />
            </div>

            <div
              class="qr-section relative w-full flex flex-col items-center justify-center mb-1"
            >
              <div
                class="absolute -top-2 bg-white px-1 z-10 text-[10px] font-bold text-gray-600 tracking-widest uppercase border border-white"
              >
                SCAN
              </div>
              
              <div
                class="qr-box border border-gray-900 p-1 flex items-center justify-center mt-2 transition-all duration-300"
                :class="{
                    'w-[100px] h-[100px]': gridColumns === 3,
                    'w-[140px] h-[140px]': gridColumns === 2
                }"
              >
                <img
                  v-if="qrDataUrls[loc.locations_id]"
                  :src="qrDataUrls[loc.locations_id]"
                  class="w-full h-full object-contain"
                />
                <Loader2 v-else class="w-6 h-6 animate-spin text-gray-300" />
              </div>
            </div>

            <div
              class="flex-1 w-full flex flex-col items-center justify-center space-y-0.5"
            >
              <h2 class="text-[12px] font-bold text-black leading-tight">
                แบบประเมินความพึงพอใจ
              </h2>
              <p class="text-[10px] text-gray-600">ประเมินความสะอาด</p>

              <div class="mt-1 text-[14px] font-bold text-black leading-tight">
                ชั้น {{ loc.locations_floor }} <br />
                อาคาร {{ loc.locations_building }}
              </div>
              <p
                class="text-[10px] text-gray-500 truncate w-full px-1"
                v-if="loc.locations_name"
              >
                ({{ loc.locations_name }})
              </p>
            </div>

            <div
              class="w-full flex justify-between items-end pt-1 mt-auto border-t border-dashed border-gray-200"
            >
              <div class="text-[8px] text-gray-500 text-left leading-none space-y-0.5">
                <div class="flex items-center gap-0.5">
                  <span>📞 045-244-999</span>
                </div>
                <div class="flex items-center gap-0.5">
                  <span>💬 @princubon</span>
                </div>
              </div>
              <div class="text-[8px] font-bold text-red-600 text-right">
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
</style>