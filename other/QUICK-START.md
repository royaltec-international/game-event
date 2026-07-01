# ⚡ Quick Start Guide

เริ่มต้นใช้งานระบบได้ใน 15 นาที!

---

## 🎯 3 ขั้นตอนหลัก

### 1️⃣ Setup Google Sheets (5 นาที)

```bash
1. เปิด Google Sheets → สร้าง Spreadsheet ใหม่
2. Extensions → Apps Script
3. วาง Code.gs ทั้งหมด (ลบโค้ดเดิม)
4. บันทึก (Ctrl+S)
5. เลือก setupSheets → Run → อนุญาต
6. Deploy → Web app → Anyone → Deploy
7. Copy Web App URL
```

**หมายเหตุ:** Code.gs เชื่อมกับ Spreadsheet อัตโนมัติ ไม่ต้องใส่ ID

**ได้อะไร:**
- ✅ Spreadsheet พร้อม 3 sheets: Config, Prizes, Registrations
- ✅ Web App URL สำหรับเชื่อมต่อ

---

### 2️⃣ Config Files (3 นาที)

**แก้ไข wheelConfig.js บรรทัดที่ 7:**
```javascript
googleScriptUrl: "PASTE_WEB_APP_URL_HERE"
```

**ตัวอย่าง:**
```javascript
googleScriptUrl: "https://script.google.com/macros/s/AKfycby.../exec"
```

**ได้อะไร:**
- ✅ เชื่อมต่อระหว่าง Frontend ↔ Google Sheets

---

### 3️⃣ Deploy GitHub Pages (7 นาที)

```bash
1. สร้าง GitHub repository (public)
2. Upload ไฟล์ทั้งหมด ยกเว้น Code.gs:
   - index.html
   - admin.html
   - style.css
   - script.js
   - wheelConfig.js
   - logo.png
   - README.md
3. Settings → Pages → Source: main → Save
4. รอ 2 นาที → เสร็จ!
```

**ได้อะไร:**
- ✅ `https://USERNAME.github.io/REPO_NAME/` (Frontend)
- ✅ `https://USERNAME.github.io/REPO_NAME/admin.html` (Admin)

---

## ✅ ทดสอบระบบ (5 นาที)

### Test 1: Admin Panel
```bash
1. เปิด admin.html
2. ดูมุมขวาบน → ต้องแสดง "เชื่อมต่อแล้ว" 🟢
3. กรอก Event Name: "Test Event"
4. คลิก บันทึก
5. เปิด Google Sheets → Config sheet → เช็ค JSON
```

### Test 2: Wheel
```bash
1. เปิด index.html
2. กรอกฟอร์ม (ข้อมูลปลอม)
3. หมุนวงล้อ
4. ได้รางวัล → เปิด Sheets → Registrations → เห็นข้อมูล
```

### Test 3: Real-time
```bash
1. เปิด admin.html → ดูจำนวนของรางวัล
2. เปิด tab ใหม่ → หมุนวงล้อ
3. กลับไป admin.html → Refresh
4. จำนวนคงเหลือควรลด 1
```

---

## 🚨 Troubleshooting

### ❌ "ไม่สามารถเชื่อมต่อได้"
→ เช็ค wheelConfig.js → googleScriptUrl ว่าใส่แล้วหรือยัง

### ❌ Apps Script error
→ ต้อง Deploy → Access = "Anyone" (ไม่ใช่ "Only myself")

### ❌ จำนวนของรางวัลไม่ลด
→ กด บันทึก ใน Admin Panel ครั้งแรก เพื่อสร้างข้อมูล Prizes

---

## 🎯 Next Steps

เมื่อทดสอบผ่านแล้ว:

1. **ตั้งค่า Event:**
   - เปิด admin.html
   - ใส่ชื่องานจริง
   - ตั้งค่าของรางวัล
   - ใส่ Logo URL
   - บันทึก

2. **แจก URL ให้ผู้เข้าร่วม:**
   - Frontend: `https://USERNAME.github.io/REPO_NAME/`
   - QR Code: ใช้ [QR Code Generator](https://www.qr-code-generator.com/)

3. **Monitor:**
   - เปิด admin.html ตลอดเวลา
   - ดูจำนวนคงเหลือ
   - Export ข้อมูลจาก Sheets เมื่อจบงาน

---

## 📱 Tips

- ทดสอบบน mobile ก่อนงานจริง
- เตรียมของรางวัลมากกว่า quantity 10%
- Backup Google Sheets เป็น Excel ก่อนเริ่มงาน
- มีคนคุม Admin Panel อย่างน้อย 1 คน

---

**🎉 พร้อมใช้งาน! เริ่มจัด Event เลย!**

หากมีปัญหา → อ่าน [README.md](README.md) แบบเต็ม
