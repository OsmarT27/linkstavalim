/* TAVALIM Links — sem dependências. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s) { return document.querySelector(s); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Aviso rápido ---------- */
  var toast = $("#toast"), tt = 0;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add("is-on");
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove("is-on"); }, 2200);
  }

  /* ---------- Compartilhar (menu do celular) ou copiar o link ---------- */
  var share = $("#share");
  if (share) share.addEventListener("click", function () {
    var data = { title: document.title, url: location.href };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { say("Link copiado"); }, function () { say("Não foi possível copiar"); });
    else say("Copie o endereço na barra do navegador");
  });

  /* ---------- Janela de e-mails ---------- */
  var dlg = $("#mail-dialog"), openBtn = $("#open-mail"), closeBtn = $("#close-mail");
  if (dlg && openBtn) {
    openBtn.addEventListener("click", function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); });
    closeBtn.addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- Baralho de artistas (mesmo sistema do site principal) ---------- */
  var ARTISTS = (window.TAVALIM_ARTISTS || []).slice();   // lista em js/artists.js

  var deck = $("[data-deck]");
  if (!deck) return;
  if (!ARTISTS.length) { var sec = $("#artistas"); if (sec) sec.hidden = true; return; }
  var list = $("[data-cards]"), live = $("[data-live]");

  function initials(name) {
    return name.split(/\s+/).filter(function (w) { return /^\p{L}/u.test(w); }).slice(0, 2)
      .map(function (p) { return p[0]; }).join("").toUpperCase();
  }
  function buildCard(a) {
    var li = document.createElement("li");
    li.className = "art";
    var bar = document.createElement("i"); bar.className = "art__bar"; bar.setAttribute("aria-hidden", "true");
    var photo = document.createElement("div"); photo.className = "art__photo";
    function fb() {
      var f = document.createElement("div");
      f.className = "art__initials" + (a.more ? " art__initials--more" : "");
      f.setAttribute("aria-hidden", "true");
      var sp = document.createElement("span"); sp.textContent = a.more ? "+" : initials(a.name);
      f.appendChild(sp); return f;
    }
    if (a.photo && !a.more) {
      var img = document.createElement("img");
      img.src = a.photo; img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.draggable = false;
      img.addEventListener("error", function () { img.remove(); photo.appendChild(fb()); });
      photo.appendChild(img);
    } else photo.appendChild(fb());
    var info = document.createElement("div"); info.className = "art__info";
    var name = document.createElement("h3"); name.className = "art__name"; name.textContent = a.name;
    info.appendChild(name);
    if (a.note) { var note = document.createElement("p"); note.className = "art__note"; note.textContent = a.note; info.appendChild(note); }
    li.appendChild(photo); li.appendChild(bar); li.appendChild(info);
    return li;
  }

  var cards = ARTISTS.map(function (a) { var c = buildCard(a); list.appendChild(c); return c; });
  var n = cards.length, order = cards.map(function (_, i) { return i; });
  var cw = 224, vw = window.innerWidth, curDx = 0, busy = false, anim = 0, drag = null;
  function measure() { cw = cards[0].offsetWidth || 224; vw = window.innerWidth; }
  function jr(i) { return ((i * 53) % 17 - 8) * 0.55; }
  function jx(i) { return ((i * 37) % 13 - 6) * 3.2; }

  function layout(dx) {
    curDx = dx;
    var p = clamp(Math.abs(dx) / (cw * 0.6), 0, 1);
    for (var r = 0; r < n; r++) {
      var i = order[r], el = cards[i], x, y, rot, sc, op, k, z;
      if (r === 0) { x = dx; y = -p * 10; rot = jr(i) * 0.25 + dx / cw * 14; sc = 1; op = 1; k = 1 - p; z = 200; }
      else {
        var s = r - p, f = clamp(s, 0, 1);
        x = jx(i) * f; y = s * 8; rot = jr(i) * (0.25 + 0.75 * f); sc = 1 - s * 0.03;
        op = clamp(1 - (s - 4), 0, 1); k = r === 1 ? p : 0; z = 200 - r;
      }
      el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + rot.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op < 0.01 ? "hidden" : "visible";
      el.style.zIndex = z;
      el.classList.toggle("is-top", r === 0);
      el.style.setProperty("--k", k.toFixed(3));
    }
  }
  function setCurrent() { var idx = order[0]; live.textContent = ARTISTS[idx].name + ", " + (idx + 1) + " de " + n; }

  function tween(from, to, dur, done) {
    if (anim) cancelAnimationFrame(anim);
    busy = true; var t0 = performance.now(); dur = reduce ? 1 : dur;
    (function step(t) {
      var u = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - u, 3);
      layout(from + (to - from) * e);
      if (u < 1) anim = requestAnimationFrame(step);
      else { anim = 0; busy = false; if (done) done(); }
    })(t0);
  }
  function next(dir) {
    if (busy) return;
    var off = (dir || -1) * (vw / 2 + cw);
    tween(curDx, off, 300, function () { order.push(order.shift()); setCurrent(); layout(0); });
  }
  function prev() {
    if (busy) return;
    order.unshift(order.pop()); setCurrent();
    tween(-(vw / 2 + cw), 0, 340);
  }

  deck.addEventListener("pointerdown", function (e) {
    if (busy || (e.button !== undefined && e.button !== 0)) return;
    drag = { x: e.clientX, id: e.pointerId, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
  });
  deck.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true; deck.classList.add("is-drag");
      try { deck.setPointerCapture(e.pointerId); } catch (err) {}
    }
    if (!drag.moved) return;
    var dt = Math.max(1, e.timeStamp - drag.lt);
    drag.v = 0.7 * drag.v + 0.3 * ((e.clientX - drag.lx) / dt);
    drag.lx = e.clientX; drag.lt = e.timeStamp;
    layout(dx);
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null; deck.classList.remove("is-drag");
    if (!d.moved) { if (e && e.type === "pointerup") next(-1); return; }
    var dx = curDx, fast = Math.abs(d.v) > 0.45 && (d.v > 0) === (dx > 0);
    if (Math.abs(dx) > cw * 0.28 || fast) next(dx > 0 ? 1 : -1); else tween(dx, 0, 260);
  }
  deck.addEventListener("pointerup", endDrag);
  deck.addEventListener("pointercancel", endDrag);

  var lastWheel = 0;
  deck.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    var now = performance.now();
    if (Math.abs(e.deltaX) > 30 && now - lastWheel > 480 && !busy) { lastWheel = now; if (e.deltaX > 0) next(-1); else prev(); }
  }, { passive: false });
  deck.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); next(-1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  });

  window.addEventListener("resize", function () { measure(); layout(curDx); });
  window.addEventListener("load", function () { measure(); layout(curDx); });
  measure(); setCurrent(); layout(0);

  if (!reduce && "IntersectionObserver" in window) {
    var nudged = false;
    new IntersectionObserver(function (en, ob) {
      if (en[0].isIntersecting && !nudged) {
        nudged = true; ob.disconnect();
        setTimeout(function () { if (!busy && !drag) tween(0, -46, 320, function () { tween(-46, 0, 420); }); }, 400);
      }
    }, { threshold: 0.6 }).observe(deck);
  }
})();
