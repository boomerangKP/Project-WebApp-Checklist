<script setup>
import { Loader2, FileSpreadsheet } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal";
import { useExport } from "@/composables/useExport";

const props = defineProps({
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
});


const { Swal } = useSwal(); 

const { isExporting, runExport } = useExport();

const handleExport = async () => {
 
  const start =
    props.startDate ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const end = props.endDate || new Date().toISOString();


  await runExport({
    functionName: 'export-work-performance',
    startDate: start,
    endDate: end,
    filePrefix: 'รายงานการปฏิบัติงาน',
    maxMonths: 6
  });
};
</script>

<template>
  <button
    @click="handleExport"
    :disabled="isExporting"
    class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed h-11 text-sm font-medium"
  >
    <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
    <FileSpreadsheet v-else class="w-4 h-4" />
    <span>{{ isExporting ? "กำลังสร้างไฟล์..." : "Export Excel" }}</span>
  </button>
</template>