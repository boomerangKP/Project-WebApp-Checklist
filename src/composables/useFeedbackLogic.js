import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export function useFeedbackLogic(locationId) {
  // --- State ---
  const loading = ref(true);
  const submitting = ref(false);
  const location = ref(null);
  const feedbackTopics = ref([]);
  const answers = ref({});
  const mainComment = ref("");
  const currentStep = ref(0);
  const isCompleted = ref(false);
  const isSubmittedSuccess = ref(false);

  // --- Computed ---
  const totalSteps = computed(() => feedbackTopics.value.length);
  const currentTopic = computed(() => feedbackTopics.value[currentStep.value]);
  const progressPercent = computed(() => {
    if (totalSteps.value === 0) return 0;
    return ((currentStep.value + 1) / totalSteps.value) * 100;
  });

  // --- Helper: Get Star Class ---
  const getStarClass = (topicId, starIndex) => {
    const currentRating = answers.value[topicId]?.rating || 0;
    if (starIndex <= currentRating) {
      return "text-yellow-400 fill-yellow-400 drop-shadow-sm";
    }
    return "text-gray-200";
  };

  // --- Actions: Fetch Data ---
  const fetchData = async () => {
    try {
      loading.value = true;
      const [locRes, topicRes] = await Promise.all([
        supabase.from("locations").select("locations_name, locations_building, locations_floor").eq("locations_id", locationId).single(),
        supabase.from("feedback_topics").select("*").eq("is_active", true).order("ordering")
      ]);

      if (locRes.error) throw locRes.error;
      if (topicRes.error) throw topicRes.error;

      location.value = locRes.data;
      feedbackTopics.value = topicRes.data;

      // Init answers
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

  // --- Actions: Navigation ---
  const setTopicRating = (topicId, score) => {
    answers.value[topicId].rating = score;
  };

  const nextStep = () => {
    const topicId = currentTopic.value.id;
    if (answers.value[topicId].rating === 0) {
      Swal.fire({ icon: "info", title: "กรุณาให้คะแนนก่อนไปต่อ", toast: true, position: "center", timer: 1500, showConfirmButton: false });
      return;
    }
    if (currentStep.value < totalSteps.value - 1) {
      currentStep.value++;
    } else {
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

  // --- Actions: Submit (แก้ไขใหม่ทั้งหมดตรงนี้) ---
  const submitFeedback = async () => {
    try {
      submitting.value = true;
      
      // 1. ดึงคะแนนรายข้อออกมาคำนวณ
      const scores = [];
      for (const topicId in answers.value) {
        if (answers.value[topicId].rating > 0) {
          scores.push(Number(answers.value[topicId].rating));
        }
      }

      // 2. คำนวณค่าเฉลี่ย (ทศนิยม 1 ตำแหน่ง เช่น 3.4)
      let avgRating = 0;
      if (scores.length > 0) {
        const totalScore = scores.reduce((a, b) => a + b, 0);
        avgRating = (totalScore / scores.length).toFixed(1); // ✅ แก้เป็นทศนิยมตามที่ขอ
      }

      // 3. Insert ลงตารางแม่ (feedbacks) ทีเดียวจบ
      const { error } = await supabase
        .from("feedbacks")
        .insert({ 
          location_id: locationId, 
          rating: avgRating,      // ✅ ส่ง 3.4
          answers: answers.value, // ✅ ส่ง JSONB คำตอบทั้งหมด
          comment: mainComment.value, 
          status: "pending" 
        });

      if (error) throw error;

      isSubmittedSuccess.value = true;
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "ส่งข้อมูลไม่สำเร็จ", "error");
    } finally {
      submitting.value = false;
    }
  };

  const resetForm = () => {
    window.location.reload();
  };

  // Auto fetch on mounted
  onMounted(() => {
    if (locationId) fetchData();
  });

  return {
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
  };
}