const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {
  kpiTile,
  barRow,
  hourlyChart,
  monthlyChart,
  pairedBarRow,
  compareKpiSub,
} = require('./dashboardView.js');

test('loads after dashboard dependencies in the shared classic-script scope', () => {
  const context = vm.createContext({});
  ['fieldAnswers.js', 'prizeCost.js', 'dashboardStats.js', 'dashboardView.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(require.resolve(`./${file}`), 'utf8'), context);
  });

  assert.equal(vm.runInContext('typeof DashboardView.init', context), 'function');
  assert.equal(vm.runInContext("kpiTile('A', 1, '')", context).includes('dash-kpi'), true);
});

test('kpi tile escapes every caller-provided text value', () => {
  const html = kpiTile('<img src=x>', '5 & 6', '"quoted" <script>');

  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /5 &amp; 6/);
  assert.match(html, /&quot;quoted&quot; &lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img/);
});

test('bar row uses value divided by the shared maximum and escapes labels', () => {
  const quarter = barRow('<Prize>', 25, 100, '25 "คน"');
  const half = barRow('Other', 50, 100, '50 คน', { warn: true });

  assert.match(quarter, /width:25%/);
  assert.match(half, /width:50%/);
  assert.match(quarter, /&lt;Prize&gt;/);
  assert.match(quarter, /25 &quot;คน&quot;/);
  assert.match(half, /dash-bar-fill warn/);
});

test('bar row clamps invalid ratios without emitting NaN or Infinity', () => {
  assert.match(barRow('Empty', 9, 0, 'none'), /width:0%/);
  assert.match(barRow('Over', 12, 10, 'full'), /width:100%/);
  assert.doesNotMatch(barRow('Bad', 'oops', 10, 'none'), /NaN|Infinity/);
});

test('hourly chart renders all 24 hours on one scale with an optional overlay', () => {
  const counts = Array(24).fill(0);
  const overlay = Array(24).fill(0);
  counts[3] = 5;
  overlay[4] = 10;

  const html = hourlyChart(counts, overlay);

  assert.equal((html.match(/class="dash-hour-bar"/g) || []).length, 24);
  assert.match(html, /height:50%/);
  assert.match(html, /data-hour="4"/);
  assert.match(html, /<polyline/);
  assert.match(html, /ชั่วโมงพีค 03:00 · 5 คน/);
});

test('monthly chart renders all twelve months on one common scale', () => {
  const values = [5, 0, 10, 0, 0, 0, 2, 0, 0, 4, 0, 0];
  const html = monthlyChart(values);

  assert.equal((html.match(/class="dash-month-bar"/g) || []).length, 12);
  assert.match(html, /height:50%/);
  assert.match(html, /ม\.ค\./);
  assert.match(html, /ธ\.ค\./);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('paired bar row shares one scale and marks a missing event with a dash', () => {
  const html = pairedBarRow('<Brand>', 5, null, 10, '5 / —');

  assert.match(html, /&lt;Brand&gt;/);
  assert.match(html, /dash-paired-a[^>]*style="width:50%"/);
  assert.match(html, /dash-paired-b missing[^>]*style="width:0%"/);
  assert.match(html, /5 \/ —/);
});

test('compare KPI subtext includes direction, percentage, and cost warning', () => {
  assert.equal(compareKpiSub('Expo 2025', 80, 25, true), 'Expo 2025: 80 ▲ 25% ⚠ ต้นทุนไม่ครบ');
  assert.equal(compareKpiSub('Expo 2025', 0, null, false), 'Expo 2025: 0');
  assert.equal(compareKpiSub('Expo 2025', 100, -5, false), 'Expo 2025: 100 ▼ 5%');
});
