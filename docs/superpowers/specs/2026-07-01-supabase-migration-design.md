# ย้าย Database จาก Google Sheets ไป Supabase + ปรับปรุงหน้า Admin

## 1. ภาพรวม

ระบบ event lead-generation (วงล้อลุ้นรางวัล) ปัจจุบันเป็น static website (HTML/JS) เก็บข้อมูลลงทะเบียนใน Google Sheet ผ่าน Google Apps Script (`Code.gs`) แบบ webhook. งานนี้ย้ายฐานข้อมูลไป **Supabase** (Postgres) แทน พร้อมปรับปรุงหน้า Admin ให้:

- Export ข้อมูลผู้ลงทะเบียนเป็นไฟล์ Excel (.xlsx)
- ลบข้อมูลที่ไม่ใช้แล้วได้ (รายแถว + ลบยกชุด)
- รองรับหลาย event ทำงาน**พร้อมกัน**จริง (คนละ URL) ไม่ใช่แค่สลับทีละอัน
- ดูรายชื่อผู้ลงทะเบียนแบบ **realtime** ในหน้า Admin
- ป้องกันด้วย Supabase Auth (login) ก่อนเข้าถึงข้อมูล/ฟังก์ชันจัดการ

**Frontend เรียก Supabase ตรงจาก browser** (ผ่าน `@supabase/supabase-js`) ไม่มี backend server เพิ่ม เหมาะกับ static site ที่ host บน GitHub Pages อยู่แล้ว. ความปลอดภัยคุมด้วย Row Level Security (RLS) ของ Postgres แทนการซ่อน logic ไว้หลัง server.

`Code.gs` และ Google Sheet เดิม**เก็บไว้เฉยๆ ไม่ลบ ไม่ใช้งานต่อ** (เผื่อ rollback). **ไม่ย้ายข้อมูลเก่า** เข้า Supabase (เริ่มฐานข้อมูลใหม่).

## 2. Database Schema (Supabase / Postgres)

3 ตารางหลัก แยกกันชัดเจน เชื่อมด้วย foreign key (`event_id`):

```sql
-- ตาราง events: เก็บ config ของแต่ละงาน (เดิมคือ Config sheet)
create table events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                 -- ชื่อ event เช่น "Belden Roadshow 2026"
  slug          text unique not null,           -- ใช้ทำ URL เฉพาะ event เช่น "belden-roadshow-2026"
  config        jsonb not null,                 -- formFields, brandsCheckbox, pdpa, wheel, spin ฯลฯ (JSON ก้อนเดียวเหมือนเดิม)
  is_active     boolean default false,          -- event default เวลาเข้า URL โดยไม่มี ?event=
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on events (slug);

-- ตาราง prizes: ของรางวัลต่อ event (เดิมคือ Prizes sheet)
create table prizes (
  id            text not null,                  -- prize id เช่น "notepad" (ผูกกับ config)
  event_id      uuid not null references events(id) on delete cascade,
  label         text not null,
  quantity      int not null,                   -- จำนวนตั้งต้น
  used          int not null default 0,
  remaining     int generated always as (quantity - used) stored,
  updated_at    timestamptz default now(),
  primary key (id, event_id)
);

-- ตาราง registrations: ผู้ลงทะเบียน (เดิมคือ Registrations sheet)
create table registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  company       text,
  position      text,
  prize_label   text,
  prize_id      text,
  brands        text,                           -- comma-separated เหมือนเดิม
  pdpa_consent  text,                            -- 'YES' / 'NO' / 'N/A'
  custom_fields jsonb,                           -- custom form fields (แทน dynamic column ของ Sheet เดิม)
  created_at    timestamptz default now()
);
create index on registrations (event_id);
```

**เปลี่ยนจากเดิมตรงไหน:**
- Custom fields เดิมสร้าง column ใหม่ทุกครั้งใน Sheet (dynamic columns) → เก็บใน `jsonb` column เดียวแทน (ไม่ต้อง ALTER TABLE ทุกครั้งที่เพิ่ม field ใหม่)
- `remaining` เป็น generated column คำนวณอัตโนมัติ (แทนสูตร `=D-E` ใน Sheet เดิม)

**RPC function สำหรับลดสต็อกแบบ atomic** (กัน race condition ตอนคนหมุนพร้อมกันจำนวนมาก):

