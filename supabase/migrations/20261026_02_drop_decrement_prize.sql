-- ============================================================
--  20261026_02_drop_decrement_prize.sql
--  Remove the old client-callable decrement RPC (any visitor could use
--  it to pick their own prize or drain stock).
--
--  Run in Supabase SQL Editor AFTER the frontend that uses draw_prize()
--  is live on GitHub Pages — the old page still calls decrement_prize.
-- ============================================================

drop function if exists decrement_prize(uuid, text);
