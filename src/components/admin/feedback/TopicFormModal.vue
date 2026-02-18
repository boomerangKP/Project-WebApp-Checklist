<script setup>
import { ref, watch } from "vue";
import { X, Save, Loader2 } from "lucide-vue-next";

const props = defineProps({
  isOpen: Boolean,
  mode: String, // 'add' | 'edit'
  initialData: Object,
  loading: Boolean,
});

const emit = defineEmits(["close", "save"]);

const form = ref({
  id: null,
  name: "",
  description: "",
  ordering: 1,
  is_active: true,
});

// Sync ข้อมูลเมื่อเปิด Modal หรือ initialData เปลี่ยน
watch(
  () => props.initialData,
  (newVal) => {
    if (newVal) {
      form.value = {
        id: newVal.id || null,
        name: newVal.name || "",
        description: newVal.description || "",
        ordering: newVal.ordering || 1,
        is_active: newVal.is_active !== undefined ? newVal.is_active : true,
      };
    } else {
      // Reset form
      form.value = { id: null, name: "", description: "", ordering: 1, is_active: true };
    }
  },
  { immediate: true }
);

const submit = () => {
  emit("save", form.value);
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans"
    >
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        @click="$emit('close')"
      ></div>

      <div
        class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 border border-gray-100 dark:border-slate-700 transition-colors duration-300"
      >
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800"
        >
          <h3 class="font-bold text-lg text-gray-900 dark:text-white">
            {{ mode === "add" ? "เพิ่มหัวข้อประเมิน" : "แก้ไขหัวข้อประเมิน" }}
          </h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full p-2 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div>
            <label
              class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5"
            >
              หัวข้อการประเมิน <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="เช่น ความสะอาดของพื้น, กลิ่นภายในห้องน้ำ"
              class="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5"
              >คำอธิบายเพิ่มเติม (Optional)</label
            >
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="เช่น พื้นแห้งสนิท ไม่มีคราบน้ำขัง..."
              class="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <label
                class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5"
                >ลำดับการแสดงผล</label
              >
              <input
                v-model.number="form.ordering"
                type="number"
                min="1"
                class="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label
                class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5"
                >สถานะ</label
              >
              <div class="flex items-center h-[42px]">
                <label class="inline-flex items-center cursor-pointer group">
                  <input type="checkbox" v-model="form.is_active" class="sr-only peer" />
                  <div
                    class="relative w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"
                  ></div>
                  <span
                    class="ms-3 text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
                  >
                    {{ form.is_active ? "ใช้งาน" : "ปิดใช้งาน" }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3"
        >
          <button
            @click="$emit('close')"
            class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all focus:ring-2 focus:ring-gray-200 dark:focus:ring-slate-700"
          >
            ยกเลิก
          </button>
          <button
            @click="submit"
            :disabled="loading"
            class="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-sm shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span>{{ mode === "add" ? "บันทึกข้อมูล" : "บันทึกการแก้ไข" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Optional: ปรับแต่ง Scrollbar ให้สวยงามเข้ากับธีม */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e2e8f0;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #cbd5e1;
}

/* ✅ Dark Mode Scrollbar */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #475569; /* slate-600 */
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #64748b; /* slate-500 */
}
</style>