```sql
create or replace function decrement_prize(p_event_id uuid, p_prize_id text)
returns int language plpgsql security definer as $$
declare v_remaining int;
begin
  update prizes set used = used + 1, updated_at = now()
  where id = p_prize_id and event_id = p_event_id and used < quantity
  returning quantity - used into v_remaining;
  return v_remaining; -- null = ของหมดพอดี (กันแจกเกินสต็อกจริง)
end; $$;
```

`security definer` ทำให้ฟังก์ชันนี้รันข้าม RLS ได้ (anon เรียกใช้ได้โดยไม่ต้องมีสิทธิ์ UPDATE ตรงบนตาราง `prizes`) — ปลอดภัยกว่าเปิด UPDATE ให้ anon ตรงๆ

## 3. RLS Policies + Auth

เปิด RLS ทุกตาราง แยกสิทธิ์ 2 ระดับ: **anon** (หน้าเกมสาธารณะ ไม่ login) กับ **authenticated** (admin login แล้ว):

```sql
alter table events        enable row level security;
alter table prizes        enable row level security;
alter table registrations enable row level security;

-- events: anon อ่านได้อย่างเดียว (ต้องโหลด config ไปเล่นเกม), เขียน/ลบต้อง login
create policy "anon read events" on events for select to anon using (true);
create policy "auth full events" on events for all    to authenticated using (true) with check (true);

-- prizes: anon อ่านได้ (โชว์ remaining), เขียน/ลบต้อง login (ลดสต็อกผ่าน RPC เท่านั้น)
create policy "anon read prizes" on prizes for select to anon using (true);
create policy "auth full prizes" on prizes for all    to authenticated using (true) with check (true);

-- registrations: anon INSERT ได้อย่างเดียว (ตอนลงทะเบียน) ห้าม SELECT/UPDATE/DELETE
create policy "anon insert registrations" on registrations for insert to anon with check (true);
create policy "auth full registrations"   on registrations for all    to authenticated using (true) with check (true);
```

**เหตุผล:** ถ้าไม่กันไว้แบบนี้ ใครก็เรียก Supabase API ตรงๆ (ผ่าน anon key ที่ฝังใน browser — ปกติของ Supabase ไม่ใช่ช่องโหว่) ดึงข้อมูล PDPA ทั้งหมด หรือลบ prizes ทิ้งได้เลยโดยไม่ผ่านหน้าเว็บด้วยซ้ำ. สิทธิ์อ่าน/ลบ/export ข้อมูลผู้ลงทะเบียนสงวนไว้เฉพาะ admin ที่ login แล้วเท่านั้น

**Auth สำหรับ Admin:**
- ใช้ Supabase Auth (email/password) — สร้าง user ผ่าน Supabase Dashboard (ไม่เปิดให้สมัครเองสาธารณะ)
- `admin.html` เช็ค session ก่อนแสดง UI ผ่าน `supabase.auth.getSession()` — ไม่มี session → แสดงฟอร์ม login
- มีปุ่ม Logout มาตรฐาน

## 4. Frontend Changes

**ไฟล์ใหม่**: `supabaseClient.js` — client เดียวใช้ร่วมทุกหน้า

```js
const SUPABASE_URL = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ..."; // public ได้ — RLS คุมสิทธิ์แล้ว
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
โหลดผ่าน CDN `@supabase/supabase-js@2` ก่อนไฟล์นี้ ในทุกหน้า (`index.html`, `admin.html`)

**wheelConfig.js** — ตัดฟังก์ชัน API เดิมที่ยิงไป `googleScriptUrl` ทิ้ง แทนด้วย query Supabase ตรง:

| เดิม (Google Apps Script) | ใหม่ (Supabase) |
|---|---|
| `GET ?action=getConfig` | อ่าน event ตาม URL (ดูหัวข้อ multi-event ด้านล่าง) |
| `GET ?action=getRemaining` | `supabase.from('prizes').select('id, quantity, used').eq('event_id', eventId)` → คำนวณ remaining ฝั่ง client |
| `POST action=saveConfig` | `supabase.from('events').update({config}).eq('id', eventId)` (ต้อง login) |
| `POST action=decrementPrize` | `supabase.rpc('decrement_prize', {p_event_id, p_prize_id})` |

**script.js** — จุดหลักที่เปลี่ยนคือ `sendToGoogleSheets()` → เปลี่ยนเป็น `supabase.from('registrations').insert({...})`. Logic ฟอร์ม/วงล้อ/validation เดิมไม่แตะ. เพิ่ม retry queue ใน localStorage ถ้า insert ล้มเหลว (ดูหัวข้อ Error Handling)

**รองรับหลาย event พร้อมกัน (URL-based):**

Schema (events/prizes/registrations แยก FK) รองรับหลาย event พร้อมกันอยู่แล้วโดยธรรมชาติ — จุดที่ต้องเพิ่มคือให้ `index.html` รู้ว่าตัวเองคือ event ไหนจาก URL แทนการพึ่ง `is_active` เพียงอย่างเดียว:

```js
const params = new URLSearchParams(location.search);
const slug = params.get('event');

