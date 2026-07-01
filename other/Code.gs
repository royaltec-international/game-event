// ============================================================
//  Code.gs — Google Apps Script (Real-time + Event Name)
//  รองรับหลาย Event ในไฟล์เดียว
// ============================================================

const SHEETS = {
  REGISTRATIONS: 'Registrations',
  CONFIG: 'Config',
  PRIZES: 'Prizes',
};

// ============================================================
//  Main Handler
// ============================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  try {
    if (action === 'getConfig') {
      return getConfig();
    } else if (action === 'getRemaining') {
      return getRemainingPrizes();
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    // Parse ข้อมูลที่ส่งมา
    let data = {};

    if (e.postData && e.postData.contents) {
      // พยายาม parse เป็น JSON ก่อน (รองรับทั้ง application/json และ text/plain)
      // หมายเหตุ: ใช้ text/plain เพื่อหลีกเลี่ยง CORS preflight ใน Google Apps Script
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // ถ้า parse JSON ไม่ได้ ให้ลอง URL-encoded format
        if (e.parameter && Object.keys(e.parameter).length > 0) {
          data = e.parameter;
        } else {
          const raw = e.postData.contents;
          raw.split('&').forEach(pair => {
            const [key, val] = pair.split('=');
            if (key) data[decodeURIComponent(key)] = decodeURIComponent((val || '').replace(/\+/g, ' '));
          });
        }
      }
    } else if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    }
    
    const action = data.action;
    
    if (action === 'saveConfig') {
      return saveConfig(data.config);
    } else if (action === 'decrementPrize') {
      return decrementPrize(data.prizeId, data.amount || 1);
    } else if (action === 'register') {
      return saveRegistration(data);
    } else if (!action) {
      // Legacy: ถ้าไม่มี action แสดงว่าเป็นการส่งข้อมูลลงทะเบียนแบบเดิม
      return saveRegistration(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  Config Management
// ============================================================
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.CONFIG);
  
  if (!sheet) {
    sheet = createConfigSheet(ss);
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'No config data found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const configJson = data[1][1];

  // ป้องกัน crash เมื่อ Config ยังว่าง (first-time run)
  if (!configJson) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Config is empty — please save from admin panel first'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let config;
  try {
    config = JSON.parse(configJson);
  } catch (parseErr) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Config JSON invalid: ' + parseErr.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    config: config
  })).setMimeType(ContentService.MimeType.JSON);
}

function saveConfig(config) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.CONFIG);
  
  if (!sheet) {
    sheet = createConfigSheet(ss);
  }
  
  sheet.getRange(2, 2).setValue(JSON.stringify(config));
  sheet.getRange(2, 3).setValue(new Date());
  
  updatePrizesSheet(ss, config.prizes, config.eventName || 'Default Event');
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Config saved successfully'
  })).setMimeType(ContentService.MimeType.JSON);
}

function createConfigSheet(ss) {
  const sheet = ss.insertSheet(SHEETS.CONFIG);
  sheet.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Last Updated']]);
  sheet.getRange(2, 1).setValue('config');
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#ffd700');
  return sheet;
}

// ============================================================
//  Prizes Management
// ============================================================
function getRemainingPrizes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.PRIZES);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Prizes sheet not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const remaining = {};
  
  for (let i = 1; i < data.length; i++) {
    const prizeId = data[i][0];
    const initial = data[i][3];
    const used = data[i][4] || 0;
    const left = initial - used;
    remaining[prizeId] = Math.max(0, left);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    remaining: remaining
  })).setMimeType(ContentService.MimeType.JSON);
}

function decrementPrize(prizeId, amount) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PRIZES);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Prizes sheet not found'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === prizeId) {
      const currentUsed = data[i][4] || 0;
      sheet.getRange(i + 1, 5).setValue(currentUsed + amount);
      sheet.getRange(i + 1, 7).setValue(new Date());
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Prize count updated'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'Prize ID not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

function updatePrizesSheet(ss, prizes, eventName) {
  let sheet = ss.getSheetByName(SHEETS.PRIZES);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.PRIZES);
    sheet.getRange(1, 1, 1, 7).setValues([
      ['Prize ID', 'Event Name', 'Label', 'Initial Qty', 'Used', 'Remaining', 'Last Updated']
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#ffd700');
  }
  
  const existingData = {};
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0] + '|' + data[i][1]; // prizeId|eventName
    existingData[key] = {
      used: data[i][4] || 0
    };
  }
  
  // ป้องกัน crash เมื่อ sheet มีแค่ header row (lastRow=1 → 0 rows → error)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 7).clear();
  }
  
  const rows = prizes.map(p => {
    const key = p.id + '|' + eventName;
    const used = existingData[key] ? existingData[key].used : 0;
    const remaining = p.quantity - used;
    return [p.id, eventName, p.label, p.quantity, used, Math.max(0, remaining), new Date()];
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }
  
  for (let i = 0; i < prizes.length; i++) {
    const row = i + 2;
    sheet.getRange(row, 6).setFormula(`=D${row}-E${row}`);
  }
}

