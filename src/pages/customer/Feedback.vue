<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabase";
import {
  Star,
  Loader2,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Send,
  CheckCircle2,
  UserCog,
} from "lucide-vue-next";
import Swal from "sweetalert2";

const route = useRoute();
const locationId = route.params.id;

// --- State ---
const loading = ref(true);
const submitting = ref(false);
const location = ref(null);
const feedbackTopics = ref([]);
const answers = ref({});
const mainComment = ref("");

// 🔥 State สำหรับการเลื่อนข้อ (Step)
const currentStep = ref(0);
const isCompleted = ref(false); // เช็คว่าทำครบทุกข้อหรือยัง

// --- Computed ---
const totalSteps = computed(() => feedbackTopics.value.length);
const currentTopic = computed(() => feedbackTopics.value[currentStep.value]);

// คำนวณ % ความคืบหน้า (Progress Bar)
const progressPercent = computed(() => {
  if (totalSteps.value === 0) return 0;
  return ((currentStep.value + 1) / totalSteps.value) * 100;
});

// --- Fetch Data ---
const fetchData = async () => {
  try {
    loading.value = true;

    // 1. ดึงสถานที่
    const locReq = supabase
      .from("locations")
      .select("locations_name, locations_building, locations_floor")
      .eq("locations_id", locationId)
      .single();
    // 2. ดึงหัวข้อ
    const topicReq = supabase
      .from("feedback_topics")
      .select("*")
      .eq("is_active", true)
      .order("ordering");

    const [locRes, topicRes] = await Promise.all([locReq, topicReq]);

    if (locRes.error) throw locRes.error;
    if (topicRes.error) throw topicRes.error;

    location.value = locRes.data;
    feedbackTopics.value = topicRes.data;

    // เตรียมที่เก็บคำตอบ
    feedbackTopics.value.forEach((topic) => {
      answers.value[topic.id] = { rating: 0, comment: "" };
    });
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "ไม่พบข้อมูล", "error");
  } finally {
    loading.value = false;
  }
};

// --- Actions ---
const setTopicRating = (topicId, score) => {
  answers.value[topicId].rating = score;

  // (Optional) ถ้าอยากให้กดดาวปุ๊บ ไปข้อถัดไปปั๊บ ให้เปิดบรรทัดนี้
  // if (score === 5) setTimeout(() => nextStep(), 300)
};

const nextStep = () => {
  // เช็คว่ากดดาวยัง?
  const topicId = currentTopic.value.id;
  if (answers.value[topicId].rating === 0) {
    Swal.fire({
      icon: "info",
      title: "กรุณาให้คะแนนก่อนไปต่อ",
      toast: true,
      position: "center",
      timer: 1500,
      showConfirmButton: false,
    });
    return;
  }

  if (currentStep.value < totalSteps.value - 1) {
    currentStep.value++;
  } else {
    // ถ้าข้อสุดท้ายแล้ว ให้ไปหน้าสรุป
    isCompleted.value = true;
  }
};

const prevStep = () => {
  if (isCompleted.value) {
    isCompleted.value = false;
  } else if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const submitFeedback = async () => {
  try {
    submitting.value = true;

    // 1. หัวบิล
    const { data: parentData, error: parentError } = await supabase
      .from("feedbacks")
      .insert({
        location_id: locationId,
        rating: 0,
        issues: [],
        comment: mainComment.value,
      })
      .select()
      .single();

    if (parentError) throw parentError;

    // 2. รายละเอียด
    const detailsToInsert = feedbackTopics.value.map((topic) => ({
      feedback_id: parentData.id,
      topic_id: topic.id,
      rating: answers.value[topic.id].rating,
      comment: answers.value[topic.id].comment,
    }));

    const { error: childError } = await supabase
      .from("feedback_details")
      .insert(detailsToInsert);

    if (childError) throw childError;

    await Swal.fire({
      icon: "success",
      title: "เสร็จเรียบร้อย!",
      text: "ขอบคุณสำหรับคำแนะนำครับ",
      showConfirmButton: false,
      timer: 2000,
    });

    // Reset
    window.location.reload();
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "ส่งข้อมูลไม่สำเร็จ", "error");
  } finally {
    submitting.value = false;
  }
};

const getStarClass = (topicId, starIndex) => {
  const currentRating = answers.value[topicId]?.rating || 0;
  if (starIndex <= currentRating) {
    return "text-yellow-400 fill-yellow-400 drop-shadow-sm";
  }
  return "text-gray-200";
};

onMounted(() => {
  if (locationId) fetchData();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-noto overflow-hidden relative">
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center">
      <Loader2 class="w-10 h-10 text-indigo-600 animate-spin mb-2" />
      <p class="text-gray-400">กำลังโหลด...</p>
    </div>

    <div
      v-else-if="location"
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
          <div
            class="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full"
          >
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
              <span class="text-6xl mb-4 block">🤔</span>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">
                {{ currentTopic.name }}
              </h2>
              <p class="text-gray-500">{{ currentTopic.description }}</p>
            </div>

            <div class="flex justify-center gap-2 mb-8">
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

            <div
              v-if="
                answers[currentTopic.id].rating > 0 && answers[currentTopic.id].rating < 5
              "
              class="animate-in slide-in-from-bottom-2 fade-in"
            >
              <p class="text-sm text-gray-600 mb-2 text-center">เกิดปัญหาอะไรขึ้นครับ?</p>
              <textarea
                v-model="answers[currentTopic.id].comment"
                rows="2"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="เช่น เหม็นมาก, น้ำเจิ่งนอง..."
              ></textarea>
            </div>
          </div>

          <div v-else class="w-full text-center">
            <div class="mb-6">
              <CheckCircle2 class="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 class="text-2xl font-bold text-gray-800">ประเมินครบแล้ว!</h2>
              <p class="text-gray-500">มีข้อเสนอแนะเพิ่มเติมไหมครับ?</p>
            </div>

            <textarea
              v-model="mainComment"
              rows="4"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-6"
              placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)..."
            ></textarea>

            <div class="bg-indigo-50 p-4 rounded-xl text-left">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2">
                สรุปคะแนนของคุณ
              </h4>
              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="t in feedbackTopics"
                  :key="t.id"
                  class="text-xs flex items-center justify-between"
                >
                  <span class="text-gray-600 truncate mr-2">{{ t.name }}</span>
                  <div class="flex items-center gap-1">
                    <Star class="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span class="font-bold">{{ answers[t.id].rating }}</span>
                  </div>
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
  </div>
</template>

<style scoped>
.font-noto {
  font-family: "Noto Sans Thai", sans-serif;
}

/* Animation สำหรับการเลื่อนสไลด์ */
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
</style>
