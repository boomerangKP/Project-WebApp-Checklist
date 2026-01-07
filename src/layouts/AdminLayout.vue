<script setup>
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
</script>

<template>
  <div class="flex h-screen bg-gray-100 font-sans">
    <AdminSidebar />

    <div class="flex-1 flex flex-col overflow-hidden">
      <AdminHeader />

      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 relative">
        <router-view />
      </main>
    </div>
  </div>
</template>