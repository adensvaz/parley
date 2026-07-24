// Parley site — shared client behaviour
(function () {
  // (.js class is set inline in <head> before paint)

  // mobile nav
  var burger = document.querySelector('.burger');
  var links = document.querySelector('.nav-links');
  if (burger && links) burger.addEventListener('click', function () { links.classList.toggle('open'); });

  // scroll reveal (with safety fallback so content never stays hidden)
  var reveals = document.querySelectorAll('.reveal');
  function revealAll() { reveals.forEach(function (el) { el.classList.add('in'); }); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
    // safety net: anything still hidden after 1.4s gets revealed
    setTimeout(revealAll, 1400);
  } else { revealAll(); }

  // ---- Embeds: only load if the asset is reachable (hide section on 404/flaky file) ----
  document.querySelectorAll('iframe[data-embed-src]').forEach(function (ifr) {
    var src = ifr.getAttribute('data-embed-src');
    function drop() { var s = ifr.closest('[data-embed-section]'); if (s) s.style.display = 'none'; }
    fetch(src, { method: 'HEAD' }).then(function (r) { if (r.ok) { ifr.src = src; } else { drop(); } }).catch(drop);
  });

  // ---- Pricing billing toggle (defaults to annual) ----
  var billing = document.querySelector('[data-billing]');
  if (billing) {
    var pricing = document.querySelector('.pricing');
    var bts = billing.querySelectorAll('.bt');
    bts.forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = b.getAttribute('data-bill');
        if (pricing) pricing.setAttribute('data-mode', mode);
        bts.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-selected', 'true');
      });
    });
  }

  // ---- Objection Arcade ----
  var arcade = document.querySelector('[data-arcade]');
  if (arcade) {
    var btns = arcade.querySelectorAll('.obj-btn');
    var out = arcade.querySelector('[data-arcade-out]');
    function render(btn) {
      btns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var line = btn.getAttribute('data-line');
      var next = btn.getAttribute('data-next');
      var label = btn.getAttribute('data-label') || 'Objection';
      out.innerHTML =
        '<div class="side" style="color:var(--blue);margin-top:0">Prospect</div>' +
        '<div class="bubble pros">“' + btn.getAttribute('data-q-full') + '”</div>' +
        '<div class="side" style="color:var(--green)">Parley whispers</div>' +
        '<div class="card obj g"><div class="card-lbl"><span class="dot red"></span>' + label + '</div>' +
        '<div class="body" style="color:#ffe9ee">“' + line + '”</div>' +
        '<div class="mono" style="margin-top:9px;color:var(--dim)">▸ ' + next + '</div></div>';
      out.classList.remove('in'); void out.offsetWidth; out.classList.add('in');
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { render(b); }); });
    if (btns[0]) render(btns[0]);
  }

  // ---- Hero live-call typing ----
  var live = document.querySelector('[data-live]');
  if (live && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var prosEl = live.querySelector('[data-live-pros]');
    var cardEl = live.querySelector('[data-live-card]');
    var full = prosEl.getAttribute('data-text');
    var i = 0;
    if (cardEl) cardEl.style.opacity = 0;
    prosEl.textContent = '';
    function type() {
      if (i <= full.length) { prosEl.textContent = full.slice(0, i); i++; setTimeout(type, 26); }
      else if (cardEl) { setTimeout(function () { cardEl.style.transition = 'opacity .5s ease, transform .5s ease'; cardEl.style.opacity = 1; cardEl.style.transform = 'translateY(0)'; }, 350); }
    }
    if (cardEl) cardEl.style.transform = 'translateY(10px)';
    setTimeout(type, 500);
  }
})();
