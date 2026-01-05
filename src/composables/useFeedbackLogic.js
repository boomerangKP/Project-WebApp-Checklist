// src/composables/useFeedbackLogic.js
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

  // --- Actions: Submit ---
  const submitFeedback = async () => {
    try {
      submitting.value = true;
      
      // Calculate Average Rating
      let totalScore = 0;
      let count = 0;
      for (const topicId in answers.value) {
        if (answers.value[topicId].rating > 0) {
          totalScore += answers.value[topicId].rating;
          count++;
        }
      }
      const finalRating = count > 0 ? Math.round(totalScore / count) : 0;

      // Insert Parent
      const { data: parentData, error: parentError } = await supabase
        .from("feedbacks")
        .insert({ location_id: locationId, rating: finalRating, issues: [], comment: mainComment.value, status: "pending" })
        .select()
        .single();
      if (parentError) throw parentError;

      // Insert Details
      const detailsToInsert = feedbackTopics.value.map((topic) => ({
        feedback_id: parentData.id,
        topic_id: topic.id,
        rating: answers.value[topic.id].rating,
        comment: answers.value[topic.id].comment,
      }));
      const { error: childError } = await supabase.from("feedback_details").insert(detailsToInsert);
      if (childError) throw childError;

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

  // Return everything needed for the template
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