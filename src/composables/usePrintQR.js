// src/composables/usePrintQR.js

export function usePrintQR() {
  
  const printContent = (contentRef) => {
    if (!contentRef) return;

    // 1. สร้าง Iframe (ซ่อนไว้นอกจอ)
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed',
      left: '-9999px',
      top: '0',
      width: '210mm',
      height: '297mm',
      border: 'none',
    });
    document.body.appendChild(iframe);

    // ดึง HTML
    const contentHtml = contentRef.innerHTML;
    const doc = iframe.contentWindow.document;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            /* --- 1. Global Reset & Page Setup --- */
            * { box-sizing: border-box; }
            
            /* ✅ แก้ไข: ย้าย Margin มาที่ @page เพื่อให้มีผลทุกหน้า (1, 2, 3...) */
            @page { 
              size: A4 portrait; 
              margin: 10mm; /* เว้นขอบ 1cm ทุกด้าน ทุกหน้า */
            }

            body { 
              margin: 0; 
              padding: 0; /* เอา padding body ออก */
              width: 100%; /* ให้กว้างเต็มพื้นที่ที่เหลือจาก @page margin */
              font-family: 'Sarabun', sans-serif; 
              background: white;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }

            /* --- 2. Grid Layout (3 คอลัมน์) --- */
            .print-grid-layout {
              display: grid;
              /* ใช้ 1fr เพื่อให้แบ่งช่องเท่าๆ กันตามพื้นที่กระดาษจริง */
              grid-template-columns: repeat(3, 1fr); 
              column-gap: 5mm; /* ช่องว่างแนวตั้ง */
              row-gap: 5mm;    /* ช่องว่างแนวนอน */
              width: 100%;
            }

            /* --- 3. Card Styling --- */
            .sticker-card {
              width: 100% !important; /* เต็มช่อง Grid */
              height: 8.5cm !important; /* ล็อคความสูงการ์ด */
              
              border: 1px solid #000;
              padding: 0.2cm;
              
              display: flex;
              flex-direction: column;
              align-items: center;
              background: white;
              
              overflow: hidden; 
              page-break-inside: avoid; /* ห้ามการ์ดขาดครึ่ง */
              break-inside: avoid;
            }

            /* --- 4. ล็อคขนาดรูปโลโก้ (กันระเบิด) --- */
            /* กล่องโลโก้ */
            .sticker-card > div:nth-child(1) {
               width: 100% !important;
               height: 1.2cm !important; /* ล็อคสูง 1.2cm */
               border: 1px solid #ccc;
               display: flex; align-items: center; justify-content: center;
               margin-bottom: 2px;
               padding: 2px;
            }
            /* รูปโลโก้ */
            .sticker-card > div:nth-child(1) img {
               width: auto !important;
               height: 100% !important;
               max-width: 100% !important;
               object-fit: contain !important;
            }

            /* --- 5. ล็อคขนาด QR Code (กันระเบิด) --- */
            /* กล่องครอบ QR */
            .sticker-card > div:nth-child(2) {
               position: relative;
               width: 100%;
               display: flex; justify-content: center;
               margin-bottom: 2px;
            }
            /* ป้าย SCAN */
            .sticker-card > div:nth-child(2) > div:first-child {
               position: absolute; top: -6px; 
               background: white; padding: 0 4px; 
               font-size: 8pt; font-weight: bold; 
               border: 1px solid #fff; z-index: 10;
            }
            /* กล่องสี่เหลี่ยม QR */
            .sticker-card > div:nth-child(2) > div:last-child {
               width: 2.8cm !important;  /* ✅ ล็อคกว้าง 2.8cm */
               height: 2.8cm !important; /* ✅ ล็อคสูง 2.8cm */
               border: 1px solid #000;
               display: flex; align-items: center; justify-content: center;
               margin-top: 5px;
               padding: 2px;
            }
            /* รูป QR */
            .sticker-card > div:nth-child(2) > div:last-child img {
               width: 100% !important;
               height: 100% !important;
               object-fit: contain !important;
            }

            /* --- 6. Text Styling (ปรับแก้ระยะห่าง) --- */
            
            /* หัวข้อ: แบบประเมิน... */
            h2 { 
                font-size: 10pt !important; 
                font-weight: bold; 
                margin: 0 0 2px 0; /* ✅ เพิ่มระยะห่างด้านล่าง 4px */
                line-height: 1.4;  /* ✅ เพิ่มความสูงบรรทัดเป็น 1.4 (สระจะไม่ทับ) */
                text-align: center; 
                color: #000;
            }

            /* รองหัวข้อ: ประเมินความสะอาด */
            p { 
                font-size: 8pt !important; 
                margin: 0 0 6px 0; /* ✅ เพิ่มระยะห่างด้านล่าง 6px (ก่อนขึ้นชั้น/อาคาร) */
                color: #555; 
                text-align: center; 
            }
            
            /* กล่องคลุมข้อความที่อยู่ (ชั้น/อาคาร) */
            .sticker-card > div:nth-child(3) { 
                width: 100%; 
                text-align: center; 
                display: flex;
                flex-direction: column; /* จัดเรียงแนวตั้ง */
                justify-content: center;
            }

            /* ตัวหนังสือ ชั้น/อาคาร (ตัวหนา) */
            .sticker-card > div:nth-child(3) > div { 
                font-size: 11pt !important; 
                font-weight: bold; 
                line-height: 1.4;    /* ✅ เพิ่มความสูงบรรทัด */
                margin-bottom: 2px;  /* ✅ เว้นระยะห่างจากชื่อห้องนิดนึง */
                margin-top: 4px;
                color: #000;
            }

            /* ชื่อห้อง (วงเล็บข้างล่าง) */
            .sticker-card > div:nth-child(3) > p { 
                font-size: 8pt !important; 
                margin: 0;
                white-space: nowrap; 
                overflow: hidden; 
                text-overflow: ellipsis; 
                color: #666;
            }

            /* Footer */
            .sticker-card > div:last-child {
               width: 100%; margin-top: auto; padding-top: 5px; 
               border-top: 1px dashed #ccc;
               display: flex; justify-content: space-between; align-items: flex-end;
            }
            .sticker-card > div:last-child > div:first-child { font-size: 6pt !important; text-align: left; line-height: 1.1; }
            .sticker-card > div:last-child > div:last-child { font-size: 6pt !important; font-weight: bold; color: red; }

          </style>
        </head>
        <body>
          <div class="print-grid-layout">${contentHtml}</div>
        </body>
      </html>
    `);
    doc.close();

    // รอโหลดรูปภาพ
    iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }, 500);
        
        setTimeout(() => {
           if(document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 5000);
    };
  };

  return { printContent };
}