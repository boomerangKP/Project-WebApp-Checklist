<script setup>
import { ref, onMounted, computed, watch } from "vue"; // ✅
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";

// Import Components
import LocationSelector from "@/components/maid/manual/LocationSelector.vue";
import CheckList from "@/components/maid/manual/CheckList.vue";
import SubmitModals from "@/components/maid/manual/SubmitModals.vue";

const router = useRouter();
const userStore = useUserStore();

// --- State ---
const loading = ref(true);
const submitting = ref(false);
const showConfirmModal = ref(false);
const showSuccessModal = ref(false);
const showWarningModal = ref(false);
const warningMessage = ref("");

// --- Data ---
const locations = ref([]);
const restroomTypes = ref([]);
const checkListItems = ref([]);
const selectedLocation = ref("");
const selectedType = ref("");

const currentDate = new Date().toLocaleDateString("th-TH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const currentTime = ref(
  new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
);

// --- Computed ---
const locationName = computed(() => {
  const loc = locations.value.find((l) => l.locations_id == selectedLocation.value);
  return loc
    ? `${loc.locations_name} (${loc.locations_building} ชั้น ${loc.locations_floor})`
    : "-";
});

const typeName = computed(() => {
  const type = restroomTypes.value.find((t) => t.restroom_types_id == selectedType.value);
  return type ? type.restroom_types_name : "-";
});

const summaryStats = computed(() => {
  const failCount = checkListItems.value.filter((i) => i.status === "fail").length;
  return { pass: checkListItems.value.length - failCount, fail: failCount };
});

// --- 🔥 WATCHER: เลือกสถานที่ปุ๊บ ใส่ประเภทให้เลย ---
watch(selectedLocation, (newLocId) => {
  if (newLocId) {
    // หาข้อมูลสถานที่ที่ถูกเลือก
    const targetLoc = locations.value.find((l) => l.locations_id == newLocId);

    // ถ้าสถานที่นั้นมี restroom_types_id ผูกอยู่ -> ใส่ค่าให้ selectedType ทันที
    if (targetLoc && targetLoc.restroom_types_id) {
      selectedType.value = targetLoc.restroom_types_id;
    } else {
      selectedType.value = ""; // เผื่อไว้กรณีข้อมูลไม่ครบ
    }
  } else {
    selectedType.value = "";
  }
});

// --- Fetch Data ---
const fetchInitialData = async () => {
  try {
    loading.value = true;

    // 1. Locations: 🔥 เพิ่ม restroom_types_id เข้าไปใน select
    const { data: locs } = await supabase
      .from("locations")
      .select(
        "locations_id, locations_name, locations_building, locations_floor, restroom_types_id"
      ) // 👈 ต้องมีอันนี้
      .eq("locations_status", "active")
      .order("locations_name");
    locations.value = locs || [];

    // 2. Restroom Types
    const { data: types } = await supabase
      .from("restroom_types")
      .select("*")
      .eq("restroom_types_status", "active");
    restroomTypes.value = types || [];

    // 3. Check Items
    const { data: items } = await supabase
      .from("check_items")
      .select("*")
      .eq("check_items_status", "active")
      .order("check_items_order");
    checkListItems.value = items.map((item) => ({ ...item, status: "pass" })) || [];
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// --- Logic ---
const onRequestSubmit = () => {
  if (!selectedLocation.value) {
    warningMessage.value = 'กรุณาระบุ "สถานที่" ที่ปฏิบัติงานให้เรียบร้อย';
    showWarningModal.value = true;
    return;
  }
  // เช็คว่าประเภทห้องน้ำถูกเลือกหรือยัง (ระบบควรเลือกให้แล้ว)
  if (!selectedType.value) {
    warningMessage.value = "ไม่พบประเภทห้องน้ำของสถานที่นี้ (กรุณาแจ้ง Admin)";
    showWarningModal.value = true;
    return;
  }
  showConfirmModal.value = true;
};

const confirmSubmit = async () => {
  showConfirmModal.value = false;
  submitting.value = true;
  try {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const localDate = `${year}-${month}-${day}`;

    // 1. Insert Session
    const sessionData = {
      locations_id: selectedLocation.value,
      restroom_types_id: selectedType.value,
      employees_id: userStore.profile.employees_id,
      check_sessions_date: localDate,
      check_sessions_time_start: new Date().toLocaleTimeString("en-GB"),
      check_sessions_status: checkListItems.value.some((i) => i.status === "fail")
        ? "fail"
        : "pass",
    };

    const { data: session, error: sessErr } = await supabase
      .from("check_sessions")
      .insert(sessionData)
      .select()
      .single();
    if (sessErr) throw sessErr;

    // 2. Insert Results
    const resultsData = checkListItems.value.map((item) => ({
      check_sessions_id: session.check_sessions_id,
      check_items_id: item.check_items_id,
      check_results_status: item.status,
    }));

    const { error: resErr } = await supabase.from("check_results").insert(resultsData);
    if (resErr) throw resErr;

    // 3. Success
    showSuccessModal.value = true;
  } catch (err) {
    warningMessage.value = "เกิดข้อผิดพลาด: " + err.message;
    showWarningModal.value = true;
  } finally {
    submitting.value = false;
  }
};

onMounted(fetchInitialData);
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <header
      class="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3"
    >
      <button
        @click="router.back()"
        class="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"
      >
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-lg font-bold text-gray-800">บันทึกงาน (Manual)</h1>
    </header>

    <div
      v-if="loading"
      class="flex flex-col items-center justify-center h-64 text-gray-400 gap-2"
    >
      <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
      <span>กำลังดึงรายการ...</span>
    </div>

    <main v-else class="p-4 space-y-6">
      <LocationSelector
        :locations="locations"
        :restroomTypes="restroomTypes"
        v-model:selectedLocation="selectedLocation"
        v-model:selectedType="selectedType"
        :currentDate="currentDate"
        :currentTime="currentTime"
        :disabledType="!!selectedLocation"
      />

      <CheckList
        :items="checkListItems"
        @toggle="
          (i) =>
            (checkListItems[i].status =
              checkListItems[i].status === 'pass' ? 'fail' : 'pass')
        "
        @camera="() => {}"
      />
    </main>

    <div
      class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-20"
    >
      <button
        @click="onRequestSubmit"
        :disabled="submitting || loading"
        class="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-2xl shadow-green-200 shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
      >
        <Loader2 v-if="submitting" class="w-6 h-6 animate-spin" />
        <Save v-else class="w-6 h-6" />
        {{ submitting ? "กำลังส่งข้อมูล..." : "ส่งงาน (Submit Task)" }}
      </button>
    </div>

    <SubmitModals
      :showConfirm="showConfirmModal"
      :showSuccess="showSuccessModal"
      :showWarning="showWarningModal"
      :warningMessage="warningMessage"
      :locationName="locationName"
      :typeName="typeName"
      :stats="summaryStats"
      @closeConfirm="showConfirmModal = false"
      @closeWarning="showWarningModal = false"
      @confirmSubmit="confirmSubmit"
      @finish="
        () => {
          showSuccessModal = false;
          router.replace('/maid/home');
        }
      "
    />
  </div>
</template>
