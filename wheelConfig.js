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
//  Real-time Sync API
// ============================================================

// โหลด Config จาก Google Sheets
async function loadConfigFromServer() {
  if (!WHEEL_CONFIG.googleScriptUrl) return null;
  
  try {
    const response = await fetch(WHEEL_CONFIG.googleScriptUrl + '?action=getConfig', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to load config');
    const data = await response.json();
    
    if (data.success && data.config) {
      return data.config;
    }
    return null;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

// บันทึก Config ไปยัง Google Sheets
async function saveConfigToServer(config) {
  if (!WHEEL_CONFIG.googleScriptUrl) return false;

  try {
    // ใช้ Content-Type: text/plain เพื่อหลีกเลี่ยง CORS preflight
    // Google Apps Script ไม่รองรับ OPTIONS request จาก Content-Type: application/json
    const response = await fetch(WHEEL_CONFIG.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'saveConfig',
        config: config
      })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// ดึงจำนวนของรางวัลคงเหลือแบบ real-time
async function getRemainingPrizes() {
  if (!WHEEL_CONFIG.googleScriptUrl) return null;
  
  try {
    const response = await fetch(WHEEL_CONFIG.googleScriptUrl + '?action=getRemaining', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to get remaining prizes');
    const data = await response.json();
    
    if (data.success && data.remaining) {
      return data.remaining; // { prizeId: remainingCount, ... }
    }
    return null;
  } catch (error) {
    console.error('Error getting remaining prizes:', error);
    return null;
  }
}

// อัปเดตจำนวนของรางวัลหลังจากมีคนได้รับ
async function updatePrizeCount(prizeId, decrement = 1) {
  if (!WHEEL_CONFIG.googleScriptUrl) return false;

  try {
    const response = await fetch(WHEEL_CONFIG.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'decrementPrize',
        prizeId: prizeId,
        amount: decrement
      })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error updating prize count:', error);
    return false;
  }
}
