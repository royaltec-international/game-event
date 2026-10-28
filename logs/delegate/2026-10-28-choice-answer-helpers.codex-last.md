เสร็จ Task 1

ไฟล์ที่แก้:

- [fieldAnswers.js](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/js/fieldAnswers.js) + tests
- [exportRows.js](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/js/exportRows.js) + tests
- [admin.html](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/admin.html)
- [index.html](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/index.html)

ทำแล้ว:

- เพิ่ม answer helpers ครบ contract
- รองรับ export แบบ key ใหม่และ label legacy
- กรอง `__other` และ join array
- ส่ง `state.formFields` เข้า export
- เพิ่ม script tags ตามลำดับ
- เพิ่ม classic-script regression test ป้องกัน global-name collision

Verify: `node --test js/` → **101 passed, 0 failed**

Syntax และ `git diff --check` ผ่าน ไม่มีจุดไม่แน่ใจ ไม่ได้ commit/push.