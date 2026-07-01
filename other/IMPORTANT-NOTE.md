# ⚠️ IMPORTANT: Code.gs Setup

## ✅ Correct Setup Process

### Code.gs ไม่ต้องแก้ไข Spreadsheet ID

Code.gs ใช้:
```javascript
SpreadsheetApp.getActiveSpreadsheet()
```

ซึ่งหมายความว่า **เชื่อมกับ Spreadsheet ที่เปิด Apps Script อัตโนมัติ**

---

## 📝 Steps (ถูกต้อง)

### 1. เปิด Google Sheets
- สร้าง Spreadsheet ใหม่
- หรือเปิด Spreadsheet ที่มีอยู่

### 2. เปิด Apps Script จาก Spreadsheet นั้น
```
Extensions → Apps Script
```

**สำคัญ:** ต้องเปิด Apps Script **จาก Spreadsheet ที่ต้องการใช้งาน** ไม่ใช่สร้าง Apps Script แยก

### 3. วางโค้ด
- ลบโค้ดเดิมทั้งหมด
- Copy-Paste Code.gs ทั้งหมด
- **ไม่ต้องแก้อะไรเลย**
- บันทึก (Ctrl+S)

### 4. รัน Setup
- เลือก function: `setupSheets`
- คลิก Run (▶️)
- อนุญาต permissions

### 5. Deploy
- Deploy → New deployment
- Type: Web app
- Execute as: Me
- Access: Anyone
- Deploy
- Copy URL

---

## ❌ Common Mistakes

### ❌ ผิด: สร้าง Apps Script แยก
```
script.google.com → New Project
❌ แบบนี้จะไม่เชื่อมกับ Spreadsheet
```

### ✅ ถูก: เปิดจาก Spreadsheet
```
Google Sheets → Extensions → Apps Script
✅ แบบนี้จะเชื่อมอัตโนมัติ
```

---

## 🔍 How to Verify

### ตรวจสอบว่า Apps Script เชื่อมกับ Spreadsheet:

**ใน Apps Script Editor:**
1. ดูด้านซ้ายบน
2. ควรเห็นชื่อ Spreadsheet ที่เชื่อมอยู่
3. หรือคลิก icon ⚙️ → Project Settings
4. ดูส่วน "Container"
5. ต้องมี Spreadsheet ID แสดง

---

## 💡 Why This Way?

### ข้อดี:
- ✅ ง่ายกว่า (ไม่ต้องคัดลอก ID)
- ✅ ปลอดภัยกว่า (ไม่ต้องแชร์ ID)
- ✅ ผิดพลาดน้อยกว่า
- ✅ Deploy ได้ทันที

### Apps Script จะรู้อัตโนมัติว่า:
- ต้องเขียนข้อมูลลง Spreadsheet ไหน
- Sheets ไหนบ้างที่มีอยู่
- ต้อง Create sheets ใหม่หรือไม่

---

## 🚀 Quick Start (Corrected)

```bash
1. เปิด Google Sheets
2. Extensions → Apps Script (จาก Spreadsheet นั้น!)
3. วาง Code.gs ทั้งหมด
4. บันทึก
5. เลือก setupSheets → Run
6. Deploy → Web app → Anyone
7. Copy URL → ไปใส่ใน wheelConfig.js
8. Done! ✅
```

**Configuration Points:**
- ❌ Code.gs — ไม่ต้องแก้
- ✅ wheelConfig.js — ใส่ Web App URL

---

## 📞 Still Confused?

### Test:
1. เปิด Apps Script
2. ใส่โค้ดทดสอบ:
```javascript
function testConnection() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Connected to: " + ss.getName());
  Logger.log("Spreadsheet ID: " + ss.getId());
}
```
3. Run `testConnection`
4. ดู Logs → ถ้าเห็นชื่อ Spreadsheet = เชื่อมต่อแล้ว!

---

**สรุป:**
- Code.gs ใช้ `getActiveSpreadsheet()` เชื่อมอัตโนมัติ
- ไม่ต้องใส่ Spreadsheet ID ไหนๆ ทั้งสิ้น
- แค่เปิด Apps Script จาก Spreadsheet ที่ต้องการใช้

✅ **Ready to Deploy!**
