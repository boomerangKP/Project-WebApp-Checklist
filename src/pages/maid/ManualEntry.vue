<script setup>
import { ref, onMounted, computed, watch, onUnmounted, h, render } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { supabase } from "@/lib/supabase";
import { useJobChecks } from "@/composables/useJobChecks"; // ✅ เรียกใช้ Composable
import { ArrowLeft, Loader2, Save, CheckCircle2, XCircle } from "lucide-vue-next";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import "dayjs/locale/th";

// Import Components
import LocationSelector from "@/components/maid/manual/LocationSelector.vue";
import CheckList from "@/components/maid/manual/CheckList.vue";

const router = useRouter();
const userStore = useUserStore();
const { checkExistingSession } = useJobChecks(); // ✅ ดึงฟังก์ชันมาใช้

// --- State ---
const loading = ref(true);
const submitting = ref(false);

// --- Data ---
const locations = ref([]);
const restroomTypes = ref([]);
const checkListItems = ref([]);
const selectedLocation = ref("");
const selectedType = ref("");

// วันเวลาปัจจุบัน
const currentDate = ref("");
const currentTime = ref("");
let timerInterval = null;

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
  return {
    pass: checkListItems.value.length - failCount,
    fail: failCount,
  };
});

// --- Helper แปลง Icon เป็น HTML ---
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
        console.warn("GPS High Accuracy failed:", err.message);
        navigator.geolocation.getCurrentPosition(
          (pos2) => resolve({ lat: pos2.coords.latitude, long: pos2.coords.longitude }),
          (err2) => {
            console.error("GPS Failed:", err2.message);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
};

// --- Watcher ---
watch(selectedLocation, (newLocId) => {
  if (newLocId) {
    const targetLoc = locations.value.find((l) => l.locations_id == newLocId);

    if (targetLoc && targetLoc.locations_status !== "active") {
      selectedLocation.value = "";
      selectedType.value = "";
      Swal.fire("แจ้งเตือน", "สถานที่นี้ปิดใช้งานชั่วคราว", "warning");
      return;
    }

    if (targetLoc && targetLoc.restroom_types_id) {
      selectedType.value = targetLoc.restroom_types_id;
    } else {
      selectedType.value = "";
    }
  } else {
    selectedType.value = "";
  }
});

// --- Fetch Data ---
const fetchInitialData = async () => {
  try {
    const { data: locs } = await supabase
      .from("locations")
      .select(
        "locations_id, locations_name, locations_building, locations_floor, restroom_types_id, locations_status"
      )
      .order("locations_name");
    locations.value = locs || [];

    const { data: types } = await supabase
      .from("restroom_types")
      .select("*")
      .eq("restroom_types_status", "active");
    restroomTypes.value = types || [];

    if (checkListItems.value.length === 0) {
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
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// --- 🔥 Submit Logic (รวม 5 Case) ---
const onRequestSubmit = async () => {
  if (!selectedLocation.value) {
    Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: 'กรุณาระบุ "สถานที่" ที่ปฏิบัติงาน',
      confirmButtonColor: "#f59e0b",
    });
    return;
  }
  if (!selectedType.value) {
    Swal.fire({
      icon: "error",
      title: "ข้อมูลผิดพลาด",
      text: "ไม่พบประเภทห้องน้ำ (แจ้ง Admin)",
      confirmButtonColor: "#ef4444",
    });
    return;
  }

  // 1. ถามยืนยัน
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

    // ✅ 1. ใช้ Composable เช็คงานซ้ำ (Logic กลาง)
    const { existingSession, slotStartTime, todayStr } = await checkExistingSession(
      selectedLocation.value
    );

    // =========================================================
    // 🕵️ LOGIC การตัดสินใจ (Decision Tree)
    // =========================================================

    // --- กรณี A: เจองานเดิม (Duplicate Found) ---
    if (existingSession) {
      const isMyWork = existingSession.employees_id === userStore.profile.employees_id;
      const workerName = isMyWork
        ? "คุณ"
        : existingSession.employees?.employees_firstname
        ? `${existingSession.employees.employees_firstname} ${existingSession.employees.employees_lastname}`
        : "พนักงานท่านอื่น";
      const status = existingSession.check_sessions_status;
      const time = dayjs(existingSession.created_at).locale("th").format("HH:mm น.");

      // 🟢 Case 3: ตรวจเสร็จแล้ว (Approved) -> จบงาน ห้ามแก้ ห้ามซ้ำ
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

      // 🟡 Case 2 & 4: รอตรวจ (Waiting) หรือ โดนสั่งแก้ (Rejected)
      // อนุญาตให้ "แก้ไขงานเดิม" ได้ (Update)
      if (status === "waiting" || status === "rejected") {
        // ถ้าเป็นงานคนอื่น -> บล็อก (Case 1) พร้อมรายละเอียดครบ
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

        // 🔥🔥🔥 [เพิ่ม] เช็คโควต้าการแก้ไข (Max Edit Limit) 🔥🔥🔥
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
          return; // ❌ จบการทำงานทันที ห้ามไปต่อ
        }

        // ถ้าเป็นงานตัวเอง -> ถามยืนยันการอัปเดต (Case 2, 4)
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
          // ✅ UPDATE LOGIC (Case 5: Fixed Slot, Audit Trail)
          const { error: updateErr } = await supabase
            .from("check_sessions")
            .update({
              check_sessions_status: "waiting", // กลับมารอตรวจเสมอ
              // ❌ check_sessions_time_start: ... // ห้ามแก้เวลาเริ่ม!
              lat: gps?.lat || null,
              long: gps?.long || null,
              edit_count: (existingSession.edit_count || 0) + 1,
              updated_at: new Date(), // เวลาแก้ไขล่าสุด
              employees_id: userStore.profile.employees_id, // เปลี่ยนคนรับผิดชอบเป็นคนล่าสุด
            })
            .eq("check_sessions_id", existingSession.check_sessions_id);

          if (updateErr) throw updateErr;

          // 🔥 บันทึก Audit Log (Case 5)
          await supabase.from("audit_logs").insert({
            table_name: "check_sessions",
            record_id: existingSession.check_sessions_id,
            action: "UPDATE",
            old_value: status, // เก็บสั้นๆ
            new_value: "waiting",
            employees_id: userStore.profile.employees_id,
            ip_address: "app-client",
            user_agent: navigator.userAgent,
          });

          // ลบผลตรวจเก่า ใส่ใหม่
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
    // (ทำงานเมื่อยังไม่มีใครส่งงานใน Slot นี้)
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

    // ดัก Error เผื่อ Race Condition (Case 1: กดพร้อมกันเป๊ะ)
    if (sessErr) {
      if (sessErr.code === "23505" || sessErr.message.includes("unique_job_per_slot")) {
        // ดึงข้อมูลคนตัดหน้ามาแสดง (ถ้ามี)
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

    await Swal.fire({ icon: "success", title: "ส่งงานเรียบร้อย!", timer: 1500 });
    router.replace("/maid/home");
  } catch (error) {
    console.error(error);
    Swal.fire("เกิดข้อผิดพลาด", error.message || "Error", "error");
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchInitialData();
  updateDateTime();
  timerInterval = setInterval(updateDateTime, 1000);
});

onUnmounted(() => clearInterval(timerInterval));
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <header
      class="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 w-full z-20 flex items-center gap-3"
    >
      <button
        @click="router.back()"
        class="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
      >
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-lg font-bold text-gray-800">บันทึกงาน (Manual)</h1>
    </header>

    <div
      v-if="loading"
      class="flex flex-col items-center justify-center h-64 text-gray-400 gap-2 pt-20"
    >
      <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
      <span>กำลังดึงรายการ...</span>
    </div>

    <main v-else class="p-4 space-y-6 pt-20">
      <LocationSelector
        :locations="locations"
        :restroomTypes="restroomTypes"
        v-model:selectedLocation="selectedLocation"
        v-model:selectedType="selectedType"
        :currentDate="currentDate"
        :currentTime="currentTime"
        :disabledType="!!selectedLocation"
        @refresh-locations="fetchInitialData"
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
        {{ submitting ? "กำลังบันทึก..." : "ส่งงาน (Submit Task)" }}
      </button>
    </div>
  </div>
</template>
