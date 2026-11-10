/* Hotel North prototype. Motion spec: _docs/hotel-north-2026-11-10/MOTION.md
   One owner per property: GSAP owns transform/opacity/clip-path on the targets below, CSS owns colour, borders and presses. */
(function () {
  'use strict';
  window.__hn = 1;
  var html = document.documentElement, body = document.body;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var phone = matchMedia('(max-width: 899px)');
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGsap && !RM.matches;
  if (!hasGsap) html.className = 'no-js';

  /* ------------------------------------------------------------ booking */
  var GODO = 'https://property.godo.is/booking.php?propid=77444&invoicee=602130&referer=BookingLink';
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(s, n) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + n); return iso(d); }
  $$('[data-bookform]').forEach(function (form) {
    var i = form.elements.checkin, o = form.elements.checkout, err = $('.f-err', form);
    var today = iso(new Date());
    i.min = today; i.value = addDays(today, 1);
    o.min = addDays(today, 1); o.value = addDays(today, 2);
    i.addEventListener('change', function () {
      if (!i.value) return;
      o.min = addDays(i.value, 1);
      if (!o.value || o.value <= i.value) o.value = addDays(i.value, 1);
      err.hidden = true;
    });
    o.addEventListener('change', function () { err.hidden = true; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!i.value || !o.value || o.value <= i.value) { err.hidden = false; o.focus(); return; }
      var u = GODO + '&checkin=' + i.value + '&checkout=' + o.value + '&numadult=' + form.elements.numadult.value;
      if (form.elements.roomid.value) u += '&roomid=' + form.elements.roomid.value;
      window.open(u, '_blank', 'noopener');
    });
  });

  /* ------------------------------------------------------------ contact form: sends nothing */
  $$('[data-msgform]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var done = $('.msg-done', form);
      done.hidden = false;
      if (motion) gsap.fromTo(done, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
    });
  });

  /* ------------------------------------------------------------ drawer and sheet */
  var scrim = $('[data-scrim]'), bar = $('.bar'), main = $('main'), foot = $('.foot');
  var openPanel = null, opener = null, lockY = 0;
  function triggers(on) { if (!hasGsap) return; ScrollTrigger.getAll().forEach(function (t) { on ? t.enable(false, false) : t.disable(false, true); }); }
  function lock() {
    lockY = window.scrollY; triggers(false);
    body.style.position = 'fixed'; body.style.top = -lockY + 'px'; body.style.left = '0'; body.style.right = '0';
  }
  function unlock() {
    body.style.position = ''; body.style.top = ''; body.style.left = ''; body.style.right = '';
    html.style.scrollBehavior = 'auto'; window.scrollTo(0, lockY); html.style.scrollBehavior = ''; triggers(true);
  }
  function setInert(on) { [main, foot, bar].forEach(function (el) { if (el) el.inert = on; }); }
  function axis(panel) { return panel.id === 'menu' ? 'xPercent' : 'yPercent'; }
  function open(panel, trigger, byKeyboard) {
    if (openPanel === panel) return;
    if (openPanel) close(true);
    openPanel = panel; opener = trigger;
    panel.hidden = false; scrim.hidden = false; scrim.style.pointerEvents = ''; panel.style.pointerEvents = '';
    if (!body.style.position) lock();
    setInert(true);
    if (trigger && trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'true');
    if (motion) {
      var from = {}; from[axis(panel)] = 100;
      if (!panel._shown) { gsap.set(panel, from); panel._shown = true; }
      var to = { duration: 0.45, ease: 'expo.out', overwrite: true }; to[axis(panel)] = 0;
      gsap.to(panel, to);
      gsap.to(scrim, { opacity: 1, duration: 0.3, overwrite: true });
      var ln = $$('.ln-i', panel);
      if (ln.length) gsap.fromTo(ln, { yPercent: 112 }, { yPercent: 0, duration: 0.7, stagger: 0.05, delay: 0.08, ease: 'expo.out', overwrite: true });
    } else { scrim.style.opacity = 1; }
    // Nothing is highlighted on a pointer open: focus the panel. On a keyboard open, the first control.
    var first = $('a[href], button, input, select, textarea', panel);
    (byKeyboard && first ? first : panel).focus({ preventScroll: true });
  }
  function close(silent) {
    var panel = openPanel, trigger = opener;
    if (!panel) return;
    openPanel = null; opener = null;
    if (trigger && trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'false');
    function done() { if (openPanel !== panel) panel.hidden = true; if (!openPanel) scrim.hidden = true; }
    panel.style.pointerEvents = 'none'; // a closing panel must not swallow a tap on the button under it
    if (!silent) { scrim.style.pointerEvents = 'none'; setInert(false); unlock(); if (trigger) trigger.focus({ preventScroll: true }); }
    if (motion) {
      var to = { duration: 0.3, ease: 'power2.in', overwrite: true, onComplete: done }; to[axis(panel)] = 100;
      gsap.to(panel, to);
      if (!silent) gsap.to(scrim, { opacity: 0, duration: 0.3, overwrite: true });
    } else { if (!silent) scrim.style.opacity = 0; done(); }
  }
  var menu = $('#menu'), sheet = $('#sheet');
  $$('[data-open-menu]').forEach(function (b) { b.addEventListener('click', function (e) { open(menu, b, e.detail === 0); }); });
  $$('[data-open-book]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (!phone.matches) return; // desktop: the link scrolls to the booking card
      e.preventDefault(); open(sheet, b, e.detail === 0);
    });
  });
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { close(); }); });
  scrim.addEventListener('click', function () { close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openPanel) close(); });
  phone.addEventListener('change', function () { if (openPanel) close(); });

  /* ------------------------------------------------------------ rail: moved by hand */
  $$('[data-rail-sec]').forEach(function (sec) {
    var rail = $('[data-rail]', sec), prev = $('[data-rail-prev]', sec), next = $('[data-rail-next]', sec);
    var slides = $$('.slide', rail);
    function step() { return (slides[0] ? slides[0].getBoundingClientRect().width : 600) + 16; }
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2; next.disabled = rail.scrollLeft >= max;
    }
    var tween = null;
    function glide(x) {
      var max = rail.scrollWidth - rail.clientWidth; x = Math.max(0, Math.min(max, x));
      if (tween) tween.kill();
      if (hasGsap && !RM.matches) {
        rail.classList.add('drag');
        tween = gsap.to(rail, { scrollLeft: x, duration: 0.7, ease: 'power3.out', onComplete: function () { rail.classList.remove('drag'); sync(); } });
      } else { rail.scrollLeft = x; rail.classList.remove('drag'); }
    }
    function edge(x) { // nearest slide edge to x
      var pad = parseFloat(getComputedStyle(rail).paddingLeft) || 0, best = x, bd = Infinity;
      slides.forEach(function (s) { var e = s.offsetLeft - pad, d = Math.abs(e - x); if (d < bd) { bd = d; best = e; } });
      return best;
    }
    function go(dir) { glide(edge(rail.scrollLeft + dir * step())); }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    rail.addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    window.addEventListener('resize', sync); window.addEventListener('load', sync); sync();
    if (window.ResizeObserver) new ResizeObserver(sync).observe(rail);
    $$('img', rail).forEach(function (im) { im.addEventListener('load', sync); });
    // mouse drag with a short glide; touch uses native swipe
    var down = false, sx = 0, sl = 0, lastX = 0, lastT = 0, v = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; sx = lastX = e.clientX; sl = rail.scrollLeft; lastT = e.timeStamp; v = 0;
      if (tween) tween.kill();
      rail.classList.add('drag'); rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener('pointermove', function (e) {
      if (!down) return;
      rail.scrollLeft = sl - (e.clientX - sx);
      var dt = e.timeStamp - lastT; if (dt > 0) v = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = e.timeStamp;
    });
    function up() {
      if (!down) return; down = false;
      glide(edge(rail.scrollLeft - v * 320));
    }
    rail.addEventListener('pointerup', up); rail.addEventListener('pointercancel', up);
  });

  /* ------------------------------------------------------------ map rows light their road */
  $$('[data-map]').forEach(function (sec) {
    var pinned = null;
    function light(key, on) {
      $$('[data-road="' + key + '"]', sec).forEach(function (el) { el.classList.toggle('on', on); });
    }
    $$('.drive', sec).forEach(function (row) {
      var key = row.dataset.road;
      row.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') light(key, true); });
      row.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && pinned !== key) light(key, false); });
      row.addEventListener('focus', function () { light(key, true); });
      row.addEventListener('blur', function () { if (pinned !== key) light(key, false); });
      row.addEventListener('click', function () {
        if (pinned && pinned !== key) light(pinned, false);
        pinned = pinned === key ? null : key; light(key, pinned === key);
        row.setAttribute('aria-pressed', pinned === key ? 'true' : 'false');
      });
    });
  });

  if (!motion) return;

  /* ============================================================ motion */
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'expo.out' });

  // hero: opening
  var hero = $('[data-hero]');
  if (hero) {
    var hi = $('.hero-img', hero);
    var start = function () {
      gsap.timeline()
        .to('.hero-cover', { opacity: 0, duration: 1.3, ease: 'power2.out' }, 0)
        .fromTo(hi, { scale: 1.2 }, { scale: 1, duration: 2.2 }, 0)
        .fromTo('.hero-h .ln-i', { yPercent: 112, y: 0 }, { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.25)
        .to('.hero-sub', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.75)
        .to('.hero-cue', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 1.0)
        .from('.hero-cue i', { scaleY: 0, duration: 0.9 }, 1.0);
    };
    var go = false, kick = function () { if (!go) { go = true; start(); } };
    if (hi.complete) kick(); else { hi.addEventListener('load', kick); hi.addEventListener('error', kick); setTimeout(kick, 1200); }
    // hero: leaves by plain scroll, the photo trails a little
    gsap.fromTo(hi, { yPercent: -10.7 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-tx', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  // heads
  function head(el, opts) {
    var tl = gsap.timeline(opts);
    var eye = $('.eye', el);
    if (eye) tl.to(eye, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
    tl.fromTo($$('.ln-i', el), { yPercent: 112, y: 0 }, { yPercent: 0, duration: 0.9, stagger: 0.09 }, 0.08);
    return tl;
  }
  $$('[data-head]').forEach(function (el) { head(el, { scrollTrigger: { trigger: el, start: 'top 82%'} }); });
  $$('[data-head-now]').forEach(function (el) { head(el, { delay: 0.15 }); });
  $$('[data-stepped]').forEach(function (el) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 80%'} });
    tl.to($('.eye', el), { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
    $$('.ln', el).forEach(function (ln, i) {
      tl.fromTo($('.ln-i', ln), { yPercent: 112, y: 0 }, { yPercent: 0, duration: 0.9 }, 0.08 + i * 0.1);
      if (!phone.matches) tl.fromTo(ln, { x: '3vw' }, { x: 0, duration: 1.1 }, 0.08 + i * 0.1);
    });
  });

  // paragraphs and small blocks
  ScrollTrigger.batch('[data-rise]', {
    start: 'top 88%',
    onEnter: function (els) { els = els.filter(function (e) { if (e._in) return false; e._in = 1; return true; }); if (els.length) gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true }); },
  });

  // valley: a framed photo opens to full width
  $$('[data-valley]').forEach(function (sec) {
    var ph = $('[data-valley-ph]', sec), stage = ph.parentNode;
    var from = phone.matches ? 'inset(6% 8% 6% 8% round 2px)' : 'inset(8% 22% 8% 22% round 2px)';
    var st = { trigger: stage, start: 'top 85%', end: 'top 20%', scrub: 0.6 };
    gsap.fromTo(ph, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: st });
    gsap.fromTo($('img', ph), { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: st });
  });

  // room cards: the paper cover leaves, the photo settles
  $$('[data-card]').forEach(function (card) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 85%'} });
    tl.to($('.cover', card), { scaleY: 0, duration: 1.3, ease: 'power3.inOut' }, 0)
      .fromTo($('.card-ph img', card), { scale: 1.2 }, { scale: 1, duration: 1.5, ease: 'power3.out', clearProps: 'transform' }, 0)
      .fromTo($$('.card-tx > *', card), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' }, 0.3);
  });

  // drifting photos
  if (!phone.matches) {
    $$('[data-drift]').forEach(function (el) {
      var dir = el.dataset.drift === '-1' ? -1 : 1;
      gsap.fromTo($('img', el), { yPercent: -6 * dir }, { yPercent: 6 * dir, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  // guest quote: sentences settle with the scroll
  $$('[data-quote]').forEach(function (sec) {
    gsap.to($$('.q', sec), { opacity: 1, stagger: 0.5, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 72%', end: 'top 22%', scrub: true } });
    gsap.from($('footer', sec), { opacity: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: sec, start: 'top 45%'} });
  });

  // route maps: roads draw out from the hotel
  $$('[data-map]').forEach(function (sec) {
    $$('.mapcol', sec).forEach(function (col, i) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: col, start: 'top 72%'}, delay: phone.matches ? 0 : i * 0.25 });
      tl.to($$('.road', col), { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: 'power2.inOut' }, 0)
        .from($('.home .pulse', col), { scale: 0, transformOrigin: 'center', duration: 0.9 }, 0)
        .to($('.home text', col), { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.2)
        .to($$('.place', col), { opacity: 1, duration: 0.5, stagger: 0.12, ease: 'power2.out' }, 0.9)
        .from($$('.drives li', col), { opacity: 0, y: 14, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.5);
    });
  });

  // footer
  var fg = $$('[data-foot] .foot-grid > *');
  if (fg.length) gsap.fromTo(fg, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '[data-foot]', start: 'top 90%'} });

  // geometry changes when fonts and photos land
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  // if the visitor turns reduced motion on mid-visit, show everything at rest
  RM.addEventListener('change', function () { location.reload(); });
})();
