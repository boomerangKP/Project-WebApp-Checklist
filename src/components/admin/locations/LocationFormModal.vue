<script setup>
import { reactive, watch, ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import {
  MapPin,
  Hash,
  X,
  ChevronDown,
  Check,
  Plus,
  CheckCircle2,
  Hammer,
  Ban,
  Box,
} from "lucide-vue-next";

const props = defineProps({
  isOpen: Boolean,
  mode: String,
  initialData: Object,
  restroomTypes: Array,
  uniqueBuildings: Array,
  floorsByBuilding: Array,
  loading: Boolean,
});

const emit = defineEmits(["close", "save", "update:building"]);

const formData = reactive({
  id: null,
  code: "",
  name: "",
  building: "",
  floor: "",
  typeId: "",
  status: "active",
});

// --- State สำหรับ Custom Dropdown ---
const activeDropdown = ref(null); // ใช้ตัวแปรเดียวคุมการเปิด/ปิดทั้งหมด
const buildingSearch = ref("");
const floorSearch = ref("");
const buildingInputRef = ref(null);
const floorInputRef = ref(null);

// Config สถานะ
const statusOptions = [
  {
    value: "active",
    label: "ปกติ",
    description: "พร้อมใช้งาน",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    value: "maintenance",
    label: "ปิดปรับปรุง",
    description: "กำลังซ่อมแซม",
    icon: Hammer,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    value: "inactive",
    label: "ปิดใช้งาน",
    description: "เลิกใช้งานถาวร",
    icon: Ban,
    color: "text-gray-500",
    bg: "bg-gray-100",
  },
];

// Initialize Form
watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      if (props.mode === "edit" && props.initialData) {
        const item = props.initialData;
        Object.assign(formData, {
          id: item.locations_id,
          code: item.locations_code,
          name: item.locations_name,
          building: item.locations_building,
          floor: item.locations_floor,
          typeId: item.restroom_types_id,
          status: item.locations_status || "active",
        });
      } else {
        Object.assign(formData, {
          id: null,
          code: "",
          name: "",
          building: "",
          floor: "",
          typeId: props.restroomTypes[0]?.restroom_types_id || "",
          status: "active",
        });
      }
      // Reset Search & UI
      buildingSearch.value = "";
      floorSearch.value = "";
      activeDropdown.value = null;
    }
  }
);

// Watch Building Change
watch(
  () => formData.building,
  (val) => {
    emit("update:building", val);
  }
);

// --- Computed Labels ---
const currentTypeName = computed(() => {
  const found = props.restroomTypes.find((t) => t.restroom_types_id === formData.typeId);
  return found ? found.restroom_types_name : "เลือกประเภท";
});

const currentStatusLabel = computed(() => {
  return statusOptions.find((o) => o.value === formData.status)?.label || formData.status;
});

// --- Filtered Options ---
const filteredBuildings = computed(() => {
  const q = buildingSearch.value.toLowerCase();
  return props.uniqueBuildings.filter((b) => b.toLowerCase().includes(q));
});

const filteredFloors = computed(() => {
  const q = floorSearch.value.toLowerCase();
  return props.floorsByBuilding.filter((f) => String(f).toLowerCase().includes(q));
});

// --- Dropdown Logic ---
const toggleDropdown = async (name) => {
  if (activeDropdown.value === name) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = name;
    // Auto focus search inputs
    await nextTick();
    if (name === "building" && buildingInputRef.value) buildingInputRef.value.focus();
    if (name === "floor" && floorInputRef.value) floorInputRef.value.focus();
  }
};

const closeDropdown = () => {
  activeDropdown.value = null;
};

const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) {
    activeDropdown.value = null;
  }
};

onMounted(() => window.addEventListener("click", handleClickOutside));
onUnmounted(() => window.removeEventListener("click", handleClickOutside));

// --- Actions ---
const selectType = (id) => {
  formData.typeId = id;
  closeDropdown();
};

const selectBuilding = (b) => {
  formData.building = b;
  closeDropdown();
  buildingSearch.value = "";
  formData.floor = "";
};

const createBuilding = () => {
  if (!buildingSearch.value.trim()) return;
  formData.building = buildingSearch.value.trim();
  closeDropdown();
};

const selectFloor = (f) => {
  formData.floor = f;
  closeDropdown();
  floorSearch.value = "";
};

const createFloor = () => {
  if (!floorSearch.value.trim()) return;
  formData.floor = floorSearch.value.trim();
  closeDropdown();
};

const selectStatus = (value) => {
  formData.status = value;
  closeDropdown();
};

