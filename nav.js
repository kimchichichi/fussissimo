(function () {
  const body = document.body;
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  const mq = window.matchMedia("(max-width: 991px)");
  const CLOSE_MS = 420;
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
    window.setTimeout(close, 120);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && body.classList.contains("nav-open")) {
      close();
      toggle.focus();
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
