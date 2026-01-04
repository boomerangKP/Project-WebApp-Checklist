<script setup>
defineProps({
  selectedLocations: Array,
  qrDataUrls: Object,
  layout: { type: String, default: 'grid-3' }
})
</script>

<template>
  <div class="print-overlay">
    <div class="print-grid" :class="layout">
      
      <div v-for="loc in selectedLocations" :key="loc.locations_id" class="sticker-card">
         <template v-if="qrDataUrls[loc.locations_id]">
           
           <div class="header-text">
             <div class="text-main">สแกนส่งงาน</div>
             <div class="text-sub">ประเมินความสะอาด</div>
           </div>

           <div class="qr-box">
             <img :src="qrDataUrls[loc.locations_id]" class="qr-img" />
           </div>

           <div class="footer-info">
             <div class="room-name">{{ loc.locations_name }}</div>
             <div class="room-detail">
               {{ loc.locations_building }} / ชั้น {{ loc.locations_floor }}
             </div>
             <div class="code-ref">{{ loc.locations_code }}</div>
           </div>

         </template>
      </div>

    </div>
  </div>
</template>

<style>
/* Global Styles for Print Mode */
@media screen {
  .print-overlay { display: none; }
}

@media print {
  /* ซ่อนหน้าเว็บเดิมทั้งหมด */
  body * { visibility: hidden; overflow: visible; }
  
  /* โชว์เฉพาะ Overlay */
  .print-overlay, .print-overlay * { visibility: visible; }
  
  .print-overlay {
    position: absolute; top: 0; left: 0; width: 100%; min-height: 100%;
    background: white; z-index: 999999;
  }

  @page { size: A4; margin: 0.5cm; }

  .print-grid {
    display: grid;
    gap: 10px;
    padding: 10px;
    width: 100%;
  }

  /* --- Styles: Layout ใหญ่ (2 คอลัมน์) --- */
  .print-grid.grid-2 { grid-template-columns: 1fr 1fr; }
  .print-grid.grid-2 .sticker-card { height: 350px; border-radius: 20px; padding: 20px; }
  .print-grid.grid-2 .text-main { font-size: 24px; }
  .print-grid.grid-2 .text-sub { font-size: 16px; }
  .print-grid.grid-2 .qr-box { width: 180px; height: 180px; }
  .print-grid.grid-2 .room-name { font-size: 22px; margin-top: 10px; }
  .print-grid.grid-2 .room-detail { font-size: 16px; }

  /* --- Styles: Layout กลาง (3 คอลัมน์) --- */
  .print-grid.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .print-grid.grid-3 .sticker-card { height: 260px; border-radius: 15px; padding: 15px; }
  .print-grid.grid-3 .text-main { font-size: 18px; }
  .print-grid.grid-3 .text-sub { font-size: 12px; }
  .print-grid.grid-3 .qr-box { width: 130px; height: 130px; }
  .print-grid.grid-3 .room-name { font-size: 16px; margin-top: 8px; }
  .print-grid.grid-3 .room-detail { font-size: 12px; }

  /* --- Styles: Layout เล็ก (4 คอลัมน์) --- */
  .print-grid.grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .print-grid.grid-4 .sticker-card { height: 200px; border-radius: 10px; padding: 10px; }
  .print-grid.grid-4 .text-main { font-size: 14px; }
  .print-grid.grid-4 .text-sub { font-size: 10px; display: none; } /* ซ่อนตัวรอง */
  .print-grid.grid-4 .qr-box { width: 100px; height: 100px; }
  .print-grid.grid-4 .room-name { font-size: 12px; margin-top: 5px; line-height: 1.1; }
  .print-grid.grid-4 .room-detail { font-size: 10px; }

  /* --- Shared Styles --- */
  .sticker-card {
    border: 2px solid #000;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; page-break-inside: avoid; box-sizing: border-box;
  }
  .header-text { margin-bottom: 5px; }
  .text-main { font-weight: bold; color: #000; line-height: 1.2; }
  .text-sub { color: #555; }
  .qr-box {
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #ddd; border-radius: 8px; padding: 5px;
  }
  .qr-img { width: 100%; height: 100%; object-fit: contain; }
  .footer-info { width: 100%; }
  .room-name { font-weight: bold; color: #000; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .room-detail { color: #666; }
  .code-ref { font-family: monospace; font-size: 8px; color: #999; margin-top: 2px; }
}
</style>