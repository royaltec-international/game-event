# 📦 File Manifest

สรุปไฟล์ทั้งหมดในโปรเจค Spin Wheel v2.0

---

## 📁 Root Directory

### 🌐 Frontend Files (Upload to GitHub)

| File | Size | Description | Required |
|------|------|-------------|----------|
| **index.html** | 8.6K | หน้าหลัก: ฟอร์มลงทะเบียน + วงล้อ + ผลรางวัล | ✅ Yes |
| **admin.html** | 35K | Admin Panel สำหรับจัดการ config real-time | ✅ Yes |
| **style.css** | 9.6K | Styles (Kanit font + Gradient theme) | ✅ Yes |
| **script.js** | 17K | Main logic (updated with Event Name) | ✅ Yes |
| **wheelConfig.js** | 5.7K | Config + Real-time API functions | ✅ Yes |
| **logo.png** | 109K | Logo Royaltec (example) | ⚠️ Optional |

### 📊 Backend File (วางใน Google Apps Script)

| File | Size | Description | Required |
|------|------|-------------|----------|
| **Code.gs** | 11K | Google Apps Script backend | ✅ Yes |

**หมายเหตุ:** ไฟล์นี้ **ห้าม** upload ไป GitHub — วางใน Apps Script เท่านั้น

### 📚 Documentation Files

| File | Size | Description | Upload to GitHub |
|------|------|-------------|------------------|
| **README.md** | 15K | เอกสารหลักฉบับสมบูรณ์ | ✅ Yes |
| **QUICK-START.md** | 4.3K | Quick start guide (15 นาที) | ✅ Yes |
| **CHECKLIST.md** | 7.2K | Pre-launch checklist | ✅ Yes |
| **CHANGELOG.md** | 5.2K | Version history | ✅ Yes |
| **FILE-MANIFEST.md** | - | เอกสารนี้ | ✅ Yes |

---

## 📂 docs/ Directory

| File | Size | Description |
|------|------|-------------|
| **GUIDE-update-sheets.md** | 9.8K | คู่มือปรับแก้ Google Sheets เดิม |
| **EVENT-NAME-FEATURE.md** | 9.6K | รายละเอียด Event Name Feature |

---

## 📦 Package Files

### Archive
- **spin-wheel-final.tar.gz** - Complete package (all files compressed)

---

## 🎯 Deployment Checklist

### ✅ Files to Upload to GitHub:

```
spin-wheel/
├── index.html          ✅ Upload
├── admin.html          ✅ Upload
├── style.css           ✅ Upload
├── script.js           ✅ Upload
├── wheelConfig.js      ✅ Upload
├── logo.png            ⚠️  Optional (or replace with your logo)
├── README.md           ✅ Upload
├── QUICK-START.md      ✅ Upload
├── CHECKLIST.md        ✅ Upload
├── CHANGELOG.md        ✅ Upload
├── FILE-MANIFEST.md    ✅ Upload
└── docs/
    ├── GUIDE-update-sheets.md     ✅ Upload
    └── EVENT-NAME-FEATURE.md      ✅ Upload
```

### ❌ Files NOT to Upload to GitHub:

```
❌ Code.gs              → วางใน Google Apps Script เท่านั้น
```

---

## 📝 File Dependencies

### index.html depends on:
- ✅ style.css (linked)
- ✅ wheelConfig.js (loaded first)
- ✅ script.js (loaded after wheelConfig)
- ⚠️ logo.png (optional, referenced in wheelConfig)

### admin.html depends on:
- ✅ wheelConfig.js (for API functions)
- ✅ Inline styles (self-contained)
- ✅ Inline JavaScript (self-contained)

### script.js depends on:
- ✅ wheelConfig.js (must load first)
- ✅ WHEEL_CONFIG object (from wheelConfig.js)

### Code.gs depends on:
- ✅ Google Spreadsheet (เปิด Apps Script จากไฟล์นั้น)
- ✅ 3 sheets: Config, Prizes, Registrations
- ✅ ใช้ `getActiveSpreadsheet()` — เชื่อมอัตโนมัติ

---

## 🔧 Configuration Required

### Before Deploy:

**wheelConfig.js (บรรทัดที่ 7):**
```javascript
googleScriptUrl: "YOUR_WEB_APP_URL_HERE"
```

**หมายเหตุ:** 
- Code.gs ไม่ต้องแก้อะไร
- ใช้ `SpreadsheetApp.getActiveSpreadsheet()` เชื่อมอัตโนมัติ
- แค่เปิด Apps Script จาก Spreadsheet ที่ต้องการใช้งาน

---

## 📊 File Sizes Summary

| Category | Total Size |
|----------|------------|
| **Frontend (HTML/CSS/JS)** | ~76 KB |
| **Backend (Code.gs)** | 11 KB |
| **Assets (Logo)** | 109 KB |
| **Documentation** | ~61 KB |
| **Total** | ~257 KB |

**Note:** ขนาดเล็กมาก → โหลดเร็ว, เหมาะกับ mobile

---

## 🚀 Deployment Workflow

```
1. Setup Google Sheets
   └─> เปิด Spreadsheet
   └─> Extensions → Apps Script
   └─> วาง Code.gs
   └─> บันทึก
   └─> รัน setupSheets()
   └─> Deploy Web App
   
2. Configure wheelConfig.js
   └─> ใส่ googleScriptUrl
   
3. Upload to GitHub
   └─> ทุกไฟล์ ยกเว้น Code.gs
   
4. Enable GitHub Pages
   └─> Settings → Pages → main
   
5. Test
   └─> admin.html → ตรวจสอบการเชื่อมต่อ
   └─> index.html → ทดสอบหมุนวงล้อ
```

---

## 🔍 File Integrity Check

เช็คว่าไฟล์ครบหรือไม่:

```bash
# ใน terminal / command prompt:
cd spin-wheel-final
ls -1

# ควรเห็น:
# admin.html
# CHANGELOG.md
# CHECKLIST.md
# Code.gs
# docs
# FILE-MANIFEST.md
# index.html
# logo.png
# QUICK-START.md
# README.md
# script.js
# style.css
# wheelConfig.js
```

---

## ✅ Verification

- [x] Frontend files: 6 files
- [x] Backend file: 1 file (Code.gs)
- [x] Documentation: 5 files
- [x] Subdirectory: docs/ (2 files)
- [x] Total: 14 files + 1 directory

**Status:** ✅ Complete Package Ready for Deployment

---

**Last Updated:** May 20, 2026  
**Package Version:** 2.0.0  
**Total Files:** 14
