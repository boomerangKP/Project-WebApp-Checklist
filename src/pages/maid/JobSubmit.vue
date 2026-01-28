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
import dayjs from "dayjs";
import "dayjs/locale/th";

// Import Components
import LocationSelector from "@/components/maid/manual/LocationSelector.vue";
import CheckList from "@/components/maid/manual/CheckList.vue";

// ✅ Import Composable เหมือน ManualEntry
import { useJobChecks } from "@/composables/useJobChecks";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const locationId = route.params.id; // รับค่าจาก URL (Scan QR)

// ✅ เรียกใช้ Composable
const { checkExistingSession } = useJobChecks();

// --- State ---
const loading = ref(true);
const submitting = ref(false);
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

// --- 📍 Helper: ดึง GPS ---
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
        resolve(null);
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

    // ดึงข้อมูลสถานที่จาก ID ที่ได้จาก QR Code
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

// --- 🔥 Submit Logic (ปรับให้เหมือน ManualEntry เป๊ะๆ) ---
const onRequestSubmit = async () => {
  // 1. ถามยืนยันก่อน
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

  try {
    submitting.value = true;
    await new Promise((r) => setTimeout(r, 500));
    const gps = await getCurrentLocation();

    // ✅ 1. ใช้ Composable เช็คงานซ้ำ (เหมือน ManualEntry)
    const { existingSession, slotStartTime, todayStr } = await checkExistingSession(
      selectedLocation.value
    );

    // =========================================================
    // 🕵️ LOGIC การตัดสินใจ (Copy จาก ManualEntry มาเลย)
    // =========================================================

    // --- กรณี A: เจองานเดิม ---
    if (existingSession) {
      const isMyWork = existingSession.employees_id === userStore.profile.employees_id;
      const workerName = isMyWork
        ? "คุณ"
        : existingSession.employees?.employees_firstname
        ? `${existingSession.employees.employees_firstname} ${existingSession.employees.employees_lastname}`
        : "พนักงานท่านอื่น";
      const status = existingSession.check_sessions_status;
      const time = dayjs(existingSession.created_at).locale("th").format("HH:mm น.");

      // 🟢 Case 3: ตรวจเสร็จแล้ว (Approved) -> จบงาน
      if (status === "approved") {
        await Swal.fire({
          icon: "success",
          title: "งานนี้เสร็จสมบูรณ์แล้ว",
          html: `งานนี้ถูกตรวจและอนุมัติเรียบร้อยแล้ว<br><span class="text-sm text-gray-500">ไม่จำเป็นต้องส่งซ้ำครับ</span>`,
          confirmButtonColor: "#16a34a",
        });
        submitting.value = false;
        router.replace("/maid/home");
        return;
      }

      // 🟡 Case 2 & 4: รอตรวจ หรือ โดนสั่งแก้
      if (status === "waiting" || status === "rejected") {
        // ถ้าเป็นงานคนอื่น -> บล็อก
        if (!isMyWork) {
          const statusText = status === "rejected" ? "กำลังแก้ไข" : "รอตรวจสอบ";
          await Swal.fire({
            title: "มีผู้ส่งงานนี้ไปแล้ว",
            html: `
                    <div class="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 text-sm space-y-2">
                        <div class="flex justify-between"><span>ผู้ส่ง:</span> <span class="font-bold text-gray-800">${workerName}</span></div>
                        <div class="flex justify-between"><span>สถานะ:</span> <span class="font-bold text-indigo-600">${statusText}</span></div>
                        <div class="flex justify-between"><span>เวลา:</span> <span class="font-bold text-gray-800">${time}</span></div>
                    </div>
                    <div class="mt-4 text-xs text-red-500 font-medium text-center">ไม่อนุญาตให้ส่งงานซ้ำในรอบเดียวกัน</div>
                  `,
            icon: "warning",
            confirmButtonText: "กลับหน้าหลัก",
            confirmButtonColor: "#4f46e5",
            allowOutsideClick: false,
          });
          submitting.value = false;
          router.replace("/maid/home");
          return;
        }

        // 🔥 เช็คโควต้าการแก้ไข
        const MAX_EDITS = 3;
        const currentEdits = existingSession.edit_count || 0;

        if (currentEdits >= MAX_EDITS) {
          await Swal.fire({
            icon: "error",
            title: "เกินโควต้าการแก้ไข",
            html: `งานนี้ถูกแก้ไขไปแล้ว <b>${currentEdits}</b> ครั้ง<br>ซึ่งครบจำนวนที่กำหนดไว้แล้ว<br><span class="text-sm text-gray-500">กรุณาติดต่อ Admin หากต้องการแก้ไขเพิ่มเติม</span>`,
            confirmButtonText: "เข้าใจแล้ว",
            confirmButtonColor: "#d33",
          });
          submitting.value = false;
          return;
        }

        // ถ้าเป็นงานตัวเอง -> ถามยืนยันอัปเดต
        const confirmEdit = await Swal.fire({
          title: "พบงานที่คุณเพิ่งส่ง",
          html: `สถานะ: <b>${
            status === "rejected" ? "ต้องแก้ไข" : "รอตรวจสอบ"
          }</b><br>แก้ไขไปแล้ว: <b>${currentEdits}/${MAX_EDITS}</b> ครั้ง<br>ต้องการอัปเดตข้อมูลใช่หรือไม่?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "ใช่ อัปเดตรายการเดิม",
          cancelButtonText: "ยกเลิก",
          confirmButtonColor: "#f59e0b",
          reverseButtons: true,
        });

        if (confirmEdit.isConfirmed) {
          // ✅ UPDATE LOGIC
          const { error: updateErr } = await supabase
            .from("check_sessions")
            .update({
              check_sessions_status: "waiting",
              lat: gps?.lat || null,
              long: gps?.long || null,
              edit_count: (existingSession.edit_count || 0) + 1,
              updated_at: new Date(),
              employees_id: userStore.profile.employees_id,
            })
            .eq("check_sessions_id", existingSession.check_sessions_id);

          if (updateErr) throw updateErr;

          // 🔥 บันทึก Audit Log
          await supabase.from("audit_logs").insert({
            table_name: "check_sessions",
            record_id: existingSession.check_sessions_id,
            action: "UPDATE",
            old_value: status,
            new_value: "waiting",
            employees_id: userStore.profile.employees_id,
            ip_address: "app-client",
            user_agent: navigator.userAgent,
          });

          // ลบผลเก่า ใส่ใหม่
          await supabase
            .from("check_results")
            .delete()
            .eq("check_sessions_id", existingSession.check_sessions_id);

          const resultsData = checkListItems.value.map((item) => ({
            check_sessions_id: existingSession.check_sessions_id,
            check_items_id: item.check_items_id,
            check_results_status: item.status,
            check_results_detail: item.detail || null,
          }));
          await supabase.from("check_results").insert(resultsData);

          await Swal.fire({ icon: "success", title: "บันทึกการแก้ไขแล้ว!", timer: 1500 });
          router.replace("/maid/home");
          return;
        } else {
          submitting.value = false;
          return;
        }
      }
    }

    // --- กรณี B: สร้างงานใหม่ (INSERT) ---
    const sessionData = {
      locations_id: selectedLocation.value,
      restroom_types_id: selectedType.value,
      employees_id: userStore.profile.employees_id,
      check_sessions_date: todayStr,
      check_sessions_time_start: slotStartTime,
      check_sessions_status: "waiting",
      lat: gps?.lat || null,
      long: gps?.long || null,
      edit_count: 0,
    };

    const { data: session, error: sessErr } = await supabase
      .from("check_sessions")
      .insert(sessionData)
      .select()
      .single();

    // ดัก Error Race Condition
    if (sessErr) {
      if (sessErr.code === "23505" || sessErr.message.includes("unique_job_per_slot")) {
        const { existingSession: conflictJob } = await checkExistingSession(
          selectedLocation.value
        );
        let conflictName = "พนักงานท่านอื่น";
        let conflictTime = "-";
        let conflictStatus = "ไม่ทราบสถานะ";

        if (conflictJob) {
          if (conflictJob.employees) {
            conflictName = `${conflictJob.employees.employees_firstname} ${conflictJob.employees.employees_lastname}`;
          }
          conflictTime = dayjs(conflictJob.created_at).locale("th").format("HH:mm น.");
          const statusMap = {
            waiting: "รอตรวจสอบ",
            approved: "ตรวจแล้ว (ผ่าน)",
            pass: "ผ่านแล้ว",
            rejected: "กำลังแก้ไข",
            fail: "ไม่ผ่าน",
          };
          conflictStatus =
            statusMap[conflictJob.check_sessions_status] ||
            conflictJob.check_sessions_status;
        }

        await Swal.fire({
          title: "มีผู้ส่งงานนี้ไปแล้ว",
          html: `
                    <div class="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 text-sm space-y-2">
                        <div class="flex justify-between"><span>ผู้ส่ง:</span> <span class="font-bold text-gray-800">${conflictName}</span></div>
                        <div class="flex justify-between"><span>สถานะ:</span> <span class="font-bold text-indigo-600">${conflictStatus}</span></div>
                        <div class="flex justify-between"><span>เวลา:</span> <span class="font-bold text-gray-800">${conflictTime}</span></div>
                    </div>
                    <div class="mt-4 text-xs text-red-500 font-medium text-center">ไม่อนุญาตให้ส่งงานซ้ำในรอบเดียวกัน</div>
                  `,
          icon: "warning",
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#4f46e5",
        });
        router.replace("/maid/home");
        return;
      }
      throw sessErr;
    }

    // Insert Results
    const resultsData = checkListItems.value.map((item) => ({
      check_sessions_id: session.check_sessions_id,
      check_items_id: item.check_items_id,
      check_results_status: item.status,
      check_results_detail: item.detail || null,
    }));
    await supabase.from("check_results").insert(resultsData);

    await Swal.fire({
      icon: "success",
      title: "ส่งงานเรียบร้อย!",
      text: "บันทึกข้อมูลสำเร็จแล้ว",
      confirmButtonText: "กลับหน้าหลัก",
      confirmButtonColor: "#16a34a",
      allowOutsideClick: false,
    }).then(() => router.replace("/maid/home"));
  } catch (error) {
    Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
  } finally {
    submitting.value = false;
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
