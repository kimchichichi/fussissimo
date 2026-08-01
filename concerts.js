/**
 * Renders Konzerte from data/concerts.json, then:
 * - Marks the first future date as .next
 * - Moves expired upcoming items into the archive year groups
 * - Toggles empty-state / page kicker when nothing is upcoming
 */
(function () {
  "use strict";

  var upcomingRoot = document.querySelector("[data-tour-upcoming]");
  var archiveRoot = document.querySelector("[data-tour-archive]");
  var emptyState = document.querySelector("[data-tour-empty]");
  var kicker = document.querySelector("[data-tour-kicker]");
  if (!upcomingRoot || !archiveRoot) return;

  upcomingRoot.setAttribute("aria-busy", "true");
  upcomingRoot.classList.add("is-loading");

  var WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDate(iso) {
    if (!iso) return null;
    var datePart = String(iso).slice(0, 10);
    var parts = datePart.split("-");
    if (parts.length < 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]) - 1;
    var day = Number(parts[2]);
    if (!y || m < 0 || !day) return null;
    return new Date(y, m, day);
  }

  function yearOf(iso) {
    return iso ? String(iso).slice(0, 4) : "";
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatDisplayDate(iso) {
    var d = parseDate(iso);
    if (!d) return "";
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  }

  function extractTime(iso) {
    if (!iso || iso.length < 16 || iso.charAt(10) !== "T") return "";
    return iso.slice(11, 16);
  }

  function formatWhen(iso) {
    var d = parseDate(iso);
    if (!d) return "";
    var day = WEEKDAYS[d.getDay()];
    var time = extractTime(iso);
    return time ? day + " · " + time : day;
  }

  function datetimeAttr(iso) {
    if (!iso) return "";
    return iso.length >= 16 ? iso.slice(0, 16) : iso.slice(0, 10);
  }

  function mapsHref(concert) {
    var q = concert.maps_query || [concert.venue, concert.city].filter(Boolean).join(" ");
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(q)
    );
  }

  function mailSubject(concert) {
    var label = formatDisplayDate(concert.date);
    var venue = concert.venue || "";
    return (
      "Tickets / Infos Konzert " +
      label +
      (venue ? " " + venue : "")
    );
  }

  function icsStamp(iso) {
    var d = parseDate(iso);
    if (!d) return "";
    var time = extractTime(iso);
    var y = d.getFullYear();
    var m = pad(d.getMonth() + 1);
    var day = pad(d.getDate());
    if (!time) return y + m + day;
    var hm = time.replace(":", "");
    return y + m + day + "T" + hm + "00";
  }

  function icsEnd(iso) {
    var d = parseDate(iso);
    if (!d) return "";
    var time = extractTime(iso);
    if (!time) {
      return icsStamp(iso);
    }
    var parts = time.split(":");
    var end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      Number(parts[0]) + 2,
      Number(parts[1]) || 0
    );
    return (
      end.getFullYear() +
      pad(end.getMonth() + 1) +
      pad(end.getDate()) +
      "T" +
      pad(end.getHours()) +
      pad(end.getMinutes()) +
      "00"
    );
  }

  function buildIcs(concert) {
    var start = icsStamp(concert.date);
    if (!start) return null;
    var end = icsEnd(concert.date);
    var summary = "FUSSISSIMO — " + (concert.venue || "Konzert");
    var loc = [concert.venue, concert.city].filter(Boolean).join(", ");
    var uid =
      "fussissimo-" +
      String(concert.date).slice(0, 10) +
      "@rehansyed.de";
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FUSSISSIMO//Konzerte//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + start + (start.length === 8 ? "" : "Z"),
      "DTSTART:" + start,
      "DTEND:" + end,
      "SUMMARY:" + summary,
      "LOCATION:" + loc,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    return new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name) {
    if (window.FUSSIcons && typeof FUSSIcons.make === "function") {
      return FUSSIcons.make(name);
    }
    var i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  function refreshIcons(root) {
    if (window.FUSSIcons && typeof FUSSIcons.refresh === "function") {
      FUSSIcons.refresh(root);
    }
  }

  function withIcon(node, name, labelText) {
    node.classList.add("btn-with-icon");
    node.appendChild(icon(name));
    if (labelText != null) {
      var span = document.createElement("span");
      span.textContent = labelText;
      node.appendChild(span);
    }
    return node;
  }

  function renderVenue(concert, isPast) {
    var venueWrap = el("span", "tour-venue");
    if (isPast && concert.venue_url) {
      var a = el("a", "link-ext link-ext--archive", null);
      a.href = concert.venue_url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute(
        "aria-label",
        "Archiv: " + (concert.venue || "") + ", " + (concert.city || "") + " — externe Seite"
      );
      a.appendChild(document.createTextNode(concert.venue || ""));
      a.appendChild(icon("external-link"));
      venueWrap.appendChild(a);
      var tag = el("span", "tour-archiv-tag");
      tag.setAttribute("aria-hidden", "true");
      tag.textContent = "Archiv";
      venueWrap.appendChild(document.createTextNode(" "));
      venueWrap.appendChild(tag);
    } else {
      venueWrap.textContent = concert.venue || "";
    }
    return venueWrap;
  }

  function renderConcert(concert, isPast) {
    var iso = concert.date || "";
    var dateKey = String(iso).slice(0, 10);
    var article = el("article", "tour-item" + (isPast ? " past" : ""));
    article.setAttribute("data-concert-date", dateKey);

    var scan = el("div", "tour-scan");
    var time = el("time", "tour-date", formatDisplayDate(iso));
    time.setAttribute("datetime", datetimeAttr(iso));
    scan.appendChild(time);
    scan.appendChild(el("span", "tour-when", formatWhen(iso)));
    scan.appendChild(renderVenue(concert, isPast));
    scan.appendChild(el("span", "tour-city", concert.city || ""));

    if (!isPast) {
      var info = el("div", "tour-info");
      info.appendChild(scan);

      var meta = el("p", "tour-meta");
      var maps = el("a", "tour-maps");
      maps.href = mapsHref(concert);
      maps.target = "_blank";
      maps.rel = "noopener noreferrer";
      maps.setAttribute("aria-label", "Wegbeschreibung");
      maps.title = "Wegbeschreibung";
      maps.appendChild(icon("map-pin"));
      meta.appendChild(maps);
      if (concert.ticket_note) {
        meta.appendChild(el("span", "tour-ticket-note", concert.ticket_note));
      }
      info.appendChild(meta);
      article.appendChild(info);

      var actions = el("div", "tour-actions");
      var ticket = el("a", "btn");
      ticket.href =
        "mailto:info@rehansyed.de?subject=" +
        encodeURIComponent(mailSubject(concert));
      ticket.setAttribute(
        "aria-label",
        "Tickets und Infos zum Konzert am " +
          formatDisplayDate(iso) +
          " per E-Mail anfragen"
      );
      withIcon(ticket, "ticket", "Tickets / Infos");
      actions.appendChild(ticket);

      var icsBlob = buildIcs(concert);
      if (icsBlob) {
        var cal = el("a", "btn btn-ghost");
        cal.href = URL.createObjectURL(icsBlob);
        cal.download =
          "FUSSISSIMO-" + dateKey + ".ics";
        cal.setAttribute(
          "aria-label",
          "Konzert am " + formatDisplayDate(iso) + " in den Kalender speichern"
        );
        withIcon(cal, "calendar-plus", "In Kalender speichern");
        actions.appendChild(cal);
      }
      article.appendChild(actions);
    } else {
      article.appendChild(scan);
    }

    return article;
  }

  function updateOlderCount() {
    var details = archiveRoot.querySelector(".tour-older");
    if (!details) return;
    var countEl = details.querySelector(".tour-older-count");
    var n = details.querySelectorAll(".tour-item").length;
    if (countEl) countEl.textContent = "(" + n + ")";
  }

  function ensureYearGroup(year) {
    var group = archiveRoot.querySelector('[data-year="' + year + '"]');
    if (group) return group;

    group = document.createElement("div");
    group.className = "tour-year";
    group.setAttribute("data-year", year);

    var heading = document.createElement("h3");
    heading.className = "group-year";
    heading.id = "year-" + year;
    heading.textContent = year;
    group.appendChild(heading);

    var currentYear = String(startOfToday().getFullYear());
    var details = archiveRoot.querySelector(".tour-older");

    if (year === currentYear) {
      if (details) archiveRoot.insertBefore(group, details);
      else archiveRoot.appendChild(group);
      return group;
    }

    if (!details) {
      archiveRoot.appendChild(group);
      return group;
    }

    var years = details.querySelectorAll("[data-year]");
    var inserted = false;
    for (var i = 0; i < years.length; i++) {
      if (years[i].getAttribute("data-year") < year) {
        details.insertBefore(group, years[i]);
        inserted = true;
        break;
      }
    }
    if (!inserted) details.appendChild(group);
    return group;
  }

  function moveToArchive(item, iso) {
    item.classList.remove("next");
    item.classList.add("past");
    var badge = item.querySelector(".badge");
    if (badge) badge.remove();
    var meta = item.querySelector(".tour-meta");
    if (meta) meta.remove();
    var actions = item.querySelector(".tour-actions");
    if (actions) actions.remove();
    var info = item.querySelector(".tour-info");
    if (info) {
      while (info.firstChild) item.insertBefore(info.firstChild, info);
      info.remove();
    }

    var group = ensureYearGroup(yearOf(iso));
    var siblings = group.querySelectorAll(".tour-item[data-concert-date]");
    var placed = false;
    for (var i = 0; i < siblings.length; i++) {
      var other = siblings[i].getAttribute("data-concert-date") || "";
      if (other < iso) {
        group.insertBefore(item, siblings[i]);
        placed = true;
        break;
      }
    }
    if (!placed) group.appendChild(item);
  }

  function formatKicker(item) {
    var time = item.querySelector("time.tour-date");
    var city = item.querySelector(".tour-city");
    if (!time) return "";
    var dateText = (time.textContent || "").trim();
    var cityText = city ? (city.textContent || "").trim() : "";
    var shortCity = cityText.replace(/\s+am\s+Main$/i, "").trim();
    return "/ " + dateText + (shortCity ? " · " + shortCity : "");
  }

  function clearNextState(item) {
    item.classList.remove("next");
    var badge = item.querySelector(".badge");
    if (badge) badge.remove();
  }

  function markAsNext(item) {
    item.classList.add("next");
    if (!item.querySelector(".badge")) {
      var b = document.createElement("span");
      b.className = "badge";
      b.textContent = "Nächstes";
      var scan = item.querySelector(".tour-scan");
      if (scan) scan.insertBefore(b, scan.firstChild);
      else item.insertBefore(b, item.firstChild);
    }
  }

  function organize() {
    var today = startOfToday();
    var items = Array.prototype.slice.call(
      upcomingRoot.querySelectorAll(".tour-item[data-concert-date]")
    );

    items.sort(function (a, b) {
      return (a.getAttribute("data-concert-date") || "").localeCompare(
        b.getAttribute("data-concert-date") || ""
      );
    });

    var future = [];
    items.forEach(function (item) {
      var iso = item.getAttribute("data-concert-date");
      var d = parseDate(iso);
      if (!d || d < today) moveToArchive(item, iso);
      else future.push(item);
    });

    future.forEach(clearNextState);

    if (future.length) {
      markAsNext(future[0]);
      if (emptyState) emptyState.hidden = true;
      if (kicker) {
        var kick = formatKicker(future[0]);
        if (kick) kicker.textContent = kick;
      }
    } else {
      if (emptyState) emptyState.hidden = false;
      if (kicker) kicker.textContent = "/ Termine in Vorbereitung";
    }

    updateOlderCount();
  }

  function clearLoading() {
    upcomingRoot.classList.remove("is-loading");
    upcomingRoot.removeAttribute("aria-busy");
    var skel = upcomingRoot.querySelector("[data-tour-skeleton]");
    if (skel) skel.remove();
  }

  function mount(list) {
    clearLoading();
    upcomingRoot.textContent = "";
    list
      .slice()
      .sort(function (a, b) {
        return String(a.date || "").localeCompare(String(b.date || ""));
      })
      .forEach(function (concert) {
        var iso = String(concert.date || "").slice(0, 10);
        var d = parseDate(iso);
        var isPast = !d || d < startOfToday();
        // Always mount into upcoming first; organize() moves past items.
        upcomingRoot.appendChild(renderConcert(concert, false));
        if (isPast) {
          // Re-render venue link style after move by replacing node
          var last = upcomingRoot.lastElementChild;
          if (last && concert.venue_url) {
            var venueEl = last.querySelector(".tour-venue");
            if (venueEl) {
              venueEl.replaceWith(renderVenue(concert, true));
            }
          }
        }
      });
    organize();
    refreshIcons(document.querySelector(".tour-page") || document.body);
  }

  fetch("data/concerts.json")
    .then(function (res) {
      if (!res.ok) throw new Error("concerts.json " + res.status);
      return res.json();
    })
    .then(function (data) {
      var list = (data && data.concerts) || [];
      mount(list);
    })
    .catch(function (err) {
      console.error(err);
      clearLoading();
      upcomingRoot.textContent = "";
      if (emptyState) emptyState.hidden = false;
      if (kicker) kicker.textContent = "/ Termine in Vorbereitung";
    });
})();
