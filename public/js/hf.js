/* HYDROFLASH — comportements du site (menu, barre d'appel, volets, « Être rappelé », vérificateur de zone, formulaires).
   Sans JavaScript, tout reste utilisable : liens d'appel, formulaires envoyés normalement, contenus lisibles. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var small = window.matchMedia('(max-width: 700px)');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg = d.body.dataset;
  var TEL = cfg.tel || 'tel:+33762882839', NUM = cfg.num || '07 62 88 28 39';

  /* ---------- Menu (dialogue plein écran) ---------- */
  var menu = d.getElementById('menu'), burger = d.querySelector('[data-burger]');
  if (menu && burger) {
    var closeBtn = menu.querySelector('[data-close]');
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      d.body.style.overflow = open ? 'hidden' : '';
      (open ? closeBtn : burger).focus();
    };
    burger.addEventListener('click', function () { setMenu(true); });
    closeBtn.addEventListener('click', function () { setMenu(false); });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
      if (e.key === 'Tab') {
        var f = menu.querySelectorAll('a[href], button'); var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ---------- Barre d'action collante : apparaît quand les boutons du hero sortent de l'écran ---------- */
  var bar = d.querySelector('.mbar'), heroCta = d.querySelector('.hero-ctas');
  if (bar && heroCta && !bar.classList.contains('mbar--urg')) {
    var ticking = false;
    var updBar = function () { ticking = false; bar.classList.toggle('is-off', heroCta.getBoundingClientRect().bottom > 0); };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(updBar); } };
    updBar();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', updBar);
  }

  /* ---------- Pied de page : rubriques repliables sur smartphone ---------- */
  d.querySelectorAll('[data-fdet]').forEach(function (det) {
    if (small.matches) det.open = false;
    det.querySelector('summary').addEventListener('click', function (e) { if (!small.matches) e.preventDefault(); });
  });
  d.querySelectorAll('[data-more]').forEach(function (m) { if (!small.matches) m.open = true; });
  if (small.matches) d.querySelectorAll('[data-faq-fold] details[open]').forEach(function (x) { x.open = false; });

  /* ---------- « Être rappelé » (page urgence) ---------- */
  var rappel = d.getElementById('rappel');
  if (rappel) {
    var nom = rappel.querySelector('input:not([type=hidden]):not([tabindex="-1"])');
    var heroCb = d.querySelector('.u-cb');
    var syncCb = function () {
      if (!heroCb) return;
      if (small.matches) heroCb.setAttribute('aria-expanded', String(rappel.classList.contains('is-open')));
      else heroCb.removeAttribute('aria-expanded');
    };
    syncCb();
    d.querySelectorAll('[data-rappel]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var fromHero = a === heroCb;
        if (small.matches && fromHero && rappel.classList.contains('is-open')) { rappel.classList.remove('is-open'); syncCb(); return; }
        rappel.classList.add('is-open'); syncCb();
        rappel.scrollIntoView({ block: small.matches ? 'center' : 'start', behavior: calm ? 'auto' : 'smooth' });
        setTimeout(function () { if (nom) nom.focus({ preventScroll: true }); }, calm ? 0 : 380);
      });
    });
    small.addEventListener && small.addEventListener('change', syncCb);
  }

  /* ---------- Vérificateur de code postal (Seine-Maritime 76 · Eure 27) ----------
     Données chargées à la demande : /data/communes-76-27.json { "76000": [["Rouen","76"], …] }
     Source : @etalab/decoupage-administratif 6.0.0 (INSEE, La Poste — Licence Ouverte). */
  var communes = null;
  var loadCommunes = function () {
    if (communes) return Promise.resolve(communes);
    return fetch('/data/communes-76-27.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (j) { communes = j; return j; });
  };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var icon = function (id) { return '<span class="cp-ic" aria-hidden="true"><svg class="ic"><use href="#' + id + '"/></svg></span>'; };
  var callBtn = '<a class="btn btn-call cp-call" href="' + TEL + '"><svg class="ic" aria-hidden="true"><use class="u-d" href="#i-tel"/><use class="u-m" href="#i-tel-f"/></svg>Appeler le ' + NUM + '</a>';
  var listCommunes = function (list) {
    var deps = list.map(function (c) { return c[1]; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var shown = list.slice(0, 4), more = list.length > 4 ? ', …' : '';
    if (deps.length === 1) return shown.map(function (c) { return esc(c[0]); }).join(', ') + more + ' (' + deps[0] + ')';
    return shown.map(function (c) { return esc(c[0]) + ' (' + c[1] + ')'; }).join(', ') + more;
  };
  d.querySelectorAll('form[data-cp]').forEach(function (form) {
    var input = form.querySelector('input'), res = d.getElementById(form.getAttribute('data-res'));
    var rep = d.getElementById(form.getAttribute('data-map'));
    var baseDesc = input.getAttribute('aria-describedby') || '';
    var setState = function (state, html) {
      res.className = 'cp-res is-' + state;
      res.innerHTML = html;
      if (state === 'err') { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', (baseDesc + ' ' + res.id).trim()); }
      else { input.removeAttribute('aria-invalid'); input.setAttribute('aria-describedby', baseDesc); }
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.replace(/\s+/g, '');
      if (rep) rep.querySelectorAll('.rp-grp').forEach(function (g) { g.classList.remove('is-hit'); });
      if (!/^\d{5}$/.test(v)) {
        setState('err', '<p class="cp-err">' + icon('i-no') + '<span>' + (v ? 'Code postal invalide&nbsp;: saisissez 5 chiffres (ex. 76000).' : 'Saisissez votre code postal&nbsp;: 5 chiffres (ex. 76000).') + '</span></p>');
        input.focus();
        return;
      }
      loadCommunes().then(function (data) {
        var hit = data[v];
        if (hit && hit.length) {
          setState('ok', '<p class="cp-ok">' + icon('i-ok') + '<span>Oui&nbsp;: <strong>' + listCommunes(hit) + '</strong> ' + (hit.length > 1 ? 'font' : 'fait') + ' partie de notre secteur d\'intervention.</span></p>' + callBtn);
          if (rep) { var g = rep.querySelector('.rp-grp[data-dep="' + hit[0][1] + '"]'); if (g) g.classList.add('is-hit'); }
        } else {
          setState('ko', '<p class="cp-ko">' + icon('i-no') + '<span>Ce code postal n\'est pas dans notre secteur (Seine-Maritime 76 et Eure 27). Appelez-nous pour en parler.</span></p>' + callBtn);
        }
      }).catch(function () {
        setState('ko', '<p class="cp-ko">' + icon('i-no') + '<span>Vérification indisponible pour le moment. Appelez-nous&nbsp;: nous intervenons en Seine-Maritime (76) et dans l\'Eure (27).</span></p>' + callBtn);
      });
    });
  });

  /* ---------- Formulaires de demande (rappel, devis) ----------
     Envoi au script serveur (attribut action). En préproduction (data-preprod), l'envoi est simulé. */
  d.querySelectorAll('form[data-demande]').forEach(function (form) {
    var out = form.querySelector('[data-form-msg]');
    var t0 = form.querySelector('input[name="t0"]');
    if (t0) t0.value = String(Date.now());
    var say = function (cls, html) { if (!out) return; out.className = 'form-msg ' + cls; out.innerHTML = html; out.focus && out.focus(); };
    form.addEventListener('submit', function (e) {
      var tel = form.querySelector('input[name="tel"]'), nm = form.querySelector('input[name="nom"]');
      var bad = [];
      if (nm && !nm.value.trim()) bad.push(nm);
      if (tel && !/^(?:(?:\+|00)33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(tel.value.trim())) bad.push(tel);
      form.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
      if (bad.length) {
        e.preventDefault();
        bad.forEach(function (x) { x.setAttribute('aria-invalid', 'true'); });
        say('is-err', 'Merci d\'indiquer ' + (bad.length > 1 ? 'votre nom et un numéro de téléphone valide' : (bad[0] === nm ? 'votre nom' : 'un numéro de téléphone valide (ex. 06 12 34 56 78)')) + '.');
        bad[0].focus();
        return;
      }
      if (form.hasAttribute('data-preprod')) {
        e.preventDefault();
        say('is-ok', 'Préproduction&nbsp;: l\'envoi est désactivé. Sur le site en ligne, votre demande est transmise et nous vous rappelons immédiatement.');
        return;
      }
      if (!window.fetch || !window.FormData) return; // envoi classique
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (j) {
          if (j && j.ok) { location.href = j.redirect || '/contact/merci/'; return; }
          say('is-err', (j && j.message) || 'L\'envoi n\'a pas abouti. Appelez-nous directement au <a href="' + TEL + '">' + NUM + '</a>.');
        })
        .catch(function () { say('is-err', 'L\'envoi n\'a pas abouti. Appelez-nous directement au <a href="' + TEL + '">' + NUM + '</a>.'); })
        .finally(function () { if (btn) btn.disabled = false; });
    });
  });

  /* ---------- Contact : présélection du type de problème depuis l'URL (?prestation=curage) ----------
     Table « slug → rang de l'option » fournie par [data-presel] (pas de script en ligne : CSP). */
  var presel = d.querySelector('[data-presel]');
  if (presel) {
    try {
      var rangs = JSON.parse(presel.getAttribute('data-presel'));
      var m = /[?&]prestation=([^&#]*)/.exec(location.search);
      var cle = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
      var choix = d.querySelector('#devis select[name="type"]');
      if (choix && Object.prototype.hasOwnProperty.call(rangs, cle)) choix.selectedIndex = rangs[cle];
    } catch (err) { /* rien */ }
  }

  /* ---------- Apparition douce des sections (ordinateur, animations acceptées) ---------- */
  if (!small.matches && !calm && 'IntersectionObserver' in window) {
    root.classList.add('anim');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    d.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Compteur de contacts ----------
     Deux chiffres, et rien d'autre : combien de clics sur le numéro, combien de
     demandes envoyées, et depuis quelle page. Aucun cookie, aucun identifiant de
     visiteur, aucun service extérieur. Relevé : /mesure/rapport.php */
  if (navigator.sendBeacon) {
    var pageMesure = location.pathname.slice(0, 80);
    var compter = function (type) {
      try {
        var corps = new URLSearchParams();
        corps.set('e', type);
        corps.set('p', pageMesure);
        navigator.sendBeacon('/mesure/enregistrer.php', corps);
      } catch (err) { /* la mesure ne doit jamais gêner le visiteur */ }
    };
    d.addEventListener('click', function (ev) {
      var lien = ev.target && ev.target.closest ? ev.target.closest('a[href^="tel:"]') : null;
      if (lien) compter('appel');
    }, true);
    if (pageMesure.replace(/\/$/, '') === '/contact/merci') compter('demande');
  }
})();
