/* Пара Палок — общая логика сайта (главная и меню). Без зависимостей. */
(function () {
  "use strict";

  const DATA = window.PARA_PALOK_MENU;
  if (!DATA) return;

  const BASE = document.documentElement.getAttribute("data-base") || "";
  const IMG_DIR = BASE + "assets/images/menu/";
  const MENU_URL = BASE + "menu/";
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionQuery.matches;
  motionQuery.addEventListener("change", (e) => { reduceMotion = e.matches; });

  const fmtPrice = (n) => n.toLocaleString("ru-RU") + " " + DATA.currency;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function plural(n, forms) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
    return forms[2];
  }

  /* ---------- карточка блюда ---------- */
  function dishCard(item, opts) {
    opts = opts || {};
    const hasImg = Boolean(item.image);
    const classes = ["dish"];
    if (!hasImg) classes.push("dish--noimg");
    if (item.wide && !opts.noWide) classes.push("dish--wide");

    let media = "";
    if (hasImg) {
      const src = IMG_DIR + item.image + ".webp";
      const small = IMG_DIR + item.image + "-480.webp";
      const sizes = opts.sizes || "(max-width: 420px) 92vw, (max-width: 760px) 46vw, (max-width: 1100px) 30vw, 300px";
      const pos = item.imagePosition ? ' style="object-position:' + esc(item.imagePosition) + '"' : "";
      const eager = opts.eager ? ' fetchpriority="high"' : ' loading="lazy"';
      media =
        '<div class="dish__media"><img src="' + src + '" srcset="' + small + " 480w, " + src + ' 1000w" sizes="' + sizes + '"' +
        ' alt="' + esc(item.name) + '" width="1000" height="750" decoding="async"' + eager + pos + "></div>";
    }
    const desc = item.description ? '<p class="dish__desc">' + esc(item.description) + "</p>" : "";
    const portion = item.portion ? '<span class="dish__portion">' + esc(item.portion).replace(/ /g, " ") + "</span>" : "<span></span>";
    return (
      '<article class="' + classes.join(" ") + '" data-id="' + item.id + '">' +
      '<div class="dish__shape">' +
      media +
      '<span class="dish__toast" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Добавлено в корзину</span>' +
      '<div class="dish__body">' +
      '<h3 class="h-card dish__name"><button class="dish__open" type="button" data-open="' + item.id + '" aria-haspopup="dialog">' + esc(item.name) + "</button></h3>" +
      desc +
      '<div class="dish__meta">' + portion + '<span class="dish__price">' + fmtPrice(item.price) + "</span></div>" +
      "</div></div>" +
      '<button class="dish__add" type="button" data-add="' + item.id + '" aria-label="Добавить в корзину: ' + esc(item.name) + '">' +
      '<svg class="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
      '<svg class="i-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' +
      "</button></article>"
    );
  }

  /* ---------- шапка: мобильное меню ---------- */
  function initHeader() {
    const toggle = document.querySelector(".burger");
    const drawer = document.getElementById("drawer");
    if (!toggle || !drawer) return;
    const set = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть навигацию" : "Открыть навигацию");
      drawer.dataset.open = String(open);
    };
    toggle.addEventListener("click", () => set(toggle.getAttribute("aria-expanded") !== "true"));
    drawer.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.dataset.open === "true") { set(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 1025px)").addEventListener("change", () => set(false));
  }

  /* ---------- плавающая кнопка «Связаться» ---------- */
  function initFab() {
    const fab = document.querySelector(".fab");
    if (!fab) return;
    const btn = fab.querySelector(".fab__btn");
    const set = (open) => {
      fab.dataset.open = String(open);
      btn.setAttribute("aria-expanded", String(open));
    };
    btn.addEventListener("click", () => set(fab.dataset.open !== "true"));
    // «Связаться» в шапке раскрывает ту же кнопку
    document.querySelectorAll("[data-fab-open]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        set(true);
        const first = fab.querySelector(".fab__menu a");
        if (first) first.focus({ preventScroll: true });
      })
    );
    document.addEventListener("click", (e) => {
      if (fab.dataset.open === "true" && !fab.contains(e.target)) set(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && fab.dataset.open === "true") { set(false); btn.focus(); }
    });
  }

  /* ---------- корзина: счётчик в шапке (без оформления заказа) ---------- */
  const CART_KEY = "parapalok-cart";
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (e) { return {}; }
  }
  function cartTotal(cart) {
    return Object.keys(cart).reduce((n, k) => n + cart[k], 0);
  }
  // подпись кнопки «+» учитывает, сколько порций уже в корзине
  function syncCards() {
    const cart = readCart();
    document.querySelectorAll(".dish[data-id]").forEach((card) => {
      const n = cart[card.dataset.id] || 0;
      const add = card.querySelector(".dish__add");
      const open = card.querySelector(".dish__open");
      if (add && open) add.setAttribute("aria-label", n > 0 ? "Добавить ещё порцию: " + open.textContent + ", в корзине " + n : "Добавить в корзину: " + open.textContent);
    });
  }
  // зелёная плашка «Добавлено в корзину» на 1,6 с: в карточке, а если добавили не с карточки — внизу экрана
  const TOAST_MS = 1600;
  function flashAdded(btn) {
    const card = btn && btn.closest(".dish");
    let el = card && card.querySelector(".dish__toast");
    if (!el) {
      el = document.querySelector(".add-toast");
      if (!el) {
        el = document.createElement("div");
        el.className = "add-toast";
        el.setAttribute("aria-hidden", "true");
        el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Добавлено в корзину';
      }
      // внутри открытого окна плашка должна быть в нём, иначе её закроет затемнение
      const host = document.querySelector("dialog[open]") || document.body;
      if (el.parentElement !== host) host.appendChild(el);
    }
    el.classList.remove("is-on"); void el.offsetWidth; el.classList.add("is-on");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-on"), TOAST_MS);
  }
  function renderCartBadge() {
    syncCards();
    const n = cartTotal(readCart());
    document.querySelectorAll(".cart").forEach((btn) => {
      btn.setAttribute("aria-label", "Корзина, " + n + " " + plural(n, ["позиция", "позиции", "позиций"]));
      const badge = btn.querySelector(".cart__n");
      if (badge) { badge.textContent = n; badge.dataset.zero = String(n === 0); }
    });
  }
  let announce = () => {};
  const cartListeners = [];
  function writeCart(cart) {
    Object.keys(cart).forEach((k) => { if (!(cart[k] > 0)) delete cart[k]; });
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) { /* приватный режим */ }
    renderCartBadge();
    cartListeners.forEach((fn) => fn());
  }
  function addToCart(id, btn) {
    const item = DATA.items.find((i) => String(i.id) === String(id));
    const cart = readCart();
    cart[id] = (cart[id] || 0) + 1;
    writeCart(cart);
    announce((item ? item.name : "Блюдо") + " — в корзине");
    flashAdded(btn);
    if (btn) {
      btn.dataset.added = "true";
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.dataset.added = "false"; }, 1200);
    }
  }
  function initCart() {
    renderCartBadge();
    const live = document.createElement("p");
    live.className = "visually-hidden";
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);
    announce = (t) => { live.textContent = t; };
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (btn) addToCart(btn.dataset.add, btn);
    });
    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) { renderCartBadge(); cartListeners.forEach((fn) => fn()); }
    });
  }

  /* ---------- корзина: панель справа ---------- */
  // Номер WhatsApp для отправки заказа (тот же, что в ссылках мессенджеров)
  const ORDER_WA = "79164424403";
  const ORDER_TG = "https://t.me/+79164424403";
  const ORDER_MAX = "https://max.ru/u/f9LHodD0cOLRS5Lga28QyCL-2Y_Gy77-2vk_UNrNaWI2NBUG1sOvjYheSIU";
  // значок мессенджера берём из уже размеченных кнопок на странице, чтобы не дублировать SVG
  const msgrIcon = (kind) => {
    const svg = document.querySelector(".msgr__i--" + kind + " svg");
    return svg ? svg.outerHTML : "";
  };
  // Телефон для звонков — из макета, заменить на реальный перед публикацией
  const CALL_TEL = "74951234567";
  // доставка дальше 1 км — только при заказе от этой суммы
  const FAR_MIN = 2500;
  function deliveryNote(sum) {
    const ok = sum >= FAR_MIN;
    const left = FAR_MIN - sum;
    const k = Math.min(sum / FAR_MIN, 1);
    return '<div class="cart-deliv' + (ok ? " is-ok" : "") + '">' +
      '<p class="cart-deliv__line"><strong>Бесплатно</strong> до&nbsp;1&nbsp;км и&nbsp;по&nbsp;ЖК на&nbsp;Донецкой, 34к1&nbsp;— на&nbsp;любую сумму.</p>' +
      (ok
        ? '<p class="cart-deliv__line">Доставка дальше 1&nbsp;км доступна: до&nbsp;5&nbsp;км&nbsp;— 200&nbsp;₽, дальше&nbsp;— по&nbsp;договорённости.</p>'
        : '<p class="cart-deliv__line">Дальше 1&nbsp;км привезём <span class="min-badge">при заказе от&nbsp;' + fmtPrice(FAR_MIN).replace(/ /g, "&nbsp;") + '</span>. Добавьте ещё на&nbsp;<strong>' + fmtPrice(left) + "</strong>.</p>") +
      '<div class="cart-deliv__bar" role="progressbar" aria-label="Сумма до доставки дальше 1 км" aria-valuemin="0" aria-valuemax="' + FAR_MIN + '" aria-valuenow="' + Math.min(sum, FAR_MIN) + '"><span style="transform:scaleX(' + k.toFixed(3) + ')"></span></div>' +
      "</div>";
  }
  function initCartPanel() {
    const openers = document.querySelectorAll(".cart");
    if (!openers.length || !window.bootstrap || !bootstrap.Offcanvas) return;
    // Bootstrap Offcanvas справа; элемент создаётся один раз, при «+»/«−» меняется только содержимое
    const box = document.createElement("div");
    box.className = "offcanvas offcanvas-end cart-panel";
    box.id = "cart-panel";
    box.tabIndex = -1;
    box.setAttribute("aria-labelledby", "cart-panel-title");
    document.body.appendChild(box);
    const panel = bootstrap.Offcanvas.getOrCreateInstance(box);
    let opener = null;
    let orderText = "";

    function lines() {
      const cart = readCart();
      return Object.keys(cart)
        .map((id) => ({ item: DATA.items.find((i) => String(i.id) === id), qty: cart[id] }))
        .filter((l) => l.item && l.qty > 0);
    }
    function render() {
      const ls = lines();
      const count = ls.reduce((n, l) => n + l.qty, 0);
      const sum = ls.reduce((n, l) => n + l.qty * l.item.price, 0);
      const head =
        '<div class="cart-panel__head"><h2 class="cart-panel__title" id="cart-panel-title">Корзина' +
        (count ? '<span>' + count + " " + plural(count, ["позиция", "позиции", "позиций"]) + "</span>" : "") +
        '</h2><button class="cart-panel__close" type="button" data-bs-dismiss="offcanvas" aria-label="Закрыть корзину"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
      if (!ls.length) {
        box.innerHTML = head +
          '<div class="cart-panel__empty"><p>В корзине пока пусто.</p><p class="cart-panel__hint">Добавьте блюда кнопкой «+» на карточке или в окне блюда.</p>' +
          '<a class="btn" href="' + MENU_URL + '">Открыть меню</a></div>';
        return;
      }
      const rows = ls.map((l) => {
        const it = l.item;
        const img = it.image
          ? '<img src="' + IMG_DIR + it.image + '-480.webp" alt="" width="96" height="72" decoding="async"' + (it.imagePosition ? ' style="object-position:' + esc(it.imagePosition) + '"' : "") + ">"
          : '<span class="cart-row__noimg" aria-hidden="true"></span>';
        return '<li class="cart-row" data-id="' + it.id + '">' + img +
          '<div class="cart-row__info"><p class="cart-row__name">' + esc(it.name) + "</p>" +
          (it.portion ? '<p class="cart-row__portion">' + esc(it.portion) + "</p>" : "") +
          '<div class="cart-row__qty" role="group" aria-label="Количество: ' + esc(it.name) + '">' +
          '<button type="button" data-qty="-1" aria-label="Убрать одну порцию">−</button>' +
          '<span aria-live="polite">' + l.qty + "</span>" +
          '<button type="button" data-qty="1" aria-label="Добавить порцию">+</button></div></div>' +
          '<div class="cart-row__side"><p class="cart-row__sum">' + fmtPrice(it.price * l.qty) + "</p>" +
          '<button class="cart-row__del" type="button" data-del aria-label="Удалить из корзины: ' + esc(it.name) + '">Удалить</button></div></li>';
      }).join("");
      const text = orderText = "Здравствуйте! Хочу заказать:\n" +
        ls.map((l) => "— " + l.item.name + " × " + l.qty + " = " + fmtPrice(l.item.price * l.qty)).join("\n") +
        "\nИтого: " + fmtPrice(sum) + " (без учёта доставки)" +
        "\nАдрес доставки: ";
      box.innerHTML = head +
        '<ul class="cart-panel__list">' + rows + "</ul>" +
        '<div class="cart-panel__foot">' +
        '<div class="cart-panel__total"><span>Итого</span><strong>' + fmtPrice(sum) + "</strong></div>" +
        deliveryNote(sum) +
        '<p class="cart-panel__send">Отправить заказ</p>' +
        '<div class="cart-panel__msgrs">' +
        '<a class="cart-send cart-send--wa" href="https://wa.me/' + ORDER_WA + "?text=" + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + msgrIcon("wa") + "WhatsApp</a>" +
        '<a class="cart-send cart-send--tg" href="' + ORDER_TG + '" target="_blank" rel="noopener" data-copy>' + msgrIcon("tg") + "Telegram</a>" +
        '<a class="cart-send cart-send--max" href="' + ORDER_MAX + '" target="_blank" rel="noopener" data-copy>' + msgrIcon("max") + "MAX</a>" +
        "</div>" +
        '<p class="cart-panel__copied" aria-live="polite"></p>' +
        '<a class="btn btn--white cart-panel__call" href="tel:+' + CALL_TEL + '">Позвонить: +7 (495) 123-45-67</a>' +
        '<button class="cart-panel__clear" type="button" data-clear>Очистить корзину</button>' +
        "</div>";
    }
    openers.forEach((b) => b.addEventListener("click", () => { opener = b; render(); panel.show(); }));
    box.addEventListener("hidden.bs.offcanvas", () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    });
    box.addEventListener("click", (e) => {
      if (e.target.closest(".cart-panel__empty .btn")) return panel.hide();
      const row = e.target.closest(".cart-row");
      const cart = readCart();
      const q = e.target.closest("[data-qty]");
      if (q && row) { cart[row.dataset.id] = (cart[row.dataset.id] || 0) + Number(q.dataset.qty); writeCart(cart); return; }
      if (e.target.closest("[data-del]") && row) { delete cart[row.dataset.id]; writeCart(cart); return; }
      if (e.target.closest("[data-clear]")) { writeCart({}); return; }
      // Telegram и MAX не принимают текст в ссылке: копируем заказ в буфер, чат открывается по ссылке
      const cp = e.target.closest("[data-copy]");
      if (cp) {
        const note = box.querySelector(".cart-panel__copied");
        const done = () => { if (note) note.textContent = "Текст заказа скопирован — вставьте его в чат " + cp.textContent.trim() + "."; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(orderText).then(done, () => { if (note) note.textContent = "Скопируйте состав заказа из корзины и отправьте его в чат."; });
        } else if (note) {
          note.textContent = "Скопируйте состав заказа из корзины и отправьте его в чат.";
        }
      }
    });
    // перерисовка при любом изменении корзины; фокус возвращаем на ту же кнопку
    cartListeners.push(() => {
      if (!box.classList.contains("show")) return;
      const a = document.activeElement;
      const key = a && a.closest(".cart-row") ? [a.closest(".cart-row").dataset.id, a.dataset.qty || (a.hasAttribute("data-del") ? "del" : "")] : null;
      const list = box.querySelector(".cart-panel__list");
      const top = list ? list.scrollTop : 0;
      render();
      const list2 = box.querySelector(".cart-panel__list");
      if (list2) list2.scrollTop = top;
      let target = null;
      if (key) {
        const r = box.querySelector('.cart-row[data-id="' + key[0] + '"]');
        if (r) target = key[1] === "del" ? null : r.querySelector('[data-qty="' + key[1] + '"]');
      }
      (target || box.querySelector(".cart-panel__close")).focus({ preventScroll: true });
    });
  }

  /* ---------- окно блюда: открывается кликом по карточке ---------- */
  function initDishModal() {
    if (typeof HTMLDialogElement === "undefined") return;
    const dlg = document.createElement("dialog");
    dlg.className = "dish-modal";
    dlg.tabIndex = -1;
    dlg.setAttribute("aria-labelledby", "dish-modal-title");
    document.body.appendChild(dlg);
    let opener = null;

    function open(id, from) {
      const item = DATA.items.find((i) => String(i.id) === String(id));
      if (!item) return;
      opener = from || null;
      const img = item.image
        ? '<figure class="dish-modal__media"><img src="' + IMG_DIR + item.image + '.webp" alt="' + esc(item.name) + '" width="1000" height="750"' +
          (item.imagePosition ? ' style="object-position:' + esc(item.imagePosition) + '"' : "") + "></figure>"
        : "";
      const cat = DATA.categories.find((c) => c.id === item.category);
      dlg.innerHTML =
        '<div class="dish-modal__box">' +
        '<button class="dish-modal__close" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        img +
        '<div class="dish-modal__body">' +
        (cat ? '<a class="dish-modal__cat" href="' + MENU_URL + "#" + cat.id + '">' + esc(cat.title) + "</a>" : "") +
        '<h2 class="dish-modal__title" id="dish-modal-title">' + esc(item.name) + "</h2>" +
        (item.description ? '<p class="dish-modal__desc">' + esc(item.description) + "</p>" : "") +
        '<div class="dish-modal__buy">' +
        '<div class="dish-modal__price">' + fmtPrice(item.price) + (item.portion ? '<span>' + esc(item.portion) + "</span>" : "") + "</div>" +
        '<div class="dish-modal__cta">' +
        '<button class="btn dish-modal__add" type="button" data-add="' + item.id + '"></button>' +
        '<span class="dish-modal__incart" aria-live="polite"></span>' +
        "</div></div></div></div>";
      syncAdd(item.id);
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      if (sbw > 0) document.body.style.paddingRight = sbw + "px"; // страница не сдвигается, когда пропадает полоса прокрутки
      dlg.showModal();
      dlg.focus({ preventScroll: true }); // фокус на окне, а не на кнопке закрытия — без вспышки кольца
      document.documentElement.classList.add("has-modal");
    }
    // кнопка: «Добавить в корзину», а если блюдо уже в корзине — «Добавить ещё» и число порций
    function syncAdd(id) {
      const n = readCart()[id] || 0;
      const add = dlg.querySelector(".dish-modal__add");
      const note = dlg.querySelector(".dish-modal__incart");
      if (add) add.textContent = n ? "Добавить ещё" : "Добавить в корзину";
      if (note) note.textContent = n ? "В корзине: " + n + " " + plural(n, ["порция", "порции", "порций"]) : "";
    }
    function cleanup() {
      if (!document.documentElement.classList.contains("has-modal")) return;
      document.documentElement.classList.remove("has-modal");
      document.body.style.paddingRight = "";
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    }
    function close() { if (dlg.open) dlg.close(); cleanup(); }

    // Esc закрывает окно сам; снимаем блокировку прокрутки сразу, не дожидаясь события close
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dlg.addEventListener("close", cleanup);
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest(".dish-modal__close")) close();
      else if (e.target.closest(".dish-modal__cat")) close();
      const add = e.target.closest(".dish-modal__add");
      // корзину пополняет общий обработчик на document (он срабатывает позже), поэтому подпись — в следующем тике
      if (add) setTimeout(() => syncAdd(add.dataset.add), 0);
    });
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".dish__open");
      if (b) open(b.dataset.open, b);
    });
  }

  /* ---------- Яндекс Карта: JS API 2.1, загружается сразу после загрузки страницы ---------- */
  // красная метка 44×58, острие — в точке адреса
  const MAP_PIN = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="58" viewBox="0 0 44 58">' +
    '<path d="M22 57C22 57 42 33.6 42 21.5C42 10.2 33 1 22 1S2 10.2 2 21.5C2 33.6 22 57 22 57Z" fill="#e02020" stroke="#ffffff" stroke-width="2"/>' +
    '<circle cx="22" cy="21.5" r="7.5" fill="#ffffff"/></svg>'
  );
  function initMap() {
    const box = document.getElementById("map");
    const button = document.getElementById("loadMap");
    if (!box) return;
    const center = [parseFloat(box.dataset.lat), parseFloat(box.dataset.lon)];
    let started = false;

    function init() {
      const map = new ymaps.Map("map", { center: center, zoom: Number(box.dataset.zoom) || 16 });
      const placemark = new ymaps.Placemark(
        center,
        { balloonContent: box.dataset.balloon, hintContent: box.dataset.title },
        { iconLayout: "default#image", iconImageHref: MAP_PIN, iconImageSize: [44, 58], iconImageOffset: [-22, -58] }
      );
      map.controls.remove("geolocationControl");
      map.controls.remove("searchControl");
      map.controls.remove("trafficControl");
      map.controls.remove("typeSelector");
      map.controls.remove("fullscreenControl");
      map.controls.remove("rulerControl");
      map.behaviors.disable("scrollZoom"); // колесо мыши прокручивает страницу, а не карту
      map.geoObjects.add(placemark);
    }

    function load() {
      if (started) return;
      started = true;
      if (button) { button.hidden = true; }
      const script = document.createElement("script");
      script.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU" + (box.dataset.apikey ? "&apikey=" + encodeURIComponent(box.dataset.apikey) : "");
      script.async = true;
      script.onload = function () {
        const stub = box.parentElement.querySelector(".map-stub");
        if (stub) stub.remove();
        box.style.display = "block";
        ymaps.ready(init);
      };
      script.onerror = function () {
        started = false;
        script.remove();
        if (button) { button.hidden = false; button.disabled = false; button.textContent = "Повторить загрузку карты"; }
      };
      document.head.append(script);
    }

    if (button) button.addEventListener("click", load);
    // карта показывается сразу: грузим после загрузки страницы, чтобы не тормозить первый экран
    if (document.readyState === "complete") load();
    else window.addEventListener("load", load, { once: true });
  }

  /* ---------- окно-приглашение к заказу: через 15 секунд на сайте ---------- */
  const PROMO_DELAY = 10000;              // сколько провести на сайте (суммарно по страницам)
  const PROMO_SEEN = "parapalok-promo-seen"; // показываем один раз за посещение (sessionStorage)
  const PROMO_TIME = "parapalok-time-on-site";
  function initPromo() {
    if (typeof HTMLDialogElement === "undefined") return;
    if (/\/privacy\//.test(location.pathname)) return;
    try { if (sessionStorage.getItem(PROMO_SEEN)) return; } catch (e) { /* хранилище недоступно — покажем */ }

    let spent = 0;
    try { spent = Number(sessionStorage.getItem(PROMO_TIME)) || 0; } catch (e) { /* без учёта прошлых страниц */ }
    const startedAt = Date.now();
    const saveTime = () => { try { sessionStorage.setItem(PROMO_TIME, String(spent + Date.now() - startedAt)); } catch (e) {} };
    window.addEventListener("pagehide", saveTime);

    const busy = () =>
      document.documentElement.classList.contains("has-modal") ||
      document.querySelector(".offcanvas.show, .offcanvas.showing, .fab[data-open='true'], .drawer[data-open='true']");

    function tryShow() {
      if (busy()) { setTimeout(tryShow, 2000); return; }
      show();
    }
    setTimeout(tryShow, Math.max(0, PROMO_DELAY - spent));

    function show() {
      const h = new Date().getHours();
      const title = h >= 16 || h < 4 ? "Роллы к ужину" : "Роллы к обеду";
      const items = DATA.items.filter((i) => i.popular).slice(0, 3);
      const rows = items.map((it) =>
        '<li class="promo__item">' +
        '<img src="' + IMG_DIR + it.image + '-480.webp" alt="" width="96" height="72" decoding="async">' +
        '<div class="promo__info"><p class="promo__name">' + esc(it.name) + "</p>" +
        '<p class="promo__meta">' + (it.portion ? esc(it.portion) + ", " : "") + fmtPrice(it.price).replace(/ /g, "&nbsp;") + "</p></div>" +
        '<button class="promo__add" type="button" data-add="' + it.id + '" aria-label="Добавить в корзину: ' + esc(it.name) + '">' +
        '<svg class="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
        '<svg class="i-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' +
        "</button></li>"
      ).join("");
      const dlg = document.createElement("dialog");
      dlg.className = "promo";
      dlg.tabIndex = -1;
      dlg.setAttribute("aria-labelledby", "promo-title");
      dlg.innerHTML =
        '<div class="promo__box">' +
        '<figure class="promo__photo"><img src="' + BASE + 'assets/images/site/hero-rolls-900.webp" alt="" width="900" height="638" decoding="async"></figure>' +
        '<div class="promo__body">' +
        '<button class="promo__close" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<h2 class="promo__title" id="promo-title">' + title + "</h2>" +
        '<p class="promo__lead">Привезём бесплатно до&nbsp;1&nbsp;км и&nbsp;по&nbsp;ЖК на&nbsp;Донецкой, 34к1. Каждый день с&nbsp;11:00 до&nbsp;23:00.</p>' +
        '<p class="promo__sub">Чаще всего заказывают</p>' +
        '<ul class="promo__list">' + rows + "</ul>" +
        '<div class="promo__actions">' +
        '<a class="btn promo__menu" href="' + MENU_URL + '">Открыть меню</a>' +
        '<button class="promo__cart" type="button" hidden>Перейти в корзину</button>' +
        '<button class="promo__later" type="button">Не сейчас</button>' +
        "</div></div></div>";
      document.body.appendChild(dlg);

      const remember = () => { try { sessionStorage.setItem(PROMO_SEEN, "1"); } catch (e) {} };
      const close = () => {
        remember();
        if (dlg.open) dlg.close();
        document.documentElement.classList.remove("has-modal");
        document.body.style.paddingRight = "";
        dlg.remove();
      };
      dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg || e.target.closest(".promo__close, .promo__later")) return close();
        if (e.target.closest(".promo__menu")) { remember(); return; }
        if (e.target.closest(".promo__cart")) {
          close();
          const cartBtn = document.querySelector(".cart");
          if (cartBtn) cartBtn.click();
          return;
        }
        // после добавления появляется кнопка перехода в корзину
        if (e.target.closest("[data-add]")) setTimeout(() => { dlg.querySelector(".promo__cart").hidden = false; }, 0);
      });

      const sbw = window.innerWidth - document.documentElement.clientWidth;
      if (sbw > 0) document.body.style.paddingRight = sbw + "px";
      remember();
      dlg.showModal();
      dlg.focus({ preventScroll: true });
      document.documentElement.classList.add("has-modal");
    }
  }

  /* ---------- уведомление о cookie ---------- */
  const COOKIE_KEY = "parapalok-cookie-ok";
  function initCookieNotice() {
    let ok = false;
    try { ok = localStorage.getItem(COOKIE_KEY) === "1"; } catch (e) { /* хранилище недоступно */ }
    if (ok) return;
    const box = document.createElement("section");
    box.className = "cookie";
    box.setAttribute("aria-label", "Уведомление о cookie");
    box.innerHTML =
      '<p class="cookie__text">Мы используем хранилище браузера для работы корзины, а карта Яндекса может устанавливать свои cookie. Подробнее — в&nbsp;<a href="' + BASE + 'privacy/#cookie">политике конфиденциальности</a>.</p>' +
      '<button class="btn cookie__ok" type="button">Принять</button>';
    document.body.appendChild(box);
    const root = document.documentElement;
    const sync = () => root.style.setProperty("--cookie-h", box.offsetHeight + "px");
    sync();
    root.classList.add("has-cookie");
    const ro = "ResizeObserver" in window ? new ResizeObserver(sync) : null;
    if (ro) ro.observe(box);
    box.querySelector(".cookie__ok").addEventListener("click", () => {
      try { localStorage.setItem(COOKIE_KEY, "1"); } catch (e) { /* приватный режим */ }
      if (ro) ro.disconnect();
      root.classList.remove("has-cookie");
      box.remove();
    });
  }

  /* ---------- появление на загрузке ---------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (reduceMotion) { els.forEach((el) => el.classList.add("is-in")); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((el) => el.classList.add("is-in"))));
  }

  /* ---------- главная ---------- */
  function initHome() {
    const popular = document.getElementById("popular-dishes");
    if (popular) {
      const items = DATA.items.filter((i) => i.popular).slice(0, 4);
      popular.innerHTML = items.map((i) => dishCard(i, { noWide: true, sizes: "(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 300px" })).join("");
    }
    const sets = document.getElementById("featured-sets");
    if (sets) {
      const items = DATA.items.filter((i) => i.category === "sety" && i.featured).slice(0, 3);
      sets.innerHTML = items.map((i) => dishCard(i, { noWide: true, sizes: "(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 400px" })).join("");
    }
    syncCards();
    // живые цифры из каталога
    const total = DATA.items.length;
    const cats = DATA.categories.length;
    const setsCount = DATA.items.filter((i) => i.category === "sety").length;
    const rolls = DATA.items.filter((i) => /rolly$/.test(i.category)).length;
    document.querySelectorAll("[data-count]").forEach((el) => {
      const key = el.getAttribute("data-count");
      const map = { total, cats, sets: setsCount, rolls };
      if (key in map) el.textContent = map[key];
    });
    // список категорий в подвале
    const footCats = document.getElementById("footer-categories");
    if (footCats) {
      footCats.innerHTML = DATA.categories
        .map((c) => '<li><a href="' + MENU_URL + "#" + c.id + '">' + esc(c.title) + "</a></li>")
        .join("");
    }
  }

  /* ---------- страница меню ---------- */
  function initMenuPage() {
    const root = document.getElementById("menu-root");
    const navScroller = document.getElementById("menu-chips");
    if (!root || !navScroller) return;

    const byCat = {};
    DATA.items.forEach((i) => { (byCat[i.category] = byCat[i.category] || []).push(i); });

    const counts = document.querySelectorAll("[data-count]");
    counts.forEach((el) => {
      const key = el.getAttribute("data-count");
      if (key === "total") el.textContent = DATA.items.length;
      if (key === "cats") el.textContent = DATA.categories.length;
    });

    // чипы
    const chips = [{ id: "all", title: "Всё меню", count: DATA.items.length }].concat(
      DATA.categories.map((c) => ({ id: c.id, title: c.title, count: (byCat[c.id] || []).length }))
    );
    navScroller.innerHTML = chips
      .map((c) => '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="false" aria-label="' + esc(c.title) + ", " + c.count + " " + plural(c.count, ["позиция", "позиции", "позиций"]) + '">' + esc(c.title) + '<span class="chip__count" aria-hidden="true">' + c.count + "</span></button>")
      .join("");

    function sectionHTML(cat) {
      const items = byCat[cat.id] || [];
      let inner = "";
      if (cat.groups) {
        inner = cat.groups
          .map((g) => {
            const gi = items.filter((i) => i.group === g.id);
            if (!gi.length) return "";
            return (
              '<div class="menu-group"><h3 class="menu-group__title">' + esc(g.title) + '<span class="count"> ' + gi.length + " " + plural(gi.length, ["позиция", "позиции", "позиций"]) + "</span></h3>" +
              '<div class="dish-grid">' + gi.map((i) => dishCard(i)).join("") + "</div></div>"
            );
          })
          .join("");
      } else {
        inner = '<div class="dish-grid">' + items.map((i) => dishCard(i)).join("") + "</div>";
      }
      return (
        '<section class="menu-section" id="' + cat.id + '" aria-labelledby="h-' + cat.id + '">' +
        '<div class="menu-section__head"><h2 class="h-section" id="h-' + cat.id + '">' + esc(cat.title) + "</h2>" +
        '<span class="count">' + items.length + " " + plural(items.length, ["позиция", "позиции", "позиций"]) + "</span></div>" +
        inner +
        "</section>"
      );
    }

    let current = null;
    function render(catId, opts) {
      opts = opts || {};
      const valid = catId === "all" || DATA.categories.some((c) => c.id === catId);
      if (!valid) catId = "all";
      if (current === catId && !opts.force) return;
      current = catId;

      const cats = catId === "all" ? DATA.categories : DATA.categories.filter((c) => c.id === catId);
      root.innerHTML = cats.map(sectionHTML).join("") || '<p class="menu-empty">В этой категории пока нет позиций.</p>';
      syncCards();
      root.classList.remove("fade-swap"); void root.offsetWidth; root.classList.add("fade-swap");
      navScroller.querySelectorAll(".chip").forEach((b) => {
        const on = b.dataset.cat === catId;
        b.setAttribute("aria-pressed", String(on));
        if (on && opts.scrollChip !== false) b.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
      });
      if (opts.updateHash !== false) {
        const hash = catId === "all" ? "" : "#" + catId;
        if (location.hash !== hash) history.replaceState(null, "", location.pathname + location.search + hash);
      }
      if (opts.scrollTop) {
        const top = navScroller.closest(".menu-nav").getBoundingClientRect().top + window.scrollY - document.querySelector(".header__main").offsetHeight;
        window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
      }
    }

    navScroller.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      render(btn.dataset.cat, { scrollTop: true });
    });

    window.addEventListener("hashchange", () => render(location.hash.slice(1) || "all", { scrollTop: true }));

    render(location.hash.slice(1) || "all", { updateHash: false, scrollChip: false, force: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initFab();
    initCart();
    initDishModal();
    initCartPanel();
    initCookieNotice();
    initPromo();
    initMap();
    initHome();
    initMenuPage();
    initReveal();
  });
})();
