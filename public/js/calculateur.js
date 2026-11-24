/* HYDROFLASH — calculateur de prix (composant CalculateurPrix.astro).
   Données : attribut data-calc (grille tarifaire, créneaux, zones, TVA), produit à la construction depuis
   src/data/entreprise.ts. Aucun montant n'est écrit ici.
   Créneau « Maintenant » : heure locale du visiteur, jours fériés français compris. Une nuit appartient au
   jour où elle commence (samedi 18 h → dimanche 8 h = « samedi nuit »). */
(function () {
  'use strict';
  if (window.HF_CALC) return;
  window.HF_CALC = true;
  var d = document;

  /* ---------- Jours fériés (France métropolitaine) ---------- */
  var paques = function (y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - dd - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mois - 1, jour);
  };
  var cacheFeries = {};
  var feries = function (y) {
    if (cacheFeries[y]) return cacheFeries[y];
    var p = paques(y);
    var plus = function (n) { var x = new Date(p.getFullYear(), p.getMonth(), p.getDate()); x.setDate(x.getDate() + n); return x; };
    var l = [new Date(y, 0, 1), plus(1), new Date(y, 4, 1), new Date(y, 4, 8), plus(39), plus(50),
      new Date(y, 6, 14), new Date(y, 7, 15), new Date(y, 10, 1), new Date(y, 10, 11), new Date(y, 11, 25)];
    cacheFeries[y] = l.map(function (x) { return x.getMonth() + '-' + x.getDate(); });
    return cacheFeries[y];
  };
  var estFerie = function (j) { return feries(j.getFullYear()).indexOf(j.getMonth() + '-' + j.getDate()) >= 0; };

  /** Code du créneau tarifaire pour une date donnée. */
  var creneauDe = function (now) {
    var h = now.getHours();
    var jour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var nuit = h < 8 || h >= 18;
    if (h < 8) jour.setDate(jour.getDate() - 1); // la nuit a commencé la veille
    var dim = jour.getDay() === 0 || estFerie(jour), sam = jour.getDay() === 6;
    if (!nuit) return dim ? 'dim' : (sam ? 'samedi' : 'semaine');
    return dim ? 'dim_nuit' : (sam ? 'samedi_nuit' : 'nuit');
  };

  /* Heure de Paris, quel que soit le fuseau réglé sur l'appareil du visiteur (« 24:05 » possible à minuit). */
  var maintenantParis = function () {
    try {
      var t = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', hour12: false });
      var m = /(\d+)\/(\d+)\/(\d+),?\s*(\d+):(\d+)/.exec(t);
      if (m) return new Date(+m[3], +m[1] - 1, +m[2], +m[4] % 24, +m[5]);
    } catch (e) { /* navigateur ancien : heure de l'appareil */ }
    return new Date();
  };

  var nf = function (v) {
    var cents = Math.round(v * 100) / 100;
    return cents.toLocaleString('fr-FR', { minimumFractionDigits: cents % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  };
  var arrondi = function (v) { return Math.round(v * 100) / 100; };

  d.querySelectorAll('[data-calc]').forEach(function (box) {
    var data;
    try { data = JSON.parse(box.getAttribute('data-calc')); } catch (err) { return; }
    var form = box.querySelector('form');
    var out = function (k) { return box.querySelector('[data-out="' + k + '"]'); };
    var champ = function (n) { return form.elements[n]; };
    var parCode = {};
    data.creneaux.forEach(function (c) { parCode[c.code] = c; });
    var zoneLib = {};
    data.zones.forEach(function (z) { zoneLib[z.code] = z.libelle; });
    var options = {};
    data.opts.forEach(function (o) { options[o.k] = o; });
    var mlBox = box.querySelector('.calc-ml');

    var valeurRadio = function (name) {
      var r = form.querySelector('input[name="' + name + '"]:checked');
      return r ? r.value : null;
    };

    /* Code postal → zone (si la commune est connue) */
    var majZoneDepuisCp = function () {
      var cp = (champ('cp').value || '').replace(/\D/g, '').slice(0, 5);
      var msg = out('cpmsg');
      if (cp.length < 5) { msg.textContent = ''; return; }
      var z = data.cp[cp], noms = data.noms[cp];
      if (z === 'A' || z === 'B') {
        form.querySelector('input[name="z"][value="' + z + '"]').checked = true;
        msg.textContent = (noms ? noms.join(', ') + ' : ' : '') + 'zone ' + z + ' (' + zoneLib[z] + ').';
      } else if (z === 'AB') {
        msg.textContent = (noms ? noms.join(', ') + ' : ' : '') + 'à la limite des deux zones, confirmée au téléphone selon votre adresse.';
      } else if (data.deps.indexOf(cp.slice(0, 2)) >= 0) {
        msg.textContent = 'Nous intervenons dans votre département. Choisissez la zone ci-dessus ; nous vous la confirmons au téléphone.';
      } else {
        msg.textContent = 'Hors de notre zone habituelle (Seine-Maritime et Eure) : appelez-nous pour savoir si nous pouvons venir.';
      }
    };

    var calculer = function () {
      var o = options[champ('p').value];
      if (!o) return;
      if (mlBox) mlBox.hidden = !o.ml;
      var zone = valeurRadio('z') || 'A';
      var client = valeurRadio('c') || 'part';
      var choixQ = champ('q').value;
      var code = choixQ === 'auto' ? creneauDe(maintenantParis()) : choixQ;
      var cr = parCode[code] || data.creneaux[0];

      var majTxt = cr.maj > 0 ? '+ ' + cr.maj + ' %' : 'tarif de base';
      out('creneau').textContent = (choixQ === 'auto' ? 'Maintenant : ' : '') + cr.libelle + ' (' + majTxt + ')';
      out('zone').textContent = 'Zone ' + zone + ' : ' + zoneLib[zone];
      out('delai').textContent = zone === 'A'
        ? 'Sur place en ' + data.delaiA + ' environ'
        : 'Estimé au téléphone selon votre adresse';
      out('detail').textContent = o.detail;

      var base = zone === 'A' ? o.a : o.b;
      if (base === null || base === undefined) {
        out('px').textContent = 'Sur devis';
        out('unite').textContent = '';
        out('px2').textContent = 'Appelez-nous ou demandez à être rappelé : le prix vous est donné avant toute intervention.';
        return;
      }
      if (o.ml) {
        var m = parseInt(champ('ml').value, 10);
        if (!(m > 0)) m = 0;
        base = base + (zone === 'A' ? o.ml.a : o.ml.b) * m;
      }
      var ht = arrondi(base * (1 + cr.maj / 100));
      var logement = champ('log') ? champ('log').checked : true;
      var taux = (client === 'part' && data.tva.actif && o.r && logement) ? data.tva.reduit : data.tva.normal;
      var ttc = arrondi(ht * (1 + taux / 100));

      if (client === 'pro') {
        out('px').textContent = nf(ht);
        out('unite').textContent = 'HT';
        out('px2').textContent = 'TVA en sus, au taux applicable à vos locaux.';
      } else {
        out('px').textContent = nf(ttc);
        out('unite').textContent = 'TTC';
        out('px2').textContent = 'Soit ' + nf(ht) + ' HT, TVA ' + taux + ' % comprise.';
      }
    };

    form.addEventListener('submit', function (ev) { ev.preventDefault(); calculer(); });
    form.addEventListener('change', calculer);
    form.addEventListener('input', function (ev) {
      if (ev.target.name === 'cp') majZoneDepuisCp();
      calculer();
    });
    calculer();
    /* « Maintenant » suit l'horloge : nouveau calcul chaque minute */
    setInterval(function () { if (champ('q').value === 'auto') calculer(); }, 60000);
    box.classList.add('is-on');
  });
})();
