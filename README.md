# 🏢 Building Hygiene Management System (ระบบบริหารจัดการสุขอนามัยอาคาร)

ระบบเว็บแอปพลิเคชันสำหรับการบริหารจัดการและประเมินผลการทำความสะอาดพื้นที่ภายในอาคาร รองรับการทำงานผ่าน QR Code สำหรับพนักงานทำความสะอาด และมี Dashboard สำหรับผู้ดูแลระบบ

---

## 💻 Recommended IDE Setup (โปรแกรมที่แนะนำสำหรับนักพัฒนา)

- [VS Code](https://code.visualstudio.com/) 
- ติดตั้ง Extension: [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (และให้ปิดการใช้งาน Vetur หากเคยติดตั้งไว้)

## 🌐 Recommended Browser Setup (เบราว์เซอร์สำหรับทดสอบ)

- **Chrome / Edge / Brave:** แนะนำให้ติดตั้ง [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- **Firefox:** แนะนำให้ติดตั้ง [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

---

## 🚀 Getting Started (ขั้นตอนการติดตั้งและรันโปรเจกต์)

เมื่อทำการ Clone โปรเจกต์นี้ลงมาที่เครื่องแล้ว ให้ทำตามขั้นตอนต่อไปนี้ตามลำดับ เพื่อให้ระบบสามารถเชื่อมต่อฐานข้อมูลและรันได้อย่างสมบูรณ์

### 📌 Prerequisites (สิ่งที่ต้องมีในเครื่องก่อนเริ่ม)
1. **Node.js** (เวอร์ชัน 18 ขึ้นไป)
2. **pnpm** (โปรเจกต์นี้ใช้ pnpm หากไม่มีให้รัน `npm install -g pnpm`)
3. **Supabase CLI** (สำหรับการ Deploy Backend Functions) - [วิธีติดตั้ง](https://supabase.com/docs/guides/cli)

### Step 1: Install Dependencies (ติดตั้งแพ็กเกจ)
เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วรันคำสั่ง:
```sh
pnpm install