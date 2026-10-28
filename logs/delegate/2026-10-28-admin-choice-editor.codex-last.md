แก้ [admin.html](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/admin.html)

- เพิ่ม choice types และชื่อไทย
- เพิ่มตัวแก้ options, ปุ่ม ↑ ↓ ✕, เพิ่มตัวเลือก, `allowOther`
- ซ่อน Placeholder สำหรับ checkbox/radio
- ตรวจ config ก่อนบันทึก พร้อม toast error
- เพิ่มคำเตือนเมื่อเปลี่ยนประเภท field เดิม
- รองรับจอ 390px และปุ่มสัมผัส 44px

Verify ผ่าน:

```text
101 tests passed, 0 failed
grep addFFOption passed
git diff --check passed
```

ไม่มีจุดไม่แน่ใจ.