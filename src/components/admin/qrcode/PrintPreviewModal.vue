<script setup>
import { X, Loader2, Printer } from 'lucide-vue-next'

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
    
    <div class="bg-white w-full max-w-5xl h-full max-h-[95%] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
        <div>
          <h3 class="font-bold text-lg text-gray-800">ตัวอย่างก่อนพิมพ์</h3>
          <p class="text-sm text-gray-500">จำนวน {{ selectedCount }} รายการ</p>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-8 bg-gray-100/50 custom-scrollbar">
        
        <div v-if="isGenerating" class="flex flex-col items-center justify-center h-full text-gray-500">
          <Loader2 class="w-10 h-10 animate-spin mb-3 text-indigo-600" />
          <p>กำลังสร้าง QR Code...</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div 
            v-for="loc in selectedLocations" 
            :key="loc.locations_id" 
            class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all"
          >
            <div class="w-full h-1 bg-indigo-500 absolute top-0 left-0"></div>
            <template v-if="qrDataUrls[loc.locations_id]">
              <h4 class="font-bold text-gray-800 line-clamp-1 mt-2 text-sm">{{ loc.locations_name }}</h4>
              <p class="text-xs text-gray-500 mb-3">อาคาร {{ loc.locations_building }}</p>
              <img :src="qrDataUrls[loc.locations_id]" class="w-32 h-32 object-contain" />
              <div class="mt-3 px-3 py-1 bg-gray-100 rounded text-xs font-mono font-bold text-gray-600">
                {{ loc.locations_code }}
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
          <Printer class="w-5 h-5" /> สั่งพิมพ์ทันที
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>