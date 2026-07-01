# ✅ Pre-Launch Checklist

สำหรับตรวจสอบก่อน Deploy ระบบไปใช้งานจริง

---

## 📋 Google Sheets & Apps Script

### Setup
- [ ] สร้าง Google Spreadsheet แล้ว
- [ ] วาง Code.gs ใน Apps Script
- [ ] บันทึก Code.gs (Ctrl+S)
- [ ] รัน function `setupSheets()` แล้ว
- [ ] ตรวจสอบว่ามี 3 sheets: Config, Prizes, Registrations

**หมายเหตุ:** Code.gs เชื่อมกับ Spreadsheet อัตโนมัติ — ไม่ต้องใส่ Spreadsheet ID

### Headers Verification
- [ ] **Config sheet:** 3 columns (Key, Value, Last Updated)
- [ ] **Prizes sheet:** 7 columns (Prize ID, Event Name, Label, Initial Qty, Used, Remaining, Last Updated)
- [ ] **Registrations sheet:** 9 columns (Timestamp, Event Name, ชื่อ, นามสกุล, อีเมล, เบอร์โทร, บริษัท, ตำแหน่ง, ของรางวัล)

### Deploy
- [ ] Deploy เป็น Web app
- [ ] Execute as: **Me**
- [ ] Who has access: **Anyone** (สำคัญ!)
- [ ] Copy Web App URL (ลงท้ายด้วย /exec)

---

## ⚙️ Configuration Files

### wheelConfig.js
- [ ] แก้ `googleScriptUrl` (บรรทัดที่ 7)
- [ ] วาง Web App URL ที่ได้จาก Deploy
- [ ] ตรวจสอบ default values:
  - [ ] logoUrl
  - [ ] lineAddFriendUrl
  - [ ] prizes array

---

## 🎨 Frontend Files

### index.html
- [ ] ใช้ไฟล์เดิมที่มีอยู่ (ไม่ต้องแก้)
- [ ] ตรวจสอบ `<script src="wheelConfig.js">` และ `<script src="script.js">`

### style.css
- [ ] ใช้ไฟล์เดิม (ไม่ต้องแก้)
- [ ] ตรวจสอบ Kanit font import

### script.js
- [ ] ใช้ไฟล์ **script-updated.js** แล้วเปลี่ยนชื่อเป็น script.js
- [ ] ตรวจสอบว่ามีการส่ง `eventName` ใน `sendToGoogleSheets()`

### admin.html
- [ ] ใช้เวอร์ชันที่มี Event Name field แล้ว
- [ ] ตรวจสอบ `<script src="wheelConfig.js">`

---

## 🖼️ Assets

### Logo
- [ ] เตรียมไฟล์ logo.png (หรือ .jpg)
- [ ] Upload ไปยัง GitHub repository
- [ ] อัปเดต URL ใน Admin Panel หรือ wheelConfig.js

---

## 🚀 GitHub Deployment

### Repository Setup
- [ ] สร้าง repository (public)
- [ ] Upload ไฟล์ทั้งหมด **ยกเว้น Code.gs**:
  - [ ] index.html
  - [ ] admin.html
  - [ ] style.css
  - [ ] script.js (ไฟล์ที่ rename จาก script-updated.js)
  - [ ] wheelConfig.js
  - [ ] logo.png
  - [ ] README.md
  - [ ] docs/ (ถ้ามี)

### GitHub Pages
- [ ] Settings → Pages
- [ ] Source: main branch
- [ ] บันทึก
- [ ] รอ 1-2 นาที
- [ ] เช็ค URL: `https://USERNAME.github.io/REPO_NAME/`

---

## 🧪 Testing

### Connection Test
- [ ] เปิด admin.html
- [ ] ตรวจสอบ sync indicator แสดง "เชื่อมต่อแล้ว" (สีเขียว)
- [ ] ถ้าแสดง error → ดู Troubleshooting

### Admin Panel Test
- [ ] กรอก Event Name
- [ ] เพิ่มของรางวัล 1-2 รายการ
- [ ] คลิก **💾 บันทึก**
- [ ] เช็ค Google Sheets:
  - [ ] Config sheet มี JSON ในเซลล์ B2
  - [ ] Prizes sheet มีข้อมูลของรางวัล

