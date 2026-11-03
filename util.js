// Input helpers: Persian/Arabic digit normalization, integer parsing, Iranian IBAN validation.
(function (root) {
  const norm = s => String(s)
    .replace(/[۰-۹]/g, c => c.charCodeAt(0) - 1776)
    .replace(/[٠-٩]/g, c => c.charCodeAt(0) - 1632);
  // Returns an integer, or NaN if the text is not a plain whole number.
  const toInt = s => {
    const t = norm(s).replace(/[,٬،\s]/g, '');
    return /^\d{1,15}$/.test(t) ? Number(t) : NaN;
  };
  // Returns the normalized IBAN ("IR" + 24 digits) if valid (ISO 13616 mod 97), else null.
  function validIban(raw) {
    let s = norm(raw).replace(/\s/g, '').toUpperCase();
    if (/^\d{24}$/.test(s)) s = 'IR' + s;
    if (!/^IR\d{24}$/.test(s)) return null;
    const r = s.slice(4) + s.slice(0, 4);
    let rem = 0;
    for (const ch of r) {
      const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
      for (const d of v) rem = (rem * 10 + Number(d)) % 97;
    }
    return rem === 1 ? s : null;
  }
  const api = { norm, toInt, validIban };
  if (typeof module !== 'undefined') module.exports = api; else root.Util = api;
})(this);
