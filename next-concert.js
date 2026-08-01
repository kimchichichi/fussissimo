/**
 * Fills [data-next-concert] nodes from data/concerts.json (first upcoming date).
 * Formats:
 *   data-next-concert="short"  → 27.09 · Gemünden  (default)
 *   data-next-concert="long"   → 27.09.2026 · Gemünden
 * Fallback text in HTML is kept when fetch fails or nothing is upcoming.
 */
(function () {
  "use strict";

  var nodes = document.querySelectorAll("[data-next-concert]");
  if (!nodes.length) return;

  function concertsUrl() {
    var path = location.pathname || "";
    if (/\/about\//.test(path)) return "../data/concerts.json";
    return "data/concerts.json";
  }

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDate(iso) {
    if (!iso) return null;
    var parts = String(iso).slice(0, 10).split("-");
    if (parts.length < 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]) - 1;
    var day = Number(parts[2]);
    if (!y || m < 0 || !day) return null;
    return new Date(y, m, day);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function shortCity(city) {
    return String(city || "")
      .replace(/\s+am\s+Main$/i, "")
      .trim();
  }

  function formatShort(iso, city) {
    var d = parseDate(iso);
    if (!d) return "";
    var date = pad(d.getDate()) + "." + pad(d.getMonth() + 1);
    var c = shortCity(city);
    return date + (c ? " · " + c : "");
  }

  function formatLong(iso, city) {
    var d = parseDate(iso);
    if (!d) return "";
    var date =
      pad(d.getDate()) +
      "." +
      pad(d.getMonth() + 1) +
      "." +
      d.getFullYear();
    var c = shortCity(city);
    return date + (c ? " · " + c : "");
  }

  function nextUpcoming(list) {
    var today = startOfToday();
    var future = (list || [])
      .filter(function (c) {
        var d = parseDate(c && c.date);
        return d && d >= today;
      })
      .sort(function (a, b) {
        return String(a.date || "").localeCompare(String(b.date || ""));
      });
    return future[0] || null;
  }

  fetch(concertsUrl())
    .then(function (res) {
      if (!res.ok) throw new Error("concerts.json " + res.status);
      return res.json();
    })
    .then(function (data) {
      var next = nextUpcoming((data && data.concerts) || []);
      if (!next) return;
      var short = formatShort(next.date, next.city);
      var long = formatLong(next.date, next.city);
      if (!short) return;
      nodes.forEach(function (el) {
        var fmt = (el.getAttribute("data-next-concert") || "short").toLowerCase();
        el.textContent = fmt === "long" ? long : short;
      });
    })
    .catch(function () {
      /* keep static fallback */
    });
})();
