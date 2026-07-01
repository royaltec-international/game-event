// ============================================================
//  wheelConfig.js — Real-time Sync Version
//  Config จะโหลดจาก Google Sheets แบบ real-time
// ============================================================

const WHEEL_CONFIG = {
  // ─── Google Apps Script URL (ต้องตั้งค่าก่อน deploy) ───
  googleScriptUrl: "https://script.google.com/macros/s/AKfycbyaor7J_coNoEyjM0DVuoWDzqd-rI-HhZfXqbA1MrBpU_P8ZHMqSaLV-TbRL7_LPDg3xQ/exec",

  // ─── Default Values (ใช้ตอนโหลดครั้งแรกหรือ fallback) ───
  lineAddFriendUrl: "https://www.facebook.com/RoyaltecThailand",
  logoUrl: "https://royaltec-international.github.io/game-event/Royaltec_logo.png",
  logoAlt: "Company Logo",

  prizes: [
    { id: "notepad",      label: "โน๊ตก้อน",       weight: 50, quantity: 55, color: "#f9c74f", textColor: "#1a1a2e", icon: "📓" },
    { id: "calculator",   label: "เครื่องคิดเลข",   weight: 0.5, quantity: 2,  color: "#4cc9f0", textColor: "#1a1a2e", icon: "🧮" },
    { id: "fan",          label: "พัดลม",           weight: 0.5, quantity: 2,  color: "#43aa8b", textColor: "#ffffff", icon: "🌀" },
    { id: "special",      label: "ร่ม",             weight: 0.5, quantity: 1,  color: "#9b5de5", textColor: "#ffffff", icon: "🎁" },
    { id: "belden_gift_1",label: "สายชาร์จ Belden", weight: 2,   quantity: 10, color: "#ff6b35", textColor: "#ffffff", icon: "🔌" },
  ],

  formFields: [
    { key: "firstName", label: "ชื่อ",     placeholder: "ชื่อจริง",             type: "text",  required: true,  enabled: true },
    { key: "lastName",  label: "นามสกุล",  placeholder: "นามสกุล",              type: "text",  required: true,  enabled: true },
    { key: "email",     label: "อีเมล",    placeholder: "example@company.com",  type: "email", required: true,  enabled: true },
    { key: "phone",     label: "เบอร์โทร", placeholder: "0812345678",           type: "tel",   required: true,  enabled: true },
    { key: "position",  label: "ตำแหน่ง",  placeholder: "Engineer / Manager",   type: "text",  required: true,  enabled: true },
    { key: "company",   label: "บริษัท",   placeholder: "ชื่อบริษัท / องค์กร",  type: "text",  required: true,  enabled: true },
  ],

  brandsCheckbox: {
    enabled: true,
    heading: "แบรนด์หรือสินค้าที่สนใจ",
    items: ["Panduit", "Allied", "Eaton", "Belden"],
    required: false
  },

  pdpa: {
    enabled: true,
    text: "ข้าพเจ้ายินยอมให้บริษัทฯ เก็บรวบรวม ใช้ และ/หรือเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า เพื่อวัตถุประสงค์ในการติดต่อสื่อสาร นำเสนอผลิตภัณฑ์และบริการ ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)",
    required: true
  },

  wheel: {
    fontSize: 13,
    fontFamily: "'Kanit', sans-serif",
    centerCircleColor: "#162c3b",
    centerCircleBorderColor: "#ffd700",
    textRadiusRatio: 0.8,
    iconGap: 28
  },

  spin: {
    minRotations: 5,
    maxRotations: 10,
    durationMs: 5000,
    easing: "cubic-bezier(0.17, 0.67, 0.12, 0.99)"
  }
};

// ============================================================
//  Real-time Sync API — Supabase
// ============================================================

let CURRENT_EVENT_ID = null;

// โหลด Config จาก Supabase (ตาม ?event=<slug> ใน URL, fallback เป็น event ที่ is_active)
async function loadConfigFromServer() {
  const slug = resolveEventSlug(location.search);

  const query = slug
    ? supabase.from('events').select('*').eq('slug', slug).single()
    : supabase.from('events').select('*').eq('is_active', true).single();

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error loading event config:', error);
    return null;
  }

  CURRENT_EVENT_ID = data.id;
  return { ...data.config, eventName: data.name, __eventId: data.id };
}

// โหลด Config ของ event ที่ระบุ id ตรงๆ (ใช้โดยหน้า admin — event ที่เลือกใน dropdown อาจไม่ใช่ event ที่ is_active)
async function loadEventConfigById(eventId) {
  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (error || !data) {
    console.error('Error loading event by id:', error);
    return null;
  }

  CURRENT_EVENT_ID = data.id;
  return { ...data.config, eventName: data.name, __eventId: data.id };
}

// บันทึก Config กลับไปยัง Supabase (ต้อง login เป็น authenticated)
async function saveConfigToServer(eventId, config) {
  const { error } = await supabase.from('events').update({ config }).eq('id', eventId);
  if (error) {
    console.error('Error saving config:', error);
    return false;
  }
  return true;
}

// ดึงจำนวนของรางวัลคงเหลือแบบ real-time
async function getRemainingPrizes() {
  if (!CURRENT_EVENT_ID) return null;

  const { data, error } = await supabase
    .from('prizes')
    .select('id, quantity, used')
    .eq('event_id', CURRENT_EVENT_ID);

  if (error || !data) {
    console.error('Error getting remaining prizes:', error);
    return null;
  }

  return computeRemainingMap(data);
}

// ลดสต็อกของรางวัลแบบ atomic ผ่าน RPC (คืนค่า remaining ใหม่ หรือ null ถ้าของหมดพอดี)
async function decrementPrizeRpc(prizeId) {
  if (!CURRENT_EVENT_ID) return null;

  const { data, error } = await supabase.rpc('decrement_prize', {
    p_event_id: CURRENT_EVENT_ID,
    p_prize_id: prizeId,
  });

  if (error) {
    console.error('Error decrementing prize:', error);
    return null;
  }

  return data;
}
