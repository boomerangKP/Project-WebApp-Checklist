<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useFeedbackLogic } from "@/composables/useFeedbackLogic";
import {
  Star, Loader2, MapPin, ChevronRight, ChevronLeft, Send, CheckCircle2, UserCog, Heart, RefreshCw, Calculator, Tag
} from "lucide-vue-next";

// 1. รับ ID
const route = useRoute();
const locationId = route.params.id;

// 2. ดึง Logic
const {
  loading,
  submitting,
  location,
  feedbackTopics,
  answers,
  mainComment,
  currentStep,
  isCompleted,
  isSubmittedSuccess,
  totalSteps,
  currentTopic,
  progressPercent,
  getStarClass,
  setTopicRating,
  nextStep,
  prevStep,
  submitFeedback,
  resetForm
} = useFeedbackLogic(locationId);

// คำนวณคะแนนเฉลี่ย
const overallAverage = computed(() => {
  if (!feedbackTopics.value.length) return "0.0";
  
  let totalScore = 0;
  let count = 0;

  feedbackTopics.value.forEach(t => {
    const rating = answers.value[t.id]?.rating || 0;
    if (rating > 0) {
      totalScore += rating;
      count++;
    }
  });

  if (count === 0) return "0.0";
  return (totalScore / count).toFixed(1);
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-noto overflow-hidden relative">
    
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center">
      <Loader2 class="w-10 h-10 text-indigo-600 animate-spin mb-2" />
      <p class="text-gray-400">กำลังโหลด...</p>
    </div>

    <div
      v-else-if="location && !isSubmittedSuccess"
      class="flex-1 flex flex-col max-w-md mx-auto w-full bg-white shadow-2xl min-h-screen relative"
    >
      <div class="bg-white pt-6 pb-2 px-6 sticky top-0 z-20 border-b border-gray-100">
        <div class="mb-4 text-center">
          <h1 class="text-lg font-bold text-indigo-700">โรงพยาบาลพริ้นซ์ อุบลราชธานี</h1>
          <p class="text-sm text-gray-500">แบบประเมินสุขอนามัยและความสะอาด</p>
        </div>

        <div class="flex justify-between items-start mb-4">
          <div>
            <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin class="w-5 h-5 text-indigo-600" /> {{ location.locations_name }}
            </h1>
            <p class="text-xs text-gray-500 pl-7">
              {{ location.locations_building }} • ชั้น {{ location.locations_floor }}
            </p>
          </div>
          <div class="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
            {{ isCompleted ? "สรุป" : `${currentStep + 1} / ${totalSteps}` }}
          </div>
        </div>

        <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-indigo-500 transition-all duration-500 ease-out"
            :style="{ width: isCompleted ? '100%' : `${progressPercent}%` }"
          ></div>
        </div>
      </div>

      <div class="flex-1 relative p-6 flex flex-col justify-center">
        <Transition name="slide-fade" mode="out-in">
          
          <div v-if="!isCompleted" :key="currentStep" class="w-full">
            <div class="text-center mb-8 animate-in zoom-in duration-300">
              
              <div class="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold mb-4">
                <Tag class="w-3 h-3" />
                {{ currentTopic.category || 'ทั่วไป' }}
              </div>

              <h2 class="text-xl font-bold text-gray-800 mb-2 leading-relaxed">
                {{ currentTopic.name }}
              </h2>
              <p class="text-sm text-gray-500 px-4">{{ currentTopic.description }}</p>
            </div>

            <div class="flex justify-center gap-2 mb-4">
              <button
                v-for="i in 5"
                :key="i"
                @click="setTopicRating(currentTopic.id, i)"
                class="transition-transform active:scale-110 p-1 focus:outline-none"
              >
                <Star
                  class="w-10 h-10 transition-colors"
                  :class="getStarClass(currentTopic.id, i)"
                />
              </button>
            </div>

            <div class="flex justify-between px-8 text-xs text-gray-400">
               <span>ไม่พอใจ</span>
               <span>พอใจมาก</span>
            </div>

            </div>

          <div v-else class="w-full text-center">
            <div class="mb-6">
              <CheckCircle2 class="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 class="text-2xl font-bold text-gray-800">ประเมินครบแล้ว!</h2>
              <p class="text-gray-500 text-sm">มีข้อเสนอแนะเพิ่มเติมไหมครับ?</p>
            </div>

            <textarea
              v-model="mainComment"
              rows="4"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-6"
              placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)..."
            ></textarea>

            <div class="bg-indigo-50 p-4 rounded-xl text-left">
              <div class="flex items-center justify-between mb-3">
                 <h4 class="text-xs font-bold text-gray-500 uppercase">
                  สรุปคะแนนของคุณ
                </h4>
                <div class="flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm">
                   <Calculator class="w-3 h-3 text-indigo-500" />
                   <span class="text-xs font-bold text-indigo-700">เฉลี่ย: {{ overallAverage }}</span>
                </div>
              </div>
              
              <div class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                <div
                  v-for="t in feedbackTopics"
                  :key="t.id"
                  class="text-xs flex items-center justify-between py-1 border-b border-indigo-100 last:border-0"
                >
                  <div class="flex flex-col flex-1 mr-2 overflow-hidden">
                    <span class="text-[10px] text-indigo-400 font-bold mb-0.5">{{ t.category }}</span>
                    <span class="text-gray-600 truncate">{{ t.name }}</span>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <Star class="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span class="font-bold">{{ answers[t.id].rating }}</span>
                  </div>
                </div>
              </div>

               <div class="mt-3 pt-2 border-t border-indigo-200 flex justify-between items-center">
                  <span class="text-xs font-bold text-gray-600">คะแนนรวมเฉลี่ย</span>
                   <div class="flex items-center gap-1">
                    <Star class="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span class="text-sm font-bold text-gray-800">{{ overallAverage }} / 5.0</span>
                  </div>
               </div>

            </div>
          </div>
        </Transition>
      </div>

      <div class="p-6 bg-white border-t border-gray-100">
        <div class="flex gap-3 mb-3">
          <button
            v-if="currentStep > 0 || isCompleted"
            @click="prevStep"
            class="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft class="w-6 h-6" />
          </button>

          <button
            v-if="!isCompleted"
            @click="nextStep"
            class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
          >
            ข้อต่อไป <ChevronRight class="w-5 h-5" />
          </button>

          <button
            v-else
            @click="submitFeedback"
            :disabled="submitting"
            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all"
          >
            <Loader2 v-if="submitting" class="w-5 h-5 animate-spin" />
            <span v-else>ยืนยันส่งข้อมูล</span>
            <Send v-if="!submitting" class="w-5 h-5" />
          </button>
        </div>

        <div class="text-center">
          <router-link
            :to="`/login?redirect=/maid/job/${locationId}`"
            class="inline-flex items-center gap-1.5 text-[10px] text-gray-300 hover:text-indigo-600 transition-colors"
          >
            <UserCog class="w-3 h-3" />
            <span>สำหรับพนักงานทำความสะอาด</span>
          </router-link>
        </div>
      </div>
    </div>

    <div 
      v-else-if="isSubmittedSuccess"
      class="flex-1 flex flex-col max-w-md mx-auto w-full bg-white shadow-2xl min-h-screen relative animate-in fade-in zoom-in duration-500"
    >
      <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Heart class="w-12 h-12 text-green-600 fill-green-600 animate-bounce" />
        </div>
        <h2 class="text-3xl font-bold text-gray-800 mb-2">ขอบคุณครับ/ค่ะ!</h2>
        <p class="text-gray-500 mb-8 leading-relaxed">
          ขอบคุณที่ไว้วางใจใช้บริการ<br>
          <span class="text-indigo-600 font-bold">โรงพยาบาลพริ้นซ์ อุบลราชธานี</span><br>
          คำแนะนำของท่านคือกำลังใจสำคัญของเรา
        </p>
        <div class="bg-gray-50 rounded-xl p-4 w-full mb-8 border border-gray-100">
          <p class="text-xs text-gray-400 mb-1">สถานที่ที่ท่านรีวิว</p>
          <div class="flex items-center justify-center gap-2 font-bold text-gray-700">
            <MapPin class="w-4 h-4 text-indigo-500" />
            {{ location?.locations_name }}
          </div>
          <p class="text-xs text-gray-500 mt-1">
             {{ location?.locations_building }} • ชั้น {{ location?.locations_floor }}
          </p>
        </div>
        <div class="w-full space-y-3">
          <button 
            @click="resetForm"
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
          >
            <RefreshCw class="w-5 h-5" />
            ประเมินอีกครั้ง
          </button>
        </div>
      </div>
      <div class="p-4 text-center text-[10px] text-gray-300">
        Prince Hospital Ubon Ratchathani
      </div>
    </div>

  </div>
</template>

<style scoped>
.font-noto {
  font-family: "Noto Sans Thai", sans-serif;
}
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
/* Scrollbar สวยๆ */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c7c7c7; 
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8; 
}
</style>