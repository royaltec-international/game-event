ทำ Task 4 เสร็จ:

- เพิ่ม migration [20261028_04_prize_costs.sql](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/supabase/migrations/20261028_04_prize_costs.sql)
- เพิ่ม SQL tests [prize_costs.test.sql](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/supabase/tests/prize_costs.test.sql)
- เพิ่ม cost helpers [prizeCost.js](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/js/prizeCost.js)
- เพิ่ม TDD tests [prizeCost.test.js](/Users/kwxnxxmbair/K%20Storage/Claude%20Workspace/RTI%20Job/Event%20Lead%20generation/game-event/js/prizeCost.test.js)

ตรวจสอบ:

- RED ก่อน implementation: ผ่านขั้นตอนตาม TDD
- `node --test js/`: ผ่าน 106/106, exit 0
- `node --check` ไฟล์ใหม่: ผ่าน
- ไม่รัน `bash supabase/tests/run.sh` ตามคำสั่ง เพราะต้องใช้ Docker; SQL integration รอ Claude รัน
- ไม่มีจุดอื่นที่ไม่แน่ใจ