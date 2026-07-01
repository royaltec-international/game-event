# 📝 Changelog

All notable changes to this project will be documented in this file.

---

## [2.0.0] - 2026-05-20

### 🎪 Added - Event Name Feature
- **Multi-Event Support:** ระบบรองรับการใช้งานหลาย Event ในไฟล์ Google Sheets เดียว
- **Event Name Field:** เพิ่มช่อง "ชื่องาน Event" ใน Admin Panel (หน้า General Settings)
- **Event Tracking:** บันทึก Event Name พร้อมข้อมูลผู้ลงทะเบียนทุกรายการ
- **Prize Separation:** แยกนับของรางวัลตาม Event (composite key: prizeId|eventName)

### 🔄 Changed - Real-time Sync
- **Auto-refresh:** จำนวนของรางวัลคงเหลืออัปเดตทุก 10 วินาทีอัตโนมัติ
- **Connection Indicator:** แสดงสถานะการเชื่อมต่อ Google Sheets แบบ real-time
- **Stock Badges:** แสดง badge สีตามสถานะคงเหลือ (สูง/ปานกลาง/ต่ำ/หมด)
- **Usage Statistics:** Progress bar แสดงของที่ใช้ไป vs คงเหลือ

### 📊 Updated - Google Sheets Structure
- **Registrations Sheet:** เพิ่ม column "Event Name" (9 columns total)
- **Prizes Sheet:** เพิ่ม column "Event Name" (7 columns total)
- **Config Sheet:** JSON เพิ่ม field `eventName`

### 🎨 Improved - UI/UX
- **Admin Panel:** Dark theme ใหม่ สวยกว่าเดิม
- **Mobile Responsive:** ปรับปรุงการแสดงผลบน mobile
- **Visual Feedback:** Tooltip, hover states, loading indicators
- **Error Messages:** ข้อความ error ชัดเจนขึ้น

### 📚 Documentation
- **README.md:** เอกสารฉบับสมบูรณ์
- **GUIDE-update-sheets.md:** คู่มือปรับแก้ Sheets เดิม
- **EVENT-NAME-FEATURE.md:** รายละเอียด Event Name Feature
- **CHECKLIST.md:** Pre-launch checklist
- **CHANGELOG.md:** เอกสารนี้

### 🐛 Fixed
- แก้ไข CORS issues กับ Apps Script
- แก้ไข URLSearchParams parsing
- แก้ไข race condition ในการอัปเดต prize count

---

## [1.0.0] - 2026-02-25

### 🎉 Initial Release
- ระบบหมุนวงล้อลุ้นรางวัลพื้นฐาน
- ฟอร์มลงทะเบียน (6 fields: ชื่อ, นามสกุล, อีเมล, เบอร์โทร, บริษัท, ตำแหน่ง)
- วงล้อ weighted random
- บันทึกข้อมูลลง Google Sheets
- Basic admin config (ผ่าน wheelConfig.js)
- Confetti animation
- Toast notifications
- Responsive design

### Features
- ✅ Registration form with validation
- ✅ Wheel spinning with weighted probabilities
- ✅ Prize display with confetti
- ✅ Google Sheets integration
- ✅ Kanit font Thai support
- ✅ Gradient theme
- ✅ Mobile responsive

---

## Roadmap

### [2.1.0] - Planned
- [ ] QR Code generation สำหรับแต่ละผู้เล่น
- [ ] Email notification เมื่อได้รับรางวัล
- [ ] Export รายงาน PDF
- [ ] Multi-language support (EN/TH toggle)
- [ ] Prize images upload
- [ ] Custom wheel themes

### [2.2.0] - Future
- [ ] Authentication สำหรับ Admin Panel
- [ ] Analytics dashboard
- [ ] Prize history per user
- [ ] Duplicate detection (email/phone)
- [ ] Rate limiting
- [ ] Batch prize import/export

### [3.0.0] - Long-term
- [ ] Backend API (Node.js/Express)
- [ ] Database (PostgreSQL/MongoDB)
- [ ] User accounts
- [ ] Multi-tenant support
- [ ] Advanced analytics
- [ ] Mobile app (React Native)

---

## Migration Guides

### From 1.0.0 to 2.0.0
ดู [GUIDE-update-sheets.md](docs/GUIDE-update-sheets.md) สำหรับขั้นตอนโดยละเอียด

**สรุป:**
1. Backup ข้อมูลเดิม
2. อัปเดต Code.gs
3. รัน setupSheets()
4. เพิ่ม column "Event Name" ใน Registrations (ถ้ามีข้อมูลเก่า)
5. Re-deploy Web App
6. แทนที่ไฟล์ frontend

---

## Breaking Changes

### 2.0.0
⚠️ **Google Sheets Structure Changed:**
- Registrations: 8 → 9 columns (เพิ่ม Event Name)
- Prizes: 6 → 7 columns (เพิ่ม Event Name)

⚠️ **Apps Script API Changed:**
- `saveRegistration()` ต้องรับ `eventName` parameter
- `updatePrizesSheet()` ต้องรับ `eventName` parameter

⚠️ **wheelConfig.js Structure Changed:**
- เพิ่ม `eventName` field ใน config object

**Solution:** ใช้ไฟล์ใหม่ทั้งหมดจาก version 2.0.0

---

## Contributors

- **Arithut Sopa** - Initial work & Event Name Feature
- **Claude AI** - Code assistance & documentation
- **Royaltec International** - Project sponsor

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

**Last Updated:** May 20, 2026  
**Current Version:** 2.0.0
