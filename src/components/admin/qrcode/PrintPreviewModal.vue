<script setup>
import { ref } from "vue";
import { X, Loader2, Printer, Phone, Mail, MessageCircle } from "lucide-vue-next";
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

const handlePrint = () => {
  printContent(printableContent.value);
};
</script>

<template>
  <div
    v-if="show"
    class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white w-full max-w-6xl h-full max-h-[95%] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"
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

      <div class="flex-1 overflow-y-auto p-8 bg-gray-100 custom-scrollbar">
        <div
          v-if="isGenerating"
          class="flex flex-col items-center justify-center h-full text-gray-500"
        >
          <Loader2 class="w-10 h-10 animate-spin mb-3 text-indigo-600" />
          <p>กำลังสร้าง QR Code...</p>
        </div>

        <div v-else ref="printableContent" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-[21cm] mx-auto bg-white p-8 shadow-sm">

          <div
            v-for="loc in selectedLocations"
            :key="loc.locations_id"
            class="sticker-card border border-gray-900 p-2 flex flex-col items-center text-center bg-white aspect-[3/4] relative overflow-hidden"
          >
            <div class="logo-container w-full h-[50px] border border-gray-300 mb-1 flex items-center justify-center p-1">
              <img
                :src="princLogo"
                alt="Princ Hospital Logo"
                class="max-h-full max-w-full object-contain"
              />
            </div>

            <div class="qr-section relative w-full flex flex-col items-center justify-center mb-1">
              <div class="absolute -top-2 bg-white px-1 z-10 text-[10px] font-bold text-gray-600 tracking-widest uppercase border border-white">
                SCAN
              </div>
              <div class="qr-box w-[100px] h-[100px] border border-gray-900 p-1 flex items-center justify-center mt-2">
                <img v-if="qrDataUrls[loc.locations_id]" :src="qrDataUrls[loc.locations_id]" class="w-full h-full object-contain" />
                <Loader2 v-else class="w-6 h-6 animate-spin text-gray-300" />
              </div>
            </div>

            <div class="flex-1 w-full flex flex-col items-center justify-center space-y-0.5">
              <h2 class="text-[12px] font-bold text-black leading-tight">
                แบบประเมินความพึงพอใจ
              </h2>
              <p class="text-[10px] text-gray-600">ประเมินความสะอาด</p>

              <div class="mt-1 text-[14px] font-bold text-black leading-tight">
                ชั้น {{ loc.locations_floor }} <br/> อาคาร {{ loc.locations_building }}
              </div>
              <p class="text-[10px] text-gray-500 truncate w-full px-1" v-if="loc.locations_name">
                ({{ loc.locations_name }})
              </p>
            </div>

            <div class="w-full flex justify-between items-end pt-1 mt-auto border-t border-dashed border-gray-200">
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
        class="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0"
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
</style>
