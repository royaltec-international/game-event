# 🎡 Spin Wheel — Real-time Prize System

ระบบหมุนวงล้อลุ้นรางวัลแบบ Real-time พร้อม Admin Panel และรองรับหลาย Event

![Version](https://img.shields.io/badge/version-2.0-blue)
![Status](https://img.shields.io/badge/status-production-green)

---

## ✨ Features

### 🎯 Core Features
- **หมุนวงล้อ** — ระบบสุ่มรางวัลแบบ weighted random
- **ฟอร์มลงทะเบียน** — เก็บข้อมูลผู้เข้าร่วมงาน
- **Real-time Sync** — เชื่อมต่อ Google Sheets แบบ real-time
- **Admin Panel** — จัดการ config โดยไม่ต้องแก้โค้ด

### 🎪 Event Management (NEW!)
- **Multi-Event Support** — ใช้ระบบเดียวได้หลาย Event
- **Event Name Tracking** — บันทึกชื่องานพร้อมข้อมูลผู้เล่น
- **Prize Separation** — แยกนับของรางวัลตาม Event

### 📊 Admin Panel Features
- แก้ไขของรางวัล (ชื่อ, จำนวน, สี, icon)
- ดูจำนวนคงเหลือแบบ real-time
- ตั้งค่า Event Name, Logo URL, Facebook/LINE URL
- ปรับ Animation (รอบหมุน, ระยะเวลา)
- Auto-refresh ทุก 10 วินาที

### 🎨 UI/UX
- Responsive design (รองรับ mobile/tablet/desktop)
- Dark mode admin panel
- Gradient theme wheel interface
- Confetti animation เมื่อได้รางวัล
- Toast notifications

---

## 📁 โครงสร้างไฟล์

```
spin-wheel/
├── 📄 index.html           ← หน้าหลัก (ฟอร์ม + วงล้อ + ผลรางวัล)
├── 📄 admin.html           ← Admin Panel (Real-time config)
├── 🎨 style.css            ← Styles (Kanit font + Gradient theme)
├── ⚙️ script.js            ← Main logic
├── 🔧 wheelConfig.js       ← Config + Real-time API
├── 📊 Code.gs              ← Google Apps Script (backend)
├── 🖼️ logo.png             ← Logo (optional)
└── 📖 README.md            ← เอกสารนี้
```

---

## 🚀 ขั้นตอนติดตั้ง

### Step 1: ตั้งค่า Google Sheets + Apps Script

#### 1.1 สร้าง Google Spreadsheet
1. เปิด [Google Sheets](https://sheets.google.com)
2. สร้าง Spreadsheet ใหม่
3. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

#### 1.2 ติดตั้ง Apps Script
1. ใน Spreadsheet: **Extensions → Apps Script**
2. ลบโค้ดเดิมทั้งหมด
3. Copy-Paste โค้ดจาก `Code.gs` ทั้งหมด
4. **บันทึก** (Ctrl+S หรือ File → Save)

**หมายเหตุ:** Code.gs ใช้ `SpreadsheetApp.getActiveSpreadsheet()` ซึ่งจะเชื่อมกับ Spreadsheet ที่เปิด Apps Script อัตโนมัติ — **ไม่ต้องใส่ Spreadsheet ID**

#### 1.3 รัน Setup Function
1. เลือก function **`setupSheets`** จาก dropdown ด้านบน
2. คลิก **Run** (▶️)
3. **อนุญาต Permissions:**
   - Review Permissions
   - เลือก Google Account
   - Advanced → Go to [Project Name] (unsafe)
   - Allow

4. **ตรวจสอบ:** Spreadsheet ควรมี 3 sheets ใหม่:
   - ✅ `Config` (เก็บ config เป็น JSON)
   - ✅ `Prizes` (ติดตามจำนวนของรางวัล)
   - ✅ `Registrations` (บันทึกผู้เล่น)

#### 1.4 Deploy Web App
1. **Deploy → New deployment**
2. ตั้งค่า:
   - คลิก ⚙️ → เลือก **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ⚠️ (สำคัญมาก!)
3. **Deploy**
4. **Copy Web App URL** (จะได้ URL ที่ลงท้ายด้วย `/exec`)

---

### Step 2: ตั้งค่า wheelConfig.js

1. เปิดไฟล์ `wheelConfig.js`
2. **แก้บรรทัดที่ 7:**
   ```javascript
   googleScriptUrl: "PASTE_YOUR_WEB_APP_URL_HERE"
   ```
3. บันทึกไฟล์

---

### Step 3: Deploy บน GitHub Pages

#### 3.1 สร้าง Repository
1. ไปที่ [GitHub](https://github.com)
2. คลิก **New repository**
3. ตั้งชื่อ เช่น `spin-wheel-event`
4. Public
5. Create repository

#### 3.2 Upload ไฟล์
Upload ไฟล์ทั้งหมด **ยกเว้น Code.gs** (อันนี้อยู่ใน Apps Script):
- ✅ index.html
- ✅ admin.html
- ✅ style.css
- ✅ script.js
- ✅ wheelConfig.js
- ✅ README.md
- ✅ logo.png (ถ้ามี)

#### 3.3 เปิด GitHub Pages
1. **Settings → Pages**
2. Source: **main** branch
3. Save
4. รอ 1-2 นาที → เว็บจะ live ที่:
   ```
   https://YOUR_USERNAME.github.io/REPO_NAME/
   ```

---

## 🎮 วิธีใช้งาน

### สำหรับ Admin

#### เข้า Admin Panel
```
https://YOUR_USERNAME.github.io/REPO_NAME/admin.html
```

#### ตั้งค่า Event
1. ไปหน้า **🔧 ตั้งค่าทั่วไป**
2. กรอก **ชื่องาน Event** (เช่น: Royaltec Expo 2025)
3. ใส่ Logo URL, Facebook/LINE URL
4. ตั้งค่า Animation

#### จัดการของรางวัล
1. ไปหน้า **🎁 ของรางวัล**
2. เพิ่ม/ลบรางวัล
3. ตั้งชื่อ, จำนวน, สี, icon
4. ดูจำนวนคงเหลือแบบ real-time

#### บันทึกการตั้งค่า
- คลิก **💾 บันทึก** (มุมขวาบนหรือปุ่มด้านซ้าย)
- ระบบจะ sync ไปยัง Google Sheets ทันที
- ไม่ต้องดาวน์โหลดไฟล์ใดๆ

---

### สำหรับผู้เล่น

1. เข้า `https://YOUR_USERNAME.github.io/REPO_NAME/`
2. กรอกฟอร์มลงทะเบียน (ชื่อ, นามสกุล, อีเมล, เบอร์, บริษัท, ตำแหน่ง)
3. คลิก **ถัดไป — หมุนวงล้อ**
4. คลิก **🎯 หมุนวงล้อ!**
5. รอผลลัพธ์ → แสดงของรางวัล
6. แสดงหน้าจอให้ทีมงานเพื่อรับของรางวัล

---

## 📊 Google Sheets Structure

### Sheet: Config
| Key    | Value (JSON)                  | Last Updated        |
|--------|-------------------------------|---------------------|
| config | `{"eventName":"...", ...}`    | 2026-05-20 14:30:00 |

### Sheet: Prizes
| Prize ID | Event Name         | Label    | Initial Qty | Used | Remaining | Last Updated        |
|----------|--------------------|----------|-------------|------|-----------|---------------------|
| notepad  | Royaltec Expo 2025 | โน๊ตก้อน | 55          | 12   | 43        | 2026-05-20 14:30:00 |
| fan      | Royaltec Expo 2025 | พัดลม    | 2           | 0    | 2         | 2026-05-20 14:30:00 |

### Sheet: Registrations
| Timestamp           | Event Name         | ชื่อ   | นามสกุล | อีเมล          | เบอร์โทร   | บริษัท | ตำแหน่ง | ของรางวัล |
|---------------------|-------------------|--------|---------|----------------|-----------|--------|---------|-----------|
| 2026-05-20 14:30:00 | Royaltec Expo 2025| สมชาย  | ใจดี    | test@mail.com  | 0812345678| ABC    | Manager | โน๊ตก้อน  |

---

## 🔧 Troubleshooting

### ❌ Admin Panel แสดง "ไม่สามารถเชื่อมต่อได้"

**สาเหตุ:**
1. `googleScriptUrl` ใน wheelConfig.js ผิดหรือว่างเปล่า
2. Apps Script Deploy ตั้ง Access เป็น "Only myself" แทน "Anyone"
3. ยังไม่ได้รัน `setupSheets()`

**แก้ไข:**
1. เช็ค wheelConfig.js ว่า URL ถูกต้อง
2. Re-deploy Apps Script: Deploy → Manage deployments → แก้ Access เป็น "Anyone" → Deploy
3. รัน `setupSheets()` ใน Apps Script อีกครั้ง

---

### ❌ จำนวนของรางวัลไม่ลด

**สาเหตุ:**
- Sheet `Prizes` ยังไม่มีข้อมูล
- ยังไม่ได้บันทึก config จาก Admin Panel

**แก้ไข:**
1. เปิด Admin Panel
2. คลิก **💾 บันทึก**
3. เช็ค Sheet `Prizes` ว่ามีข้อมูล
4. ทดสอบหมุนวงล้อ → ดู column `Used` ว่าเพิ่มขึ้นหรือไม่

---

### ❌ CORS Error

**สาเหตุ:**
- Apps Script ไม่ได้ Deploy เป็น "Web app"

**แก้ไข:**
- ต้อง Deploy เป็น **Web app** (ไม่ใช่ API executable)
- Access ต้องเป็น **Anyone**

---

## 🎯 Best Practices

### การตั้งชื่อ Event
✅ ดี: `Royaltec Expo 2025`, `Open House Bangkok Q1`  
❌ หลีกเลี่ยง: `event`, `test`, `งาน1`

เหตุผล: ชื่อที่ชัดเจนช่วยในการ filter และ report ข้อมูล

### การจัดการของรางวัล
- ตั้งจำนวนเริ่มต้นมากกว่าที่คาดว่าจะใช้ 10-20%
- ของรางวัลที่หายากควรมี weight ต่ำ
- ของรางวัลที่มีเยอะควรมี weight สูง

### การใช้หลาย Event
- บันทึก config แต่ละ Event ก่อนเริ่มงาน
- ตั้ง Event Name ที่ไม่ซ้ำกัน
- ใช้ Filter ใน Google Sheets เพื่อดูข้อมูลแยกตาม Event

---

## 📈 การดูรายงาน

### Filter ตาม Event
ใน Sheet `Registrations`:
1. เลือก column **Event Name**
2. คลิก **Data → Create a filter**
3. เลือก Event ที่ต้องการดู

### Pivot Table
1. เลือกข้อมูลทั้งหมด
2. **Insert → Pivot table**
3. Rows: Event Name
4. Values: Count of Timestamp
5. ดูสถิติจำนวนผู้เล่นแต่ละ Event

### Export ข้อมูล
- **File → Download → CSV** (นำไปวิเคราะห์ต่อ)
- **File → Download → Excel** (สำหรับ backup)

---

## 🔐 Security & Privacy

### ข้อมูลที่เก็บ
- ชื่อ, นามสกุล, อีเมล, เบอร์โทร, บริษัท, ตำแหน่ง
- ชื่องาน Event
- ของรางวัลที่ได้รับ
- Timestamp

### การเข้าถึง
- **Apps Script:** Access = "Anyone" (จำเป็นสำหรับการทำงาน)
- **Google Sheets:** เฉพาะเจ้าของเท่านั้น
- **GitHub Pages:** Public (แต่ไม่มีข้อมูลส่วนตัว hard-coded)

### GDPR Compliance
- แจ้งผู้เล่นว่าข้อมูลจะถูกเก็บไว้ที่ Google Sheets
- ระบุวัตถุประสงค์การใช้งาน (การจัดส่งของรางวัล)
- สามารถลบข้อมูลได้ตามคำขอ

---

## 🆕 What's New (Version 2.0)

### Event Name Feature
- ✨ เพิ่มช่อง Event Name ใน Admin Panel
- 📊 บันทึก Event Name ไปกับข้อมูลทุกรายการ
- 🎯 แยกนับของรางวัลตาม Event
- 📈 รองรับหลาย Event ในไฟล์เดียว

### Real-time Sync
- 🔄 Auto-refresh ทุก 10 วินาที
- 📡 Stock badges แสดงสถานะคงเหลือ
- 🟢 Connection indicator
- ⚡ ไม่ต้องดาวน์โหลด config file

### UI Improvements
- 🎨 Dark mode Admin Panel
- 📱 Better mobile responsive
- 🎯 Usage statistics bars
- 💚 Improved visual feedback

---

## 📚 เอกสารเพิ่มเติม

- 📖 [GUIDE-update-sheets.md](docs/GUIDE-update-sheets.md) — คู่มือปรับแก้ Sheets เดิม
- 🎪 [EVENT-NAME-FEATURE.md](docs/EVENT-NAME-FEATURE.md) — รายละเอียด Event Name Feature
- 🔧 [API-REFERENCE.md](docs/API-REFERENCE.md) — Real-time API Documentation (เร็วๆ นี้)

---

## 💡 Tips & Tricks

### สำหรับ Admin
- ใช้ Logo PNG ขนาด 400x150px สำหรับผลลัพธ์ที่ดีที่สุด
- ตั้ง Facebook/LINE URL เป็น direct link (ไม่ใช่ short URL)
- ตั้ง minRotations = 5, maxRotations = 10 สำหรับประสบการณ์ที่ดี

### สำหรับการจัด Event
- ทดสอบระบบก่อนงานจริง 1-2 วัน
- เตรียมของรางวัลมากกว่า quantity ที่ตั้งไว้ 5-10 ชิ้น
- มีพนักงาน 1-2 คนคอยดูแล Admin Panel

### Performance
- Google Sheets รองรับได้หลายพันรายการไม่มีปัญหา
- Admin Panel รองรับได้หลาย tab พร้อมกัน
- ระบบรองรับผู้เล่นหลายคนพร้อมกัน (concurrent)

---

## 🤝 Contributing

พบ Bug หรือมีไอเดีย Feature ใหม่?
- เปิด Issue บน GitHub
- ส่ง Pull Request
- ติดต่อทีมพัฒนา

---

## 📄 License

MIT License — ใช้ฟรี แก้ไขได้ตามต้องการ

---

## 👥 Credits

**Developed for:** Royaltec International  
**Technology Stack:** HTML5, CSS3, Vanilla JavaScript, Google Apps Script  
**Font:** Kanit by Cadson Demak  
**Powered by:** Claude AI

---

## 🎉 Happy Spinning!

หากมีคำถามหรือต้องการความช่วยเหลือ:
- 📧 Email: support@example.com
- 💬 LINE: @example
- 🌐 Website: https://example.com

**Version 2.0** | Last Updated: May 2026
