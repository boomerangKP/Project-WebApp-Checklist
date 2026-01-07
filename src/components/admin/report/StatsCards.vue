<script setup>
import { MessageSquare, Star } from "lucide-vue-next";
defineProps({ stats: Object });
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase">จำนวนผู้ประเมิน</p>
          <h3 class="text-3xl font-bold text-gray-800 mt-1">{{ stats.totalReviews }}</h3>
        </div>
        <div class="p-2 bg-blue-50 rounded-lg text-blue-600"><MessageSquare class="w-5 h-5" /></div>
      </div>
      <p class="text-xs text-gray-400">ครั้ง ในช่วงเวลาที่เลือก</p>
    </div>
    
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase">คะแนนเฉลี่ยรวม</p>
          <div class="flex items-end gap-2 mt-1">
            <h3 class="text-3xl font-bold text-indigo-600">{{ stats.averageRating }}</h3>
            <span class="text-sm text-gray-400 mb-1">/ 5.0</span>
          </div>
        </div>
        <div class="p-2 bg-yellow-50 rounded-lg text-yellow-500"><Star class="w-5 h-5 fill-yellow-500" /></div>
      </div>
       <div class="flex gap-0.5 mt-2">
         <Star v-for="i in 5" :key="i" class="w-3 h-3" :class="i <= Math.round(stats.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'" />
       </div>
    </div>

    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
      <div>
        <p class="text-xs font-bold text-gray-400 uppercase">จุดเด่น (คะแนนสูงสุด)</p>
        <h3 class="text-lg font-bold text-emerald-600 mt-2 truncate">{{ stats.topTopic }}</h3>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-1.5 mt-2">
        <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 80%"></div>
      </div>
    </div>

    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
      <div>
        <p class="text-xs font-bold text-gray-400 uppercase">ควรปรับปรุง (คะแนนต่ำสุด)</p>
        <h3 class="text-lg font-bold text-red-500 mt-2 truncate">{{ stats.lowTopic }}</h3>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-1.5 mt-2">
        <div class="bg-red-500 h-1.5 rounded-full" style="width: 40%"></div>
      </div>
    </div>
  </div>
</template>