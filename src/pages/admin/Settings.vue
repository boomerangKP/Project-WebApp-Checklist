<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// Import Components
import LocationManager from '@/components/admin/settings/LocationManager.vue'
import CheckItemManager from '@/components/admin/settings/CheckItemManager.vue'
import MasterModal from '@/components/admin/settings/MasterModal.vue'

// --- State ---
const activeTab = ref('locations') 
const loading = ref(false)
const modalLoading = ref(false)
const rawLocations = ref([])
const checkItems = ref([])
const restroomTypes = ref([])

// --- Modal State ---
const isModalOpen = ref(false)
const modalTitle = ref('')
const modalFields = ref([])
const currentMode = ref('') // 'add_building', 'add_floor', 'add_room', 'edit_item'
const editingId = ref(null)
const contextData = ref({}) // เก็บค่า ตึก/ชั้น/ประเภท ที่ส่งมาจาก LocationManager

// --- Fetch Data ---
const fetchData = async () => {
  loading.value = true
  try {
    const [locsRes, typesRes, itemsRes] = await Promise.all([
       supabase.from('locations').select('*, restroom_types(*)').order('locations_building').order('locations_floor').order('locations_name'),
       supabase.from('restroom_types').select('*').eq('restroom_types_status', 'active'),
       supabase.from('check_items').select('*').order('check_items_order')
    ])
    rawLocations.value = locsRes.data || []
    restroomTypes.value = typesRes.data || []
    checkItems.value = itemsRes.data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// ======================= 1. จัดการ LOCATION (ฉลาดเลือกฟอร์ม) =======================

const openLocationModal = (type, ctxData = {}, editItem = null) => {
  // type: 'building', 'floor', 'room'
  // ctxData: { building: 'A', floor: '1', typeId: 1 } (ค่าจากหน้าที่เปิดอยู่)
  
  contextData.value = ctxData // จำค่า context ไว้ใช้ตอนบันทึก
  editingId.value = editItem ? editItem.locations_id : null
  
  // กรณีแก้ไข (Edit Room)
  if (editItem) {
     currentMode.value = 'edit_room'
     modalTitle.value = 'แก้ไขชื่อจุดตรวจ'
     modalFields.value = [
       { key: 'locations_name', label: 'ชื่อห้อง/จุดตรวจ', type: 'text', required: true, value: editItem.locations_name }
     ]
  } 
  // กรณีเพิ่ม (Add New) - แยกฟอร์มตามปุ่มที่กด
  else {
      if (type === 'building') {
          currentMode.value = 'add_building'
          modalTitle.value = 'เพิ่มอาคารใหม่'
          modalFields.value = [
              { key: 'locations_building', label: 'ชื่ออาคาร (เช่น A, B, ตึก 1)', type: 'text', required: true, placeholder: 'ระบุชื่ออาคาร...' }
          ]
      } 
      else if (type === 'floor') {
          currentMode.value = 'add_floor'
          modalTitle.value = `เพิ่มชั้นใหม่ (ในอาคาร ${ctxData.building})`
          modalFields.value = [
              { key: 'locations_floor', label: 'เลขชั้น (เช่น 1, 2, G)', type: 'text', required: true, placeholder: 'ระบุชั้น...' }
          ]
      } 
      else if (type === 'room') {
          currentMode.value = 'add_room'
          // หาชื่อประเภทเพื่อมาโชว์หัวข้อ
          const typeName = restroomTypes.value.find(t => t.restroom_types_id === ctxData.typeId)?.restroom_types_name || ''
          modalTitle.value = `เพิ่มห้องใหม่ (${typeName})`
          modalFields.value = [
              { key: 'locations_name', label: 'ชื่อห้อง/จุดตรวจ', type: 'text', required: true, placeholder: 'เช่น ฝั่งซ้าย, ห้องที่ 1' }
          ]
      }
  }

  isModalOpen.value = true
}

const handleDeleteLocation = async (id) => {
  if (!confirm('⚠️ ยืนยันการลบจุดตรวจนี้?')) return
  try {
    loading.value = true
    const { error } = await supabase.from('locations').delete().eq('locations_id', id)
    if (error) throw error
    await fetchData()
  } catch (err) { alert(err.message) } finally { loading.value = false }
}

const handleGroupAction = async ({ level, oldVal, action }) => {
  // (Code ส่วน Rename/Delete Group เดิม ใช้ได้เลยครับ ใส่ไว้เหมือนเดิม)
  if (action === 'edit') {
    const newVal = prompt(`กรุณากรอกชื่อใหม่สำหรับ ${level === 'building' ? 'อาคาร' : 'ชั้น'} "${oldVal}":`, oldVal)
    if (!newVal || newVal === oldVal) return
    try {
      loading.value = true
      const field = level === 'building' ? 'locations_building' : 'locations_floor'
      await supabase.from('locations').update({ [field]: newVal }).eq(field, oldVal)
      await fetchData()
    } catch (err) { alert(err.message) } finally { loading.value = false }
  }
  else if (action === 'delete') {
    if(!confirm(`⚠️ ลบกลุ่ม "${oldVal}" และห้องทั้งหมดในกลุ่มนี้?`)) return
    try {
      loading.value = true
      const field = level === 'building' ? 'locations_building' : 'locations_floor'
      await supabase.from('locations').delete().eq(field, oldVal)
      await fetchData()
    } catch (err) { alert(err.message) } finally { loading.value = false }
  }
}

// ======================= 2. จัดการ CHECK ITEM =======================
// (ส่วนนี้เหมือนเดิมครับ ไม่ได้แก้ Logic)
const openCheckItemModal = (item = null) => {
  currentMode.value = item ? 'edit_item' : 'add_item'
  editingId.value = item ? item.check_items_id : null
  modalTitle.value = item ? 'แก้ไขรายการตรวจ' : 'เพิ่มรายการตรวจใหม่'
  const nextOrder = checkItems.value.length > 0 ? Math.max(...checkItems.value.map(i => i.check_items_order)) + 1 : 1
  modalFields.value = [
    { key: 'check_items_order', label: 'ลำดับ', type: 'number', required: true, value: item?.check_items_order || nextOrder },
    { key: 'check_items_name', label: 'ชื่อรายการ', type: 'text', required: true, value: item?.check_items_name },
    { key: 'check_items_status', label: 'สถานะ', type: 'status', value: item?.check_items_status || 'active' }
  ]
  isModalOpen.value = true
}
const handleDeleteCheckItem = async (id) => { /* เหมือนเดิม */ }


// ======================= 3. SAVE HANDLER (ฉลาดขึ้น) =======================

const handleSaveData = async (formData) => {
  modalLoading.value = true
  try {
    // ---- กรณีเพิ่มอาคาร (Add Building) ----
    if (currentMode.value === 'add_building') {
        // เราต้องสร้างห้อง Dummy 1 ห้อง เพื่อให้อาคารนี้มีตัวตนใน DB
        const payload = {
            locations_building: formData.locations_building,
            locations_floor: '1', // ค่าเริ่มต้น
            restroom_types_id: restroomTypes.value[0]?.restroom_types_id, // ใช้ประเภทแรกสุดเป็นค่าเริ่มต้น
            locations_name: 'จุดเริ่มต้น', // ชื่อห้องแรก
            locations_status: 'active'
        }
        await supabase.from('locations').insert(payload)
    }

    // ---- กรณีเพิ่มชั้น (Add Floor) ----
    else if (currentMode.value === 'add_floor') {
        // สร้างห้อง Dummy 1 ห้อง ในตึกปัจจุบัน + ชั้นใหม่
        const payload = {
            locations_building: contextData.value.building, // ดึงจาก context
            locations_floor: formData.locations_floor,
            restroom_types_id: restroomTypes.value[0]?.restroom_types_id,
            locations_name: 'จุดเริ่มต้น',
            locations_status: 'active'
        }
        await supabase.from('locations').insert(payload)
    }

    // ---- กรณีเพิ่มห้อง (Add Room) ----
    else if (currentMode.value === 'add_room') {
        // ใช้ค่า ตึก/ชั้น/ประเภท จาก Context ที่ผู้ใช้อยู่ ณ ตอนนั้น
        const payload = {
            locations_building: contextData.value.building,
            locations_floor: contextData.value.floor,
            restroom_types_id: contextData.value.typeId, // ประเภทที่เลือกไว้แล้ว
            locations_name: formData.locations_name,
            locations_status: 'active'
        }
        await supabase.from('locations').insert(payload)
    }

    // ---- กรณีแก้ไขชื่อห้อง (Edit Room) ----
    else if (currentMode.value === 'edit_room') {
        await supabase.from('locations')
            .update({ locations_name: formData.locations_name })
            .eq('locations_id', editingId.value)
    }

    // ---- กรณี Check Items (เหมือนเดิม) ----
    else if (currentMode.value.includes('item')) {
        const payload = {
            check_items_order: formData.check_items_order,
            check_items_name: formData.check_items_name,
            check_items_status: formData.check_items_status
        }
        if (currentMode.value === 'add_item') await supabase.from('check_items').insert(payload)
        else await supabase.from('check_items').update(payload).eq('check_items_id', editingId.value)
    }

    isModalOpen.value = false
    await fetchData()

  } catch (err) {
    alert('บันทึกไม่สำเร็จ: ' + err.message)
  } finally {
    modalLoading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6 min-h-screen pb-10">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">ตั้งค่าระบบ (Master Data)</h1>
      <p class="text-gray-500 text-sm mt-1">จัดการโครงสร้างอาคาร และรายการตรวจสอบ</p>
    </div>

    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button @click="activeTab = 'locations'" :class="activeTab === 'locations' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">จัดการสถานที่ (Locations)</button>
        <button @click="activeTab = 'items'" :class="activeTab === 'items' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">รายการตรวจสอบ (Checklist)</button>
      </nav>
    </div>

    <div class="mt-6">
        <LocationManager 
            v-if="activeTab === 'locations'"
            :rawLocations="rawLocations"
            :restroomTypes="restroomTypes"
            :loading="loading"
            @add="(payload) => openLocationModal(payload.type, payload.data)"
            @edit="(item) => openLocationModal(null, {}, item)"
            @delete="handleDeleteLocation"
            @edit-group="(payload) => handleGroupAction({ ...payload, action: 'edit' })"
            @delete-group="(payload) => handleGroupAction({ ...payload, action: 'delete' })"
        />

        <CheckItemManager 
            v-if="activeTab === 'items'"
            :items="checkItems"
            :loading="loading"
            @add="() => openCheckItemModal(null)"
            @edit="openCheckItemModal"
            @delete="handleDeleteCheckItem"
        />
    </div>

    <MasterModal 
      :isOpen="isModalOpen"
      :title="modalTitle"
      :fields="modalFields"
      :loading="modalLoading"
      @close="isModalOpen = false"
      @submit="handleSaveData"
    />
  </div>
</template>