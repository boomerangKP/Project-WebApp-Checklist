<script setup>
import { Search, Building, Layers, Users, X } from 'lucide-vue-next'

const props = defineProps({
  search: String,
  building: String,
  floor: String,
  type: String,
  uniqueBuildings: Array,
  floors: Array,
  restroomTypes: Array
})

const emit = defineEmits(['update:search', 'update:building', 'update:floor', 'update:type', 'reset'])
</script>

<template>
  <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center flex-wrap">

    <div class="relative w-full md:w-64">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        :value="search"
        @input="$emit('update:search', $event.target.value)"
        type="text"
        placeholder="ค้นหาชื่อ, รหัส..."
        class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
    </div>

    <div class="h-6 w-px bg-gray-200 hidden md:block"></div>

    <div class="flex items-center gap-2 w-full md:w-auto">
      <Building class="w-4 h-4 text-gray-400" />
      <select
        :value="building"
        @change="$emit('update:building', $event.target.value)"
        class="w-full md:w-40 py-2 pl-2 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      >
        <option value="">ทุกอาคาร</option>
        <option v-for="b in uniqueBuildings" :key="b" :value="b">{{ b }}</option>
      </select>
    </div>

    <div class="flex items-center gap-2 w-full md:w-auto">
      <Layers class="w-4 h-4 text-gray-400" />
      <select
        :value="floor"
        @change="$emit('update:floor', $event.target.value)"
        :disabled="!building"
        class="w-full md:w-32 py-2 pl-2 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
      >
        <option value="">ทุกชั้น</option>
        <option v-for="f in floors" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <div class="flex items-center gap-2 w-full md:w-auto">
      <Users class="w-4 h-4 text-gray-400" />
      <select
        :value="type"
        @change="$emit('update:type', $event.target.value)"
        class="w-full md:w-40 py-2 pl-2 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      >
        <option value="">ทุกประเภท</option>
        <option v-for="t in restroomTypes" :key="t.restroom_types_id" :value="t.restroom_types_id">{{ t.restroom_types_name }}</option>
      </select>
    </div>

    <div class="ml-auto text-xs text-gray-400 hidden md:block" v-if="building || search || type">
      <button @click="$emit('reset')" class="hover:text-red-500 flex items-center gap-1">
        <X class="w-3 h-3" /> ล้างตัวกรอง
      </button>
    </div>

  </div>
</template>
