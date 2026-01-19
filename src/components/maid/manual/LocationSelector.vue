<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import {
  MapPin,
  Calendar,
  Clock,
  Search,
  ChevronDown,
  Check,
  Lock,
  AlertTriangle,
  Ban,
  Layers,
} from "lucide-vue-next"; // ✅ เพิ่ม Layers icon
import { supabase } from "@/lib/supabase";

const props = defineProps({
  locations: { type: Array, default: () => [] },
  restroomTypes: { type: Array, default: () => [] },
  selectedLocation: [String, Number],
  selectedType: [String, Number],
  currentDate: String,
  currentTime: String,
  disabledType: { type: Boolean, default: false },
  disabledLocation: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:selectedLocation",
  "update:selectedType",
  "refresh-locations",
]);

// --- Location Dropdown State ---
const searchQuery = ref("");
const isLocationOpen = ref(false);
const locationRef = ref(null);

// --- Type Dropdown State (เพิ่มใหม่) ---
const isTypeOpen = ref(false);
const typeRef = ref(null);

// --- Logic ---

// 1. Location Filtering
const filteredLocations = computed(() => {
  let items = props.locations;
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      (loc) =>
        loc.locations_name.toLowerCase().includes(query) ||
        loc.locations_building.toLowerCase().includes(query)
    );
  }
  return items;
});

// 2. Display Name for Type (เพื่อให้โชว์ใน Input)
const selectedTypeName = computed(() => {
  const found = props.restroomTypes.find(
    (t) => t.restroom_types_id == props.selectedType
  );
  return found ? found.restroom_types_name : "";
});

// 3. Highlight Text Helper
const getHighlightedText = (loc) => {
  const text = loc.locations_name;
  if (!searchQuery.value) return text;
  return text.replace(
    new RegExp(`(${searchQuery.value})`, "gi"),
    "<span class='font-bold text-emerald-600'>$1</span>"
  );
};

// --- Actions ---

const selectLocation = (loc) => {
  if (loc.locations_status !== "active") return;
  searchQuery.value = loc.locations_name;
  emit("update:selectedLocation", loc.locations_id);
  isLocationOpen.value = false;
};

// ✅ ฟังก์ชันเลือกประเภท (เพิ่มใหม่)
const selectType = (type) => {
  emit("update:selectedType", type.restroom_types_id);
  isTypeOpen.value = false;
};

// --- Watchers ---

// Sync Location Name
watch(
  () => props.selectedLocation,
  (newVal) => {
    const found = props.locations.find((l) => l.locations_id == newVal);
    if (found) {
      if (found.locations_status !== "active" && !props.disabledLocation) {
        searchQuery.value = "";
        emit("update:selectedLocation", "");
      } else {
        searchQuery.value = found.locations_name;
      }
    } else if (!newVal) {
      searchQuery.value = "";
    }
  },
  { immediate: true, deep: true }
);

// Click Outside (ปรับให้รองรับทั้ง 2 Dropdown)
const handleClickOutside = (event) => {
  // ปิด Location Dropdown
  if (locationRef.value && !locationRef.value.contains(event.target)) {
    isLocationOpen.value = false;
    if (!props.selectedLocation) {
      searchQuery.value = "";
    } else {
      const found = props.locations.find((l) => l.locations_id == props.selectedLocation);
      if (found) searchQuery.value = found.locations_name;
    }
  }

  // ปิด Type Dropdown
  if (typeRef.value && !typeRef.value.contains(event.target)) {
    isTypeOpen.value = false;
  }
};

// --- Real-time Subscription ---
let subscription = null;

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  subscription = supabase
    .channel("locations_updates")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "locations" },
      () => emit("refresh-locations")
    )
    .subscribe();
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  if (subscription) supabase.removeChannel(subscription);
});