### Frontend Test
- [ ] เปิด index.html
- [ ] กรอกฟอร์มลงทะเบียน (ข้อมูลทดสอบ)
- [ ] คลิก **ถัดไป**
- [ ] คลิก **หมุนวงล้อ**
- [ ] ตรวจสอบ:
  - [ ] วงล้อหมุนได้
  - [ ] แสดงผลรางวัล
  - [ ] Confetti ทำงาน
- [ ] เช็ค Google Sheets → Registrations:
  - [ ] มีข้อมูลผู้ทดสอบ
  - [ ] มี Event Name
  - [ ] มีของรางวัลที่ได้

### Real-time Test
- [ ] เปิด admin.html
- [ ] ดูจำนวนคงเหลือก่อนทดสอบ
- [ ] เปิด tab ใหม่ → หมุนวงล้อ 1 ครั้ง
- [ ] กลับไป admin.html
- [ ] Refresh (หรือรอ 10 วินาที auto-refresh)
- [ ] ตรวจสอบจำนวนคงเหลือลดลง 1

---

## 🔧 Troubleshooting Quick Check

หากมีปัญหา ตรวจสอบตามลำดับ:

### 1. Connection Error
- [ ] wheelConfig.js → googleScriptUrl ถูกต้องหรือไม่?
- [ ] Apps Script → Deploy → Access = "Anyone"?
- [ ] รัน setupSheets() แล้วหรือยัง?

### 2. Data Not Saving
- [ ] รัน setupSheets() ใน Apps Script แล้วหรือยัง?
- [ ] Sheets มี 3 sheets ครบหรือยัง?
- [ ] Headers ครบตามจำนวน columns หรือไม่?
- [ ] Apps Script เปิดจาก Spreadsheet ที่ถูกต้องหรือไม่?

### 3. Prize Count Not Updating
- [ ] บันทึก config จาก Admin Panel แล้วหรือยัง?
- [ ] Prizes sheet มีข้อมูลหรือยัง?
- [ ] prizeId ตรงกันหรือไม่?

---

## 📱 Day-of-Event Checklist

วันจริง ก่อนเริ่มงาน:

### Pre-Event (1-2 ชั่วโมงก่อน)
- [ ] ทดสอบระบบอีกครั้ง
- [ ] ตรวจนับของรางวัลจริง
- [ ] อัปเดตจำนวนใน Admin Panel ให้ตรงกับของจริง
- [ ] ตั้ง Event Name เฉพาะงานนี้
- [ ] บันทึก config
- [ ] ทดสอบหมุนวงล้อ 2-3 ครั้ง
- [ ] เช็คว่าข้อมูลบันทึกถูกต้อง

### During Event
- [ ] เปิด admin.html ไว้ใน tab ตลอดเวลา
- [ ] ดูจำนวนคงเหลือเป็นระยะ
- [ ] เตรียมของรางวัลสำรองไว้ 5-10%

### Post-Event
- [ ] Export ข้อมูลจาก Google Sheets
- [ ] บันทึก Backup (CSV หรือ Excel)
- [ ] ตรวจสอบของรางวัลคงเหลือ vs ระบบ
- [ ] สรุปสถิติ

---

## 📊 Final Verification

ก่อน Go-Live:

- [ ] ✅ Google Sheets เชื่อมต่อได้
- [ ] ✅ Admin Panel ใช้งานได้
- [ ] ✅ Frontend หมุนวงล้อได้
- [ ] ✅ บันทึกข้อมูลลง Sheets ได้
- [ ] ✅ จำนวนของรางวัลลดลงได้
- [ ] ✅ Event Name ถูกบันทึก
- [ ] ✅ ทดสอบบนมือถือแล้ว
- [ ] ✅ ทดสอบบนเดสก์ท็อปแล้ว
- [ ] ✅ Logo แสดงผลถูกต้อง
- [ ] ✅ Facebook/LINE URL ทำงาน

---

**✨ All Green? You're ready to launch! 🚀**

ลงชื่อผู้ตรวจสอบ: ________________  
วันที่: ________________
