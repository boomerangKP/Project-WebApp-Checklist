<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
  Search,
  UserPlus,
  ChevronDown,
  Check,
  Filter,
  Shield,
  User,
  Briefcase,
} from "lucide-vue-next";

const props = defineProps({
  searchQuery: String,
  roleFilter: String,
  statusFilter: String,
  // ✅ เพิ่ม Prop สำหรับ Search Suggestion (ส่งมาจาก Parent)
  searchSuggestions: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "update:searchQuery",
  "update:roleFilter",
  "update:statusFilter",
  "add",
]);

// --- State ---
const activeDropdown = ref(null);
const showSearchSuggestions = ref(false);

// --- Helper Data (สำหรับแสดงผลใน Dropdown) ---
const roleOptions = [
  { value: "all", label: "ทุกตำแหน่ง" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
  { value: "maid", label: "แม่บ้าน" },
  { value: "cleaner", label: "พนักงานทำความสะอาด" },
  { value: "user", label: "พนักงานทั่วไป" },
  { value: "supervisor", label: "หัวหน้าพนักงาน" },
];

const statusOptions = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "active", label: "ปกติ" },
  { value: "inactive", label: "ไม่เคลื่อนไหว" },
  { value: "suspended", label: "ระงับ" },
];

// --- Computed Labels ---
const currentRoleLabel = computed(
  () => roleOptions.find((r) => r.value === props.roleFilter)?.label || "ทุกตำแหน่ง"
);

const currentStatusLabel = computed(
  () => statusOptions.find((s) => s.value === props.statusFilter)?.label || "ทุกสถานะ"
);

// --- Search Suggestion Logic ---
const filteredSearchList = computed(() => {
  if (!props.searchQuery) return [];
  return props.searchSuggestions
    .filter((item) => item.toLowerCase().includes(props.searchQuery.toLowerCase()))
    .slice(0, 10);
});

// --- Actions ---
const toggleDropdown = (name) => {
  activeDropdown.value = activeDropdown.value === name ? null : name;
};

const closeDropdown = () => {
  activeDropdown.value = null;
};

const selectRole = (val) => {
  emit("update:roleFilter", val);
  closeDropdown();
};

const selectStatus = (val) => {
  emit("update:statusFilter", val);
  closeDropdown();
};

const selectSuggestion = (val) => {
  emit("update:searchQuery", val);
  showSearchSuggestions.value = false;
};

// --- Click Outside ---
const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) {
    activeDropdown.value = null;
    showSearchSuggestions.value = false;
  }
};

onMounted(() => window.addEventListener("click", handleClickOutside));
onUnmounted(() => window.removeEventListener("click", handleClickOutside));
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-3 justify-between items-center transition-colors duration-300"
  >
    <div class="relative w-full md:w-72 lg:w-80 shrink-0 custom-dropdown-container">
      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="h-4 w-4 text-gray-400 dark:text-slate-500" />
      </span>
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
        class="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 outline-none transition-all"
        placeholder="ค้นหาชื่อ, รหัส หรือ เบอร์โทร"
        autocomplete="off"
      />

      <div
        v-if="showSearchSuggestions && filteredSearchList.length > 0"
        class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        <div class="max-h-60 overflow-y-auto p-1 custom-scrollbar">
          <div
            v-for="(item, index) in filteredSearchList"
            :key="index"
            @click="selectSuggestion(item)"
            class="px-3 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-slate-700 text-sm cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-200 group transition-colors"
          >
            <Search
              class="w-3 h-3 text-gray-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
            />
            <span
              class="truncate"
              v-html="
                item.replace(
                  new RegExp(`(${searchQuery})`, 'gi'),
                  '<span class=\'font-bold text-emerald-600 dark:text-emerald-400\'>$1</span>'
                )
              "
            ></span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
      <div class="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
        <div class="relative custom-dropdown-container w-full sm:w-auto">
          <button
            @click="toggleDropdown('role')"
            class="w-full sm:w-40 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-200 hover:border-emerald-500 dark:hover:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 transition-all flex items-center justify-between"
            :class="{
              'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900':
                activeDropdown === 'role',
            }"
          >
            <div class="flex items-center gap-2 truncate">
              <Shield
                v-if="roleFilter === 'admin'"
                class="w-4 h-4 text-purple-500 dark:text-purple-400"
              />
              <Briefcase
                v-else-if="roleFilter !== 'all'"
                class="w-4 h-4 text-emerald-500 dark:text-emerald-400"
              />
              <Filter v-else class="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <span class="truncate">{{ currentRoleLabel }}</span>
            </div>
            <ChevronDown
              class="w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform"
              :class="{ 'rotate-180': activeDropdown === 'role' }"
            />
          </button>

          <div
            v-if="activeDropdown === 'role'"
            class="absolute top-full right-0 mt-1 w-full sm:w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div class="p-1">
              <div
                v-for="opt in roleOptions"
                :key="opt.value"
                @click="selectRole(opt.value)"
                class="px-3 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-slate-700 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200"
              >
                <span>{{ opt.label }}</span>
                <Check
                  v-if="roleFilter === opt.value"
                  class="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="relative custom-dropdown-container w-full sm:w-auto">
          <button
            @click="toggleDropdown('status')"
            class="w-full sm:w-36 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-200 hover:border-emerald-500 dark:hover:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 transition-all flex items-center justify-between"
            :class="{
              'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900':
                activeDropdown === 'status',
            }"
          >
            <span class="truncate">{{ currentStatusLabel }}</span>
            <ChevronDown
              class="w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform"
              :class="{ 'rotate-180': activeDropdown === 'status' }"
            />
          </button>

          <div
            v-if="activeDropdown === 'status'"
            class="absolute top-full right-0 mt-1 w-full sm:w-36 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div class="p-1">
              <div
                v-for="opt in statusOptions"
                :key="opt.value"
                @click="selectStatus(opt.value)"
                class="px-3 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-slate-700 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200"
              >
                <span>{{ opt.label }}</span>
                <Check
                  v-if="statusFilter === opt.value"
                  class="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="$emit('add')"
        class="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm shadow-emerald-200 dark:shadow-none transition-all active:scale-95 text-sm whitespace-nowrap"
      >
        <UserPlus class="w-4 h-4" />
        เพิ่มพนักงาน
      </button>
    </div>
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
  background: #d1fae5;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #10b981;
}

/* ✅ Dark Mode Scrollbar */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #059669; /* emerald-600 */
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #047857; /* emerald-700 */
}
</style>
