(function () {
  const body = document.body;
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  const mq = window.matchMedia("(max-width: 991px)");
  const CLOSE_MS = 380;
  let placeholder = null;
  let closeTimer = 0;

  function mountToBody() {
    if (nav.parentElement === body) return;
    placeholder = document.createComment("site-nav");
    nav.parentElement.insertBefore(placeholder, nav);
    body.appendChild(nav);
  }

  function restoreNav() {
    if (!placeholder || !placeholder.parentNode) return;
    placeholder.parentNode.insertBefore(nav, placeholder);
    placeholder.remove();
    placeholder = null;
  }

  function firstNavLink() {
    return nav.querySelector(".nav-link, a[href]");
  }

  function focusables() {
    return [toggle].concat(
      Array.prototype.slice.call(
        nav.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
    );
  }

  function setOpen(open) {
    window.clearTimeout(closeTimer);

    if (open && mq.matches) mountToBody();

    body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");

    if (mq.matches) {
      nav.setAttribute("aria-hidden", open ? "false" : "true");
    } else {
      nav.removeAttribute("aria-hidden");
    }

    if (open && mq.matches) {
      const first = firstNavLink();
      if (first) {
        window.setTimeout(function () {
          first.focus({ preventScroll: true });
        }, 80);
      }
    }

    if (!open) {
      closeTimer = window.setTimeout(function () {
        if (!body.classList.contains("nav-open")) restoreNav();
      }, CLOSE_MS);
    }
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!body.classList.contains("nav-open"));
  });

  nav.addEventListener("click", function (e) {
    const link = e.target.closest("a");
    if (!link) return;
    link.classList.add("is-nav-pressed");
    window.setTimeout(close, 140);
  });

  document.addEventListener("keydown", function (e) {
    if (!body.classList.contains("nav-open")) return;

    if (e.key === "Escape") {
      close();
      toggle.focus();
      return;
    }

    if (e.key !== "Tab" || !mq.matches) return;

    const list = focusables().filter(function (el) {
      return el && el.offsetParent !== null;
    });
    if (!list.length) return;

    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("click", function (e) {
    if (!body.classList.contains("nav-open")) return;
    if (e.target.closest(".nav-toggle") || e.target.closest("#site-nav")) return;
    close();
  });

  function syncMq() {
    if (!mq.matches) {
      window.clearTimeout(closeTimer);
      body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Menü öffnen");
      nav.removeAttribute("aria-hidden");
      restoreNav();
    } else if (!body.classList.contains("nav-open")) {
      nav.setAttribute("aria-hidden", "true");
    }
  }

  if (mq.addEventListener) mq.addEventListener("change", syncMq);
  else mq.addListener(syncMq);
  syncMq();
})();
