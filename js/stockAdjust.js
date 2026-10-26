// Stock adjustment for one prize. Staff enter only the change — a top-up for a new event day
// (+) or items handed out outside the game (−) — and the prize's quantity stays what the DB
// expects: the running total since the event began (remaining = quantity − used).
const MAX_PRIZE_QUANTITY = 9999;

function adjustStock(quantity, used, delta) {
  const q = Math.max(0, Math.floor(Number(quantity) || 0));
  const u = Math.max(0, Math.floor(Number(used) || 0));
  const d = Number(delta);
  const remainingBefore = Math.max(0, q - u);

  if (!Number.isInteger(d) || d === 0) {
    return { ok: false, error: 'ใส่จำนวนชิ้นเป็นเลขจำนวนเต็มที่มากกว่า 0', remainingBefore };
  }
  const next = q + d;
  if (next < u) {
    return { ok: false, error: `หักได้ไม่เกินของที่เหลือ (${remainingBefore} ชิ้น)`, remainingBefore };
  }
  if (next > MAX_PRIZE_QUANTITY) {
    return { ok: false, error: `จำนวนรวมต้องไม่เกิน ${MAX_PRIZE_QUANTITY} ชิ้น`, remainingBefore };
  }
  return { ok: true, quantity: next, remainingBefore, remainingAfter: next - u };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { adjustStock, MAX_PRIZE_QUANTITY };
}
