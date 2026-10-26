const RTI_WHEEL_SHADES = [
  '#0f2a3d', '#153952', '#1b4968', '#20587d', '#266893', '#2c77a8',
  '#5391b9', '#71a4c5', '#8fb7d2', '#adcadf', '#cadeeb', '#e8f1f8',
];
const MAX_PRIZES = 16;

function wheelPalette(n) {
  const count = Math.floor(Number(n));
  if (!Number.isFinite(count) || count <= 0) return [];

  const picked = [];
  for (let i = 0; i < count; i++) {
    const shadeIndex = count <= RTI_WHEEL_SHADES.length
      ? Math.round(i * 11 / (Math.max(count, 2) - 1))
      : i % RTI_WHEEL_SHADES.length;
    picked.push(RTI_WHEEL_SHADES[shadeIndex]);
  }

  const half = Math.ceil(count / 2);
  const palette = [];
  for (let k = 0; k < count; k++) {
    const pickedIndex = k % 2 === 0 ? k / 2 : half + (k - 1) / 2;
    palette.push(picked[pickedIndex]);
  }
  return palette;
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map(start => {
    const srgb = parseInt(hex.slice(start, start + 2), 16) / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a, b) {
  const luminanceA = relativeLuminance(a);
  const luminanceB = relativeLuminance(b);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function inkFor(bgHex) {
  const white = '#ffffff';
  const dark = '#13212b';
  return contrastRatio(bgHex, white) >= contrastRatio(bgHex, dark) ? white : dark;
}

function wheelLayout(n) {
  if (n <= 8) return 'stack';
  if (n <= 12) return 'radial-icon';
  return 'radial-text';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RTI_WHEEL_SHADES,
    MAX_PRIZES,
    wheelPalette,
    contrastRatio,
    inkFor,
    wheelLayout,
  };
}
