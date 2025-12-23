<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router' // 1. ต้อง import RouterView
// ... (code อื่นๆ)
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    
    <main class="flex-1 pb-20 overflow-y-auto">
      <RouterView /> 
    </main>

    <nav>
       </nav>
  </div>
</template>