const { data: eventRow } = slug
  ? await supabase.from('events').select('*').eq('slug', slug).single()
  : await supabase.from('events').select('*').eq('is_active', true).single(); // fallback
```

แต่ละบูธเปิดคนละ URL พร้อมกันได้จริง เช่น `index.html?event=belden-roadshow-2026`, `index.html?event=panduit-fair-2026` โดยไม่ชนกัน (แยกข้อมูลตาม `event_id` ทั้งหมด)

**admin.html เพิ่ม 4 ส่วนใหม่:**

1. **หน้า Login gate** — เช็ค session, ไม่มี → ฟอร์ม login (`signInWithPassword`)
2. **Event Selector + สร้าง Event ใหม่** — dropdown เลือก event ที่ "กำลังดูอยู่ใน admin" (view context, ใช้ filter config/prizes/registrations ทั้งหน้า) แยกจาก "event ที่ live อยู่หน้าเกมจริง". มีปุ่ม:
   - "สร้าง Event ใหม่" (ตั้งชื่อ + slug + ตั้งค่า config/prizes เริ่มต้น) — จำเป็น เพราะไม่งั้นไม่มีทางสร้าง event แรกได้เลยนอกจากรัน SQL เอง
   - "ตั้งเป็น Event ปัจจุบัน (default)" — set `is_active=true` ให้ event ที่เลือก (false ให้ตัวอื่นทั้งหมด)
   - "คัดลอกลิงก์" ต่อแถว event — generate `<origin>/index.html?event=<slug>` ให้ก็อปแจกทีมงานหน้าบูธ
3. **แท็บ "รายชื่อผู้ลงทะเบียน" (realtime)** — ตาราง list จาก `registrations` ของ event ที่เลือก, filter ตามช่วงวันที่, checkbox เลือกแถว, ปุ่ม "ลบที่เลือก" (bulk, มี confirm dialog) + ปุ่มลบรายแถว (มี confirm), ปุ่ม "Export Excel" (ใช้ **SheetJS** CDN generate `.xlsx` ฝั่ง browser จากข้อมูลที่ filter อยู่, ไม่ต้องมี backend export). Subscribe realtime:

```js
supabase
  .channel('registrations-live')
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'registrations', filter: `event_id=eq.${selectedEventId}` },
      (payload) => prependRowToTable(payload.new)
  )
  .subscribe();
