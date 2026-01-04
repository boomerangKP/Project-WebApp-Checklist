<script setup>
import { FileText, CheckCircle2, XCircle, Clock } from 'lucide-vue-next'
defineProps(['stats'])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-indigo-200 transition-all">
      <div class="flex justify-between items-start">
        <div class="p-2 bg-gray-50 rounded-lg group-hover:bg-indigo-50"><FileText class="w-5 h-5 text-gray-600 group-hover:text-indigo-600" /></div>
        <span class="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Total Tasks</span>
      </div>
      <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.total }}</h3><p class="text-xs text-gray-500 mt-1">รายการทั้งหมด</p></div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-emerald-200 transition-all">
      <div class="flex justify-between items-start">
        <div class="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 class="w-5 h-5 text-emerald-600" /></div>
        <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Success</span>
      </div>
      <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.pass }}</h3><p class="text-xs text-gray-500 mt-1">งานที่เรียบร้อย</p></div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-rose-200 transition-all">
      <div class="flex justify-between items-start">
        <div class="p-2 bg-rose-50 rounded-lg"><XCircle class="w-5 h-5 text-rose-600" /></div>
        <span class="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Issues</span>
      </div>
      <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.fail }}</h3><p class="text-xs text-gray-500 mt-1">พบปัญหา</p></div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:border-blue-200 transition-all">
      <div class="flex justify-between items-start">
        <div class="p-2 bg-blue-50 rounded-lg"><Clock class="w-5 h-5 text-blue-600" /></div>
        <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Active</span>
      </div>
      <div><h3 class="text-2xl font-bold text-gray-900">{{ stats.staff }}</h3><p class="text-xs text-gray-500 mt-1">พนักงาน</p></div>
    </div>
  </div>
</template>
