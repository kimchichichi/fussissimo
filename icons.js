(function () {
  function refresh(root) {
    if (!window.lucide || typeof lucide.createIcons !== "function") return;
    lucide.createIcons({
      attrs: {
        class: ["icon"],
        "stroke-width": 1.75,
        "stroke-linecap": "square",
        "stroke-linejoin": "miter",
      },
      root: root || document,
    });
  }

  function make(name) {
    var i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  window.FUSSIcons = { refresh: refresh, make: make };

  function boot() {
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
