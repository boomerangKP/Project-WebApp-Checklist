<script setup>
import { ref, onMounted, computed, h, render } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
} from "lucide-vue-next";
import Swal from "sweetalert2";

import LocationSelector from "@/components/maid/manual/LocationSelector.vue";
import CheckList from "@/components/maid/manual/CheckList.vue";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const locationId = route.params.id;

// --- State ---
const loading = ref(true);
const submitting = ref(false); // ใช้ตัวนี้คุมปุ่ม Loading ตอนกดส่ง
const pageStatus = ref("loading");

// --- Data ---
const locationData = ref(null);
const restroomTypes = ref([]);
const checkListItems = ref([]);
const locations = ref([]);
const selectedLocation = ref("");
const selectedType = ref("");

// วันเวลา
const currentDate = ref("");
const currentTime = ref("");

const updateDateTime = () => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  currentTime.value = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// --- Computed ---
const locationName = computed(() =>
  locationData.value
    ? `${locationData.value.locations_name} ( อาคาร ${locationData.value.locations_building} ชั้น ${locationData.value.locations_floor})`
    : "-"
);
const typeName = computed(() => {
  const t = restroomTypes.value.find((r) => r.restroom_types_id == selectedType.value);
  return t ? t.restroom_types_name : "-";
});

const summaryStats = computed(() => {
  const failCount = checkListItems.value.filter((i) => i.status === "fail").length;
  return { pass: checkListItems.value.length - failCount, fail: failCount };
});

const getIconHtml = (component, classes = "") => {
  const div = document.createElement("div");
  const vnode = h(component, { class: classes });
  render(vnode, div);
  return div.innerHTML;
};

// --- 📍 Helper: ดึง GPS (ฟังก์ชันใหม่) ---
const getCurrentLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude }),
      (err) => {
        console.warn("GPS Error:", err);
        resolve(null); // ถ้า Error ให้ส่งค่า null (ยอมให้ส่งงานได้แต่ไม่มีพิกัด)
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
};

// --- Fetch Data ---
const fetchData = async () => {
  try {
    loading.value = true;
    pageStatus.value = "loading";

    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select(
        "locations_id, locations_name, locations_building, locations_floor, restroom_types_id, locations_status"
      )
      .eq("locations_id", locationId)
      .single();

    if (locErr || !loc) {
      pageStatus.value = "not_found";
      throw new Error("ไม่พบข้อมูลสถานที่");
    }

    locationData.value = loc;

    if (loc.locations_status !== "active") {
      pageStatus.value = loc.locations_status;
      loading.value = false;
      return;
    }

    pageStatus.value = "active";
    locations.value = [loc];
    selectedLocation.value = loc.locations_id;
    selectedType.value = loc.restroom_types_id;

    const { data: types } = await supabase.from("restroom_types").select("*");
    restroomTypes.value = types || [];

    const { data: items } = await supabase
      .from("check_items")
      .select("*")
      .eq("check_items_status", "active")
      .order("check_items_order");

    checkListItems.value =
      items.map((item) => ({
        ...item,
        status: "pass",
        detail: "",
      })) || [];
  } catch (error) {
    console.error(error);
    if (pageStatus.value !== "not_found") {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message,
        confirmButtonText: "กลับหน้าหลัก",
      }).then(() => router.replace("/maid/home"));
    }
  } finally {
    loading.value = false;
  }
};

