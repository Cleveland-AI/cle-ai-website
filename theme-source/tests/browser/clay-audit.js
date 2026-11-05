// Clay style audit. Paste into the browser console on any page of the test site (or eval it in
// an iframe per page): it lists components that break the clay rules: hard 1px borders, flat or
// square buttons, flat fields, cards without the raised shadow, and shadows heavier than subtle.
// Expected leftovers: full-width bands (header/footer/sections) are square by design, and form
// fields keep a transparent 1px border for Windows high-contrast mode.
(() => {
  const out = [];
  const seen = new Set();
  const page = getComputedStyle(document.body).backgroundColor;
  const isVis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const parseShadow = s => s === 'none' ? [] : s.split(/,(?![^(]*\))/).map(x => x.trim());
  const maxBlur = s => Math.max(0, ...parseShadow(s).filter(x => !x.includes('inset')).map(x => { const n = x.replace(/rgba?\([^)]*\)|color-mix\([^)]*\)/g,'').trim().split(/\s+/).map(parseFloat).filter(v=>!isNaN(v)); return (n[2]||0) + Math.abs(n[3]||0); }));
  const sig = el => (el.tagName.toLowerCase() + '.' + [...el.classList].filter(c => !/^(wp-container|is-layout|wp-elements|has-|is-style-[a-z-]*-[0-9]|align)/.test(c)).slice(0,3).join('.')).replace(/\.$/,'');
  const els = document.querySelectorAll('body *:not(script):not(style):not(svg *):not(br)');
  for (const el of els) {
    if (!isVis(el) || el.closest('#wpadminbar')) continue;
    const s = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const bw = ['Top','Right','Bottom','Left'].map(k => parseFloat(s['border'+k+'Width']) && s['border'+k+'Style'] !== 'none' ? parseFloat(s['border'+k+'Width']) : 0);
    const hasBorder = bw.some(w => w > 0);
    const bg = s.backgroundColor; const hasBg = bg !== 'rgba(0, 0, 0, 0)' && bg !== page;
    const radius = parseFloat(s.borderTopLeftRadius) || 0;
    const shadow = s.boxShadow;
    const control = /^(button|input|select|textarea|summary)$/.test(tag) || el.classList.contains('wp-element-button') || el.classList.contains('wp-block-button__link');
    const boxy = hasBg && (parseFloat(s.paddingTop) >= 8 || parseFloat(s.paddingLeft) >= 8) && el.getBoundingClientRect().width > 40;
    const issues = [];
    if (hasBorder && !['hr'].includes(tag)) {
      const thin = bw.filter(w=>w>0 && w<=1.5).length;
      if (thin) issues.push('hard ' + bw.join('/') + 'px border ' + s.borderTopColor);
    }
    if (control && tag !== 'input' && tag !== 'summary' || (tag==='input' && /submit|button/.test(el.type))) {
      if (radius < 12) issues.push('button radius ' + radius);
      if (shadow === 'none') issues.push('flat button');
      if (maxBlur(shadow) > 20) issues.push('heavy shadow ' + maxBlur(shadow).toFixed(0) + 'px');
    } else if (/^(input|select|textarea)$/.test(tag) && !/checkbox|radio|hidden|range/.test(el.type)) {
      if (shadow === 'none') issues.push('flat field (no inset)');
      if (radius < 8) issues.push('field radius ' + radius);
    } else if (boxy) {
      if (radius < 8) issues.push('square card r=' + radius);
      if (shadow === 'none' && radius >= 8) issues.push('flat card');
      if (maxBlur(shadow) > 22) issues.push('heavy shadow ' + maxBlur(shadow).toFixed(0) + 'px');
    } else if (shadow !== 'none' && maxBlur(shadow) > 22) {
      issues.push('heavy shadow ' + maxBlur(shadow).toFixed(0) + 'px');
    }
    if (/^(img)$/.test(tag) && el.closest('.wp-block-image, figure') && radius < 6 && el.getBoundingClientRect().width > 120 && !el.src.includes('illustrations') ) issues.push('square photo');
    if (/^(table|th|td)$/.test(tag) && hasBorder) issues.push('table rules');
    if (!issues.length) continue;
    const key = sig(el) + ' | ' + issues.join('; ');
    if (seen.has(key)) continue; seen.add(key);
    out.push(key);
  }
  return out;
})()
