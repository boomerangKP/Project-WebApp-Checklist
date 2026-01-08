<script setup>
import { MessageSquare, Star, TrendingUp, TrendingDown } from "lucide-vue-next";

defineProps({ stats: Object });
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">จำนวนผู้ประเมิน</p>
          <h3 class="text-3xl font-bold text-gray-800 mt-2">{{ stats.totalReviews }}</h3>
        </div>
        <div class="p-2.5 bg-blue-50 rounded-xl text-blue-600">
          <MessageSquare class="w-6 h-6" />
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-2">ครั้ง ในช่วงเวลาที่เลือก</p>
    </div>
    
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">คะแนนเฉลี่ยรวม</p>
          <div class="flex items-end gap-2 mt-2">
            <h3 class="text-3xl font-bold text-indigo-600">{{ stats.averageRating }}</h3>
            <span class="text-sm text-gray-400 mb-1.5">/ 5.0</span>
          </div>
        </div>
        <div class="p-2.5 bg-yellow-50 rounded-xl text-yellow-500">
          <Star class="w-6 h-6 fill-yellow-500" />
        </div>
      </div>
      <div class="flex gap-1 mt-2">
        <Star 
          v-for="i in 5" 
          :key="i" 
          class="w-4 h-4 transition-colors duration-300" 
          :class="i <= Math.round(Number(stats.averageRating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'" 
        />
      </div>
    </div>

    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group">
      <div class="absolute -right-4 -bottom-4 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform">
          <TrendingUp class="w-24 h-24" />
      </div>

      <div class="relative z-10 w-full">
        <div class="flex justify-between items-start mb-3">
             <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">จุดเด่น (สูงสุด)</p>
             <div class="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-md">
                <span class="text-xs font-bold text-emerald-700">{{ stats.topScore || '0.0' }}</span>
                <Star class="w-3 h-3 text-emerald-600 fill-emerald-600" />
             </div>
        </div>
       
        <h3 
          class="text-sm font-bold text-emerald-800 leading-snug line-clamp-3" 
          :title="stats.topTopic"
        >
          {{ stats.topTopic && stats.topTopic !== '-' ? stats.topTopic : 'รอข้อมูล...' }}
        </h3>
      </div>
      
      <div class="w-full bg-gray-100 rounded-full h-1.5 mt-auto relative z-10">
        <div class="bg-emerald-500 h-1.5 rounded-full" :style="{ width: (Number(stats.topScore)/5)*100 + '%' }"></div>
      </div>
    </div>

    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group">
      <div class="absolute -right-4 -bottom-4 text-red-50 opacity-50 group-hover:scale-110 transition-transform">
          <TrendingDown class="w-24 h-24" />
      </div>

      <div class="relative z-10 w-full">
        <div class="flex justify-between items-start mb-3">
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">ควรปรับปรุง (ต่ำสุด)</p>
            <div class="flex items-center gap-1 bg-red-100 px-2 py-1 rounded-md">
                <span class="text-xs font-bold text-red-700">{{ stats.lowScore || '0.0' }}</span>
                <Star class="w-3 h-3 text-red-600 fill-red-600" />
             </div>
        </div>
        
        <h3 
          class="text-sm font-bold text-red-700 leading-snug line-clamp-3" 
          :title="stats.lowTopic"
        >
          {{ stats.lowTopic && stats.lowTopic !== '-' ? stats.lowTopic : 'รอข้อมูล...' }}
        </h3>
      </div>

      <div class="w-full bg-gray-100 rounded-full h-1.5 mt-auto relative z-10">
         <div class="bg-red-500 h-1.5 rounded-full" :style="{ width: (Number(stats.lowScore)/5)*100 + '%' }"></div>
      </div>
    </div>

  </div>
</template>