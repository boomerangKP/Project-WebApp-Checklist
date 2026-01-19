<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { X, RotateCcw, Search, Check } from "lucide-vue-next";

const props = defineProps({
  isOpen: Boolean,
  locations: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "apply"]);

// --- Local State ---
const selectedStatus = ref("all");
const selectedPeriod = ref("today");
const selectedLocation = ref("");

// --- Searchable Dropdown State ---
const searchQuery = ref("");
const isDropdownOpen = ref(false);
const dropdownRef = ref(null);

// --- Logic กรองรายการสถานที่ ---
const filteredLocations = computed(() => {
  if (!searchQuery.value) return props.locations;
  const q = searchQuery.value.toLowerCase();
  return props.locations.filter(
    (loc) =>
      loc.locations_name.toLowerCase().includes(q) ||
      loc.locations_building.toLowerCase().includes(q)
  );
});

// ชื่อสถานที่ที่เลือก (ไว้โชว์ตอนเลือกเสร็จ)
const selectedLocationName = computed(() => {
  if (!selectedLocation.value) return "";
  const found = props.locations.find((l) => l.locations_id === selectedLocation.value);
  return found ? `${found.locations_name} (${found.locations_building})` : "";
});

// --- Helper: Highlight ข้อความ (ตามตัวอย่างของคุณ) ---
const getHighlightedText = (loc) => {
  const text = `${loc.locations_name} (${loc.locations_building})`;
  if (!searchQuery.value) return text;
  // ใช้ Regex เพื่อแทนที่คำที่ตรงกันด้วย span สีเขียว
  return text.replace(
    new RegExp(`(${searchQuery.value})`, "gi"),
    "<span class='font-bold text-emerald-600'>$1</span>"
  );
};

// --- Watchers ---
watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      searchQuery.value = selectedLocationName.value;
    }
  }
);

// --- Actions ---
const selectLocation = (loc) => {
  selectedLocation.value = loc.locations_id;
  searchQuery.value = `${loc.locations_name} (${loc.locations_building})`;
  isDropdownOpen.value = false;
};

const clearLocation = () => {
  selectedLocation.value = "";
  searchQuery.value = "";
  isDropdownOpen.value = false;
};

const resetFilter = () => {
  selectedStatus.value = "all";
  selectedPeriod.value = "today";
  clearLocation();
};

const applyFilter = () => {
  emit("apply", {
    status: selectedStatus.value,
    period: selectedPeriod.value,
    location: selectedLocation.value,
  });
  emit("close");
};

// --- Click Outside ---
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false;
    if (selectedLocation.value) {
      searchQuery.value = selectedLocationName.value;
    } else {
      searchQuery.value = "";
    }
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none"
  >
    <div
      @click="$emit('close')"
      class="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
    ></div>

    <div
      class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl pointer-events-auto transform transition-transform animate-in slide-in-from-bottom-10 sm:fade-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar"
    >
      <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <h3 class="text-xl font-bold text-gray-800">กรองประวัติงาน</h3>
        <button
          @click="$emit('close')"
          class="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="space-y-6">
        <div class="space-y-2">
          <label class="font-bold text-gray-700 text-sm">สถานะ:</label>
          <div class="flex flex-wrap gap-2">
            <button
              @click="selectedStatus = 'all'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm"
              :class="
                selectedStatus === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              "
            >
              ทั้งหมด
            </button>
            <button
              @click="selectedStatus = 'pass'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm"
              :class="
                selectedStatus === 'pass'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'
              "
            >
              ตรวจแล้ว
            </button>
            <button
              @click="selectedStatus = 'waiting'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm"
              :class="
                selectedStatus === 'waiting'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50'
              "
            >
              รอตรวจ
            </button>
            <button
              @click="selectedStatus = 'fail'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm"
              :class="
                selectedStatus === 'fail'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50'
              "
            >
              แก้ไข
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="font-bold text-gray-700 text-sm">ช่วงเวลา:</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="p in [
                { k: 'today', l: 'วันนี้' },
                { k: '7days', l: '7 วันล่าสุด' },
                { k: 'month', l: 'เดือนนี้' },
                { k: 'all', l: 'ทั้งหมด' },
              ]"
              :key="p.k"
              @click="selectedPeriod = p.k"
              class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors shadow-sm"
              :class="
                selectedPeriod === p.k
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-emerald-50'
              "
            >
              {{ p.l }}
            </button>
          </div>
        </div>

        <div class="space-y-2" ref="dropdownRef">
          <label class="font-bold text-gray-700 text-sm">สถานที่:</label>

          <div class="relative w-full custom-dropdown-container">
            <span
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <Search class="h-4 w-4 text-gray-400" />
            </span>

            <input
              v-model="searchQuery"
              @focus="isDropdownOpen = true"
              @input="isDropdownOpen = true"
              type="text"
              class="block w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="ค้นหา หรือเลือกสถานที่..."
              autocomplete="off"
            />

            <button
              v-if="searchQuery"
              @click="clearLocation"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
            >
              <X class="w-3.5 h-3.5" />
            </button>

            <div
              v-if="isDropdownOpen"
              class="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            >
              <div class="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                <div
                  v-if="filteredLocations.length === 0"
                  class="px-4 py-3 text-center text-gray-400 text-sm"
                >
                  ไม่พบสถานที่ "{{ searchQuery }}"
                </div>

                <div
                  v-for="loc in filteredLocations"
                  :key="loc.locations_id"
                  @click="selectLocation(loc)"
                  class="px-3 py-2 rounded-md hover:bg-emerald-50 text-sm cursor-pointer flex items-center justify-between text-gray-700 group transition-colors"
                  :class="{ 'bg-emerald-50': selectedLocation === loc.locations_id }"
                >
                  <div class="flex items-center gap-2 overflow-hidden">
                    <Search
                      class="w-3 h-3 text-gray-400 group-hover:text-emerald-500 shrink-0"
                    />
                    <span class="truncate" v-html="getHighlightedText(loc)"></span>
                  </div>
                  <Check
                    v-if="selectedLocation === loc.locations_id"
                    class="w-4 h-4 text-emerald-600 shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 flex gap-3 pt-4 border-t border-gray-50">
        <button
          @click="resetFilter"
          class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors flex justify-center items-center gap-2 active:scale-95"
        >
          <RotateCcw class="w-4 h-4" /> รีเซ็ต
        </button>
        <button
          @click="applyFilter"
          class="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all hover:shadow-emerald-300 active:scale-95"
        >
          นำไปใช้
        </button>
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
  background-color: #d1fae5; /* สีเขียวอ่อนๆ */
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #10b981; /* สีเขียวเข้มขึ้นเมื่อ hover */
}
</style>
