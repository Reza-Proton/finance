// Minimal .xlsx writer (no dependencies): ZIP "store" method + SpreadsheetML with inline strings.
// Cell: string | number | { v, b: bold, p: one-decimal number }. Sheets are right-to-left.
(function (root) {
  const enc = new TextEncoder();
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const concat = parts => {
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };
  const u16 = n => [n & 255, (n >>> 8) & 255];
  const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  function zip(files) {
    const chunks = [], central = [];
    let offset = 0;
    const DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const local = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(DATE), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)]);
      chunks.push(local, name, f.data);
      central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(DATE), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
      offset += local.length + name.length + size;
    }
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
    return concat([...chunks, ...central, end]);
  }

  const esc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const col = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  function cellXml(v, r, c) {
    if (v === null || v === undefined || v === '') return '';
    const o = typeof v === 'object' ? v : { v };
    const ref = col(c) + (r + 1);
    if (typeof o.v === 'number' && Number.isFinite(o.v)) return `<c r="${ref}" s="${o.p ? 4 : o.b ? 3 : 2}"><v>${o.v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${o.b ? ' s="1"' : ''}><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`;
  }
  function sheetXml(rows, widths) {
    const cols = widths ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const data = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cellXml(v, ri, ci)).join('')}</row>`).join('');
    return `${HEAD}<worksheet xmlns="${NS}"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>${cols}<sheetData>${data}</sheetData></worksheet>`;
  }
  const STYLES = `${HEAD}<styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>`
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>'
    + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  // sheets: [{ name, rows: [[cell, ...], ...], widths?: [number, ...] }] -> Uint8Array (.xlsx)
  function build(sheets) {
    const n = sheets.length, REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const names = sheets.map(s => s.name.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31));
    const files = [
      { name: '[Content_Types].xml', data: enc.encode(`${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`) },
      { name: '_rels/.rels', data: enc.encode(`${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
      { name: 'xl/workbook.xml', data: enc.encode(`${HEAD}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets>${names.map((nm, i) => `<sheet name="${esc(nm).replace(/"/g, '&quot;')}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`) },
      { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(`${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`) },
      { name: 'xl/styles.xml', data: enc.encode(STYLES) },
      ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(s.rows, s.widths)) }))
    ];
    return zip(files);
  }
  const api = { build };
  if (typeof module !== 'undefined') module.exports = api; else root.Xlsx = api;
})(this);