```
   แถวใหม่โผล่ทันทีตอนมีคนลงทะเบียนหน้างาน ไม่ต้องรีเฟรช. Re-subscribe ใหม่ทุกครั้งที่เปลี่ยน event ใน dropdown (unsubscribe channel เก่าก่อน). Realtime ผ่าน RLS เดียวกับ SELECT policy ของ `registrations` → ใช้ได้เฉพาะตอน login แล้ว (ข้อมูลส่วนบุคคลไม่รั่วไปหน้าเกมสาธารณะ)
4. **ตาราง `prizes`/`events` config panel เดิม** — ปรับให้ทำงานกับ event ที่เลือกจาก selector (เดิมมี field เดียว ตอนนี้ผูกกับ `event_id`)

## 5. Error Handling

- **Insert ล้มเหลว** (network/DB error ตอนลงทะเบียน) → เก็บ retry queue ใน localStorage ชั่วคราว ป้องกัน data loss ตอนสัญญาณเน็ตกระตุกหน้างาน (ปรับปรุงจากเดิมที่ไม่มี retry เลย)
- **ของหมดพอดีตอนกำลังหมุน** (race condition, สอง user แย่งของชิ้นสุดท้ายในเสี้ยววินาที): ต้อง sync remaining สดจาก Supabase ก่อนคำนวณวงล้อทุกครั้งที่กด "หมุน" (ไม่ใช้ค่า cache ตอนโหลดหน้าแรก) เพื่อลดโอกาสชนให้เหลือน้อยที่สุด. ถ้า `decrement_prize` RPC คืนค่า `null` หลัง spin เสร็จ (ชนกันจริง) → **บังคับหมุนใหม่** (ไม่สุ่มของอื่นมาแทนของที่วงล้อแสดงผลไปแล้ว เพราะจะดูเหมือนโกงกับผู้เล่น) → โชว์ toast "ของชิ้นนี้เพิ่งหมดพอดี กรุณาหมุนใหม่" → รีเฟรช remaining (ตัดของที่หมดออกจากวงล้อ) → ไม่บันทึก registration ซ้ำ → เปิดปุ่มหมุนใหม่ทันที
- **Auth session หมดอายุ** ระหว่างใช้ admin → intercept error จาก Supabase → เด้งกลับหน้า login พร้อม toast แจ้งเตือน
- **Export ตอนไม่มีข้อมูล** (filter แล้วว่าง) → disable ปุ่ม export + toast แจ้ง
- **Bulk delete / ลบรายแถว** → confirm dialog ก่อนเสมอ (action ทำลายล้างสูง กู้คืนไม่ได้)

## 6. Testing

- ลงทะเบียน + หมุนวงล้อจริงผ่าน `index.html` → เช็คแถวขึ้นใน Supabase table editor ตรง `event_id`
- ทดสอบ concurrent decrement: เปิดหลาย tab กดหมุนพร้อมกันตอนของเหลือ 1 ชิ้น → ต้องมีคนได้แค่คนเดียว คนที่เหลือเจอ "หมุนใหม่"
- ทดสอบ RLS: ลอง query ตรงด้วย anon key ผ่าน browser console (`select * from registrations`) ต้องโดนบล็อกเพราะไม่ได้ login
- ทดสอบ Realtime: เปิด admin 2 browser (login แล้ว) ลงทะเบียนจาก `index.html` อีกแท็บ → แถวต้องโผล่ทั้ง 2 browser ทันที
- ทดสอบ multi-event พร้อมกัน: เปิด `index.html?event=A` และ `?event=B` คนละ browser พร้อมกัน → ข้อมูล/สต็อกต้องไม่ปนกัน
- ทดสอบ Export: filter event/ช่วงวันที่ต่างๆ → เปิดไฟล์ `.xlsx` ตรวจข้อมูลครบ/ตรง
- ทดสอบ Auth: เข้า `admin.html` โดยไม่ login → ต้องเจอหน้า login ไม่ใช่ข้อมูล; logout แล้วเข้าใหม่ต้อง login ซ้ำ

## Part 0 — ขั้นตอน Setup ใน Supabase Dashboard (ทำเอง ทีละขั้นตอน)

1. **Settings → API** → คัดลอก `Project URL` และ `anon public key` (ใส่ใน `supabaseClient.js`)
2. **SQL Editor** → รันคำสั่งสร้างตาราง + RLS policies + RPC function ทั้งหมด (หัวข้อ 2–3 ด้านบน) ทีเดียว
3. **Database → Replication** → เปิด replication ให้ตาราง `registrations` (จำเป็นสำหรับ Realtime)
4. **Authentication → Providers** → ปิด "Allow new users to sign up" (กันคนแปลกหน้าสมัคร account เข้ามาเป็น admin เอง)
5. **Authentication → Users → Add user** → สร้าง account admin (email/password) ด้วยตัวเอง
6. Event แรกสร้างผ่านฟีเจอร์ "สร้าง Event ใหม่" ในหน้า `admin.html` (ไม่ต้องรัน SQL insert เอง)

## Out of Scope

- ย้ายข้อมูลเก่าจาก Google Sheet เข้า Supabase (เริ่มฐานข้อมูลใหม่ตามที่ตกลง)
- Apple-style UI redesign ของ `index.html`/`admin.html` (แยกเป็นโปรเจกต์ต่างหาก บรีฟใหม่ทีหลัง)
- ลบ/ปิดการทำงานของ `Code.gs` และ Google Sheet เดิม (เก็บไว้เฉยๆ เผื่อ rollback)
- UI จัดการ Supabase Auth users (สร้าง/ลบ admin account อื่น) — ทำผ่าน Supabase Dashboard โดยตรง