// --- 🔥 Submit Logic (ปรับปรุงใหม่: GPS + Check Existing + Update) ---
const onRequestSubmit = async () => {
  // 1. ถามยืนยันก่อน (UI เดิม)
  const result = await Swal.fire({
    title: "ยืนยันการส่งงาน?",
    html: `
      <div class="text-left bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm space-y-2 mt-2">
        <div class="flex justify-between"><span class="text-gray-500">สถานที่:</span><span class="font-bold text-gray-800 text-right w-2/3">${
          locationName.value
        }</span></div>
        <div class="flex justify-between items-start"><span class="text-gray-500 whitespace-nowrap">ประเภท:</span><span class="font-medium text-gray-700 text-right w-2/3 break-words">${
          typeName.value
        }</span></div>
        <div class="border-t border-gray-200 my-2 pt-2 flex justify-between items-center">
          <span class="text-gray-500">สรุปผลตรวจ:</span>
          <div class="flex gap-2">
             ${
               summaryStats.value.fail > 0
                 ? `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold text-xs flex items-center gap-1">${getIconHtml(
                     XCircle,
                     "w-3.5 h-3.5"
                   )} ${summaryStats.value.fail} ไม่ผ่าน</span>`
                 : ""
             }
             <span class="bg-green-100 text-green-600 px-2 py-0.5 rounded-md font-bold text-xs flex items-center gap-1">${getIconHtml(
               CheckCircle2,
               "w-3.5 h-3.5"
             )} ${summaryStats.value.pass} ผ่าน</span>
          </div>
        </div>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ยืนยันส่งงาน",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#16a34a",
    reverseButtons: true,
  });

  if (!result.isConfirmed) return;

  // 2. เริ่มกระบวนการส่ง
  try {
    submitting.value = true; // ล็อคปุ่ม

    // ⏳ Fake Delay 0.5 วิ (UX)
    await new Promise((r) => setTimeout(r, 500));

    // 📍 ดึง GPS
    const gps = await getCurrentLocation();

    // 🕵️ ตรวจสอบว่ามีงานค้างไหม (Logic กันส่งซ้ำ / แก้ไขงาน)
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;

    const { data: existingSession } = await supabase
      .from("check_sessions")
      .select("check_sessions_id, check_sessions_status, created_at, edit_count")
      .eq("locations_id", selectedLocation.value)
      .eq("employees_id", userStore.profile.employees_id)
      .eq("check_sessions_date", localDate)
      .order("created_at", { ascending: false }) // เอาล่าสุด
      .limit(1)
      .maybeSingle();

    // --- กรณี A: เจองานเดิม ---
    if (existingSession) {
      // กฏ: ถ้าสถานะไม่ใช่ waiting (เช่น approved/rejected ไปแล้ว) -> ให้สร้างใบใหม่เลย (INSERT)
      // หรือถ้าอยาก Block ก็แก้ตรงนี้ได้ แต่นี่ปล่อยให้สร้างใบใหม่เพื่อความยืดหยุ่น
      if (existingSession.check_sessions_status !== "waiting") {
        // ไปทำ INSERT (ข้ามไปข้างล่าง)
      } else {
        // เช็คเวลา 30 นาที
        const taskTime = new Date(existingSession.created_at).getTime();
        const nowTime = new Date().getTime();
        const diffMinutes = (nowTime - taskTime) / (1000 * 60);

        if (diffMinutes > 30) {
          throw new Error("หมดเวลาแก้ไขงานเดิม (เกิน 30 นาที) กรุณาติดต่อหัวหน้างาน");
        }

        // ถามยืนยันการแก้
        const confirmEdit = await Swal.fire({
          title: "พบงานที่ส่งไปแล้ว",
          text: `คุณเพิ่งส่งงานนี้ไปเมื่อ ${Math.floor(
            diffMinutes
          )} นาทีที่แล้ว ต้องการแก้ไขข้อมูลล่าสุดใช่ไหม?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "ใช่ แก้ไขอันเดิม",
          cancelButtonText: "สร้างรายการใหม่", // หรือ 'ยกเลิก' ตามต้องการ
        });

        if (confirmEdit.isConfirmed) {
          // --- UPDATE Logic ---
          // 1. อัปเดต Session (พิกัดใหม่, เวลานับใหม่, edit_count +1)
          const { error: updateErr } = await supabase
            .from("check_sessions")
            .update({
              check_sessions_status: "waiting", // อาจเปลี่ยนสถานะ
              check_sessions_time_start: new Date().toLocaleTimeString("en-GB"), // อัปเดตเวลาล่าสุด
              lat: gps?.lat || null,
              long: gps?.long || null,
              edit_count: (existingSession.edit_count || 0) + 1,
            })
            .eq("check_sessions_id", existingSession.check_sessions_id);

          if (updateErr) throw updateErr;

          // 2. ลบผลการตรวจเก่าทิ้ง (Results)
          await supabase
            .from("check_results")
            .delete()
            .eq("check_sessions_id", existingSession.check_sessions_id);

          // 3. ใส่ผลการตรวจใหม่ (Results)
          const resultsData = checkListItems.value.map((item) => ({
            check_sessions_id: existingSession.check_sessions_id,
            check_items_id: item.check_items_id,
            check_results_status: item.status,
            check_results_detail: item.detail || null,
          }));
          const { error: resErr } = await supabase
            .from("check_results")
            .insert(resultsData);
          if (resErr) throw resErr;

          // จบการทำงาน (Update)
          await Swal.fire({ icon: "success", title: "แก้ไขงานเรียบร้อย!", timer: 1500 });
          router.replace("/maid/home");
          return;
        }
      }
    }

    // --- กรณี B: สร้างงานใหม่ (INSERT) ---
    const sessionData = {
      locations_id: selectedLocation.value,
      restroom_types_id: selectedType.value,
      employees_id: userStore.profile.employees_id,
      check_sessions_date: localDate,
      check_sessions_time_start: new Date().toLocaleTimeString("en-GB"),
      check_sessions_status: "waiting", // หรือ "waiting" ตาม Logic นาย
      lat: gps?.lat || null, // ✅ ใส่พิกัด
      long: gps?.long || null, // ✅ ใส่พิกัด
      edit_count: 0,
    };

    const { data: session, error: sessErr } = await supabase
      .from("check_sessions")
      .insert(sessionData)
      .select()
      .single();
    if (sessErr) throw new Error(sessErr.message);

    const resultsData = checkListItems.value.map((item) => ({
      check_sessions_id: session.check_sessions_id,
      check_items_id: item.check_items_id,
      check_results_status: item.status,
      check_results_detail: item.detail || null,
    }));

    const { error: resErr } = await supabase.from("check_results").insert(resultsData);
    if (resErr) throw new Error(resErr.message);

    await Swal.fire({
      icon: "success",
      title: "ส่งงานเรียบร้อย!",
      confirmButtonColor: "#16a34a",
    });
    router.replace("/maid/home");
  } catch (error) {
    Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
  } finally {
    submitting.value = false; // ปลดล็อคปุ่ม
  }
};

