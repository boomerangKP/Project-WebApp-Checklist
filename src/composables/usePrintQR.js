// src/composables/usePrintQR.js

export function usePrintQR() {

  // columns ในที่นี้จะเป็น 2 เสมอจากไฟล์แม่ที่ส่งมา
  const printContent = (contentRef = 2) => {
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
          <title>Print QR Code (A6 Size)</title>
          <style>
            /* --- 1. Global Reset & Page Setup --- */
            * { box-sizing: border-box; }

            @page {
              size: A4 portrait;
              margin: 0; /* ตัดขอบขาวของ Printer ออกให้หมด แล้วเรามาจัด Grid เอา */
            }

            body {
              margin: 0;
              padding: 0;
              width: 210mm; /* A4 Width */
              height: 297mm; /* A4 Height */
              font-family: 'Sarabun', sans-serif;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            /* --- 2. Grid Layout (2x2 = 4 ใบต่อหน้า A4) --- */
            .print-grid-layout {
              display: grid;
              grid-template-columns: 105mm 105mm; /* กว้าง 10.5cm x 2 */
              grid-auto-rows: 148.5mm;            /* สูง 14.85cm (A6) */
              width: 100%;
            }

            /* --- 3. Card Styling (ขนาด A6) --- */
            .sticker-card {
              width: 100% !important;
              height: 100% !important; /* เต็มช่อง Grid (A6) */

              border: 1px solid #ddd; /* เส้นขอบบางๆ สำหรับตัดกระดาษ (ถ้าไม่ต้องการให้ลบออกหรือเปลี่ยนสีเป็นขาว) */
              padding: 5mm; /* ขอบกระดาษด้านใน */

              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              background: white;

              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* --- 4. Logo Section --- */
            .sticker-card > div:nth-child(1) {
               width: 100% !important;
               height: 20mm !important; /* สูง 2cm */
               border: 1px solid #eee;
               display: flex; align-items: center; justify-content: center;
               margin-bottom: 2mm;
               padding: 1mm;
            }
            .sticker-card > div:nth-child(1) img {
               height: 100% !important;
               object-fit: contain !important;
            }

            /* --- 5. QR Code Section --- */
            .sticker-card > div:nth-child(2) {
               position: relative;
               width: 100%;
               flex: 1; /* ยืดให้เต็มพื้นที่ว่าง */
               display: flex; flex-direction: column;
               align-items: center; justify-content: center;
               margin-bottom: 2mm;
            }

            /* ป้าย SCAN ME */
            .sticker-card > div:nth-child(2) > div:first-child {
               position: absolute; top: -8px;
               background: white; padding: 0 5px;
               font-size: 10pt; font-weight: bold;
               border: 2px solid #fff; z-index: 10;
            }

            /* กล่อง QR */
            .sticker-card > div:nth-child(2) > div:last-child {
               width: 50mm !important;  /* กว้าง 5cm */
               height: 50mm !important; /* สูง 5cm */
               border: 2px solid #000;
               display: flex; align-items: center; justify-content: center;
               padding: 1mm;
            }
            .sticker-card > div:nth-child(2) > div:last-child img {
               width: 100% !important;
               height: 100% !important;
            }

            /* --- 6. Text Information --- */
            .sticker-card > div:nth-child(3) {
               width: 100%;
               text-align: center;
               margin-bottom: 5mm;
            }

            /* หัวข้อ: แบบประเมิน */
            h2 {
                font-size: 14pt !important;
                font-weight: bold;
                margin: 0;
                line-height: 1.2;
                color: #000;
            }
            p {
                font-size: 10pt !important;
                margin: 0 0 5mm 0;
                color: #555;
            }

            /* ชั้น / อาคาร (ตัวใหญ่) */
            .sticker-card > div:nth-child(3) > div {
                font-size: 18pt !important; /* ใหญ่ชัดเจน */
                font-weight: bold;
                line-height: 1.3;
                color: #000;
            }

            /* ชื่อห้อง (วงเล็บ) */
            .sticker-card > div:nth-child(3) > p {
                font-size: 12pt !important;
                margin-top: 2mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: #444;
            }

            /* --- 7. Footer --- */
            .sticker-card > div:last-child {
               width: 100%;
               margin-top: auto;
               padding-top: 2mm;
               border-top: 1px dashed #ccc;
               display: flex; justify-content: space-between; align-items: flex-end;
            }
            .sticker-card > div:last-child > div:first-child {
                font-size: 9pt !important;
                text-align: left;
                line-height: 1.4;
            }
            .sticker-card > div:last-child > div:last-child {
                font-size: 9pt !important;
                font-weight: bold;
                color: red;
            }

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
