/* Atlas website v2 — motion + small interactions. No dependencies. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Fields listed per state, counted from the Atlas field directory
     (seed-data.mjs, 2026-11-16; closed / relocated / delisted fields excluded).
     Update this object when the directory changes. */
  var FIELDS = {AK:3,AL:9,AR:4,AZ:10,CA:36,CO:8,CT:2,DE:3,FL:34,GA:18,HI:4,IA:3,ID:7,IL:6,IN:8,KS:4,KY:5,LA:6,MA:1,MD:9,ME:3,MI:16,MN:2,MO:9,MS:5,MT:6,NC:12,ND:2,NE:2,NH:4,NJ:1,NM:7,NV:3,NY:2,OH:8,OK:4,OR:10,PA:11,RI:3,SC:9,SD:2,TN:9,TX:6,UT:4,VA:13,WA:1,WI:5,WV:2};
  var NAMES = {AK:"Alaska",AL:"Alabama",AR:"Arkansas",AZ:"Arizona",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",IA:"Iowa",ID:"Idaho",IL:"Illinois",IN:"Indiana",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",MA:"Massachusetts",MD:"Maryland",ME:"Maine",MI:"Michigan",MN:"Minnesota",MO:"Missouri",MS:"Mississippi",MT:"Montana",NC:"North Carolina",ND:"North Dakota",NE:"Nebraska",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NV:"Nevada",NY:"New York",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VA:"Virginia",VT:"Vermont",WA:"Washington",WI:"Wisconsin",WV:"West Virginia",WY:"Wyoming"};
  /* Tile-grid map: [column, row] on an 11 x 8 grid */
  var GRID = {AK:[0,0],ME:[10,0],VT:[9,1],NH:[10,1],
    WA:[0,2],ID:[1,2],MT:[2,2],ND:[3,2],MN:[4,2],IL:[5,2],WI:[6,2],MI:[7,2],NY:[8,2],RI:[9,2],MA:[10,2],
    OR:[0,3],NV:[1,3],WY:[2,3],SD:[3,3],IA:[4,3],IN:[5,3],OH:[6,3],PA:[7,3],NJ:[8,3],CT:[9,3],
    CA:[0,4],UT:[1,4],CO:[2,4],NE:[3,4],MO:[4,4],KY:[5,4],WV:[6,4],VA:[7,4],MD:[8,4],DE:[9,4],
    AZ:[1,5],NM:[2,5],KS:[3,5],AR:[4,5],TN:[5,5],NC:[6,5],SC:[7,5],
    OK:[3,6],LA:[4,6],MS:[5,6],AL:[6,6],GA:[7,6],
    HI:[0,7],TX:[3,7],FL:[8,7]};

  var totalFields = 0, totalStates = 0;
  Object.keys(FIELDS).forEach(function (k) { totalFields += FIELDS[k]; totalStates++; });

  /* wrap section titles so the scan-wipe clips an inner span (the heading itself stays observable) */
  $$(".title:not(.hero-title)").forEach(function (t) { t.innerHTML = '<span class="title-in">' + t.innerHTML + "</span>"; });

  /* ---------- seeded random ---------- */
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

  /* ---------- Terrain: generated contour lines, tiled, moved at different speeds ---------- */
  function contourSVG(seed, stroke, hills, rings, sw) {
    var r = rng(seed), W = 1600, H = 2400, out = "";
    for (var h = 0; h < hills; h++) {
      var cx = 180 + r() * (W - 360), cy = 260 + r() * (H - 520), R = 90 + r() * 170;
      var a = [], n = 3 + Math.floor(r() * 3);
      for (var i = 0; i < n; i++) a.push([2 + Math.floor(r() * 4), 0.04 + r() * 0.09, r() * 6.283]);
      for (var k = 1; k <= rings; k++) {
        var rad = R * (k / rings) * (0.9 + r() * 0.08), d = "";
        for (var t = 0; t <= 48; t++) {
          var th = (t / 48) * 6.2832, m = 1;
          for (var j = 0; j < a.length; j++) m += a[j][1] * Math.sin(a[j][0] * th + a[j][2] + k * 0.12);
          d += (t ? "L" : "M") + (cx + Math.cos(th) * rad * m * 1.25).toFixed(1) + " " + (cy + Math.sin(th) * rad * m).toFixed(1);
        }
        out += '<path d="' + d + 'Z"/>';
      }
    }
    return 'url("data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '">' + out + "</svg>") + '")';
  }
  var layers = [
    { el: $("#terrainFar"), speed: 0.05 },
    { el: $("#terrainNear"), speed: 0.14 },
    { el: $("#terrainGrid"), speed: 0.24 }
  ];
  layers[0].el.style.backgroundImage = contourSVG(7, "#1554B8", 9, 9, 1.2);
  layers[1].el.style.backgroundImage = contourSVG(31, "rgba(242,242,237,0.22)", 6, 7, 1);

  /* ---------- State tile map ---------- */
  (function () {
    var map = $("#stateMap"), readout = $("#stateReadout"), max = 0, active = null;
    Object.keys(FIELDS).forEach(function (k) { if (FIELDS[k] > max) max = FIELDS[k]; });
    Object.keys(GRID).forEach(function (code) {
      var n = FIELDS[code] || 0, pos = GRID[code];
      var b = document.createElement(n ? "button" : "span");
      b.className = "st" + (n ? "" : " is-empty");
      if (n) b.type = "button";
      b.style.gridColumn = pos[0] + 1; b.style.gridRow = pos[1] + 1;
      b.style.setProperty("--c", pos[0]);
      b.style.setProperty("--heat", Math.sqrt(n / max).toFixed(3));
      b.innerHTML = "<span>" + code + (n ? "<small>" + n + "</small>" : "") + "</span>";
      b.setAttribute("aria-label", NAMES[code] + ": " + (n ? n + (n === 1 ? " field" : " fields") + " listed" : "no fields listed yet"));
      if (n) {
        var show = function () {
          if (active) active.classList.remove("is-on");
          active = b; b.classList.add("is-on");
          readout.innerHTML = "<b>" + NAMES[code] + "</b> &nbsp;" + n + (n === 1 ? " field" : " fields") + " listed";
        };
        b.addEventListener("mouseenter", show); b.addEventListener("focus", show); b.addEventListener("click", show);
      }
      map.appendChild(b);
    });
  })();

  /* ---------- Mag (scroll meter) ---------- */
  var mag = $("#mag"), magRounds = $("#magRounds"), magCount = $("#magCount"), rounds = [];
  for (var i = 0; i < 30; i++) { var d = document.createElement("i"); magRounds.appendChild(d); rounds.push(d); }
  var lastLeft = 30;

  /* ---------- Count-ups ---------- */
  function countUp(el, to, ms) {
    if (reduce) { el.textContent = to; return; }
    var t0 = performance.now(), pad = el.dataset.pad ? +el.dataset.pad : 0;
    (function step(now) {
      var p = Math.min(1, (now - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      var s = String(v); while (s.length < pad) s = "0" + s;
      el.textContent = s;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  $("#statFields").dataset.count = totalFields; $("#statStates").dataset.count = totalStates;

  /* ---------- In-view observers ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; el.classList.add("is-in"); io.unobserve(el);
      if (el.matches("[data-count]")) countUp(el, +el.dataset.count, 1400);
    });
  }, { threshold: 0.3, rootMargin: "0px 0px -8% 0px" });
  $$(".title:not(.hero-title), .statemap, [data-count]").forEach(function (el) { io.observe(el); });

  var hitIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("is-hit"); });
  }, { rootMargin: "0px 0px -38% 0px", threshold: 0.2 });
  $$("#timeline li:not(.tl-head)").forEach(function (li) { hitIO.observe(li); });

  /* ---------- Videos: load + play only while on screen ---------- */
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        if (!reduce || !v.muted) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else { v.pause(); }
    });
  }, { threshold: 0.35 });
  $$(".phone-video").forEach(function (v) { vio.observe(v); });
  $$(".sound").forEach(function (btn) {
    var v = btn.parentNode.querySelector("video");
    btn.addEventListener("click", function () {
      var on = v.muted; // turning sound on
      $$(".phone-video").forEach(function (o) { if (o !== v) { o.muted = true; var b = o.parentNode.querySelector(".sound"); b.setAttribute("aria-pressed", "false"); b.textContent = "Sound on"; } });
      v.muted = !on;
      if (on) { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Sound off" : "Sound on";
    });
  });

  /* ---------- Nav ---------- */
  var nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
  function closeNav() { links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }
  toggle.addEventListener("click", function () {
    var open = !links.classList.contains("is-open");
    links.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$("a", links).forEach(function (a) { a.addEventListener("click", closeNav); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  var navTargets = $$('a[href^="#"]', links).map(function (a) { return { a: a, sec: $(a.getAttribute("href")) }; }).filter(function (o) { return o.sec; });

  /* ---------- Pricing calculator ---------- */
  (function () {
    var input = $("#ticket"), out = $("#ticketOut");
    var money = function (n) { return "$" + n.toFixed(2); };
    function fee(price, cap) { var f = Math.round((price * 0.035 + 1.3) * 100) / 100; return cap ? Math.min(f, 5) : f; }
    function update() {
      var p = +input.value, fo = fee(p, true), fg = fee(p, false);
      out.textContent = "$" + p;
      $("#passPlayer").textContent = money(p + fo); $("#passKeep").textContent = money(p);
      $("#absPlayer").textContent = money(p); $("#absKeep").textContent = money(p - fo);
      $("#orgPlayer").textContent = money(p + fg); $("#orgKeep").textContent = money(p); $("#orgAbsorb").textContent = money(p - fg);
      input.style.setProperty("--fill", ((p - input.min) / (input.max - input.min)) * 100 + "%");
    }
    input.addEventListener("input", update); update();
  })();

  /* ---------- Chrono readout: live fps jitter, joules computed for a 0.20 g BB ---------- */
  var fpsEl = $("#chronoFps"), jEl = $("#chronoJ"), rangeEl = $("#hudRange");
  function chrono() {
    var fps = 392 + Math.round(Math.random() * 8), ms = fps * 0.3048;
    fpsEl.textContent = fps; jEl.textContent = (0.5 * 0.0002 * ms * ms).toFixed(2);
  }
  if (!reduce) setInterval(chrono, 900);

  /* ---------- BB canvas ---------- */
  var cv = $("#bbs"), ctx = cv.getContext("2d"), bbs = [], heroOn = true, cw = 0, ch = 0, dpr = 1;
  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = cv.clientWidth; ch = cv.clientHeight;
    cv.width = cw * dpr; cv.height = ch * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function fire(y, n, tracer, fromRight) {
    for (var i = 0; i < n; i++) {
      var dir = fromRight ? -1 : 1;
      bbs.push({
        x: fromRight ? cw + 30 : -30, y: y + (Math.random() - 0.5) * 16,
        vx: dir * (cw * 0.85 + Math.random() * cw * 0.5 + 500), vy: -12 - Math.random() * 30,
        t: -i * 0.085, r: 2.2 + Math.random() * 1.4, tracer: tracer, hop: 46 + Math.random() * 40
      });
    }
  }
  var nextBurst = 0.6;
  function drawBBs(dt, now) {
    ctx.clearRect(0, 0, cw, ch);
    nextBurst -= dt;
    if (nextBurst <= 0) {
      fire(ch * (0.14 + Math.random() * 0.72), 1 + Math.floor(Math.random() * 3), Math.random() < 0.3, Math.random() < 0.25);
      nextBurst = 0.7 + Math.random() * 1.5;
    }
    for (var i = bbs.length - 1; i >= 0; i--) {
      var b = bbs[i]; b.t += dt;
      if (b.t < 0) continue;
      /* hop-up: backspin lifts the BB early, gravity wins late */
      var ay = 150 - b.hop * 6 * Math.exp(-b.t * 1.6);
      b.vy += ay * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -80 || b.x > cw + 80 || b.y > ch + 40) { bbs.splice(i, 1); continue; }
      var len = Math.min(170, Math.abs(b.vx) * 0.085), dirx = b.vx > 0 ? -1 : 1, slope = b.vy / Math.abs(b.vx);
      var tx = b.x + dirx * len, ty = b.y - slope * len;
      var g = ctx.createLinearGradient(b.x, b.y, tx, ty);
      g.addColorStop(0, b.tracer ? "rgba(184,245,61,0.85)" : "rgba(242,242,237,0.55)"); g.addColorStop(1, "rgba(242,242,237,0)");
      ctx.strokeStyle = g; ctx.lineWidth = b.r * 1.1; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = b.tracer ? "#D9FF8A" : "#FFFFFF";
      if (b.tracer) { ctx.shadowColor = "#B8F53D"; ctx.shadowBlur = 14; }
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  var hero = $(".hero");
  hero.addEventListener("pointerdown", function (e) {
    if (reduce || e.target.closest("a,button")) return;
    var rect = cv.getBoundingClientRect();
    fire(e.clientY - rect.top, 5, true, e.clientX - rect.left < cw / 2);
  });
  new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);

  /* ---------- Pointer / tilt on the hero logo ---------- */
  var logo = $(".hero-logo");
  if (!reduce && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", function (e) {
      var x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      logo.style.setProperty("--lx", (x * -22).toFixed(1) + "px"); logo.style.setProperty("--ly", (y * -22).toFixed(1) + "px");
    });
  }

  /* ---------- Scroll engine: parallax, drift, ticker, mag, nav ---------- */
  var par = [], drift = $$("[data-drift]").map(function (el) { return { el: el, s: +el.dataset.drift }; });
  var phones = [], vh = window.innerHeight, maxScroll = 1, tickerEl = $("#tickerA"), tickerW = 0, tickerX = 0;
  var small = false;
  function pageTop(el) { var t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; }
  function measure() {
    vh = window.innerHeight; small = window.innerWidth < 900;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    par = $$("[data-parallax]").map(function (el) {
      return { el: el, s: +el.dataset.parallax, rot: el.dataset.rotate ? +el.dataset.rotate : 0, mid: pageTop(el) + el.offsetHeight / 2 };
    });
    phones = $$(".phone").map(function (el) { return { el: el, dir: +el.dataset.tilt || 1, mid: pageTop(el) + el.offsetHeight / 2 }; });
    layers.forEach(function (l) { l.el.style.height = Math.ceil(vh + maxScroll * l.speed + 200) + "px"; });
    sizeCanvas();
  }
  /* duplicate ticker content until it comfortably overflows */
  (function () { var html = tickerEl.innerHTML; tickerEl.innerHTML = html + html + html + html; })();
  function measureTicker() { tickerW = tickerEl.scrollWidth / 4; }

  var lastY = -1, lastT = performance.now(), vel = 0, prevY = window.scrollY;
  function frame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    var y = window.scrollY;
    vel += ((y - prevY) / Math.max(dt, 0.001) - vel) * 0.18; prevY = y;

    if (y !== lastY) {
      var k = small ? 0.55 : 1;
      if (!reduce) {
        layers.forEach(function (l) { l.el.style.transform = "translate3d(0," + (-y * l.speed).toFixed(1) + "px,0)"; });
        if (y < vh * 1.2) drift.forEach(function (d) { d.el.style.transform = "translate3d(0," + (y * d.s * k).toFixed(1) + "px,0)"; });
        par.forEach(function (p) {
          var off = p.mid - (y + vh / 2);
          if (Math.abs(off) > vh * 1.4) return;
          var t = "translate3d(0," + (off * p.s * k).toFixed(1) + "px,0)";
          if (p.rot) t += " rotate(" + ((off / vh) * p.rot).toFixed(2) + "deg)";
          p.el.style.transform = t;
        });
        phones.forEach(function (p) {
          var off = (p.mid - (y + vh / 2)) / vh;
          if (Math.abs(off) > 1.4) return;
          p.el.style.setProperty("--tilt", (p.dir * (6 + off * 16) * (small ? 0.5 : 1)).toFixed(2));
          p.el.style.setProperty("--pitch", (off * -5).toFixed(2));
        });
      }
      /* nav */
      nav.classList.toggle("is-stuck", y > 40);
      if (!links.classList.contains("is-open")) nav.classList.toggle("is-hidden", y > lastY && y > vh * 0.8 && lastY >= 0);
      var cur = null;
      navTargets.forEach(function (o) { if (o.sec.getBoundingClientRect().top < vh * 0.45) cur = o; });
      navTargets.forEach(function (o) { o.a.classList.toggle("is-active", o === cur); });
      /* mag */
      var left = Math.max(0, 30 - Math.floor((y / maxScroll) * 30.5));
      if (left !== lastLeft) {
        rounds.forEach(function (r, i) { r.classList.toggle("is-spent", i < 30 - left); });
        magCount.textContent = left; mag.classList.toggle("is-empty", left === 0); lastLeft = left;
      }
      mag.classList.toggle("is-live", y > vh * 0.5);
      rangeEl.textContent = ("00" + Math.min(999, Math.round(y / 12))).slice(-3);
      lastY = y;
    }

    if (!reduce) {
      /* ticker: constant crawl, pushed by scroll velocity */
      tickerX -= (46 + vel * 0.22) * dt;
      if (tickerW) { if (tickerX <= -tickerW) tickerX += tickerW; if (tickerX > 0) tickerX -= tickerW; }
      tickerEl.style.transform = "translate3d(" + tickerX.toFixed(1) + "px,0,0)";
      if (heroOn && !document.hidden) drawBBs(dt, now);
    }
    requestAnimationFrame(frame);
  }

  var rz;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { measure(); measureTicker(); lastY = -1; }, 150); });
  window.addEventListener("load", function () { measure(); measureTicker(); lastY = -1; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); measureTicker(); lastY = -1; });
  measure(); measureTicker();
  if (reduce) { sizeCanvas(); }
  requestAnimationFrame(frame);
})();