const handleSubmit = () => {
  emit("save", { ...formData });
};

const getStatusColor = (status) => {
  const option = statusOptions.find((o) => o.value === status);
  return option ? option.color : "text-gray-500";
};
</script>

<template>
  <div>
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          @click="$emit('close')"
        ></div>

        <div
          class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-visible animate-in zoom-in-95 relative z-10 flex flex-col max-h-[90vh]"
        >
          <div
            class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl shrink-0"
          >
            <h3 class="font-bold text-gray-800 text-lg flex items-center gap-2">
              <MapPin class="w-5 h-5 text-indigo-600" />
              {{ mode === "add" ? "เพิ่มจุดตรวจใหม่" : "แก้ไขข้อมูล" }}
            </h3>
            <button
              @click="$emit('close')"
              class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-6 overflow-y-auto custom-scrollbar">
            <form @submit.prevent="handleSubmit" class="space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs font-bold text-gray-500 uppercase"
                    >รหัส (Code) <span class="text-red-500">*</span></label
                  >
                  <div class="relative">
                    <Hash class="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      v-model="formData.code"
                      type="text"
                      placeholder="Ex. B1-F2-01"
                      class="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div class="space-y-1 relative custom-dropdown-container">
                  <label class="text-xs font-bold text-gray-500 uppercase"
                    >ประเภทห้อง <span class="text-red-500">*</span></label
                  >
                  <div
                    @click="toggleDropdown('type')"
                    class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:bg-white hover:border-emerald-500 transition-colors"
                    :class="{
                      'ring-2 ring-emerald-500 border-emerald-500 bg-white':
                        activeDropdown === 'type',
                    }"
                  >
                    <span>{{ currentTypeName }}</span>
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 transition-transform"
                      :class="{ 'rotate-180': activeDropdown === 'type' }"
                    />
                  </div>

                  <div
                    v-if="activeDropdown === 'type'"
                    class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[70] overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                      <div
                        v-for="t in restroomTypes"
                        :key="t.restroom_types_id"
                        @click="selectType(t.restroom_types_id)"
                        class="px-3 py-2 rounded-md hover:bg-emerald-50 text-sm cursor-pointer flex items-center justify-between"
                      >
                        <span>{{ t.restroom_types_name }}</span>
                        <Check
                          v-if="formData.typeId === t.restroom_types_id"
                          class="w-4 h-4 text-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1 relative custom-dropdown-container">
                  <label class="text-xs font-bold text-gray-500 uppercase"
                    >อาคาร <span class="text-red-500">*</span></label
                  >
                  <div
                    @click="toggleDropdown('building')"
                    class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:bg-white hover:border-emerald-500 transition-colors"
                    :class="{
                      'ring-2 ring-emerald-500 border-emerald-500 bg-white':
                        activeDropdown === 'building',
                    }"
                  >
                    <span :class="formData.building ? 'text-gray-900' : 'text-gray-400'">
                      {{ formData.building || "เลือกอาคาร..." }}
                    </span>
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 transition-transform"
                      :class="{ 'rotate-180': activeDropdown === 'building' }"
                    />
                  </div>

                  <div
                    v-if="activeDropdown === 'building'"
                    class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[70] overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="p-2 border-b border-gray-100">
                      <input
                        v-model="buildingSearch"
                        ref="buildingInputRef"
                        type="text"
                        placeholder="พิมพ์เพื่อค้นหา/สร้าง..."
                        class="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        @click.stop
                      />
                    </div>
                    <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      <div
                        v-for="b in filteredBuildings"
                        :key="b"
                        @click="selectBuilding(b)"
                        class="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer flex items-center justify-between group"
                      >
                        <span>{{ b }}</span>
                        <Check
                          v-if="formData.building === b"
                          class="w-4 h-4 text-emerald-600"
                        />
                      </div>
                      <div
                        v-if="filteredBuildings.length === 0 && buildingSearch"
                        @click="createBuilding"
                        class="px-3 py-2 rounded-lg text-sm text-emerald-600 bg-emerald-50 cursor-pointer flex items-center gap-2"
                      >
                        <Plus class="w-4 h-4" /> สร้าง "{{ buildingSearch }}"
                      </div>
                      <div
                        v-if="filteredBuildings.length === 0 && !buildingSearch"
                        class="px-3 py-2 text-xs text-gray-400 text-center"
                      >
                        ไม่พบข้อมูล
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-1 relative custom-dropdown-container">
                  <label class="text-xs font-bold text-gray-500 uppercase"
                    >ชั้น <span class="text-red-500">*</span></label
                  >
                  <div
                    @click="formData.building ? toggleDropdown('floor') : null"
                    class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-colors"
                    :class="{
                      'opacity-50 cursor-not-allowed': !formData.building,
                      'hover:bg-white hover:border-emerald-500': formData.building,
                      'ring-2 ring-emerald-500 border-emerald-500 bg-white':
                        activeDropdown === 'floor',
                    }"
                  >
                    <span :class="formData.floor ? 'text-gray-900' : 'text-gray-400'">
                      {{ formData.floor || "เลือกชั้น..." }}
                    </span>
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 transition-transform"
                      :class="{ 'rotate-180': activeDropdown === 'floor' }"
                    />
                  </div>

                  <div
                    v-if="activeDropdown === 'floor'"
                    class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[70] overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="p-2 border-b border-gray-100">
                      <input
                        v-model="floorSearch"
                        ref="floorInputRef"
                        type="text"
                        placeholder="ค้นหาชั้น..."
                        class="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        @click.stop
                      />
                    </div>
                    <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      <div
                        v-for="f in filteredFloors"
                        :key="f"
                        @click="selectFloor(f)"
                        class="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer flex items-center justify-between"
                      >
                        <span>ชั้น {{ f }}</span>
                        <Check
                          v-if="String(formData.floor) === String(f)"
                          class="w-4 h-4 text-emerald-600"
                        />
                      </div>
                      <div
                        v-if="filteredFloors.length === 0 && floorSearch"
                        @click="createFloor"
                        class="px-3 py-2 rounded-lg text-sm text-emerald-600 bg-emerald-50 cursor-pointer flex items-center gap-2"
                      >
                        <Plus class="w-4 h-4" /> เพิ่ม "ชั้น {{ floorSearch }}"
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-xs font-bold text-gray-500 uppercase"
                  >ชื่อจุดตรวจ / ห้อง <span class="text-red-500">*</span></label
                >
                <input
                  v-model="formData.name"
                  type="text"
                  placeholder="ระบุชื่อเรียก (เช่น ห้องน้ำชาย ฝั่งซ้าย)"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-gray-900">สถานะการใช้งาน</span>
                  <span
                    class="text-xs transition-colors"
                    :class="getStatusColor(formData.status)"
                  >
                    {{ statusOptions.find((o) => o.value === formData.status)?.label }}
                    ({{
                      statusOptions.find((o) => o.value === formData.status)?.description
                    }})
                  </span>
                </div>

                <div class="relative w-40 custom-dropdown-container">
                  <button
                    type="button"
                    @click="toggleDropdown('status')"
                    class="w-full pl-3 pr-2 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center justify-between hover:border-emerald-500 transition-colors shadow-sm"
                    :class="{
                      'ring-2 ring-emerald-500 border-emerald-500':
                        activeDropdown === 'status',
                    }"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <component
                        :is="statusOptions.find((o) => o.value === formData.status)?.icon"
                        class="w-4 h-4"
                        :class="
                          statusOptions.find((o) => o.value === formData.status)?.color
                        "
                      />
                      <span>{{ currentStatusLabel }}</span>
                    </div>
                    <ChevronDown
                      class="w-4 h-4 text-gray-500 transition-transform"
                      :class="{ 'rotate-180': activeDropdown === 'status' }"
                    />
                  </button>

                  <div
                    v-if="activeDropdown === 'status'"
                    class="absolute bottom-full right-0 mb-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-[70] overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div class="p-1">
                      <div
                        v-for="option in statusOptions"
                        :key="option.value"
                        @click="selectStatus(option.value)"
                        class="px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors group"
                        :class="
                          formData.status === option.value
                            ? option.bg
                            : 'hover:bg-gray-50'
                        "
                      >
                        <component
                          :is="option.icon"
                          class="w-4 h-4"
                          :class="option.color"
                        />
                        <div class="flex flex-col">
                          <span class="text-sm font-medium text-gray-900">{{
                            option.label
                          }}</span>
                          <span class="text-[10px] text-gray-500">{{
                            option.description
                          }}</span>
                        </div>
                        <Check
                          v-if="formData.status === option.value"
                          class="w-4 h-4 text-emerald-600 ml-auto"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-4 flex gap-3 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  @click="$emit('close')"
                  class="flex-1 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  :disabled="loading"
                  class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <span>{{ loading ? "กำลังบันทึก..." : "บันทึกข้อมูล" }}</span>
                </button>
              </div>
            </form>
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
  border-radius: 10px;
}
</style>
