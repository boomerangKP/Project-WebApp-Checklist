<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed } from "vue";
import {
  Search,
  Filter,
  ListFilter,
  CheckSquare,
  Square,
  RotateCcw,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  GripHorizontal,
  ChevronDown,
  ArrowRight,
  Check,
} from "lucide-vue-next";

const props = defineProps({
  activeTab: String,
  searchQuery: String,
  selectedMaid: String,
  maids: { type: Array, default: () => [] },
  isSelectionMode: Boolean,
  isAllSelected: Boolean,
  waitingCount: Number,
  startDate: String,
  endDate: String,
  // รับข้อมูลสำหรับ Suggestion
  searchSuggestions: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "update:activeTab",
  "update:searchQuery",
  "update:selectedMaid",
  "toggleSelectionMode",
  "toggleSelectAll",
  "refresh",
  "update:startDate",
  "update:endDate",
]);

// --- State ---
const isMenuOpen = ref(false);
const modalRef = ref(null);

// --- State สำหรับ Custom Dropdowns & Search ---
const activeDropdown = ref(null);
const showSearchSuggestions = ref(false);

// ตำแหน่งเริ่มต้น
const position = reactive({ top: 100, left: 0 });
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// --- 📅 Logic ปฏิทิน ---
const dateRange = ref("today");
const customStart = ref(new Date().toISOString().slice(0, 10));
const customEnd = ref(new Date().toISOString().slice(0, 10));
const startInputRef = ref(null);
const endInputRef = ref(null);

// ตัวเลือกช่วงเวลา
const dateOptions = [
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "week", label: "7 วันล่าสุด" },
  { value: "month", label: "เดือนนี้" },
  { value: "custom", label: "กำหนดเอง..." },
];

const currentDateLabel = computed(
  () => dateOptions.find((o) => o.value === dateRange.value)?.label || "เลือกช่วงเวลา"
);

// ฟังก์ชันแปลงวันที่แสดงผล
const displayThaiDate = (isoDate) => {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
};

const openStartCalendar = () => {
  if (startInputRef.value?.showPicker) startInputRef.value.showPicker();
};
const openEndCalendar = () => {
  if (endInputRef.value?.showPicker) endInputRef.value.showPicker();
};

// Watchers
watch(dateRange, (newVal) => {
  if (newVal === "custom") return;
  const end = new Date();
  const start = new Date();
  if (newVal === "today") {
    /* วันนี้ */
  } else if (newVal === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (newVal === "week") {
    start.setDate(start.getDate() - 6);
  } else if (newVal === "month") {
    start.setDate(1);
  }
  emit("update:startDate", start.toISOString().slice(0, 10));
  emit("update:endDate", end.toISOString().slice(0, 10));
});

watch([customStart, customEnd], () => {
  if (dateRange.value === "custom") {
    emit("update:startDate", customStart.value);
    emit("update:endDate", customEnd.value);
  }
});

// --- Logic เปิด/ปิด Menu ---
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
  if (isMenuOpen.value) {
    const width = Math.min(window.innerWidth * 0.9, 350);
    position.left = (window.innerWidth - width) / 2;
    position.top = 100;
  }
};

// --- Logic Dropdown & Search ---
const toggleDropdown = (name) => {
  activeDropdown.value = activeDropdown.value === name ? null : name;
};

const closeDropdown = () => {
  activeDropdown.value = null;
};

const selectDateRange = (val) => {
  dateRange.value = val;
  closeDropdown();
};

const selectMaid = (val) => {
  emit("update:selectedMaid", val);
  closeDropdown();
};

const filteredSearchList = computed(() => {
  if (!props.searchQuery) return [];
  return props.searchSuggestions
    .filter((item) => item.toLowerCase().includes(props.searchQuery.toLowerCase()))
    .slice(0, 10);
});

const selectSuggestion = (val) => {
  emit("update:searchQuery", val);
  showSearchSuggestions.value = false;
};

// --- Logic Drag ---
const startDrag = (e) => {
  if (!modalRef.value) return;
  isDragging = true;
  const rect = modalRef.value.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
};

const onDrag = (e) => {
  if (!isDragging) return;
  position.left = e.clientX - dragOffset.x;
  position.top = e.clientY - dragOffset.y;
};

