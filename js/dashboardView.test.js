const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { kpiTile, barRow, hourlyChart } = require('./dashboardView.js');

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
