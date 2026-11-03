// Jalali (Shamsi) calendar helpers. Uses the 33-year leap cycle (valid for modern years).
(function (root) {
  const LEAP = [1, 5, 9, 13, 17, 22, 26, 30];
  const REF = Date.UTC(2026, 2, 21), DAY = 864e5, REFY = 1405; // 1405/01/01 = 2026-03-21
  const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const isLeap = y => LEAP.includes(y % 33);
  const yearLen = y => (isLeap(y) ? 366 : 365);
  const monthDays = (y, m) => (m <= 6 ? 31 : m <= 11 ? 30 : isLeap(y) ? 30 : 29);
  function toDayNum(y, m, d) {
    let n = 0;
    if (y >= REFY) for (let i = REFY; i < y; i++) n += yearLen(i);
    else for (let i = y; i < REFY; i++) n -= yearLen(i);
    for (let i = 1; i < m; i++) n += monthDays(y, i);
    return n + d - 1;
  }
  function fromDayNum(n) {
    let y = REFY;
    while (n < 0) { y--; n += yearLen(y); }
    while (n >= yearLen(y)) { n -= yearLen(y); y++; }
    let m = 1;
    while (n >= monthDays(y, m)) { n -= monthDays(y, m); m++; }
    return [y, m, n + 1];
  }
  const dateToNum = dt => Math.round((Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) - REF) / DAY);
  const fromDate = dt => fromDayNum(dateToNum(dt));
  const todayNum = () => dateToNum(new Date());
  const api = { MONTHS, isLeap, monthDays, toDayNum, fromDayNum, fromDate, todayNum };
  if (typeof module !== 'undefined') module.exports = api; else root.Jal = api;
})(this);