// ============================================================
//  Registration — Dynamic Column Support
// ============================================================
function saveRegistration(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.REGISTRATIONS);

  // Base headers ที่ต้องมีเสมอ
  const BASE_HEADERS = [
    'Timestamp', 'Event Name', 'ชื่อ', 'นามสกุล', 'อีเมล',
    'เบอร์โทร', 'บริษัท', 'ตำแหน่ง', 'ของรางวัล', 'แบรนด์ที่สนใจ', 'PDPA Consent'
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.REGISTRATIONS);
    sheet.getRange(1, 1, 1, BASE_HEADERS.length).setValues([BASE_HEADERS]);
    sheet.getRange(1, 1, 1, BASE_HEADERS.length)
      .setFontWeight('bold').setBackground('#2e5a73').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // โหลด headers ปัจจุบัน
  const lastColNow = Math.max(sheet.getLastColumn(), BASE_HEADERS.length);
  const headers = sheet.getRange(1, 1, 1, lastColNow).getValues()[0];

  // Helper: หา column (1-based) หรือสร้างใหม่ถ้ายังไม่มี
  function colFor(name) {
    let idx = headers.indexOf(name);
    if (idx >= 0) return idx + 1;
    const newCol = headers.length + 1;
    const cell = sheet.getRange(1, newCol);
    cell.setValue(name).setFontWeight('bold').setBackground('#2e5a73').setFontColor('#ffffff');
    headers.push(name);
    return newCol;
  }

  // กำหนด columns ทั้งหมดที่จะใช้
  const colMap = {
    timestamp : colFor('Timestamp'),
    eventName : colFor('Event Name'),
    firstName : colFor('ชื่อ'),
    lastName  : colFor('นามสกุล'),
    email     : colFor('อีเมล'),
    phone     : colFor('เบอร์โทร'),
    company   : colFor('บริษัท'),
    position  : colFor('ตำแหน่ง'),
    prize     : colFor('ของรางวัล'),
    brands    : colFor('แบรนด์ที่สนใจ'),
    pdpa      : colFor('PDPA Consent'),
  };

  // Custom fields — label เป็นชื่อ column
  const customColMap = {};
  if (data.customFields) {
    try {
      const cf = typeof data.customFields === 'string'
        ? JSON.parse(data.customFields) : data.customFields;
      Object.keys(cf).forEach(label => {
        customColMap[label] = { col: colFor(label), value: cf[label] };
      });
    } catch (e) {
      Logger.log('Custom fields parse error: ' + e);
    }
  }

  // สร้าง row data
  const totalCols = headers.length;
  const row = new Array(totalCols).fill('');

  row[colMap.timestamp - 1] = data.timestamp || new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  row[colMap.eventName - 1] = data.eventName || 'Default Event';
  row[colMap.firstName - 1] = data.firstName || '';
  row[colMap.lastName  - 1] = data.lastName  || '';
  row[colMap.email     - 1] = data.email     || '';
  row[colMap.phone     - 1] = data.phone     || '';
  row[colMap.company   - 1] = data.company   || '';
  row[colMap.position  - 1] = data.position  || '';
  row[colMap.prize     - 1] = data.prize     || '(ยังไม่ได้หมุน)';
  row[colMap.brands    - 1] = data.brands    || '';
  // PDPA: YES / NO / N/A (ถ้าฟีเจอร์ปิดอยู่)
  row[colMap.pdpa - 1] = data.pdpaConsent === 'true'  ? 'YES'
                        : data.pdpaConsent === 'false' ? 'NO'
                        : (data.pdpaConsent || 'N/A');

  // Custom fields
  Object.values(customColMap).forEach(({ col, value }) => {
    row[col - 1] = value || '';
  });

  // บันทึกแถวใหม่
  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, row.length).setValues([row]);

  // ลด stock ของรางวัล
  if (data.prizeId && data.eventName) {
    decrementPrize(data.prizeId, 1);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Registration saved'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  Setup
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(SHEETS.CONFIG)) {
    createConfigSheet(ss);
  }
  
  if (!ss.getSheetByName(SHEETS.PRIZES)) {
    const sheet = ss.insertSheet(SHEETS.PRIZES);
    sheet.getRange(1, 1, 1, 7).setValues([
      ['Prize ID', 'Event Name', 'Label', 'Initial Qty', 'Used', 'Remaining', 'Last Updated']
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#ffd700');
  }
  
  if (!ss.getSheetByName(SHEETS.REGISTRATIONS)) {
    const sheet = ss.insertSheet(SHEETS.REGISTRATIONS);
    const regHeaders = ['Timestamp', 'Event Name', 'ชื่อ', 'นามสกุล', 'อีเมล', 'เบอร์โทร', 'บริษัท', 'ตำแหน่ง', 'ของรางวัล', 'แบรนด์ที่สนใจ', 'PDPA Consent'];
    sheet.getRange(1, 1, 1, regHeaders.length).setValues([regHeaders]);
    sheet.getRange(1, 1, 1, regHeaders.length).setFontWeight('bold').setBackground('#2e5a73').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  
  Logger.log('Setup complete!');
}

// ============================================================
//  Test Functions
// ============================================================
function testPost() {
  const mockEvent = {
    postData: {
      type: 'application/json',
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        eventName: 'Test Event 2025',
        firstName: 'ทดสอบ',
        lastName: 'ระบบ',
        email: 'test@example.com',
        phone: '0812345678',
        company: 'Test Company',
        position: 'Tester',
        prize: 'โน๊ตก้อน',
        prizeId: 'notepad'
      })
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}
