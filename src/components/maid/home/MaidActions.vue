<script setup>
import { useRouter } from 'vue-router'
import { QrCode, FileText, PenSquare } from 'lucide-vue-next'

const router = useRouter()

const goToScan = () => router.push('/maid/scan')
const goToHistory = () => router.push('/maid/history')
const goToManualRecord = () => router.push({ name: "maid-manual-record" })
</script>

<template>
  <div class="space-y-4">
    <button
      @click="goToScan"
      class="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 flex items-center gap-4 active:scale-95 transition-all group relative overflow-hidden"
    >
      <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
      <div class="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
        <QrCode class="w-8 h-8 text-white" />
      </div>
      <div class="text-left">
        <h3 class="text-xl font-bold">สแกน QR Code</h3>
        <p class="text-indigo-100 text-sm">เพื่อส่งงาน / เริ่มงาน</p>
      </div>
    </button>

    <div class="grid grid-cols-2 gap-4">
      <button @click="goToHistory" class="bg-white p-4 h-32 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center gap-3 active:bg-gray-50 transition-colors">
        <div class="bg-gray-100 p-3 rounded-full">
          <FileText class="w-6 h-6 text-gray-700" />
        </div>
        <span class="font-bold text-gray-700">ประวัติการส่งงาน</span>
      </button>

      <button @click="goToManualRecord" class="bg-white p-4 h-32 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center gap-3 active:bg-gray-50 transition-colors">
        <div class="bg-orange-50 p-3 rounded-full">
          <PenSquare class="w-6 h-6 text-orange-600" />
        </div>
        <span class="font-bold text-gray-700">บันทึกเอง</span>
      </button>
    </div>
  </div>
</template>