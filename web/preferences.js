const KEY = 'guanchao.workbench.preferences.v2';
const LEGACY_KEY = 'guanchao.workbench.preferences.v1';
const BUILTINS = { mode: 'light', up: '#c94e57', down: '#21846e', flat: '#525c68', accent: '#477a70', mapHeight: 490, labelSize: 12, density: 'middle' };
export const defaults = () => normalize(window.MarketUIConfig?.workbench, BUILTINS);
export function normalize(input, base = defaults()) {
  const result = { ...base };
  if (!input || typeof input !== 'object') return result;
  if (['dark', 'light'].includes(input.mode)) result.mode = input.mode;
  if (['small', 'middle'].includes(input.density)) result.density = input.density;
  for (const key of ['up', 'down', 'flat', 'accent']) if (/^#[0-9a-f]{6}$/i.test(input[key] || '')) result[key] = input[key];
  if (Number.isFinite(input.mapHeight)) result.mapHeight = Math.min(800, Math.max(320, input.mapHeight));
  if (Number.isFinite(input.labelSize)) result.labelSize = Math.min(20, Math.max(10, input.labelSize));
  return result;
}
export function loadPreferences() {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return normalize(JSON.parse(current));
    const previous = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (!previous || typeof previous !== 'object') return defaults();
    // Adopt the requested light surface once, retaining custom quote colors and sizing.
    const migrated = normalize({ ...previous, mode: 'light', accent: previous.accent === '#5b8de8' ? defaults().accent : previous.accent });
    try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch { /* Current session can still use the light surface. */ }
    return migrated;
  } catch { return defaults(); }
}
export function savePreferences(value) { localStorage.setItem(KEY, JSON.stringify(normalize(value))); }
function rgb(hex) { return hex.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16)); }
function luminance(values) { return values.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0); }
export function readableColor(hex, background) {
  const original = rgb(hex), bg = luminance(rgb(background)), target = bg < .179 ? 255 : 0;
  for (let step = 0; step <= 20; step++) {
    const values = original.map(x => Math.round(x + (target - x) * step / 20)), fg = luminance(values);
    if ((Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) >= 4.5) return '#' + values.map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return target ? '#ffffff' : '#000000';
}
export function palette(settings) {
  const colors = { ...settings, ...(settings.mode === 'dark' ? { background: '#101418', surface: '#181d23', raised: '#212830', text: '#e1e6ec', muted: '#a0aab6', line: '#2b333c' } : { background: '#f4f3ef', surface: '#fffefa', raised: '#eeede7', text: '#29332f', muted: '#667069', line: '#dedfd8' }) };
  colors.upText = readableColor(settings.up, colors.surface); colors.downText = readableColor(settings.down, colors.surface);
  return colors;
}