const stopDrag = () => {
  isDragging = false;
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
};

const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) {
    activeDropdown.value = null;
    showSearchSuggestions.value = false;
  }
};

onMounted(() => window.addEventListener("click", handleClickOutside));
onUnmounted(() => {
  window.removeEventListener("click", handleClickOutside);
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
});
</script>

<template>
  <div>
    <div
      class="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-200 shadow-sm gap-3"
    >
      <div
        class="flex overflow-x-auto custom-scrollbar gap-2 flex-1 min-w-0 items-center"
      >
        <button
          v-for="tab in [
            { id: 'waiting', label: 'รอตรวจสอบ', icon: Clock },
            { id: 'approved', label: 'ตรวจแล้ว', icon: CheckCircle2 },
            { id: 'rejected', label: 'แก้ไข', icon: XCircle },
            { id: 'all', label: 'ทั้งหมด', icon: ListFilter },
          ]"
          :key="tab.id"
          @click="$emit('update:activeTab', tab.id)"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border shrink-0"
          :class="
            activeTab === tab.id
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
              : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
          "
        >
          <component :is="tab.icon" class="w-4 h-4" />
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.id === 'waiting' && waitingCount > 0"
            class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 font-bold"
          >
            {{ waitingCount }}
          </span>
        </button>
      </div>

      <div class="flex items-center gap-2 flex-none">
        <button
          @click="$emit('refresh')"
          class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 shadow-sm"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
        <button
          @click="toggleMenu"
          class="flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg shadow-sm active:scale-95 transition-all hover:bg-indigo-700"
        >
          <Filter class="w-4 h-4" />
          <span class="text-sm font-bold hidden sm:inline">ตัวกรอง</span>
          <div
            v-if="
              isMenuOpen || dateRange !== 'today' || searchQuery || selectedMaid !== 'all'
            "
            class="w-2 h-2 rounded-full bg-green-400 animate-pulse"
          ></div>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="isMenuOpen">
        <div class="fixed inset-0 z-[9990] bg-black/5" @click="isMenuOpen = false"></div>

        <div
          ref="modalRef"
          class="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-300 w-[350px] max-w-[95vw] flex flex-col overflow-visible"
          :style="{ top: `${position.top}px`, left: `${position.left}px` }"
        >
          <div
            @mousedown="startDrag"
            class="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center cursor-move select-none rounded-t-xl"
            title="คลิกค้างเพื่อลาก"
          >
            <div class="flex items-center gap-2 text-gray-700 font-bold">
              <GripHorizontal class="w-5 h-5 text-gray-400" />
              <span>ค้นหาและกรอง</span>
            </div>
            <button
              @mousedown.stop
              @click="isMenuOpen = false"
              class="text-gray-400 hover:text-red-500 hover:bg-white rounded-full p-1 transition-all"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-4 space-y-4">
            <div class="space-y-1 relative custom-dropdown-container">
              <label class="text-xs font-bold text-gray-500">ช่วงเวลา</label>
              <button
                @click="toggleDropdown('date')"
                class="w-full h-10 pl-3 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-xs flex items-center justify-between hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                :class="{
                  'border-indigo-500 ring-2 ring-indigo-500': activeDropdown === 'date',
                }"
              >
                <span>{{ currentDateLabel }}</span>
                <ChevronDown
                  class="h-4 w-4 text-gray-400"
                  :class="{ 'rotate-180': activeDropdown === 'date' }"
                />
              </button>
              <div
                v-if="activeDropdown === 'date'"
                class="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
              >
                <div class="p-1">
                  <div
                    v-for="option in dateOptions"
                    :key="option.value"
                    @click="selectDateRange(option.value)"
                    class="px-3 py-2 rounded-md hover:bg-gray-50 text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span>{{ option.label }}</span>
                    <Check
                      v-if="dateRange === option.value"
                      class="w-3 h-3 text-indigo-600"
                    />
                  </div>
                </div>
              </div>
              <div
                v-if="dateRange === 'custom'"
                class="flex items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-100 rounded-lg animate-in slide-in-from-top-1"
              >
                <div
                  class="relative flex-1 cursor-pointer group"
                  @click="openStartCalendar"
                >
                  <div
                    class="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-md group-hover:border-indigo-300 transition-colors"
                  >
                    <Calendar class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="text-xs text-gray-700">{{
                      displayThaiDate(customStart)
                    }}</span>
                  </div>
                  <input
                    ref="startInputRef"
                    type="date"
                    v-model="customStart"
                    class="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <ArrowRight class="w-3 h-3 text-gray-400" />
                <div
                  class="relative flex-1 cursor-pointer group"
                  @click="openEndCalendar"
                >
                  <div
                    class="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-md group-hover:border-indigo-300 transition-colors"
                  >
                    <Calendar class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="text-xs text-gray-700">{{
                      displayThaiDate(customEnd)
                    }}</span>
                  </div>
                  <input
                    ref="endInputRef"
                    type="date"
                    v-model="customEnd"
                    class="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-1 relative custom-dropdown-container">
              <label class="text-xs font-bold text-gray-500">พนักงาน</label>
              <button
                @click="toggleDropdown('maid')"
                class="w-full h-10 pl-3 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-xs flex items-center justify-between hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                :class="{
                  'border-indigo-500 ring-2 ring-indigo-500': activeDropdown === 'maid',
                }"
              >
                <span class="truncate">{{
                  selectedMaid === "all" ? "พนักงานทุกคน" : selectedMaid
                }}</span>
                <Users class="h-4 w-4 text-gray-400" />
              </button>
              <div
                v-if="activeDropdown === 'maid'"
                class="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 max-h-48 overflow-y-auto custom-scrollbar"
              >
                <div class="p-1">
                  <div
                    @click="selectMaid('all')"
                    class="px-3 py-2 rounded-md hover:bg-gray-50 text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span>พนักงานทุกคน</span>
                    <Check
                      v-if="selectedMaid === 'all'"
                      class="w-3 h-3 text-indigo-600"
                    />
                  </div>
                  <div
                    v-for="maid in maids"
                    :key="maid"
                    @click="selectMaid(maid)"
                    class="px-3 py-2 rounded-md hover:bg-gray-50 text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span>{{ maid }}</span>
                    <Check v-if="selectedMaid === maid" class="w-3 h-3 text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-1 relative custom-dropdown-container">
              <label class="text-xs font-bold text-gray-500">ค้นหา</label>
              <div class="relative">
                <Search class="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  :value="searchQuery"
                  @input="
                    (e) => {
                      $emit('update:searchQuery', e.target.value);
                      showSearchSuggestions = true;
                    }
                  "
                  @focus="showSearchSuggestions = true"
                  type="text"
                  placeholder="ระบุคำค้นหา..."
                  class="w-full h-10 pl-9 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  autocomplete="off"
                />
                <div
                  v-if="showSearchSuggestions && filteredSearchList.length > 0"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 max-h-48 overflow-y-auto custom-scrollbar"
                >
                  <div class="p-1">
                    <div
                      v-for="(item, index) in filteredSearchList"
                      :key="index"
                      @click="selectSuggestion(item)"
                      class="px-3 py-2 rounded-md hover:bg-indigo-50 text-xs cursor-pointer flex items-center gap-2 text-gray-700 group transition-colors"
                    >
                      <Search class="w-3 h-3 text-gray-400 group-hover:text-indigo-500" />
                      <span
                        class="truncate"
                        v-html="
                          item.replace(
                            new RegExp(`(${searchQuery})`, 'gi'),
                            '<span class=\'font-bold text-indigo-600\'>$1</span>'
                          )
                        "
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-100 flex gap-2">
              <button
                v-if="activeTab === 'waiting'"
                @click="$emit('toggleSelectionMode')"
                class="flex-1 h-10 rounded-lg border flex items-center justify-center gap-2 bg-white transition-colors"
                :class="
                  isSelectionMode
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                "
              >
                <CheckSquare class="w-4 h-4" />
                {{ isSelectionMode ? "ยกเลิก" : "เลือกรายการ" }}
              </button>
              <button
                v-if="isSelectionMode"
                @click="$emit('toggleSelectAll')"
                class="flex-1 h-10 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <Square class="w-4 h-4" /> เลือกทั้งหมด
              </button>
            </div>

            <button
              @click="isMenuOpen = false"
              class="w-full h-10 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
            >
              เสร็จสิ้น / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
</style>
