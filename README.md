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

```
### Step 2: Setup Environment Variables (ตั้งค่าการเชื่อมต่อฐานข้อมูล)

1. สร้างไฟล์ชื่อ .env ไว้ที่โฟลเดอร์นอกสุด (ระดับเดียวกับ package.json)
2. นำ URL และ API Key จากโปรเจกต์ Supabase ของคุณมาใส่ในไฟล์ .env ตามรูปแบบนี้:
```sh
VITE_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
```
### Step 3: Setup Supabase Edge Functions (ตั้งค่าระบบประมวลผลหลังบ้าน)

โปรเจกต์นี้มีการใช้ Edge Functions (เช่น การเพิ่มพนักงาน, การออกรายงาน PDF/Excel) หากไม่ทำขั้นตอนนี้ แอดมินจะไม่สามารถกดเพิ่มพนักงานหรือโหลดรายงานได้

# 1. ล็อกอินเข้าสู่ Supabase ใน Terminal
```sh
supabase login
```
# 2. เชื่อมโยงโปรเจกต์โค้ดนี้ เข้ากับโปรเจกต์บน Supabase ของคุณ
```sh
supabase link --project-ref [YOUR_PROJECT_ID]
```
# 3. อัปโหลด Edge Functions ทั้งหมดขึ้นไปบนเซิร์ฟเวอร์
```sh
supabase functions deploy
```
(หมายเหตุ: ต้องตรวจสอบให้แน่ใจว่าบน Supabase มีการสร้างตาราง (Tables) และ Storage Buckets เรียบร้อยแล้ว)

### Step 4: Run Development Server (รันระบบจำลอง)
เมื่อตั้งค่าทุกอย่างเสร็จสิ้น สามารถรันโปรเจกต์ได้เลย:
```sh
pnpm dev
```
ระบบจะเปิดใช้งานที่ http://localhost:5173 (รองรับ Hot-Reload แก้โค้ดแล้วหน้าเว็บเปลี่ยนทันที)

### Available Scripts (คำสั่งอื่นๆ ที่ใช้งานได้)

คำสั่ง,หน้าที่
```sh 
pnpm dev
```
รันเซิร์ฟเวอร์จำลองสำหรับนักพัฒนา
```sh 
pnpm build
```
คอมไพล์และลดขนาดไฟล์ (Minify) เพื่อนำไปขึ้นระบบจริง (Production)
```sh 
pnpm preview
```
จำลองการรันไฟล์ Production ในเครื่อง (เพื่อเทสหลังจากการ Build)
```sh
pnpm lint
```
ตรวจสอบข้อผิดพลาดของรูปแบบโค้ดด้วย ESLint
