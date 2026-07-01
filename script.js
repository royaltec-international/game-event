// ============================================================
//  script.js (Updated with Event Name support)
//  ควบคุมการทำงานหลัก: Form, Wheel, Result, Google Sheets
// ============================================================

(() => {
  'use strict';

  // ----------------------------------------------------------
  //  State
  // ----------------------------------------------------------
  const state = {
    currentPage: 'form',
    userData: null,
    prizesRemaining: {},
    currentAngle: 0,
    isSpinning: false,
    wonPrize: null,
  };

  // ----------------------------------------------------------
  //  DOM refs
  // ----------------------------------------------------------
  const dom = {
    formSection:   document.getElementById('form-section'),
    wheelSection:  document.getElementById('wheel-section'),
    resultSection: document.getElementById('result-section'),
    form:          document.getElementById('registration-form'),
    submitBtn:     document.getElementById('submit-btn'),
    spinBtn:       document.getElementById('spin-btn'),
    doneBtn:       document.getElementById('done-btn'),
    canvas:        document.getElementById('wheelCanvas'),
    pointer:       document.getElementById('wheel-pointer'),
    resultIcon:    document.getElementById('result-icon'),
    resultName:    document.getElementById('result-prize-name'),
    toast:         document.getElementById('toast'),
    confetti:      document.getElementById('confetti-canvas'),
    logoImg:       document.getElementById('logo-img'),
  };

  // ----------------------------------------------------------
  //  Init
  // ----------------------------------------------------------
  async function init() {
    // ตั้งค่าจำนวนเริ่มต้นจาก local config ก่อน (fallback)
    WHEEL_CONFIG.prizes.forEach(p => {
      state.prizesRemaining[p.id] = p.quantity;
    });

    // โหลด Config + remaining จาก Server (อัปเดตทับ local)
    await loadConfig();

    drainRetryQueue().catch(console.error);

    // Render form dynamically จาก config (fields, brands, PDPA)
    renderForm();

    // ตั้งค่า Logo
    setupLogo();

    // วาดวงล้อครั้งแรก
    drawWheel(state.currentAngle);

    // ผูก Events
    dom.form.addEventListener('submit', handleFormSubmit);
    dom.spinBtn.addEventListener('click', handleSpin);
    dom.doneBtn.addEventListener('click', handleDone);
  }

  // ----------------------------------------------------------
  //  Load Config from Server
  // ----------------------------------------------------------
  async function loadConfig() {
    if (!WHEEL_CONFIG.googleScriptUrl) return;

    try {
      // โหลด config จาก server
      const config = await loadConfigFromServer();
      if (config) {
        Object.assign(WHEEL_CONFIG, config);
      }
    } catch (e) {
      console.log('Using local config (server unavailable)');
    }

    // โหลดจำนวนคงเหลือจริงจาก server (แทนที่ค่า quantity เริ่มต้น)
    try {
      const remaining = await getRemainingPrizes();
      if (remaining) {
        // อัปเดต state.prizesRemaining ด้วยข้อมูลจริงจาก Sheets
        WHEEL_CONFIG.prizes.forEach(p => {
          if (remaining[p.id] !== undefined) {
            state.prizesRemaining[p.id] = remaining[p.id];
          }
        });
      }
    } catch (e) {
      console.log('Using local prize quantities (server unavailable)');
    }
  }

  // ----------------------------------------------------------
  //  Setup Logo
  // ----------------------------------------------------------
  function setupLogo() {
    const logoImg = dom.logoImg;
    const fallback = document.getElementById('logo-fallback');

    const hasLogo = WHEEL_CONFIG.logoUrl &&
                    WHEEL_CONFIG.logoUrl !== '' &&
                    !WHEEL_CONFIG.logoUrl.includes('via.placeholder.com') &&
                    !WHEEL_CONFIG.logoUrl.includes('YOUR_');

    if (hasLogo) {
      logoImg.alt = WHEEL_CONFIG.logoAlt || 'Company Logo';
      logoImg.style.display = 'block';
      if (fallback) fallback.style.display = 'none';

      logoImg.onerror = function() {
        logoImg.style.display = 'none';
        if (fallback) fallback.style.display = 'flex';
      };
      logoImg.src = WHEEL_CONFIG.logoUrl;
    } else {
      logoImg.style.display = 'none';
      if (fallback) fallback.style.display = 'none';
    }
  }

  // ----------------------------------------------------------
  //  Page Navigation
  // ----------------------------------------------------------
  function showPage(page) {
    const pages = { form: dom.formSection, wheel: dom.wheelSection, result: dom.resultSection };
    Object.values(pages).forEach(el => el.classList.remove('active'));
    pages[page].classList.add('active');
    state.currentPage = page;
  }

  // ----------------------------------------------------------
  //  HTML Escape Helper
  // ----------------------------------------------------------
  function htmlEsc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ----------------------------------------------------------
  //  Default Config Getters (used when server config not found)
  // ----------------------------------------------------------
  function getDefaultFormFields() {
    return [
      { key: 'firstName', label: 'ชื่อ',     placeholder: 'ชื่อจริง',             type: 'text',  required: true,  enabled: true },
      { key: 'lastName',  label: 'นามสกุล',  placeholder: 'นามสกุล',              type: 'text',  required: true,  enabled: true },
      { key: 'email',     label: 'อีเมล',    placeholder: 'example@company.com',  type: 'email', required: true,  enabled: true },
      { key: 'phone',     label: 'เบอร์โทร', placeholder: '0812345678',           type: 'tel',   required: true,  enabled: true },
      { key: 'position',  label: 'ตำแหน่ง',  placeholder: 'Engineer / Manager',   type: 'text',  required: true,  enabled: true },
      { key: 'company',   label: 'บริษัท',   placeholder: 'ชื่อบริษัท / องค์กร',  type: 'text',  required: true,  enabled: true },
    ];
  }

  // ----------------------------------------------------------
  //  Dynamic Form Rendering
  // ----------------------------------------------------------
  function renderForm() {
    const fields  = WHEEL_CONFIG.formFields  || getDefaultFormFields();
    const brands  = WHEEL_CONFIG.brandsCheckbox || { enabled: false };
    const pdpa    = WHEEL_CONFIG.pdpa           || { enabled: false };

    // ─── Form Fields ───
    const container = document.getElementById('form-fields-container');
    container.innerHTML = '';

    // Fields ที่ fullWidth (email, company หรือ field ที่ไม่มีคู่)
    const enabledFields = fields.filter(f => f.enabled !== false);
    const FULL_WIDTH_KEYS = ['email', 'company'];

    enabledFields.forEach(f => {
      const isFull = FULL_WIDTH_KEYS.includes(f.key) || f.fullWidth;
      const div = document.createElement('div');
      div.className = `form-group${isFull ? ' full-width' : ''}`;

      const extraAttrs = f.type === 'tel'
        ? 'inputmode="numeric" maxlength="10"'
        : f.type === 'email' ? 'autocomplete="email"' : '';

      div.innerHTML = `
        <label class="form-label" for="field-${htmlEsc(f.key)}">
          ${htmlEsc(f.label)}${f.required ? ' <span class="required">*</span>' : ''}
        </label>
        <input
          id="field-${htmlEsc(f.key)}"
          name="${htmlEsc(f.key)}"
          type="${htmlEsc(f.type || 'text')}"
          class="form-input"
          placeholder="${htmlEsc(f.placeholder || '')}"
          data-key="${htmlEsc(f.key)}"
          data-type="${htmlEsc(f.type || 'text')}"
          data-required="${f.required ? 'true' : 'false'}"
          ${f.required ? 'required' : ''}
          ${extraAttrs}
        />
        <span id="error-${htmlEsc(f.key)}" class="field-error"></span>
      `;
      container.appendChild(div);
    });

    // ─── Brands Checkbox ───
    const brandsContainer = document.getElementById('brands-container');
    if (brands.enabled && brands.items && brands.items.length > 0) {
      const itemsHtml = brands.items.map(item =>
        `<label class="brand-item">
          <input type="checkbox" name="brand" value="${htmlEsc(item)}" class="brand-checkbox">
          ${htmlEsc(item)}
        </label>`
      ).join('');

      brandsContainer.innerHTML = `
        <div class="brands-section">
          <p class="brands-heading">
            ${htmlEsc(brands.heading || 'แบรนด์ที่สนใจ')}
            ${brands.required ? '<span class="required"> *</span>' : ''}
          </p>
          <div class="brands-grid">${itemsHtml}</div>
          <span id="error-brands" class="field-error"></span>
        </div>
      `;
    } else {
      brandsContainer.innerHTML = '';
    }

    // ─── PDPA Consent ───
    const pdpaContainer = document.getElementById('pdpa-container');
    if (pdpa.enabled && pdpa.text) {
      pdpaContainer.innerHTML = `
        <div class="pdpa-section">
          <label class="pdpa-label">
            <input type="checkbox" id="field-pdpa" name="pdpaConsent" class="pdpa-checkbox">
            <span>${htmlEsc(pdpa.text)}${pdpa.required ? '<span class="required"> *</span>' : ''}</span>
          </label>
          <span id="error-pdpa" class="field-error"></span>
        </div>
      `;
    } else {
      pdpaContainer.innerHTML = '';
    }

    // ─── Setup Live Validation ───
    setupLiveValidation();
  }

  // ----------------------------------------------------------
  //  Dynamic Validation
  // ----------------------------------------------------------
  function validateFieldValue(field, value) {
    if (!field.required) return true;
    const v = String(value || '');
    if (field.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    if (field.type === 'tel')   return /^[0-9]{9,10}$/.test(v.replace(/[-\s]/g, ''));
    if (field.type === 'number') return v.trim() !== '' && !isNaN(Number(v));
    return v.trim().length >= 2;
  }

  function getFieldErrorMsg(field) {
    if (field.type === 'email')  return 'รูปแบบอีเมลไม่ถูกต้อง';
    if (field.type === 'tel')    return 'กรุณากรอกเบอร์โทร 9-10 หลัก';
    if (field.type === 'number') return `กรุณากรอก ${field.label}`;
    return `กรุณากรอก ${field.label} (อย่างน้อย 2 ตัวอักษร)`;
  }

  function showFieldError(key, show, msg) {
    const errEl = document.getElementById(`error-${key}`);
    if (!errEl) return;
    errEl.textContent = show ? (msg || '') : '';
    errEl.classList.toggle('visible', show);
    const input = document.getElementById(`field-${key}`);
    if (input) input.classList.toggle('error', show);
  }

  function validateAll() {
    const fields = (WHEEL_CONFIG.formFields || getDefaultFormFields()).filter(f => f.enabled !== false);
    const brands = WHEEL_CONFIG.brandsCheckbox || { enabled: false };
    const pdpa   = WHEEL_CONFIG.pdpa           || { enabled: false };
    let valid = true;

    // Validate text/email/tel/number fields
    fields.forEach(f => {
      if (!f.required) return;
      const input = document.getElementById(`field-${f.key}`);
      if (!input) return;
      const ok = validateFieldValue(f, input.value);
      showFieldError(f.key, !ok, getFieldErrorMsg(f));
      if (!ok) valid = false;
    });

    // Validate brands (if required)
    if (brands.enabled && brands.required) {
      const anyChecked = document.querySelectorAll('.brand-checkbox:checked').length > 0;
      showFieldError('brands', !anyChecked, `กรุณาเลือกอย่างน้อย 1 แบรนด์`);
      if (!anyChecked) valid = false;
    }

    // Validate PDPA (if required)
    if (pdpa.enabled && pdpa.required) {
      const pdpaEl = document.getElementById('field-pdpa');
      const checked = pdpaEl ? pdpaEl.checked : false;
      showFieldError('pdpa', !checked, 'กรุณายินยอมให้จัดเก็บข้อมูลก่อนดำเนินการต่อ');
      if (!checked) valid = false;
    }

    return valid;
  }

  function getFormData() {
    const fields  = (WHEEL_CONFIG.formFields || getDefaultFormFields()).filter(f => f.enabled !== false);
    const brands  = WHEEL_CONFIG.brandsCheckbox || { enabled: false };
    const pdpa    = WHEEL_CONFIG.pdpa           || { enabled: false };
    const BASE_KEYS = ['firstName', 'lastName', 'email', 'phone', 'company', 'position'];

    const data = {};
    const customFields = {};

    fields.forEach(f => {
      const input = document.getElementById(`field-${f.key}`);
      if (!input) return;
      if (BASE_KEYS.includes(f.key)) {
        data[f.key] = input.value;
      } else {
        // Custom field — label เป็น column header ใน Google Sheet
        customFields[f.label || f.key] = input.value;
      }
    });

    // Brands — comma-separated
    if (brands.enabled) {
      const checked = [...document.querySelectorAll('.brand-checkbox:checked')].map(el => el.value);
      data.brands = checked.join(', ');
    }

    // PDPA — true/false string
    if (pdpa.enabled) {
      const pdpaEl = document.getElementById('field-pdpa');
      data.pdpaConsent = pdpaEl && pdpaEl.checked ? 'true' : 'false';
    }

    // Custom fields as JSON string
    if (Object.keys(customFields).length > 0) {
      data.customFields = JSON.stringify(customFields);
    }

    return data;
  }

  function setupLiveValidation() {
    const fields = (WHEEL_CONFIG.formFields || getDefaultFormFields()).filter(f => f.enabled !== false);
    fields.forEach(f => {
      const input = document.getElementById(`field-${f.key}`);
      if (!input) return;
      input.addEventListener('blur', () => {
        if (f.required) showFieldError(f.key, !validateFieldValue(f, input.value), getFieldErrorMsg(f));
      });
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          showFieldError(f.key, !validateFieldValue(f, input.value), getFieldErrorMsg(f));
        }
      });
    });
  }

  // ----------------------------------------------------------
  //  Form Submit
  // ----------------------------------------------------------
  function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateAll()) return;

    state.userData = getFormData();
    showPage('wheel');
  }

  // ----------------------------------------------------------
  //  Supabase Registration Insert + Retry Queue
  // ----------------------------------------------------------
  async function insertRegistration(payload) {
    const row = {
      event_id: CURRENT_EVENT_ID,
      first_name: payload.firstName || '',
      last_name: payload.lastName || '',
      email: payload.email || '',
      phone: payload.phone || '',
      company: payload.company || '',
      position: payload.position || '',
      prize_label: payload.prize || '',
      prize_id: payload.prizeId || '',
      brands: payload.brands || '',
      pdpa_consent: payload.pdpaConsent === 'true' ? 'YES' : payload.pdpaConsent === 'false' ? 'NO' : 'N/A',
      custom_fields: payload.customFields ? JSON.parse(payload.customFields) : null,
    };

    const { error } = await supabase.from('registrations').insert(row);
    if (error) {
      console.error('Insert failed, queueing for retry:', error);
      queueFailedRegistration(window.localStorage, row);
      return false;
    }
    return true;
  }

  async function drainRetryQueue() {
    const pending = readRetryQueue(window.localStorage);
    if (pending.length === 0) return;

    const stillFailing = [];
    for (const row of pending) {
      const { error } = await supabase.from('registrations').insert(row);
      if (error) stillFailing.push(row);
    }

    if (stillFailing.length === 0) {
      clearRetryQueue(window.localStorage);
    } else {
      window.localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(stillFailing));
    }
  }

  // ----------------------------------------------------------
  //  Wheel Drawing
  // ----------------------------------------------------------
  function getActiveSegments() {
    return WHEEL_CONFIG.prizes.filter(p => state.prizesRemaining[p.id] > 0);
  }

  function drawWheel(rotationAngle) {
    const canvas = dom.canvas;
    const ctx = canvas.getContext('2d');
    const segments = getActiveSegments();
    const total = segments.length;

    if (total === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r  = cx - 4;
    const arc = (2 * Math.PI) / total;
    const cfg = WHEEL_CONFIG.wheel;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segments.forEach((seg, i) => {
      const startAngle = rotationAngle + i * arc;
      const endAngle   = startAngle + arc;
      const midAngle   = startAngle + arc / 2;

      // Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midAngle);

      const textR = r * (cfg.textRadiusRatio || 0.55);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor || '#ffffff';
      ctx.font = `600 ${cfg.fontSize}px ${cfg.fontFamily}`;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;

      // Icon
      const iconFont = `${cfg.fontSize + 2}px serif`;
      ctx.font = iconFont;
      ctx.fillText(seg.icon, textR + 4, 4);

      // Label
      ctx.font = `600 ${cfg.fontSize}px ${cfg.fontFamily}`;
      const iconGap = cfg.iconGap || 28;
      const maxW = textR - iconGap;
      wrapText(ctx, seg.label, textR - iconGap, 0, maxW, cfg.fontSize * 1.3);

      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = WHEEL_CONFIG.wheel.centerCircleColor;
    ctx.fill();
    ctx.strokeStyle = WHEEL_CONFIG.wheel.centerCircleBorderColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center icon
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy);
    ctx.textBaseline = 'alphabetic';
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.fillText(text, x, y + lineHeight / 4);
      return;
    }
    const half = Math.ceil(text.length / 2);
    const line1 = text.slice(0, half);
    const line2 = text.slice(half);
    ctx.fillText(line1, x, y - lineHeight / 2 + lineHeight / 4);
    ctx.fillText(line2, x, y + lineHeight / 2 + lineHeight / 4);
  }

  // ----------------------------------------------------------
  //  Prize Selection (Weighted Random)
  // ----------------------------------------------------------
  function pickPrize() {
    const active = getActiveSegments();
    if (active.length === 0) return null;

    const totalWeight = active.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const prize of active) {
      rand -= prize.weight;
      if (rand <= 0) return prize;
    }
    return active[active.length - 1];
  }

  // ----------------------------------------------------------
  //  Spin
  // ----------------------------------------------------------
  async function handleSpin() {
    if (state.isSpinning) return;

    dom.spinBtn.disabled = true;

    let active;
    try {
      // Sync ล่าสุดจาก Supabase ก่อนคำนวณวงล้อ ลดโอกาสชนกับคนอื่นให้เหลือน้อยที่สุด
      const freshRemaining = await getRemainingPrizes();
      if (freshRemaining) {
        WHEEL_CONFIG.prizes.forEach(p => {
          if (freshRemaining[p.id] !== undefined) state.prizesRemaining[p.id] = freshRemaining[p.id];
        });
        drawWheel(state.currentAngle);
      }

      active = getActiveSegments();
      if (active.length === 0) {
        showToast('ของรางวัลหมดแล้ว!', 'error');
        dom.spinBtn.disabled = false;
        return;
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
      dom.spinBtn.disabled = false;
      return;
    }

    const prize = pickPrize();
    state.wonPrize = prize;
    state.isSpinning = true;
    dom.canvas.classList.add('spinning');

    const segments = getActiveSegments();
    const segCount = segments.length;
    const prizeIndex = segments.findIndex(s => s.id === prize.id);
    const arc = (2 * Math.PI) / segCount;

    const cfg = WHEEL_CONFIG.spin;
    const rotations = cfg.minRotations + Math.floor(Math.random() * (cfg.maxRotations - cfg.minRotations + 1));
    const baseTarget = -Math.PI / 2 - (prizeIndex * arc) - (arc / 2);
    const currentNorm = ((state.currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const targetNorm  = ((baseTarget % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const diff = ((targetNorm - currentNorm) + 2 * Math.PI) % (2 * Math.PI);
    const targetAngle = state.currentAngle + diff + (2 * Math.PI * rotations);

    spinAnimate(state.currentAngle, targetAngle, cfg.durationMs, async () => {
      state.currentAngle = targetAngle;
      state.isSpinning = false;
      dom.canvas.classList.remove('spinning');

      try {
        const newRemaining = await decrementPrizeRpc(prize.id);

        if (newRemaining === null) {
          // ของหมดพอดีตอนกำลังหมุน — บังคับหมุนใหม่ ห้ามสุ่มของอื่นแทน (วงล้อโชว์ผลไปแล้ว)
          showToast('ของชิ้นนี้เพิ่งหมดพอดี กรุณาหมุนใหม่', 'error');
          state.prizesRemaining[prize.id] = 0;
          drawWheel(state.currentAngle);
          return;
        }

        state.prizesRemaining[prize.id] = newRemaining;

        insertRegistration({
          ...state.userData,
          prize: prize.label,
          prizeId: prize.id,
        }).catch(console.error);

        showResult(prize);
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
      } finally {
        dom.spinBtn.disabled = false;
      }
    });
  }

  function spinAnimate(from, to, duration, onDone) {
    const start = performance.now();
    const diff  = to - from;

    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const angle = from + diff * eased;

      drawWheel(angle);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        drawWheel(to);
        onDone();
      }
    }

    requestAnimationFrame(frame);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ----------------------------------------------------------
  //  Result
  // ----------------------------------------------------------
  function showResult(prize) {
    dom.resultIcon.textContent = prize.icon;
    dom.resultName.textContent = prize.label;
    showPage('result');
    launchConfetti();
  }

  // ----------------------------------------------------------
  //  Done Button
  // ----------------------------------------------------------
  function handleDone() {
    window.open(WHEEL_CONFIG.lineAddFriendUrl, '_blank');
  }

  // ----------------------------------------------------------
  //  Confetti
  // ----------------------------------------------------------
  function launchConfetti() {
    const canvas = dom.confetti;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#ffd700','#4cc9f0','#f94144','#43aa8b','#9b5de5','#ffffff'];
    const pieces = Array.from({ length: 120 }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * -canvas.height,
      w:  6 + Math.random() * 8,
      h:  10 + Math.random() * 12,
      r:  Math.random() * Math.PI * 2,
      dr: (Math.random() - 0.5) * 0.2,
      dx: (Math.random() - 0.5) * 2,
      dy: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.8 + Math.random() * 0.2,
    }));

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x  += p.dx;
        p.y  += p.dy;
        p.r  += p.dr;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (frame < 180) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(draw);
  }

  // ----------------------------------------------------------
  //  Toast
  // ----------------------------------------------------------
  function showToast(msg, type = 'info') {
    dom.toast.textContent = msg;
    dom.toast.className = `toast ${type} show`;
    setTimeout(() => { dom.toast.classList.remove('show'); }, 3000);
  }

  // ----------------------------------------------------------
  //  Start
  // ----------------------------------------------------------
  window.addEventListener('DOMContentLoaded', init);

})();