const getStatusBadge = (status) => {
  switch (status) {
    case "maintenance":
      return {
        text: "ปิดปรับปรุง",
        class: "bg-orange-100 text-orange-600",
        icon: AlertTriangle,
      };
    case "inactive":
      return { text: "ปิดใช้งาน", class: "bg-gray-100 text-gray-500", icon: Ban };
    default:
      return null;
  }
};
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
    <h2 class="font-bold text-gray-800 flex items-center gap-2 text-lg">
      <MapPin class="w-5 h-5 text-emerald-500" />
      ระบุข้อมูลงาน
    </h2>

    <div class="space-y-1.5" ref="locationRef">
      <label class="text-sm font-medium text-gray-700">สถานที่ปฏิบัติงาน</label>
      <div class="relative custom-dropdown-container">
        <input
          type="text"
          v-model="searchQuery"
          @focus="!disabledLocation && (isLocationOpen = true)"
          @input="
            !disabledLocation && (isLocationOpen = true);
            !disabledLocation && emit('update:selectedLocation', '');
          "
          :disabled="disabledLocation"
          placeholder="พิมพ์ชื่อห้อง หรือ ชั้น... (เช่น 101)"
          class="w-full border text-gray-800 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-gray-400"
          :class="
            disabledLocation
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-50 border-gray-200 focus:bg-white'
          "
        />

        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />

        <div
          class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
        >
          <Lock v-if="disabledLocation" class="w-4 h-4 text-gray-400" />
          <ChevronDown
            v-else
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': isLocationOpen }"
          />
        </div>

        <div
          v-if="isLocationOpen && !disabledLocation"
          class="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar"
        >
          <ul v-if="filteredLocations.length > 0">
            <li
              v-for="loc in filteredLocations"
              :key="loc.locations_id"
              @click="selectLocation(loc)"
              class="px-4 py-3 border-b border-gray-50 last:border-0 flex justify-between items-center group transition-colors"
              :class="{
                'hover:bg-emerald-50 cursor-pointer': loc.locations_status === 'active',
                'bg-gray-50 cursor-not-allowed opacity-75':
                  loc.locations_status !== 'active',
                'bg-emerald-50': selectedLocation === loc.locations_id,
              }"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span
                    class="font-medium truncate"
                    :class="
                      loc.locations_status === 'active'
                        ? 'text-gray-800 group-hover:text-emerald-700'
                        : 'text-gray-400 line-through'
                    "
                    v-html="getHighlightedText(loc)"
                  >
                  </span>
                  <span
                    v-if="loc.locations_status !== 'active'"
                    class="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                    :class="getStatusBadge(loc.locations_status).class"
                  >
                    <component
                      :is="getStatusBadge(loc.locations_status).icon"
                      class="w-3 h-3"
                    />
                    {{ getStatusBadge(loc.locations_status).text }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  อาคาร {{ loc.locations_building }} • ชั้น {{ loc.locations_floor }}
                </div>
              </div>
              <Check
                v-if="selectedLocation === loc.locations_id"
                class="w-4 h-4 text-emerald-600"
              />
            </li>
          </ul>
          <div v-else class="p-4 text-center text-gray-400 text-sm">
            ไม่พบสถานที่ "{{ searchQuery }}"
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-1.5" ref="typeRef">
      <label class="text-sm font-medium text-gray-700">ประเภทห้องน้ำ</label>
      <div class="relative custom-dropdown-container">
        <input
          type="text"
          readonly
          :value="selectedTypeName"
          @click="!disabledType && (isTypeOpen = !isTypeOpen)"
          :disabled="disabledType"
          placeholder="-- กรุณาเลือกประเภท --"
          class="w-full border text-gray-800 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-gray-400 cursor-pointer"
          :class="
            disabledType
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-50 border-gray-200 focus:bg-white'
          "
        />

        <Layers class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />

        <div
          class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
        >
          <Lock v-if="disabledType" class="w-4 h-4 text-gray-400" />
          <ChevronDown
            v-else
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': isTypeOpen }"
          />
        </div>

        <div
          v-if="isTypeOpen && !disabledType"
          class="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar"
        >
          <ul>
            <li
              v-for="type in restroomTypes"
              :key="type.restroom_types_id"
              @click="selectType(type)"
              class="px-4 py-3 border-b border-gray-50 last:border-0 flex justify-between items-center group hover:bg-emerald-50 cursor-pointer transition-colors"
              :class="{ 'bg-emerald-50': selectedType === type.restroom_types_id }"
            >
              <span class="font-medium text-gray-700 group-hover:text-emerald-700">
                {{ type.restroom_types_name }}
              </span>
              <Check
                v-if="selectedType === type.restroom_types_id"
                class="w-4 h-4 text-emerald-600"
              />
            </li>
          </ul>
        </div>
      </div>
      <p
        v-if="disabledType || disabledLocation"
        class="text-xs text-emerald-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1"
      >
        <Lock class="w-3 h-3" /> ระบบระบุข้อมูลให้อัตโนมัติตาม สถานที่ปฏิบัติงาน
      </p>
    </div>

    <div
      class="pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 bg-gray-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl mt-2"
    >
      <div class="flex items-center gap-1.5">
        <Calendar class="w-4 h-4" /> {{ currentDate }}
      </div>
      <div class="flex items-center gap-1.5">
        <Clock class="w-4 h-4" /> {{ currentTime }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d1fae5;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #10b981;
}
</style>