onMounted(() => {
  fetchData();
  updateDateTime();
  setInterval(updateDateTime, 1000);
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <header
      class="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 w-full z-20 flex items-center gap-3"
    >
      <button
        @click="router.replace('/maid/home')"
        class="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
      >
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-lg font-bold text-gray-800">สแกนส่งงาน (Scan Task)</h1>
    </header>

    <div
      v-if="loading"
      class="flex flex-col items-center justify-center h-screen text-gray-400 gap-2"
    >
      <Loader2 class="w-10 h-10 animate-spin text-indigo-500" />
      <span>กำลังตรวจสอบสถานะห้อง...</span>
    </div>

    <div
      v-else-if="pageStatus === 'not_found'"
      class="flex flex-col items-center justify-center h-screen space-y-4 pt-10"
    >
      <XCircle class="w-16 h-16 text-gray-300" />
      <h2 class="text-xl font-bold text-gray-500">ไม่พบข้อมูลสถานที่</h2>
      <button @click="router.replace('/maid/home')" class="text-indigo-600 font-medium">
        กลับหน้าหลัก
      </button>
    </div>

    <div
      v-else-if="pageStatus === 'maintenance'"
      class="flex flex-col items-center justify-center h-screen space-y-6 px-6 pt-10 text-center animate-in zoom-in-95"
    >
      <div class="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center">
        <AlertTriangle class="w-12 h-12 text-orange-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">ปิดปรับปรุงชั่วคราว</h1>
        <p class="text-gray-500 mt-2">{{ locationName }}</p>
        <p class="text-sm text-gray-400 mt-1">
          ขณะนี้ห้องนี้กำลังดำเนินการซ่อมแซม<br />ไม่สามารถส่งงานได้ในขณะนี้
        </p>
      </div>
      <button
        @click="router.replace('/maid/home')"
        class="w-full max-w-xs py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-50"
      >
        กลับหน้าหลัก
      </button>
    </div>

    <div
      v-else-if="pageStatus === 'inactive'"
      class="flex flex-col items-center justify-center h-screen space-y-6 px-6 pt-10 text-center animate-in zoom-in-95"
    >
      <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
        <Ban class="w-12 h-12 text-gray-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">ปิดการใช้งาน</h1>
        <p class="text-gray-500 mt-2">{{ locationName }}</p>
        <p class="text-sm text-gray-400 mt-1">
          ห้องนี้ถูกปิดการใช้งานถาวรแล้ว<br />กรุณาติดต่อหัวหน้างานหากมีข้อสงสัย
        </p>
      </div>
      <button
        @click="router.replace('/maid/home')"
        class="w-full max-w-xs py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700"
      >
        กลับหน้าหลัก
      </button>
    </div>

    <div v-else>
      <main class="p-4 space-y-6 pt-20">
        <LocationSelector
          :locations="locations"
          :restroomTypes="restroomTypes"
          v-model:selectedLocation="selectedLocation"
          v-model:selectedType="selectedType"
          :currentDate="currentDate"
          :currentTime="currentTime"
          :disabledType="true"
          :disabledLocation="true"
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
          class="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-4 rounded-2xl shadow-green-200 shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Loader2 v-if="submitting" class="w-6 h-6 animate-spin" />
          <Save v-else class="w-6 h-6" />

          {{ submitting ? "กำลังส่งข้อมูล..." : "ส่งงาน (Submit Task)" }}
        </button>
      </div>
    </div>
  </div>
</template>
