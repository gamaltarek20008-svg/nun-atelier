/* ==========================================================================
   SHOP — standalone storefront behaviour
   No framework, no build step, no backend, no admin.

   All artwork and copy are local. Cart lives in localStorage.
   ========================================================================== */
(function () {
  "use strict";

  var DATA = window.SHOP_DATA || { categories: [], products: [] };
  var PRODUCTS = DATA.products || [];
  var CATEGORIES = DATA.categories || [];
  var BY_SLUG = {};
  PRODUCTS.forEach(function (p) { BY_SLUG[p.slug] = p; });

  /* ------------------------------------------------------------------ i18n */

  var AR = window.NUN_AR || { map: {}, colors: {}, types: {}, categories: {}, ui: {} };
  AR.map = AR.map || {};
  AR.ui = AR.ui || {};

  function initialLang() {
    var q = qs("lang");
    if (q === "ar" || q === "en") {
      try { localStorage.setItem("nun.lang", q); } catch (e) {}
      return q;
    }
    try { return localStorage.getItem("nun.lang") === "ar" ? "ar" : "en"; } catch (e) { return "en"; }
  }
  var LANG = initialLang();
  function isAr() { return LANG === "ar"; }

  (function buildTranslationMaps() {
    function add(en, ar) {
      if (!en || !ar || en === ar) return;
      if (!Object.prototype.hasOwnProperty.call(AR.map, en)) AR.map[en] = ar;
    }
    PRODUCTS.forEach(function (p) {
      add(p.name, p.nameAr);
      add(p.short, p.shortAr);
      add(p.description, p.descriptionAr);
      add(p.material, p.materialAr);
      add(p.care, p.careAr);
      add(p.typeName, p.typeNameAr);
      add(p.categoryName, p.categoryNameAr);
      (p.colors || []).forEach(function (c) { add(c.name, c.nameAr || AR.colors[c.name]); });
    });
    CATEGORIES.forEach(function (c) {
      add(c.name, c.nameAr);
      add(c.description, c.descriptionAr);
    });
    Object.keys(AR.types).forEach(function (k) { add(k, AR.types[k]); });
    Object.keys(AR.colors).forEach(function (k) { add(k, AR.colors[k]); });
  })();

  function arCount(n, one, two, few, many) {
    n = Number(n) || 0;
    if (n === 1) return one;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return n + " " + few;
    return n + " " + many;
  }
  function piecesPhrase(n) {
    return arCount(n, AR.ui.piece || "قطعة واحدة", AR.ui.twoPieces || "قطعتان", "قطع", "قطعة");
  }
  function resultsPhrase(n) {
    return arCount(n, AR.ui.resultFor ? AR.ui.resultFor.replace("{q}", "") : "نتيجة واحدة", "نتيجتان", "نتائج", "نتيجة");
  }
  function fill(tpl, vars) {
    return String(tpl || "").replace(/\{(\w+)\}/g, function (m, k) {
      return vars && Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m;
    });
  }
  function arOf(s) { return AR.map[s] || s; }

  function translateCore(core) {
    if (AR.map[core]) return AR.map[core];
    var m;

    if (core === "NŪN Atelier — Considered clothing, made in small runs") {
      return "نون أتيليه — ملابس مدروسة، بكميات صغيرة";
    }
    if ((m = core.match(/^(.+) — NŪN Atelier$/))) return arOf(m[1]) + " — نون أتيليه";
    if (core === "NŪN Atelier") return "نون أتيليه";

    if ((m = core.match(/^(\d+) pieces?$/))) return piecesPhrase(Number(m[1]));
    if ((m = core.match(/^(\d+) results? for “(.+)”$/))) {
      var q = arOf(m[2]);
      return Number(m[1]) === 1
        ? fill(AR.ui.resultFor || "نتيجة واحدة لـ «{q}»", { q: q })
        : fill(AR.ui.resultsFor || "{n} نتيجة لـ «{q}»", { n: m[1], q: q });
    }
    if ((m = core.match(/^(.+) view (\d+)$/))) {
      return fill(AR.ui.view || "{name} — صورة {n}", { name: arOf(m[1]), n: m[2] });
    }
    if ((m = core.match(/^Quote (\d+)$/))) return fill(AR.ui.quote || "اقتباس {n}", { n: m[1] });
    if ((m = core.match(/^Look (\d+)$/))) return fill(AR.ui.look || "إطلالة {n}", { n: m[1] });
    if ((m = core.match(/^(NN-[A-Z]{2}-\d+) · (.+)$/))) {
      return m[1] + " · " + (AR.types[m[2]] || m[2]);
    }
    if ((m = core.match(/^(.+) · Size (.+) · (NN-[A-Z]{2}-\d+)$/))) {
      return fill(AR.ui.discountLine || "{color} · مقاس {size} · {sku}", { color: arOf(m[1]), size: m[2], sku: m[3] });
    }
    if ((m = core.match(/^(.+) · (XS|S|M|L|XL|2Y|4Y|6Y|8Y|One size)$/))) {
      return fill(AR.ui.drawerLine || "{color} · {size}", { color: arOf(m[1]), size: m[2] });
    }
    if ((m = core.match(/^Size (.+)$/))) return fill(AR.ui.size || "مقاس {size}", { size: m[1] });
    if ((m = core.match(/^(\d+) in stock$/))) return fill(AR.ui.inStock || "{n} متوفر", { n: m[1] });
    if ((m = core.match(/^— (\d+) left in (.+), ships in (\d+)h$/))) {
      return fill(AR.ui.onlyLeft || "— بقي {n} في {size}، يُشحن خلال {h} ساعة", { n: m[1], size: m[2], h: m[3] });
    }
    if ((m = core.match(/^Add to bag — \$(\d+)$/))) {
      return fill(AR.ui.addToBagPrice || "أضف إلى الحقيبة — ${price}", { price: m[1] });
    }
    if ((m = core.match(/^Subtotal \((\d+) items?\)$/))) {
      return fill(AR.ui.subtotalItems || "الإجمالي الفرعي ({n} قطعة)", { n: m[1] });
    }
    if ((m = core.match(/^Discount · (.+)$/))) return fill(AR.ui.discount || "خصم · {code}", { code: m[1] });
    if ((m = core.match(/^Add \$(\d+) for complimentary shipping\.$/))) {
      return fill(AR.ui.freeShipAdd || "أضف ${amount} للحصول على شحن مجاني.", { amount: m[1] });
    }
    if ((m = core.match(/^Add \$(\d+) for free shipping\.$/))) {
      return fill(AR.ui.freeShipAdd || "أضف ${amount} للحصول على شحن مجاني.", { amount: m[1] });
    }
    if ((m = core.match(/^Taxes included\. Complimentary shipping applied\.$/))) {
      return AR.ui.taxesFree || "الأسعار تشمل الضرائب. تم تطبيق الشحن المجاني.";
    }
    if ((m = core.match(/^Taxes included\. Add \$(\d+) for complimentary shipping\.$/))) {
      return fill(AR.ui.taxesAdd || "الأسعار تشمل الضرائب. أضف ${amount} للحصول على شحن مجاني.", { amount: m[1] });
    }
    if ((m = core.match(/^© (\d+) NŪN Atelier\. All rights reserved\.$/))) {
      return fill(AR.ui.copyright || "© {year} نون أتيليه. جميع الحقوق محفوظة.", { year: m[1] });
    }
    if ((m = core.match(/^(.+) added to your bag$/))) {
      return fill(AR.ui.addedToBag || "تمت إضافة {name} إلى حقيبتك", { name: arOf(m[1]) });
    }
    if ((m = core.match(/^(.+) applied$/))) {
      return fill(AR.ui.codeApplied || "تم تطبيق الكود {code}", { code: m[1] });
    }
    if ((m = core.match(/^More (.+)$/))) {
      var moreName = arOf(m[1]);
      if (moreName !== m[1]) return fill(AR.ui.more || "المزيد من {name}", { name: moreName });
    }
    if ((m = core.match(/^(.+) · (.+)$/))) {
      var a = arOf(m[1]), b = arOf(m[2]);
      if (a !== m[1] || b !== m[2]) return a + " · " + b;
    }
    return core;
  }

  function translateString(value) {
    if (!isAr() || !value) return value;
    var core = value.trim();
    if (!core) return value;
    var out = translateCore(core);
    if (out === core) return value;
    return value.replace(core, out);
  }

  function translateAttributes(el) {
    ["alt", "aria-label", "placeholder", "title"].forEach(function (attr) {
      if (!el.hasAttribute(attr)) return;
      var value = el.getAttribute(attr);
      var next = translateString(value);
      if (next !== value) el.setAttribute(attr, next);
    });
  }

  function translateNode(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var value = node.nodeValue;
      var next = translateString(value);
      if (next !== value) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(node.tagName)) return;
    if (node.hasAttribute("data-no-i18n")) return;
    translateAttributes(node);
    for (var child = node.firstChild; child; child = child.nextSibling) translateNode(child);
  }

  var i18nObserver = null;
  var translating = false;

  function translateDocument() {
    if (!isAr() || translating) return;
    translating = true;
    translateNode(document.head);
    translateNode(document.body);
    translating = false;
  }

  function bootI18n() {
    document.documentElement.lang = isAr() ? "ar" : "en";
    document.documentElement.dir = isAr() ? "rtl" : "ltr";
    if (!isAr()) return;
    translateDocument();
    if (i18nObserver) return;
    i18nObserver = new MutationObserver(function (mutations) {
      if (translating) return;
      translating = true;
      mutations.forEach(function (mutation) {
        if (mutation.type === "characterData") translateNode(mutation.target);
        else if (mutation.type === "childList") {
          for (var i = 0; i < mutation.addedNodes.length; i++) translateNode(mutation.addedNodes[i]);
        }
      });
      translating = false;
    });
    i18nObserver.observe(document.head, { subtree: true, childList: true, characterData: true });
    i18nObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  /* ----------------------------------------------------------------- theme */

  var THEME_KEY = "nun.theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function updateChromeButtons() {
    var dark = currentTheme() === "dark";
    $$("[data-theme-toggle]").forEach(function (btn) {
      var label = dark
        ? (isAr() ? "التبديل إلى الوضع الفاتح" : "Switch to light mode")
        : (isAr() ? "التبديل إلى الوضع الداكن" : "Switch to dark mode");
      if (btn.classList.contains("pref-btn")) {
        btn.innerHTML = icon(dark ? "sun" : "moon") + "<span>" +
          (dark ? (isAr() ? "الوضع الفاتح" : "Light mode") : (isAr() ? "الوضع الداكن" : "Dark mode")) + "</span>";
      } else {
        btn.innerHTML = icon(dark ? "sun" : "moon");
      }
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
    $$("[data-lang-toggle]").forEach(function (btn) {
      var code = isAr() ? "EN" : "AR";
      var aria = isAr() ? "التبديل إلى الإنجليزية" : "Switch to Arabic";
      if (btn.classList.contains("pref-btn")) {
        var span = btn.querySelector("span");
        var codeEl = btn.querySelector(".pref-code");
        if (codeEl) codeEl.textContent = code;
        if (span && span !== codeEl) span.textContent = isAr() ? "English" : "العربية";
      } else {
        btn.textContent = code;
      }
      btn.setAttribute("aria-label", aria);
      btn.setAttribute("title", aria);
    });
  }
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    updateChromeButtons();
  }
  function toggleTheme() {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  }
  function toggleLang() {
    try { localStorage.setItem("nun.lang", isAr() ? "en" : "ar"); } catch (e) {}
    location.reload();
  }

  var LOCKED_CATEGORY = document.body.dataset.category || "";

  function categoryHref(slug) {
    return esc(slug) + ".html";
  }

  function departmentProducts() {
    return LOCKED_CATEGORY
      ? PRODUCTS.filter(function (p) { return p.category === LOCKED_CATEGORY; })
      : PRODUCTS;
  }

  var CART_KEY = "shop.cart.v1";
  var COUPON_KEY = "shop.coupon.v1";
  var FREE_SHIPPING = 250;
  var SHIPPING = 12;

  /* ------------------------------------------------------------------ utils */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(n) { return "$" + Math.round(Number(n) || 0); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
    return h;
  }
  function ratingOf(p) {
    if (p.rating) return p.rating;
    return 4.4 + ((hash(p.slug) % 6) / 10);
  }
  function reviewsOf(p) {
    if (p.reviews) return p.reviews;
    return 18 + (hash(p.slug + "r") % 122);
  }
  function firstImage(p) { return p.images && p.images[0] ? p.images[0] : "assets/img/editorial/studio.jpg"; }
  function secondImage(p) { return p.images && p.images[2] ? p.images[2] : (p.images[1] || firstImage(p)); }
  function sizeStock(p, label) {
    var s = (p.sizes || []).filter(function (x) { return x.label === label; })[0];
    return s ? s.stock : 0;
  }
  function defaultSize(p) {
    var sizes = p.sizes || [];
    var inStock = sizes.filter(function (s) { return s.stock > 0; });
    return (inStock[0] || sizes[0] || { label: "One size" }).label;
  }

  /* ------------------------------------------------------------------ icons */

  var PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    bag: '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.7"/><circle cx="17.5" cy="18" r="1.7"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    leaf: '<path d="M20 4C10 4 4 9 4 16v4"/><path d="M20 4c0 9-5.5 13-12 13H4"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6M11 8v6"/>',
    heart: '<path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>'
  };
  function icon(name, extra) {
    var d = PATHS[name] || "";
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra ? " " + extra : "") + ">" + d + "</svg>";
  }
  function stars(r) {
    var full = Math.round(r);
    var out = "";
    for (var i = 0; i < 5; i++) out += '<svg viewBox="0 0 24 24" style="opacity:' + (i < full ? 1 : 0.28) + '">' + PATHS.star + "</svg>";
    return '<span class="rating-inline">' + out + "<b>" + r.toFixed(1) + "</b></span>";
  }

  /* ------------------------------------------------------------------- cart */

  var cart = readCart();
  var coupon = readCoupon();

  function readCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (l) { return BY_SLUG[l.slug]; }) : [];
    } catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    renderCartCount();
    renderDrawer();
    if (document.body.dataset.page === "cart") renderCartPage();
  }
  function readCoupon() {
    try { return JSON.parse(localStorage.getItem(COUPON_KEY) || "null"); } catch (e) { return null; }
  }
  function saveCoupon(c) {
    coupon = c;
    try {
      if (c) localStorage.setItem(COUPON_KEY, JSON.stringify(c));
      else localStorage.removeItem(COUPON_KEY);
    } catch (e) {}
  }
  function cartCount() {
    return cart.reduce(function (n, l) { return n + l.qty; }, 0);
  }
  function cartSubtotal() {
    return cart.reduce(function (n, l) {
      var p = BY_SLUG[l.slug];
      return n + (p ? p.price * l.qty : 0);
    }, 0);
  }
  function cartDiscount() {
    if (!coupon) return 0;
    return Math.round(cartSubtotal() * coupon.rate);
  }
  function cartShipping() {
    if (!cart.length) return 0;
    return cartSubtotal() - cartDiscount() >= FREE_SHIPPING ? 0 : SHIPPING;
  }
  function cartTotal() {
    return Math.max(0, cartSubtotal() - cartDiscount() + cartShipping());
  }
  function addToCart(slug, size, color, qty) {
    var p = BY_SLUG[slug];
    if (!p) return;
    qty = Math.max(1, Number(qty) || 1);
    size = size || defaultSize(p);
    color = color || ((p.colors && p.colors[0] && p.colors[0].name) || "");
    var line = cart.filter(function (l) {
      return l.slug === slug && l.size === size && l.color === color;
    })[0];
    if (line) line.qty = Math.min(20, line.qty + qty);
    else cart.push({ slug: slug, size: size, color: color, qty: qty });
    saveCart();
    openPanel("cart");
    toast(esc(p.name) + " added to your bag");
  }
  function setQty(index, qty) {
    var line = cart[index];
    if (!line) return;
    if (qty <= 0) cart.splice(index, 1);
    else line.qty = Math.min(20, qty);
    saveCart();
  }
  function removeLine(index) {
    cart.splice(index, 1);
    saveCart();
    toast("Item removed");
  }

  /* ------------------------------------------------------------ page chrome */

  var ANNOUNCE = [
    "Complimentary shipping over $250",
    "Autumn / Winter 26 — now in store",
    "Free returns within 30 days",
    "Small-run production, made in Portugal"
  ];

  var NAV_LINKS = [
    { href: "shop.html?new=1", label: "New in" },
    { href: "index.html#story", label: "About" },
    { href: "index.html#journal", label: "Journal" },
    { href: "index.html#service", label: "Contact" }
  ];

  var COLLECTIONS = [
    { href: "shop.html?new=1", label: "New in" },
    { href: "shop.html?sale=1", label: "Archive sale" },
    { href: "shop.html?sort=rating", label: "Top rated" },
    { href: "shop.html", label: "All pieces" }
  ];

  function megaMenuHTML() {
    return (
      '<div class="nav-shop" data-shop-nav>' +
      '<button class="nav-shop-btn" type="button" data-shop-toggle aria-haspopup="true" aria-expanded="false" aria-controls="megaMenu">Shop' + icon("down") + "</button>" +
      '<div class="mega" id="megaMenu">' +
      '<div class="wrap mega-inner">' +
      '<div class="mega-col">' +
      '<p class="eyebrow">Categories</p>' +
      '<ul class="mega-list mega-cats">' +
      CATEGORIES.map(function (c) {
        return '<li><a href="' + categoryHref(c.slug) + '"><span>' + esc(c.name) + "</span>" + icon("right") + "</a></li>";
      }).join("") +
      "</ul></div>" +
      '<div class="mega-col">' +
      '<p class="eyebrow">Collections</p>' +
      '<ul class="mega-list">' +
      COLLECTIONS.map(function (l) {
        return '<li><a href="' + l.href + '">' + esc(l.label) + "</a></li>";
      }).join("") +
      "</ul></div>" +
      '<a class="mega-promo" href="' + categoryHref("women") + '">' +
      '<img src="assets/img/categories/knitwear.jpg" alt="Knitwear from the Autumn / Winter 26 collection">' +
      '<span class="mega-promo-copy"><span class="eyebrow eyebrow-gold">AW26</span>' +
      '<strong class="display">The quiet collection</strong></span></a>' +
      "</div></div></div>"
    );
  }

  function headerHTML(active) {
    var track = "";
    for (var r = 0; r < 2; r++) {
      ANNOUNCE.forEach(function (t) {
        track += "<span><i>◆</i>" + esc(t) + "</span>";
      });
    }
    return (
      '<div class="announce"><div class="announce-track">' + track + "</div></div>" +
      '<header class="site-header" id="siteHeader"><div class="wrap header-inner">' +
      '<a class="brand" href="index.html">NŪN<small>Atelier</small></a>' +
      '<nav class="nav" aria-label="Main">' +
      megaMenuHTML() +
      NAV_LINKS.map(function (l) {
        return '<a href="' + l.href + '">' + esc(l.label) + "</a>";
      }).join("") +
      "</nav>" +
      '<div class="header-actions">' +
      '<button class="icon-btn" type="button" data-lang-toggle aria-label="Switch to Arabic">AR</button>' +
      '<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch to dark mode">' + icon("moon") + "</button>" +
      '<button class="icon-btn" type="button" data-open="search" aria-label="Search">' + icon("search") + "</button>" +
      '<button class="icon-btn" type="button" data-open="cart" aria-label="Open bag">' + icon("bag") +
      '<span class="cart-count" data-cart-count hidden>0</span></button>' +
      '<button class="icon-btn burger" type="button" data-open="menu" aria-label="Open menu">' + icon("menu") + "</button>" +
      "</div></div></header>"
    );
  }

  function footerHTML() {
    var cols = [
      { title: "Shop", links: [["Shop all", "shop.html"], ["New arrivals", "shop.html?new=1"], ["Men", "men.html"], ["Women", "women.html"], ["Kids", "kids.html"], ["Accessories", "accessories.html"]] },
      { title: "Atelier", links: [["Our story", "index.html#story"], ["Materials", "index.html#story"], ["Journal", "index.html#journal"], ["Stockists", "index.html#store"], ["Careers", "index.html#store"]] },
      { title: "Help", links: [["Shipping & returns", "index.html#service"], ["Size guide", "shop.html"], ["Track an order", "index.html#service"], ["Contact", "index.html#service"], ["Privacy", "index.html#service"]] }
    ];
    return (
      '<footer class="site-footer"><div class="wrap">' +
      '<div class="footer-top">' +
      '<div class="footer-brand"><a class="brand" href="index.html">NŪN<small>Atelier</small></a>' +
      "<p>Considered clothing, made in small runs from traceable cloth. Designed in Cairo, cut in Porto.</p>" +
      '<div class="pay-row mt-2"><span>VISA</span><span>MC</span><span>AMEX</span><span>PAYPAL</span></div></div>' +
      cols.map(function (c) {
        return '<div class="footer-col"><h4>' + c.title + "</h4>" +
          c.links.map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + "</a>"; }).join("") +
          "</div>";
      }).join("") +
      "</div>" +
      '<div class="footer-bottom"><p>© ' + new Date().getFullYear() + " NŪN Atelier. All rights reserved.</p>" +
      "<p>Green edition — a static storefront. No account, no admin.</p></div>" +
      "</div></footer>"
    );
  }

  function overlaysHTML() {
    return (
      '<div class="scrim" id="scrim" data-close-all></div>' +

      '<aside class="drawer" id="cartDrawer" aria-hidden="true" aria-label="Shopping bag">' +
      '<div class="drawer-head"><h2>Your bag <span class="muted" data-cart-count-label>(0)</span></h2>' +
      '<button class="icon-btn" type="button" data-close-all aria-label="Close bag">' + icon("close") + "</button></div>" +
      '<div class="drawer-body" id="drawerBody"></div>' +
      '<div class="drawer-foot" id="drawerFoot"></div></aside>' +

      '<div class="mobile-panel" id="mobilePanel" aria-hidden="true">' +
      '<div class="mobile-panel-head"><a class="brand" href="index.html">NŪN<small>Atelier</small></a>' +
      '<button class="icon-btn" type="button" data-close-all aria-label="Close menu">' + icon("close") + "</button></div>" +
      '<nav class="mobile-links" aria-label="Mobile">' +
      '<a href="shop.html">Shop all</a>' +
      '<a href="shop.html?new=1">New in</a>' +
      '<a href="index.html#story">About</a>' +
      '<a href="index.html#journal">Journal</a>' +
      '<a href="index.html#service">Contact</a>' +
      "</nav>" +
      '<div class="mobile-section"><p class="eyebrow">Categories</p>' +
      '<div class="mobile-cat-grid">' +
      CATEGORIES.map(function (c) {
        return '<a href="' + categoryHref(c.slug) + '"><span>' + esc(c.name) + "</span>" + icon("right") + "</a>";
      }).join("") +
      "</div></div>" +
      '<div class="mobile-section"><p class="eyebrow">Collections</p>' +
      '<div class="mobile-col-list">' +
      COLLECTIONS.map(function (l) {
        return '<a href="' + l.href + '">' + esc(l.label) + "</a>";
      }).join("") +
      "</div></div>" +
      '<div class="mobile-panel-foot">' +
      '<button class="btn btn-solid btn-block" type="button" data-open="cart">View bag</button>' +
      '<div class="mobile-prefs">' +
      '<button class="pref-btn" type="button" data-theme-toggle aria-label="Switch to dark mode">' + icon("moon") + "<span>Dark mode</span></button>" +
      '<button class="pref-btn" type="button" data-lang-toggle aria-label="Switch to Arabic"><b class="pref-code">AR</b><span>العربية</span></button>' +
      "</div>" +
      '<p class="muted" style="font-size:.72rem">Complimentary shipping on orders over $250.</p>' +
      "</div></div>" +

      '<div class="search-panel" id="searchPanel" aria-hidden="true">' +
      '<div class="search-inner">' +
      '<div class="search-bar">' + icon("search") +
      '<input id="searchInput" type="search" placeholder="Search pieces, cloth, colours…" autocomplete="off" aria-label="Search products">' +
      '<button type="button" data-close-all>Close</button></div>' +
      '<p class="search-hint" id="searchHint">Popular: knitwear · linen · denim · outerwear</p>' +
      '<div class="search-results" id="searchResults"></div>' +
      "</div></div>" +

      '<div class="lightbox" id="lightbox" aria-hidden="true">' +
      '<div class="lightbox-bar"><span id="lightboxCount">1 / 4</span>' +
      '<button type="button" data-close-all aria-label="Close gallery">' + icon("close") + "</button></div>" +
      '<div class="lightbox-stage"><img id="lightboxImg" alt=""></div>' +
      '<div class="lightbox-nav">' +
      '<button type="button" data-light="prev" aria-label="Previous image">' + icon("left") + "</button>" +
      '<button type="button" data-light="next" aria-label="Next image">' + icon("right") + "</button>" +
      "</div></div>" +

      '<div class="toasts" id="toasts" aria-live="polite"></div>'
    );
  }

  function mountChrome(active) {
    var headerMount = $("#siteHeaderMount");
    var footerMount = $("#siteFooterMount");
    if (headerMount) headerMount.outerHTML = headerHTML(active);
    if (footerMount) footerMount.outerHTML = footerHTML();
    var holder = document.createElement("div");
    holder.innerHTML = overlaysHTML();
    while (holder.firstChild) document.body.appendChild(holder.firstChild);
    renderCartCount();
    renderDrawer();
  }

  /* ---------------------------------------------------------------- overlays */

  var lastFocus = null;
  function openPanel(kind) {
    lastFocus = document.activeElement;
    var scrim = $("#scrim");
    var drawer = $("#cartDrawer");
    var menu = $("#mobilePanel");
    var search = $("#searchPanel");
    closeAll(true);
    lastFocus = document.activeElement;
    if (kind === "cart") {
      renderDrawer();
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      scrim.classList.add("show");
    } else if (kind === "menu") {
      menu.classList.add("open");
      menu.setAttribute("aria-hidden", "false");
      scrim.classList.add("show");
    } else if (kind === "search") {
      search.classList.add("open");
      search.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      setTimeout(function () { var i = $("#searchInput"); if (i) i.focus(); }, 120);
    }
    if (kind === "cart" || kind === "menu") document.body.classList.add("no-scroll");
  }
  function closeAll(silent) {
    ["#cartDrawer", "#mobilePanel", "#searchPanel", "#lightbox"].forEach(function (sel) {
      var el = $(sel);
      if (el) { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); }
    });
    var scrim = $("#scrim");
    if (scrim) scrim.classList.remove("show");
    document.body.classList.remove("no-scroll");
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function toast(msg) {
    var host = $("#toasts");
    if (!host) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = icon("check") + "<span>" + msg + "</span>";
    host.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .35s, transform .35s";
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(function () { el.remove(); }, 400);
    }, 2600);
  }

  function renderCartCount() {
    var n = cartCount();
    $$("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    $$("[data-cart-count-label]").forEach(function (el) {
      el.textContent = "(" + n + ")";
    });
  }

  function renderDrawer() {
    var body = $("#drawerBody");
    var foot = $("#drawerFoot");
    if (!body || !foot) return;
    if (!cart.length) {
      body.innerHTML = '<div class="empty-state" style="border:0;padding:2.5rem 0">' +
        '<h3>Your bag is empty</h3><p>Start with the pieces everyone reaches for.</p>' +
        '<a class="btn btn-outline mt-3" href="shop.html">Shop all</a></div>';
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = cart.map(function (l, i) {
      var p = BY_SLUG[l.slug];
      return '<div class="drawer-line">' +
        '<a href="product.html?slug=' + p.slug + '"><img src="' + firstImage(p) + '" alt="' + esc(p.name) + '"></a>' +
        "<div><h3>" + esc(p.name) + "</h3><p>" + esc(l.color) + " · " + esc(l.size) + "</p>" +
        '<div class="qty-mini"><button type="button" data-qty="' + i + '" data-delta="-1" aria-label="Decrease">−</button>' +
        "<span>" + l.qty + "</span>" +
        '<button type="button" data-qty="' + i + '" data-delta="1" aria-label="Increase">+</button></div>' +
        '<p class="mt-1">' + money(p.price * l.qty) + ' <button type="button" class="remove-line" data-remove="' + i + '">Remove</button></p>' +
        "</div></div>";
    }).join("");
    foot.innerHTML = '<div class="summary-row"><span>Subtotal</span><span>' + money(cartSubtotal()) + "</span></div>" +
      '<div class="summary-row"><span>Shipping</span><span>' + (cartShipping() === 0 ? "Free" : money(cartShipping())) + "</span></div>" +
      '<div class="summary-total"><span>Total</span><span>' + money(cartTotal()) + "</span></div>" +
      '<a class="btn btn-solid btn-block" href="cart.html">View bag &amp; checkout</a>' +
      '<p class="muted" style="font-size:.66rem;margin-top:.75rem">' +
      (cartSubtotal() >= FREE_SHIPPING ? "You unlocked complimentary shipping." : "Add " + money(FREE_SHIPPING - cartSubtotal()) + " for free shipping.") +
      "</p>";
  }

  /* --------------------------------------------------------------- fragments */

  function swatches(p) {
    return '<span class="swatches">' + (p.colors || []).slice(0, 4).map(function (c) {
      return '<span class="swatch-dot" style="background:' + esc(c.hex) + '" title="' + esc(c.name) + '"></span>';
    }).join("") + "</span>";
  }

  function productCard(p, opts) {
    opts = opts || {};
    var sale = p.compareAt && p.compareAt > p.price;
    return '<article class="pcard reveal"' + (opts.delay ? ' style="--d:' + opts.delay + 's"' : "") + ">" +
      '<div class="pcard-media">' +
      '<a href="product.html?slug=' + p.slug + '" aria-label="' + esc(p.name) + '">' +
      '<img class="img-a" src="' + firstImage(p) + '" alt="' + esc(p.name) + '" loading="lazy">' +
      '<img class="img-b" src="' + secondImage(p) + '" alt="" loading="lazy" aria-hidden="true"></a>' +
      (sale ? '<span class="badge badge-sale">Sale</span>' : p.isNew ? '<span class="badge">New</span>' : "") +
      '<button class="quick-add" type="button" data-quick-add="' + p.slug + '">' + icon("plus") + " Quick add</button>" +
      "</div>" +
      '<div class="pcard-info"><div class="pcard-title"><h3><a href="product.html?slug=' + p.slug + '">' + esc(p.name) + "</a></h3>" +
      '<span class="price' + (sale ? " price-sale" : "") + '">' + money(p.price) + (sale ? "<s>" + money(p.compareAt) + "</s>" : "") + "</span></div>" +
      '<div class="pcard-meta">' + swatches(p) + "<span>" + esc(p.typeName || p.categoryName) + "</span></div></div></article>";
  }

  /* ------------------------------------------------------------------- home */

  function renderHome() {
    var newIn = PRODUCTS.filter(function (p) { return p.isNew; });
    if (newIn.length < 8) newIn = newIn.concat(PRODUCTS.filter(function (p) { return !p.isNew; }));
    newIn = newIn.slice(0, 10);
    var best = PRODUCTS.filter(function (p) { return p.isFeatured; }).slice(0, 4);
    if (best.length < 4) best = PRODUCTS.slice(0, 4);

    var stats = [
      { n: 12, suffix: "", label: "Years of the atelier" },
      { n: PRODUCTS.length, suffix: "", label: "Pieces this season" },
      { n: 100, suffix: "%", label: "Traceable cloth" },
      { n: 48, suffix: "h", label: "Dispatch window" }
    ];

    var quotes = [
      { text: "The poplin shirt has survived three summers and still looks like it was pressed yesterday.", who: "Maya R. — Cairo", stars: "★★★★★" },
      { text: "You can feel the difference in the cloth the second you pick it up. Nothing loud, everything considered.", who: "Idris K. — London", stars: "★★★★★" },
      { text: "Finally a label that cuts for real bodies and doesn’t charge couture prices for it.", who: "Lena S. — Berlin", stars: "★★★★★" }
    ];

    return (
      /* hero */
      '<section class="hero">' +
      '<div class="hero-media"><img src="assets/img/editorial/hero.jpg" alt="Model wearing the Autumn / Winter 26 collection" fetchpriority="high"></div>' +
      '<div class="wrap hero-inner hero-enter">' +
      '<div class="hero-copy"><p class="eyebrow">Autumn / Winter 26 — The Quiet Collection</p>' +
      '<h1 class="display h1">Clothes that<br>keep their word.</h1>' +
      "<p>Small-run tailoring in traceable wool, linen and cotton. Cut once, cut properly — then worn for a decade.</p>" +
      '<div class="hero-actions"><a class="btn btn-solid" href="shop.html">Shop the collection</a>' +
      '<a class="btn btn-outline" href="#story">Inside the atelier</a></div></div>' +
      '<div class="hero-foot"><div class="hero-stats">' +
      '<div><strong>' + PRODUCTS.filter(function (p) { return p.isNew; }).length + '</strong><span>New pieces</span></div>' +
      '<div><strong>' + CATEGORIES.length + '</strong><span>Categories</span></div>' +
      '<div><strong>4.8</strong><span>Average rating</span></div>' +
      "</div>" +
      '<a class="scroll-cue" href="#categories">Scroll <span></span></a></div>' +
      "</div></section>" +

      /* trust */
      '<section class="trust"><div class="wrap"><div class="trust-grid">' +
      '<div class="trust-item">' + icon("truck") + "<span>Free shipping over $250</span></div>" +
      '<div class="trust-item">' + icon("refresh") + "<span>30-day easy returns</span></div>" +
      '<div class="trust-item">' + icon("shield") + "<span>Secure checkout</span></div>" +
      '<div class="trust-item">' + icon("leaf") + "<span>Traceable, low-impact cloth</span></div>" +
      "</div></div></section>" +

      /* categories */
      '<section class="section" id="categories"><div class="wrap">' +
      '<div class="section-head reveal"><div><p class="eyebrow">Browse</p>' +
      '<h2 class="display h2 mt-1">Shop by category</h2>' +
      "<p>Four departments, one point of view. Start where you need to.</p></div>" +
      '<a class="link-arrow" href="shop.html">All categories ' + icon("right") + "</a></div>" +
      '<div class="cat-grid">' +
      CATEGORIES.map(function (c, i) {
        var count = PRODUCTS.filter(function (p) { return p.category === c.slug; }).length;
        return '<a class="cat-card reveal" href="' + categoryHref(c.slug) + '" style="--d:' + (i * 0.05) + 's">' +
          '<img src="' + c.image + '" alt="' + esc(c.name) + '" loading="lazy">' +
          '<div class="cat-label"><div><span>' + count + " pieces</span><h3>" + esc(c.name) + "</h3></div>" +
          '<span class="circle">' + icon("right") + "</span></div></a>";
      }).join("") +
      "</div></div></section>" +

      /* new in rail */
      '<section class="section-tight"><div class="wrap">' +
      '<div class="rail-head reveal"><div><p class="eyebrow">Just landed</p><h2 class="display h2 mt-1">New in</h2></div>' +
      '<div class="rail-nav"><button type="button" data-rail="-1" aria-label="Previous">' + icon("left") + "</button>" +
      '<button type="button" data-rail="1" aria-label="Next">' + icon("right") + "</button></div></div>" +
      '<div class="rail" id="newRail">' + newIn.map(function (p) { return productCard(p); }).join("") + "</div>" +
      '<p class="mt-3"><a class="link-arrow" href="shop.html?new=1">See everything new ' + icon("right") + "</a></p>" +
      "</div></section>" +

      /* promos */
      '<section class="section-tight"><div class="wrap"><div class="promo-grid">' +
      '<article class="promo reveal"><img src="assets/img/editorial/look-1.jpg" alt="Outerwear editorial" loading="lazy">' +
      '<div class="promo-body"><p class="eyebrow" style="color:rgba(255,255,255,.7)">The outer layer</p>' +
      "<h3>Wool that earns its keep.</h3><p>Topcoats and blousons cut to layer over knitwear without a single wrinkle.</p>" +
      '<a class="link-arrow" href="' + categoryHref("men") + '">Shop men ' + icon("right") + "</a></div></article>" +
      '<article class="promo reveal" style="--d:.08s"><img src="assets/img/editorial/look-2.jpg" alt="Knitwear editorial" loading="lazy">' +
      '<div class="promo-body"><p class="eyebrow" style="color:rgba(255,255,255,.7)">The soft layer</p>' +
      "<h3>Knitted in small runs.</h3><p>Lambswool, merino and bouclé from two mills we visit every spring.</p>" +
      '<a class="link-arrow" href="' + categoryHref("women") + '">Shop women ' + icon("right") + "</a></div></article>" +
      "</div></div></section>" +

      /* story */
      '<section class="section" id="story"><div class="wrap split split-2">' +
      '<div class="editorial-media reveal"><img data-parallax src="assets/img/editorial/mill.jpg" alt="Cloth on the mill floor" loading="lazy"></div>' +
      '<div class="editorial-copy reveal" style="--d:.1s"><p class="eyebrow">Inside the atelier</p>' +
      "<blockquote>“We buy the cloth first. The design follows the hand of the fabric.”</blockquote>" +
      "<p>Every style begins on the mill floor in Porto, where we choose cloth by weight and drape rather than by trend. Nothing is cut until the sample has been worn for a month by someone in the studio.</p>" +
      '<ul class="editorial-list">' +
      "<li><strong>Cloth</strong><span>Portugal &amp; Italy</span></li>" +
      "<li><strong>Cut &amp; sew</strong><span>Porto, small runs</span></li>" +
      "<li><strong>Trims</strong><span>Corozo, silk, leather</span></li>" +
      "<li><strong>Repairs</strong><span>Free, for life</span></li>" +
      "</ul></div></div></section>" +

      /* stats */
      '<section class="stats"><div class="wrap"><div class="stats-grid">' +
      stats.map(function (s) {
        return '<div class="stat reveal"><strong><span data-count="' + s.n + '">0</span>' + s.suffix + "</strong><span>" + s.label + "</span></div>";
      }).join("") +
      "</div></div></section>" +

      /* quotes */
      '<section class="section-tight"><div class="wrap"><div class="quotes reveal">' +
      '<div><p class="eyebrow">Word of mouth</p><h2 class="display h2">Worn, washed,<br>worn again.</h2>' +
      '<div class="quote-dots" id="quoteDots">' +
      quotes.map(function (q, i) {
        return '<button type="button" data-quote="' + i + '" class="' + (i === 0 ? "active" : "") + '" aria-label="Quote ' + (i + 1) + '"></button>';
      }).join("") + "</div></div>" +
      '<div class="quote-stage" id="quoteStage">' +
      quotes.map(function (q, i) {
        return '<figure class="quote ' + (i === 0 ? "active" : "") + '"><p>“' + esc(q.text) + '”</p>' +
          "<footer><span class=\"quote-stars\">" + q.stars + "</span>" + esc(q.who) + "</footer></figure>";
      }).join("") +
      "</div></div></div></section>" +

      /* best sellers */
      '<section class="section-tight" id="journal"><div class="wrap">' +
      '<div class="section-head reveal"><div><p class="eyebrow">Most wanted</p><h2 class="display h2 mt-1">The pieces you keep</h2></div>' +
      '<a class="link-arrow" href="shop.html">Shop all ' + icon("right") + "</a></div>" +
      '<div class="pgrid pgrid-4">' +
      best.map(function (p, i) { return productCard(p, { delay: i * 0.06 }); }).join("") +
      "</div></div></section>" +

      /* newsletter */
      '<section class="section-tight" id="service"><div class="wrap"><div class="newsletter reveal">' +
      '<div><p class="eyebrow">The letter</p><h2 class="display h3 mt-1">First look, no noise.</h2>' +
      "<p class=\"muted mt-1\">Early access to small runs, restocks and the occasional note from the studio.</p></div>" +
      '<div><form class="field-row" data-newsletter><input type="email" required placeholder="Email address" aria-label="Email address">' +
      '<button type="submit">Subscribe ' + icon("right") + "</button></form>" +
      "<small>By subscribing you agree to our privacy policy. Unsubscribe anytime.</small></div>" +
      "</div></div></section>"
    );
  }

  /* ------------------------------------------------------------------- shop */

  var shop = { categories: [], sizes: [], colors: [], price: [], sort: "featured", page: 1, q: "", sale: false, newIn: false };
  var PER_PAGE = 12;

  function readShopFromUrl() {
    shop.categories = LOCKED_CATEGORY ? [LOCKED_CATEGORY] : (qs("category") || "").split(",").filter(Boolean);
    shop.sizes = (qs("size") || "").split(",").filter(Boolean);
    shop.colors = (qs("color") || "").split(",").filter(Boolean);
    shop.price = (qs("price") || "").split(",").filter(Boolean);
    shop.sort = qs("sort") || "featured";
    shop.page = clamp(parseInt(qs("page") || "1", 10) || 1, 1, 999);
    shop.q = qs("q") || "";
    shop.sale = qs("sale") === "1";
    shop.newIn = qs("new") === "1";
  }
  function writeShopToUrl() {
    var params = new URLSearchParams();
    if (!LOCKED_CATEGORY && shop.categories.length) params.set("category", shop.categories.join(","));
    if (shop.sizes.length) params.set("size", shop.sizes.join(","));
    if (shop.colors.length) params.set("color", shop.colors.join(","));
    if (shop.price.length) params.set("price", shop.price.join(","));
    if (shop.sort !== "featured") params.set("sort", shop.sort);
    if (shop.page > 1) params.set("page", shop.page);
    if (shop.q) params.set("q", shop.q);
    if (shop.sale) params.set("sale", "1");
    if (shop.newIn) params.set("new", "1");
    var url = location.pathname + (params.toString() ? "?" + params.toString() : "");
    history.replaceState(null, "", url);
  }

  var PRICE_BANDS = [
    { key: "under-75", label: "Under $75", test: function (p) { return p.price < 75; } },
    { key: "75-120", label: "$75 – $120", test: function (p) { return p.price >= 75 && p.price <= 120; } },
    { key: "over-120", label: "Over $120", test: function (p) { return p.price > 120; } }
  ];

  function filteredProducts() {
    var list = PRODUCTS.slice();
    if (shop.newIn) list = list.filter(function (p) { return p.isNew; });
    if (shop.sale) list = list.filter(function (p) { return p.compareAt && p.compareAt > p.price; });
    if (shop.categories.length) list = list.filter(function (p) { return shop.categories.indexOf(p.category) > -1; });
    if (shop.sizes.length) {
      list = list.filter(function (p) {
        return (p.sizes || []).some(function (s) { return shop.sizes.indexOf(s.label) > -1 && s.stock > 0; });
      });
    }
    if (shop.colors.length) {
      list = list.filter(function (p) {
        return (p.colors || []).some(function (c) { return shop.colors.indexOf(c.name) > -1; });
      });
    }
    if (shop.price.length) {
      list = list.filter(function (p) {
        return shop.price.some(function (key) {
          var band = PRICE_BANDS.filter(function (b) { return b.key === key; })[0];
          return band && band.test(p);
        });
      });
    }
    if (shop.q) {
      var q = shop.q.toLowerCase();
      list = list.filter(function (p) {
        return (p.name + " " + p.categoryName + " " + (p.typeName || "") + " " + p.short + " " + (p.tags || []).join(" ")).toLowerCase().indexOf(q) > -1;
      });
    }
    var sorters = {
      featured: function (a, b) { return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || a.name.localeCompare(b.name); },
      newest: function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || a.name.localeCompare(b.name); },
      "price-asc": function (a, b) { return a.price - b.price; },
      "price-desc": function (a, b) { return b.price - a.price; },
      rating: function (a, b) { return ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a); },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    };
    return list.sort(sorters[shop.sort] || sorters.featured);
  }

  function filterSizes() {
    var seen = {};
    departmentProducts().forEach(function (p) { (p.sizes || []).forEach(function (s) { seen[s.label] = true; }); });
    return Object.keys(seen).sort(function (a, b) {
      var order = ["XS", "S", "M", "L", "XL", "2Y", "4Y", "6Y", "8Y", "One size"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }
  function filterColors() {
    var seen = {};
    departmentProducts().forEach(function (p) {
      (p.colors || []).forEach(function (c) { if (!seen[c.name]) seen[c.name] = c.hex; });
    });
    return Object.keys(seen).map(function (name) { return { name: name, hex: seen[name] }; }).slice(0, 14);
  }

  function filtersHTML() {
    var colors = filterColors();
    var catFilter = LOCKED_CATEGORY ? "" :
      '<div class="filter-group"><button class="filter-head" type="button" data-fold>Category ' + icon("down") + "</button>" +
      '<div class="filter-body">' + CATEGORIES.map(function (c) {
        var count = PRODUCTS.filter(function (p) { return p.category === c.slug; }).length;
        return '<label class="check"><input type="checkbox" data-filter="category" value="' + c.slug + '"' +
          (shop.categories.indexOf(c.slug) > -1 ? " checked" : "") + ">" + esc(c.name) + "<em>" + count + "</em></label>";
      }).join("") + "</div></div>";
    return '<div class="filter-close"><strong style="letter-spacing:.2em;font-size:.62rem;text-transform:uppercase">Filters</strong>' +
      '<button class="icon-btn" type="button" data-filters-close aria-label="Close filters">' + icon("close") + "</button></div>" +
      catFilter +
      '<div class="filter-group"><button class="filter-head" type="button" data-fold>Size ' + icon("down") + "</button>" +
      '<div class="filter-body"><div class="size-grid">' + filterSizes().map(function (s) {
        return '<button class="size-chip" type="button" data-filter="size" value="' + esc(s) + '" aria-pressed="' +
          (shop.sizes.indexOf(s) > -1) + '">' + esc(s) + "</button>";
      }).join("") + "</div></div></div>" +
      '<div class="filter-group"><button class="filter-head" type="button" data-fold>Colour ' + icon("down") + "</button>" +
      '<div class="filter-body"><div class="color-grid">' + colors.map(function (c) {
        return '<button class="color-dot" type="button" data-filter="color" value="' + esc(c.name) + '" title="' + esc(c.name) +
          '" aria-label="' + esc(c.name) + '" aria-pressed="' + (shop.colors.indexOf(c.name) > -1) + '" style="background:' + esc(c.hex) + '"></button>';
      }).join("") + "</div></div></div>" +
      '<div class="filter-group"><button class="filter-head" type="button" data-fold>Price ' + icon("down") + "</button>" +
      '<div class="filter-body">' + PRICE_BANDS.map(function (b) {
        return '<label class="check"><input type="checkbox" data-filter="price" value="' + b.key + '"' +
          (shop.price.indexOf(b.key) > -1 ? " checked" : "") + ">" + b.label + "</label>";
      }).join("") + "</div></div>" +
      '<div class="filter-group"><button class="filter-head" type="button" data-fold>Offers ' + icon("down") + "</button>" +
      '<div class="filter-body">' +
      '<label class="check"><input type="checkbox" data-filter="new" value="1"' + (shop.newIn ? " checked" : "") + ">New arrivals only</label>" +
      '<label class="check"><input type="checkbox" data-filter="sale" value="1"' + (shop.sale ? " checked" : "") + ">On sale only</label>" +
      "</div></div>" +
      '<div class="filter-actions"><button class="btn btn-outline" type="button" data-clear-filters>Clear</button>' +
      '<button class="btn btn-solid" type="button" data-filters-close>Apply</button></div>';
  }

  function chipsHTML() {
    var chips = [];
    if (!LOCKED_CATEGORY) {
      shop.categories.forEach(function (c) {
        var cat = CATEGORIES.filter(function (x) { return x.slug === c; })[0];
        chips.push([ "category", c, cat ? cat.name : c ]);
      });
    }
    shop.sizes.forEach(function (s) { chips.push(["size", s, "Size " + s]); });
    shop.colors.forEach(function (c) { chips.push(["color", c, c]); });
    shop.price.forEach(function (p) {
      var band = PRICE_BANDS.filter(function (b) { return b.key === p; })[0];
      chips.push(["price", p, band ? band.label : p]);
    });
    if (shop.sale) chips.push(["sale", "1", "On sale"]);
    if (shop.newIn) chips.push(["new", "1", "New in"]);
    if (!chips.length) return "";
    return '<div class="active-chips">' + chips.map(function (c) {
      return '<button class="chip" type="button" data-chip="' + c[0] + '" data-value="' + esc(c[1]) + '">' +
        esc(c[2]) + " " + icon("close") + "</button>";
    }).join("") + '<button class="chip-clear" type="button" data-clear-filters>Clear all</button></div>';
  }

  function shopResultsHTML() {
    var list = filteredProducts();
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    shop.page = clamp(shop.page, 1, pages);
    var slice = list.slice((shop.page - 1) * PER_PAGE, shop.page * PER_PAGE);
    return '<div class="pgrid pgrid-3" id="productGrid">' +
      (slice.length ? slice.map(function (p, i) { return productCard(p, { delay: i * 0.04 }); }).join("") :
        '<div class="empty-state" style="grid-column:1/-1"><h3>Nothing matches those filters</h3><p>Try removing a colour or size.</p>' +
        '<button class="btn btn-outline mt-3" type="button" data-clear-filters>Clear filters</button></div>') +
      "</div>" +
      (pages > 1 ? '<div class="pagination">' +
        '<button class="step" type="button" data-page="' + (shop.page - 1) + '"' + (shop.page === 1 ? ' aria-disabled="true"' : "") + ">" +
        icon("left") + " Previous</button>" +
        '<div class="pages">' + Array.from({ length: pages }, function (_, i) {
          return '<button class="page-btn" type="button" data-page="' + (i + 1) + '"' + (i + 1 === shop.page ? ' aria-current="page"' : "") + ">" + (i + 1) + "</button>";
        }).join("") + "</div>" +
        '<button class="step" type="button" data-page="' + (shop.page + 1) + '"' + (shop.page === pages ? ' aria-disabled="true"' : "") + ">Next " + icon("right") + "</button></div>" : "");
  }

  function shopCountLabel() {
    var n = filteredProducts().length;
    var label = n === 1 ? "1 piece" : n + " pieces";
    return label;
  }

  function shopTitle() {
    if (shop.categories.length === 1) {
      return (CATEGORIES.filter(function (c) { return c.slug === shop.categories[0]; })[0] || {}).name || "Shop";
    }
    if (shop.categories.length === 0) {
      if (shop.sale) return "Archive sale";
      if (shop.newIn) return "New in";
      if (shop.sort === "rating") return "Top rated";
    }
    return "Shop all";
  }

  function syncShopHeading() {
    var title = shopTitle();
    var h1 = $(".page-head h1");
    if (h1) h1.textContent = title;
    var crumb = $(".page-head .breadcrumb span");
    if (crumb) crumb.textContent = title;
    document.title = title + " — NŪN Atelier";
  }

  function renderShop() {
    readShopFromUrl();
    if (LOCKED_CATEGORY && qs("category")) {
      var clean = new URLSearchParams(location.search);
      clean.delete("category");
      history.replaceState(null, "", location.pathname + (clean.toString() ? "?" + clean.toString() : ""));
    }
    var title = shopTitle();
    var catMeta = LOCKED_CATEGORY ? CATEGORIES.filter(function (c) { return c.slug === LOCKED_CATEGORY; })[0] : null;
    var blurb = catMeta && catMeta.description
      ? catMeta.description
      : "Small-run tailoring in traceable cloth. Filter by size, colour or price.";
    document.title = title + " — NŪN Atelier";
    return '<div class="page-head"><div class="wrap">' +
      '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a>' + icon("right") +
      '<a href="shop.html">Shop</a>' + icon("right") + "<span>" + esc(title) + "</span></nav>" +
      '<div class="page-head-row mt-2"><div><h1 class="display h2">' + esc(title) + "</h1>" +
      '<p class="muted mt-1" style="max-width:52ch">' + esc(blurb) + "</p></div>" +
      '<p class="eyebrow" id="resultCount">' + shopCountLabel() + "</p></div></div></div>" +
      '<div class="wrap shop-layout">' +
      '<aside class="filters" id="filters" aria-label="Filters">' + filtersHTML() + "</aside>" +
      "<div>" +
      '<div class="shop-toolbar"><div class="toolbar-left">' +
      '<button class="filter-toggle" type="button" data-filters-open>' + icon("grid") + " Filter</button>" +
      '<span id="toolbarCount">' + shopCountLabel() + "</span></div>" +
      '<label class="sort-wrap">Sort <select id="sortSelect">' +
      [["featured", "Featured"], ["newest", "Newest"], ["rating", "Top rated"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["name", "Alphabetical"]]
        .map(function (o) { return '<option value="' + o[0] + '"' + (shop.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") +
      "</select></label></div>" +
      '<div id="chipsHost">' + chipsHTML() + "</div>" +
      '<div id="shopResults">' + shopResultsHTML() + "</div>" +
      "</div></div>";
  }

  function syncFilterControls() {
    $$("#filters [data-filter]").forEach(function (el) {
      var kind = el.dataset.filter;
      var value = el.dataset.value || el.value;
      var arr = kind === "category" ? shop.categories : kind === "size" ? shop.sizes : kind === "color" ? shop.colors : shop.price;
      var on = kind === "sale" ? shop.sale : kind === "new" ? shop.newIn : arr.indexOf(value) > -1;
      if (el.tagName === "INPUT") el.checked = on;
      else el.setAttribute("aria-pressed", String(on));
    });
  }

  function refreshShop() {
    var results = $("#shopResults");
    if (!results) return;
    writeShopToUrl();
    syncNav();
    syncShopHeading();
    results.innerHTML = shopResultsHTML();
    var chipsHost = $("#chipsHost");
    if (chipsHost) chipsHost.innerHTML = chipsHTML();
    var label = shopCountLabel();
    var a = $("#resultCount"); if (a) a.textContent = label;
    var b = $("#toolbarCount"); if (b) b.textContent = label;
    syncFilterControls();
    observeReveals(results);
    var grid = $("#productGrid");
    if (grid) {
      var top = grid.getBoundingClientRect().top + window.scrollY - 140;
      if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }

  function toggleFilter(kind, value) {
    var arr = shop[kind === "category" ? "categories" : kind === "size" ? "sizes" : kind === "color" ? "colors" : "price"];
    var i = arr.indexOf(value);
    if (i > -1) arr.splice(i, 1); else arr.push(value);
    shop.page = 1;
    refreshShop();
  }

  /* ---------------------------------------------------------------- product */

  var lightboxImages = [];
  var lightboxIndex = 0;

  function renderProduct() {
    var slug = qs("slug") || PRODUCTS[0].slug;
    var p = BY_SLUG[slug];
    if (!p) {
      return '<div class="wrap section"><div class="empty-state"><h3>Piece not found</h3>' +
        '<p>That style may have sold through.</p><a class="btn btn-outline mt-3" href="shop.html">Back to shop</a></div></div>';
    }
    document.title = p.name + " — NŪN Atelier";
    var images = (p.images && p.images.length ? p.images : [firstImage(p)]);
    var sizes = p.sizes || [];
    var defaultSizeLabel = defaultSize(p);
    var lookImages = ["assets/img/editorial/look-3.jpg", "assets/img/editorial/look-1.jpg"];
    var related = PRODUCTS.filter(function (x) { return x.slug !== p.slug; }).sort(function (a, b) {
      return (a.category === p.category ? -1 : 0) - (b.category === p.category ? -1 : 0);
    }).slice(0, 4);

    return '<div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb">' +
      '<a href="index.html">Home</a>' + icon("right") + '<a href="shop.html">Shop</a>' + icon("right") +
      '<a href="' + categoryHref(p.category) + '">' + esc(p.categoryName) + "</a>" + icon("right") +
      "<span>" + esc(p.name) + "</span></nav></div>" +

      '<div class="wrap pdp">' +
      '<div class="gallery">' +
      '<div class="gallery-thumbs" id="galleryThumbs">' + images.map(function (src, i) {
        return '<button class="gthumb" type="button" data-thumb="' + i + '" aria-current="' + (i === 0) + '">' +
          '<img src="' + src + '" alt="' + esc(p.name) + " view " + (i + 1) + '"></button>';
      }).join("") + "</div>" +
      '<div class="gallery-main" id="galleryMain" role="button" tabindex="0" aria-label="Open image gallery">' +
      '<img id="galleryImg" src="' + images[0] + '" alt="' + esc(p.name) + '">' +
      (p.isNew ? '<span class="badge">New</span>' : "") +
      '<span class="zoom-hint">' + icon("zoom") + " Zoom</span></div></div>" +

      '<div class="pdp-info">' +
      '<div class="pdp-topline"><span>' + esc(p.sku) + " · " + esc(p.typeName || p.categoryName) + "</span>" +
      '<span class="rating-inline" style="text-transform:none;letter-spacing:0">' + stars(ratingOf(p)) +
      " <span>(" + reviewsOf(p) + ")</span></span></div>" +
      '<h1 class="display">' + esc(p.name) + "</h1>" +
      '<div class="pdp-price"><span>' + money(p.price) + "</span>" +
      (p.compareAt ? "<s class='muted'>" + money(p.compareAt) + "</s>" : "") +
      (p.compareAt ? '<span class="save">Save ' + money(p.compareAt - p.price) + "</span>" : "") +
      "</div>" +
      '<p class="pdp-desc">' + esc(p.short) + "</p>" +

      '<div class="option-block"><div class="option-head"><span>Colour</span><strong id="colorName">' +
      esc((p.colors && p.colors[0] && p.colors[0].name) || "Natural") + "</strong></div>" +
      '<div class="color-row" id="colorRow">' + (p.colors || []).map(function (c, i) {
        return '<button class="color-btn" type="button" data-color="' + esc(c.name) + '" aria-label="' + esc(c.name) +
          '" aria-pressed="' + (i === 0) + '" style="background:' + esc(c.hex) + '">' +
          (i === 0 ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>' : "") + "</button>";
      }).join("") + "</div></div>" +

      '<div class="option-block"><div class="option-head"><span>Size</span><strong id="sizeGuideLink" style="font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;text-decoration:underline;text-underline-offset:3px">Size guide</strong></div>' +
      '<div class="size-row" id="sizeRow">' + sizes.map(function (s) {
        return '<button class="size-btn" type="button" data-size="' + esc(s.label) + '" aria-pressed="' +
          (s.label === defaultSizeLabel) + '"' + (s.stock <= 0 ? " disabled" : "") + ">" + esc(s.label) + "</button>";
      }).join("") + "</div>" +
      '<p class="stock-line" id="stockLine"></p></div>' +

      '<div class="buy-row">' +
      '<div class="qty"><button type="button" data-pdp-qty="-1" aria-label="Decrease quantity">' + icon("minus") + "</button>" +
      '<span id="pdpQty">1</span><button type="button" data-pdp-qty="1" aria-label="Increase quantity">' + icon("plus") + "</button></div>" +
      '<button class="btn btn-solid" type="button" id="addToBag">Add to bag — ' + money(p.price) + "</button>" +
      '<button class="wish-btn" type="button" id="wishBtn" aria-pressed="false" aria-label="Save to wishlist">' + icon("heart") + "</button>" +
      "</div>" +

      '<ul class="trust-row">' +
      "<li>" + icon("truck") + "<span>Free shipping over $250</span></li>" +
      "<li>" + icon("refresh") + "<span>30-day returns</span></li>" +
      "<li>" + icon("shield") + "<span>Secure checkout</span></li>" +
      "</ul>" +

      '<div class="mt-3">' +
      accordion("Details", "<p>" + esc(p.description) + "</p>") +
      accordion("Material &amp; care", "<p><strong style=\"color:var(--ink)\">" + esc(p.material) + "</strong></p><p>" + esc(p.care) + "</p>") +
      accordion("Shipping &amp; returns", "<p>Dispatched within 48 hours from Porto. Complimentary shipping over $250, a flat $12 below that. Returns accepted within 30 days, unworn and with tags.</p>") +
      accordion("Size &amp; fit", "<ul>" + sizes.map(function (s) {
        return "<li><span>" + esc(s.label) + "</span><span>" + (s.stock > 0 ? s.stock + " in stock" : "Sold out") + "</span></li>";
      }).join("") + "</ul>") +
      "</div></div></div>" +

      '<div class="wrap"><div class="look-band"><div class="section-head" style="margin-bottom:0"><div>' +
      '<p class="eyebrow">Styled here</p><h2 class="display h3 mt-1">On the model</h2></div>' +
      '<a class="link-arrow" href="shop.html">Shop the looks ' + icon("right") + "</a></div>" +
      '<div class="look-grid">' + lookImages.map(function (src, i) {
        return "<figure><img src=\"" + src + "\" alt=\"Look " + (i + 1) + "\" loading=\"lazy\"><figcaption>Look " + (i + 1) + "</figcaption></figure>";
      }).join("") + "</div></div></div>" +

      '<section class="section-tight"><div class="wrap">' +
      '<div class="section-head"><div><p class="eyebrow">You may also like</p><h2 class="display h3 mt-1">Pairs well with</h2></div>' +
      '<a class="link-arrow" href="' + categoryHref(p.category) + '">More ' + esc(p.categoryName) + " " + icon("right") + "</a></div>" +
      '<div class="pgrid pgrid-4">' + related.map(function (r) { return productCard(r); }).join("") + "</div></section>" +

      '<div class="mobile-buy"><div class="info"><p>' + esc(p.name) + "</p><span>" + money(p.price) + '</span></div>' +
      '<button class="btn btn-solid" type="button" id="mobileAdd">Add to bag</button></div>';
  }

  function accordion(title, bodyHTML) {
    return '<div class="accordion"><button class="acc-head" type="button" data-acc>' + title + icon("plus") + "</button>" +
      '<div class="acc-body"><div>' + bodyHTML + "</div></div></div>";
  }

  function initProduct(p) {
    if (!p) return;
    var images = p.images && p.images.length ? p.images : [firstImage(p)];
    var state = { size: defaultSize(p), color: (p.colors && p.colors[0] && p.colors[0].name) || "Natural", qty: 1 };

    function updateStock() {
      var el = $("#stockLine");
      if (!el) return;
      var stock = sizeStock(p, state.size);
      el.innerHTML = stock > 0
        ? "<b>In stock</b> — " + stock + " left in " + esc(state.size) + ", ships in 48h"
        : "<b style=\"color:var(--danger)\">Sold out</b> in " + esc(state.size) + " — try another size";
      var add = $("#addToBag");
      if (add) add.disabled = stock <= 0;
      var mob = $("#mobileAdd");
      if (mob) mob.disabled = stock <= 0;
    }
    updateStock();

    $$("#sizeRow .size-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.size = btn.dataset.size;
        $$("#sizeRow .size-btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        updateStock();
      });
    });
    $$("#colorRow .color-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.color = btn.dataset.color;
        $$("#colorRow .color-btn").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
          var tick = $("svg", b);
          if (b === btn && !tick) b.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>');
          if (b !== btn && tick) tick.remove();
        });
        var name = $("#colorName");
        if (name) name.textContent = state.color;
      });
    });
    $$("[data-pdp-qty]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.qty = clamp(state.qty + Number(btn.dataset.pdpQty), 1, 10);
        $("#pdpQty").textContent = state.qty;
      });
    });
    function add() {
      if (sizeStock(p, state.size) <= 0) return;
      addToCart(p.slug, state.size, state.color, state.qty);
    }
    var addBtn = $("#addToBag");
    if (addBtn) addBtn.addEventListener("click", add);
    var mob = $("#mobileAdd");
    if (mob) mob.addEventListener("click", add);

    var wish = $("#wishBtn");
    if (wish) {
      wish.addEventListener("click", function () {
        var on = wish.getAttribute("aria-pressed") === "true";
        wish.setAttribute("aria-pressed", String(!on));
        toast(on ? "Removed from saved pieces" : "Saved for later");
      });
    }

    $$("[data-acc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var acc = btn.parentElement;
        var wasOpen = acc.classList.contains("open");
        $$(".accordion.open").forEach(function (a) { a.classList.remove("open"); });
        if (!wasOpen) acc.classList.add("open");
      });
    });
    var first = $(".accordion");
    if (first) first.classList.add("open");

    function setImage(i) {
      lightboxIndex = (i + images.length) % images.length;
      var main = $("#galleryImg");
      if (main) main.src = images[lightboxIndex];
      $$("#galleryThumbs .gthumb").forEach(function (t, idx) {
        t.setAttribute("aria-current", String(idx === lightboxIndex));
      });
      var lbImg = $("#lightboxImg");
      if (lbImg) lbImg.src = images[lightboxIndex];
      var count = $("#lightboxCount");
      if (count) count.textContent = (lightboxIndex + 1) + " / " + images.length;
    }
    lightboxImages = images;
    setImage(0);
    $$("#galleryThumbs .gthumb").forEach(function (t) {
      t.addEventListener("click", function () { setImage(Number(t.dataset.thumb)); });
    });
    var main = $("#galleryMain");
    if (main) {
      main.addEventListener("click", function () {
        $("#lightbox").classList.add("open");
        $("#lightbox").setAttribute("aria-hidden", "false");
        document.body.classList.add("no-scroll");
        setImage(lightboxIndex);
      });
      main.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); main.click(); }
      });
    }
  }

  /* -------------------------------------------------------------------- cart */

  function renderCartPage() {
    var host = $("#cartLines");
    var side = $("#cartSide");
    if (!host || !side) return;
    var bagLabel = $("#bagCount");
    if (bagLabel) bagLabel.textContent = cartCount() + (cartCount() === 1 ? " piece" : " pieces");
    if (!cart.length) {
      host.innerHTML = '<div class="empty-state" style="border:0;padding:2rem 0;text-align:start">' +
        '<p class="eyebrow">Your bag</p><h3 class="mt-1">Nothing in the bag yet</h3>' +
        '<p>Start with the pieces the studio reaches for.</p>' +
        '<a class="btn btn-solid mt-3" href="shop.html">Shop the collection</a></div>';
      side.innerHTML = "";
      return;
    }
    host.innerHTML = cart.map(function (l, i) {
      var p = BY_SLUG[l.slug];
      return '<div class="cart-line"><a href="product.html?slug=' + p.slug + '"><img src="' + firstImage(p) + '" alt="' + esc(p.name) + '"></a>' +
        "<div><h3><a href=\"product.html?slug=" + p.slug + "\">" + esc(p.name) + "</a></h3>" +
        '<p class="meta">' + esc(l.color) + " · Size " + esc(l.size) + " · " + esc(p.sku) + "</p>" +
        '<div class="line-controls"><div class="qty-mini"><button type="button" data-qty="' + i + '" data-delta="-1" aria-label="Decrease">−</button>' +
        "<span>" + l.qty + "</span><button type=\"button\" data-qty=\"" + i + '" data-delta="1" aria-label="Increase">+</button></div>' +
        '<button class="remove-line" type="button" data-remove="' + i + '">Remove</button></div></div>' +
        '<p class="price" style="align-self:start">' + money(p.price * l.qty) + "</p></div>";
    }).join("");

    side.innerHTML = "<h2>Order summary</h2>" +
      '<div class="summary-row"><span>Subtotal (' + cartCount() + (cartCount() === 1 ? " item" : " items") + ")</span><span>" + money(cartSubtotal()) + "</span></div>" +
      (coupon ? '<div class="summary-row"><span>Discount · ' + esc(coupon.code) + ' <button type="button" class="remove-line" data-remove-coupon>Remove</button></span><span>−' + money(cartDiscount()) + "</span></div>" : "") +
      '<div class="summary-row"><span>Shipping</span><span>' + (cartShipping() === 0 ? "Free" : money(cartShipping())) + "</span></div>" +
      '<div class="summary-total"><span>Total</span><span>' + money(cartTotal()) + "</span></div>" +
      '<form class="coupon-row" data-coupon><input type="text" placeholder="Coupon code" aria-label="Coupon code" value="' + (coupon ? esc(coupon.code) : "") + '">' +
      "<button type=\"submit\">Apply</button></form>" +
      '<p class="muted" style="font-size:.64rem;margin-top:.5rem">Try <strong>NUN10</strong> or <strong>WELCOME5</strong>.</p>' +
      '<button class="btn btn-solid btn-block" type="button" id="checkoutBtn">Checkout</button>' +
      '<a class="btn btn-outline btn-block" href="shop.html" style="margin-top:.5rem">Continue shopping</a>' +
      '<p class="muted" style="font-size:.66rem;margin-top:.9rem">Taxes included. ' +
      (cartSubtotal() >= FREE_SHIPPING ? "Complimentary shipping applied." : "Add " + money(FREE_SHIPPING - cartSubtotal()) + " for complimentary shipping.") +
      "</p>";
  }

  function initCartPage() {
    renderCartPage();
  }

  /* --------------------------------------------------------------- search UI */

  function renderSearchResults(query) {
    var host = $("#searchResults");
    var hint = $("#searchHint");
    if (!host) return;
    var q = query.trim().toLowerCase();
    if (!q) {
      host.innerHTML = "";
      if (hint) hint.textContent = "Popular: knitwear · linen · denim · outerwear";
      return;
    }
    var found = PRODUCTS.filter(function (p) {
      var hay = [
        p.name, p.nameAr, p.categoryName, p.categoryNameAr, p.typeName, p.typeNameAr,
        p.short, p.shortAr, (p.tags || []).join(" "),
        (p.colors || []).map(function (c) { return c.name + " " + (c.nameAr || ""); }).join(" ")
      ].join(" ");
      return hay.toLowerCase().indexOf(q) > -1;
    }).slice(0, 8);
    if (hint) hint.textContent = found.length + (found.length === 1 ? " result" : " results") + " for “" + query.trim() + "”";
    host.innerHTML = found.length ? found.map(function (p) {
      return '<a class="search-result" href="product.html?slug=' + p.slug + '">' +
        '<img src="' + firstImage(p) + '" alt=""><div><h4>' + esc(p.name) + "</h4><p>" + esc(p.typeName && p.typeName !== p.categoryName ? p.typeName + " · " + p.categoryName : p.categoryName) + "</p></div>" +
        '<span class="price">' + money(p.price) + "</span></a>";
    }).join("") : '<p class="muted">No pieces match that search. Try “shirt” or “wool”.</p>';
  }

  /* ------------------------------------------------------------------ reveal */

  var observer = null;
  function observeReveals(root) {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal", root || document).forEach(function (el) { el.classList.add("in"); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    }
    $$(".reveal", root || document).forEach(function (el) {
      if (!el.classList.contains("in")) observer.observe(el);
    });
  }

  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.textContent = el.dataset.count; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = Number(el.dataset.count);
        var start = performance.now();
        function step(now) {
          var t = Math.min(1, (now - start) / 1400);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(target * eased);
          if (t < 1) requestAnimationFrame(step);
          else el.textContent = target;
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  function initQuotes() {
    var stage = $("#quoteStage");
    if (!stage) return;
    var quotes = $$(".quote", stage);
    var dots = $$("#quoteDots button");
    var index = 0;
    var timer;
    function go(i) {
      index = i % quotes.length;
      quotes.forEach(function (q, idx) { q.classList.toggle("active", idx === index); });
      dots.forEach(function (d, idx) { d.classList.toggle("active", idx === index); });
    }
    function play() {
      clearInterval(timer);
      timer = setInterval(function () { go(index + 1); }, 5600);
    }
    dots.forEach(function (d, i) {
      d.addEventListener("click", function () { go(i); play(); });
    });
    play();
  }

  function initMarquee() {
    $$(".announce").forEach(function (bar) {
      bar.addEventListener("mouseenter", function () {
        var t = $(".announce-track", bar);
        if (t) t.style.animationPlayState = "paused";
      });
      bar.addEventListener("mouseleave", function () {
        var t = $(".announce-track", bar);
        if (t) t.style.animationPlayState = "running";
      });
    });
  }

  function initScrollFX() {
    var header = $("#siteHeader");
    var last = window.scrollY;
    var ticking = false;
    function onScroll() {
      var y = window.scrollY;
      if (header) {
        header.classList.toggle("scrolled", y > 8);
        if (y > 320 && y > last + 6) header.classList.add("hidden");
        else if (y < last - 6 || y < 120) header.classList.remove("hidden");
      }
      last = y;
      parallax();
      ticking = false;
    }
    function parallax() {
      $$("[data-parallax]").forEach(function (img) {
        var rect = img.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        var progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        img.style.transform = "translateY(" + (progress * -32).toFixed(1) + "px) scale(1.12)";
      });
    }
    window.addEventListener("resize", parallax);
    parallax();
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();
  }

  /* --------------------------------------------------------------- shop menu */

  var shopNav = null;
  var shopNavTimer = null;

  function setShopNav(open) {
    if (shopNavTimer) { clearTimeout(shopNavTimer); shopNavTimer = null; }
    if (!shopNav) return;
    shopNav.classList.toggle("open", open);
    var btn = $("[data-shop-toggle]", shopNav);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function initShopNav() {
    shopNav = $("[data-shop-nav]");
    if (!shopNav) return;
    var btn = $("[data-shop-toggle]", shopNav);
    var desktop = window.matchMedia("(min-width: 980px)");

    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        setShopNav(!shopNav.classList.contains("open"));
      });
    }
    shopNav.addEventListener("mouseenter", function () {
      if (desktop.matches) setShopNav(true);
    });
    shopNav.addEventListener("mouseleave", function () {
      if (!desktop.matches) return;
      if (shopNavTimer) clearTimeout(shopNavTimer);
      shopNavTimer = setTimeout(function () { setShopNav(false); }, 160);
    });
    shopNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setShopNav(false);
    });
    document.addEventListener("click", function (e) {
      if (shopNav.classList.contains("open") && !shopNav.contains(e.target)) setShopNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && shopNav.classList.contains("open")) {
        setShopNav(false);
        if (btn) btn.focus();
      }
    });
    window.addEventListener("scroll", function () {
      if (shopNav.classList.contains("open")) setShopNav(false);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ wiring */

  function initGlobal() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-theme-toggle]")) { e.preventDefault(); toggleTheme(); return; }
      if (t.closest("[data-lang-toggle]")) { e.preventDefault(); toggleLang(); return; }
      var open = t.closest("[data-open]");
      if (open) { e.preventDefault(); openPanel(open.dataset.open); return; }
      if (t.closest("[data-close-all]")) { closeAll(); return; }

      var quick = t.closest("[data-quick-add]");
      if (quick) {
        e.preventDefault();
        var p = BY_SLUG[quick.dataset.quickAdd];
        if (p) addToCart(p.slug, defaultSize(p), (p.colors && p.colors[0] && p.colors[0].name) || "Natural", 1);
        return;
      }
      var qtyBtn = t.closest("[data-qty]");
      if (qtyBtn) {
        var idx = Number(qtyBtn.dataset.qty);
        var line = cart[idx];
        if (line) setQty(idx, line.qty + Number(qtyBtn.dataset.delta));
        return;
      }
      var remove = t.closest("[data-remove]");
      if (remove) { removeLine(Number(remove.dataset.remove)); return; }
      var rail = t.closest("[data-rail]");
      if (rail) {
        var track = $("#newRail");
        if (track) track.scrollBy({ left: Number(rail.dataset.rail) * Math.min(520, track.clientWidth * 0.8), behavior: "smooth" });
        return;
      }
      var fold = t.closest("[data-fold]");
      if (fold) { fold.parentElement.classList.toggle("closed"); return; }
      var filtersOpen = t.closest("[data-filters-open]");
      if (filtersOpen) {
        var f = $("#filters");
        if (f) { f.classList.add("open"); document.body.classList.add("no-scroll"); }
        return;
      }
      var filtersClose = t.closest("[data-filters-close]");
      if (filtersClose) {
        var panel = $("#filters");
        if (panel) { panel.classList.remove("open"); document.body.classList.remove("no-scroll"); }
        return;
      }
      var filt = t.closest("[data-filter]");
      if (filt && filt.tagName !== "INPUT") {
        toggleFilter(filt.dataset.filter, filt.dataset.value || filt.value);
        return;
      }
      var chip = t.closest("[data-chip]");
      if (chip) {
        if (chip.dataset.chip === "sale") { shop.sale = false; shop.page = 1; refreshShop(); }
        else if (chip.dataset.chip === "new") { shop.newIn = false; shop.page = 1; refreshShop(); }
        else toggleFilter(chip.dataset.chip, chip.dataset.value);
        return;
      }
      if (t.closest("[data-clear-filters]")) {
        shop.categories = LOCKED_CATEGORY ? [LOCKED_CATEGORY] : []; shop.sizes = []; shop.colors = []; shop.price = []; shop.sale = false; shop.newIn = false; shop.page = 1;
        var aside = $("#filters");
        if (aside) aside.innerHTML = filtersHTML();
        refreshShop();
        return;
      }
      var pageBtn = t.closest("[data-page]");
      if (pageBtn && pageBtn.closest(".pagination")) {
        if (pageBtn.getAttribute("aria-disabled") === "true") return;
        shop.page = Number(pageBtn.dataset.page);
        refreshShop();
        return;
      }
      var couponRemove = t.closest("[data-remove-coupon]");
      if (couponRemove) { saveCoupon(null); renderCartPage(); toast("Coupon removed"); return; }
      if (t.closest("#checkoutBtn")) {
        toast("This is a static storefront — checkout is disabled.");
        return;
      }
      var qbtn = t.closest("[data-quote]");
      if (qbtn) return; /* handled locally */
      var lightBtn = t.closest("[data-light]");
      if (lightBtn) {
        var imgs = lightboxImages.length ? lightboxImages : [];
        if (imgs.length) {
          lightboxIndex = (lightboxIndex + (lightBtn.dataset.light === "next" ? 1 : -1) + imgs.length) % imgs.length;
          var lb = $("#lightboxImg");
          if (lb) lb.src = imgs[lightboxIndex];
          var c = $("#lightboxCount");
          if (c) c.textContent = (lightboxIndex + 1) + " / " + imgs.length;
        }
        return;
      }
      var sizeGuide = t.closest("#sizeGuideLink");
      if (sizeGuide) {
        var acc = $$("[data-acc]").filter(function (b) { return /Size/i.test(b.textContent); })[0];
        if (acc) {
          acc.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(function () { acc.parentElement.classList.add("open"); }, 300);
        }
        return;
      }
    });

    document.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "sortSelect") {
        shop.sort = t.value;
        shop.page = 1;
        refreshShop();
      }
      if (t.matches('[data-filter="category"], [data-filter="price"]')) {
        toggleFilter(t.dataset.filter, t.value);
      }
      if (t.matches('[data-filter="sale"]')) {
        shop.sale = t.checked;
        shop.page = 1;
        refreshShop();
      }
      if (t.matches('[data-filter="new"]')) {
        shop.newIn = t.checked;
        shop.page = 1;
        refreshShop();
      }
    });

    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (form.matches("[data-newsletter]")) {
        e.preventDefault();
        var input = $("input", form);
        if (input && input.value) {
          toast("You’re on the list — welcome to the studio.");
          form.reset();
        }
        return;
      }
      if (form.matches("[data-coupon]")) {
        e.preventDefault();
        var code = ($("input", form).value || "").trim().toUpperCase();
        var map = { NUN10: 0.1, WELCOME5: 0.05 };
        if (map[code]) {
          saveCoupon({ code: code, rate: map[code] });
          renderCartPage();
          toast(code + " applied");
        } else {
          toast("That code isn’t valid");
        }
        return;
      }
    });

    var searchInput = $("#searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", function () { renderSearchResults(searchInput.value); });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && $("#lightbox").classList.contains("open")) {
        var dir = e.key === "ArrowRight" ? 1 : -1;
        lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
        $("#lightboxImg").src = lightboxImages[lightboxIndex];
        $("#lightboxCount").textContent = (lightboxIndex + 1) + " / " + lightboxImages.length;
      }
    });

    /* close mobile menu when a link is tapped */
    $$("#mobilePanel a").forEach(function (a) { a.addEventListener("click", function () { closeAll(true); }); });

    initScrollFX();
    initMarquee();
  }

  /* -------------------------------------------------------------------- boot */

  function navKey() {
    var page = document.body.dataset.page || "home";
    if (page === "category") return LOCKED_CATEGORY;
    if (page === "shop") {
      if (qs("new") === "1") return "new";
      return "shop";
    }
    if (page === "product") {
      var item = BY_SLUG[qs("slug")];
      if (item && CATEGORIES.some(function (c) { return c.slug === item.category; })) return "shop";
      return "shop";
    }
    return "";
  }

  function syncNav() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var key = navKey();
    var trigger = nav.querySelector("[data-shop-toggle]");
    if (trigger) {
      var shopActive = key === "shop" || key === "new" || CATEGORIES.some(function (c) { return c.slug === key; });
      trigger.classList.toggle("is-active", shopActive);
    }
    [].forEach.call(nav.querySelectorAll("a"), function (a) {
      if (a.classList.contains("mega-promo") || a.classList.contains("mega-all")) { a.removeAttribute("aria-current"); return; }
      var href = a.getAttribute("href") || "";
      var match = key === "new" ? (href.indexOf("new=1") > -1 || href.indexOf("sort=newest") > -1)
        : key === "shop" ? href === "shop.html"
        : key ? href === key + ".html" : false;
      if (match) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function boot() {
    var page = document.body.dataset.page || "home";
    var active = navKey();
    var app = $("#app");
    if (!app) return;

    bootI18n();
    mountChrome(active);
    initShopNav();
    syncNav();
    updateChromeButtons();

    if (page === "home") {
      app.innerHTML = renderHome();
      initCounters();
      initQuotes();
    } else if (page === "shop" || page === "category") {
      app.innerHTML = renderShop();
    } else if (page === "product") {
      app.innerHTML = renderProduct();
      initProduct(BY_SLUG[qs("slug")] || PRODUCTS[0]);
    } else if (page === "cart") {
      app.innerHTML = '<div class="page-head"><div class="wrap">' +
        '<nav class="breadcrumb"><a href="index.html">Home</a>' + icon("right") + "<span>Bag</span></nav>" +
        '<div class="page-head-row mt-2"><h1 class="display h2">Your bag</h1>' +
        '<p class="eyebrow" id="bagCount">' + cartCount() + " pieces</p></div></div></div>" +
        '<div class="wrap cart-layout"><div id="cartLines"></div><aside class="cart-side" id="cartSide"></aside></div>';
      initCartPage();
    }

    if (page === "shop" || page === "category") {
      /* keep results fresh on back/forward */
      window.addEventListener("popstate", function () {
        readShopFromUrl();
        app.innerHTML = renderShop();
        observeReveals(app);
      });
    }

    observeReveals(app);
    initGlobal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
