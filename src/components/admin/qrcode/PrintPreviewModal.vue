<script setup>
import { X, Loader2, Printer, Frown, Meh, Smile, MapPin } from 'lucide-vue-next'

const props = defineProps({
  show: Boolean,
  isGenerating: Boolean,
  
  selectedCount: Number,
  selectedLocations: Array,
  qrDataUrls: Object
})

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <div v-if="show" class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">

    <div class="bg-white w-full max-w-6xl h-full max-h-[95%] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
        <div>
          <h3 class="font-bold text-lg text-gray-800">ตัวอย่างก่อนพิมพ์ (Sticker Layout)</h3>
          <p class="text-sm text-gray-500">จำนวน {{ selectedCount }} รายการ</p>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-8 bg-gray-200/80 custom-scrollbar">

        <div v-if="isGenerating" class="flex flex-col items-center justify-center h-full text-gray-500">
          <Loader2 class="w-10 h-10 animate-spin mb-3 text-indigo-600" />
          <p>กำลังสร้าง QR Code...</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="loc in selectedLocations"
            :key="loc.locations_id"
            class="relative aspect-square rounded-xl shadow-lg overflow-hidden flex flex-col items-center text-center p-4 group hover:scale-[1.02] transition-transform duration-300"
            style="background: linear-gradient(180deg, #3b82f6 0%, #1e40af 100%);"
          >
            <div class="absolute top-3 left-4 flex items-center gap-1.5 opacity-90">
                <div class="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                    <span class="text-white font-bold text-xs">+</span>
                </div>
                <div class="text-[10px] text-white text-left leading-tight">
                    <p class="font-bold">PRINC HOSPITAL</p>
                    <p class="opacity-80">UBONRATCHATHANI</p>
                </div>
            </div>

            <template v-if="qrDataUrls[loc.locations_id]">
              
              <div class="mt-8 relative">
                 <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#024baa] text-white text-xs font-bold px-4 py-1 rounded-full z-10 tracking-wider border-2 border-white shadow-sm">
                    SCAN ME
                 </div>

                 <div class="bg-white p-3 rounded-2xl shadow-lg border-4 border-white/20">
                    <img :src="qrDataUrls[loc.locations_id]" class="w-32 h-32 object-contain" />
                 </div>

                 <div class="absolute -right-8 bottom-0 flex flex-col gap-[-5px]">
                    <div class="w-10 h-10 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg transform translate-y-2 translate-x-1 z-30">
                        <Smile class="w-6 h-6 text-white" />
                    </div>
                    <div class="w-10 h-10 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center shadow-lg z-20">
                        <Meh class="w-6 h-6 text-white" />
                    </div>
                    <div class="w-10 h-10 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg transform -translate-y-2 translate-x-1 z-10">
                        <Frown class="w-6 h-6 text-white" />
                    </div>
                 </div>
              </div>

              <div class="mt-4 text-white">
                <h2 class="text-lg font-bold leading-tight drop-shadow-md">แบบประเมินความพึงพอใจ</h2>
                <p class="text-sm font-medium opacity-90">การบริการด้านความสะอาด</p>
              </div>

              <div class="mt-auto mb-2 bg-white text-[#1e40af] px-6 py-1.5 rounded-full font-bold text-sm shadow-md flex items-center gap-1">
                 <MapPin class="w-3 h-3" />
                 ชั้น {{ loc.locations_floor }} อาคาร {{ loc.locations_building }}
              </div>

              <div class="absolute bottom-1 w-full flex justify-between px-4 text-[8px] text-white/60 font-mono">
                  <span>{{ loc.locations_code }}</span>
                  <span>www.princ.com</span>
              </div>

            </template>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
        <button @click="$emit('close')" class="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors">
          ยกเลิก
        </button>
        <button
          @click="$emit('confirm')"
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
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
</style>