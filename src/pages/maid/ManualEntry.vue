<script setup>
import { ref, onMounted, computed, watch, onUnmounted, h, render } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Save, CheckCircle2, XCircle } from "lucide-vue-next";
import Swal from "sweetalert2";

// Import Components
import LocationSelector from "@/components/maid/manual/LocationSelector.vue";
import CheckList from "@/components/maid/manual/CheckList.vue";

const router = useRouter();
const userStore = useUserStore();

// --- State ---
const loading = ref(true);
const submitting = ref(false); // ใช้คุมปุ่ม Loading

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

// --- 📍 Helper: ดึง GPS (Robust Version: แก้ปัญหา Timeout) ---
const getCurrentLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    // 1. ลองขอแบบแม่นยำสูงก่อน (High Accuracy)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, long: pos.coords.longitude });
      },
      (error) => {
        console.warn("High accuracy GPS failed, trying low accuracy...", error.message);

        // 2. แผนสำรอง: ขอแบบธรรมดา (Low Accuracy)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({ lat: pos.coords.latitude, long: pos.coords.longitude });
          },
          (err2) => {
            // 3. ถ้ายังไม่ได้อีก ให้ยอมแพ้ แต่ไม่ Throw Error (ส่ง null)
            console.error("GPS Failed completely:", err2.message);
            resolve(null);
          },
          {
            enableHighAccuracy: false, // ปิดโหมดแม่นยำ (ใช้เสา/WiFi)
            timeout: 10000, // ให้เวลา 10 วิ
            maximumAge: 0,
          }
        );
      },
      {
        enableHighAccuracy: true, // เปิดโหมดแม่นยำ
        timeout: 5000, // ให้เวลา 5 วิ (ถ้าเกินนี้ไปแผน 2)
        maximumAge: 0,
      }
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

// --- 🔥 Submit Logic ---
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

  // 2. เริ่ม Process ส่งงาน
  try {
    submitting.value = true;

    // ⏳ Fake Delay
    await new Promise((r) => setTimeout(r, 500));

    // 📍 ดึง GPS (ใช้ฟังก์ชันใหม่ที่แก้แล้ว)
    const gps = await getCurrentLocation();

    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;

    // 🕵️ เช็คงานซ้ำ / งานค้าง
    const { data: existingSession } = await supabase
      .from("check_sessions")
      .select("check_sessions_id, check_sessions_status, created_at, edit_count")
      .eq("locations_id", selectedLocation.value)
      .eq("employees_id", userStore.profile.employees_id)
      .eq("check_sessions_date", localDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // --- กรณี A: เจองานเดิม ---
    if (existingSession) {
      // 1. ถ้างานเดิมสถานะไม่ใช่ waiting (ถูกตรวจแล้ว) -> แจ้งเตือนก่อนส่งใหม่
      if (existingSession.check_sessions_status !== "waiting") {
        const statusMap = {
            approved: 'อนุมัติแล้ว/ผ่าน',
            pass: 'ผ่านแล้ว',
            rejected: 'ส่งกลับแก้ไข',
            fail: 'ไม่ผ่าน',
            fixed: 'แก้ไขแล้ว'
        };
        const statusText = statusMap[existingSession.check_sessions_status] || existingSession.check_sessions_status;

        // 🚨 แจ้งเตือน (แยกปุ่มให้ชัดเจน)
        const confirmNew = await Swal.fire({
            title: 'มีการส่งงานจุดนี้ไปแล้ว',
            html: `งานล่าสุดสถานะ: <b class="text-indigo-600">${statusText}</b><br>คุณต้องการส่งเป็น <b>"รายการใหม่"</b> ใช่หรือไม่?`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'ใช่ ส่งรายการใหม่',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#3b82f6',
            reverseButtons: true
        });

        // ❌ ถ้ากด "ยกเลิก" หรือปิด Popup -> หยุดทันที
        if (!confirmNew.isConfirmed) {
            submitting.value = false;
            return;
        }
        
        // ✅ ถ้ากด "ยืนยัน" -> ปล่อยไหลลงไป Insert ข้างล่าง

      } else {
        // 2. ถ้างานเดิมเป็น Waiting (รอตรวจ) -> ให้แก้ไขได้ภายใน 30 นาที
        const taskTime = new Date(existingSession.created_at).getTime();
        const nowTime = new Date().getTime();
        const diffMinutes = (nowTime - taskTime) / (1000 * 60);

        if (diffMinutes > 30) {
          throw new Error("หมดเวลาแก้ไขงานเดิม (เกิน 30 นาที) กรุณาติดต่อหัวหน้างาน");
        }

        // 🔥 แก้ไขตรงนี้: แยก 3 ทางเลือก (แก้ไข / สร้างใหม่ / ยกเลิก)
        const confirmEdit = await Swal.fire({
          title: "พบงานที่ส่งไปแล้ว",
          text: `คุณเพิ่งส่งงานจุดนี้ไปเมื่อ ${Math.floor(
            diffMinutes
          )} นาทีที่แล้ว`,
          icon: "warning",
          showDenyButton: true,   // ✅ ปุ่มทางเลือกที่ 2 (สร้างใหม่)
          showCancelButton: true, // ✅ ปุ่มยกเลิก
          confirmButtonText: "ใช่ แก้ไขอันเดิม",
          denyButtonText: "สร้างรายการใหม่",
          cancelButtonText: "ยกเลิก",
          confirmButtonColor: "#f59e0b",
          denyButtonColor: "#16a34a",
          cancelButtonColor: "#6b7280",
          reverseButtons: true,
        });

        // 🟢 ทางเลือก 1: แก้ไขอันเดิม (Confirmed)
        if (confirmEdit.isConfirmed) {
          // UPDATE Logic
          const { error: updateErr } = await supabase
            .from("check_sessions")
            .update({
              check_sessions_status: "waiting", // ✅ บังคับ Waiting
              check_sessions_time_start: new Date().toLocaleTimeString("en-GB"),
              lat: gps?.lat || null,
              long: gps?.long || null,
              edit_count: (existingSession.edit_count || 0) + 1,
            })
            .eq("check_sessions_id", existingSession.check_sessions_id);

          if (updateErr) throw updateErr;

          // ลบ Results เก่า ใส่ใหม่
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

          await Swal.fire({ icon: "success", title: "แก้ไขงานเรียบร้อย!", timer: 1500 });
          router.replace("/maid/home");
          return;
        } 
        // 🔴 ทางเลือก 2: ยกเลิก / ปิดหน้าต่าง (Dismissed) -> หยุดทันที
        else if (confirmEdit.isDismissed) {
           submitting.value = false;
           return;
        }
        
        // 🔵 ทางเลือก 3: สร้างรายการใหม่ (Denied) -> ปล่อยไหลลงไป Insert ข้างล่าง
      }
    }

    // --- กรณี B: สร้างงานใหม่ (INSERT) ---
    const sessionData = {
      locations_id: selectedLocation.value,
      restroom_types_id: selectedType.value,
      employees_id: userStore.profile.employees_id,
      check_sessions_date: localDate,
      check_sessions_time_start: new Date().toLocaleTimeString("en-GB"),
      check_sessions_status: "waiting", // ✅ บังคับ Waiting
      lat: gps?.lat || null,
      long: gps?.long || null,
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