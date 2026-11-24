/* HYDROFLASH — calculateur de prix (composant CalculateurPrix.astro).
   Données : attribut data-calc (grille tarifaire, zones, TVA), produit à la construction depuis
   src/data/entreprise.ts. Aucun montant n'est écrit ici.
   Particuliers uniquement : prix TTC, le même à toute heure (aucune majoration). Aucun prix pro sur le site.
   Décisions du 24/11/2026. */
(function () {
  'use strict';
  if (window.HF_CALC) return;
  window.HF_CALC = true;
  var d = document;

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
      /* Case « logement de plus de 2 ans » : utile seulement pour une prestation éligible au taux réduit. */
      var tvaBox = box.querySelector('[data-tva]');
      if (tvaBox) tvaBox.hidden = !o.r;
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
      var ht = arrondi(base);
      var logement = champ('log') ? champ('log').checked : true;
      var taux = (data.tva.actif && o.r && logement) ? data.tva.reduit : data.tva.normal;
      var ttc = arrondi(ht * (1 + taux / 100));

      var reduite = data.tva.actif && o.r;
      out('px').textContent = nf(ttc);
      out('unite').textContent = 'TTC';
      out('px2').textContent = 'TVA ' + taux + '\u00a0% comprise'
        + (reduite ? (logement ? ' (logement de plus de 2\u00a0ans).' : ' (logement de moins de 2\u00a0ans).') : '.');
    };

    form.addEventListener('submit', function (ev) { ev.preventDefault(); calculer(); });
    form.addEventListener('change', calculer);
    form.addEventListener('input', function (ev) {
      if (ev.target.name === 'cp') majZoneDepuisCp();
      calculer();
    });
    calculer();
    box.classList.add('is-on');
  });
})();
