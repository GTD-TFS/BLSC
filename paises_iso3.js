(function(){
  'use strict';

  const BY_NAME = {
    "DESCONOCIDO": "XXX",

    "ALBANIA": "ALB",
    "ALEMANIA": "DEU",
    "ANDORRA": "AND",
    "AUSTRIA": "AUT",
    "BELGICA": "BEL",
    "BIELORRUSIA": "BLR",
    "BOSNIA HERZEGOVINA": "BIH",
    "BULGARIA": "BGR",
    "CHIPRE": "CYP",
    "CROACIA": "HRV",
    "DINAMARCA": "DNK",
    "REPUBLICA ESLOVACA": "SVK",
    "ESLOVENIA": "SVN",
    "ESTONIA": "EST",
    "FINLANDIA": "FIN",
    "FRANCIA": "FRA",
    "GRECIA": "GRC",
    "HUNGRIA": "HUN",
    "IRLANDA": "IRL",
    "ISLANDIA": "ISL",
    "ITALIA": "ITA",
    "KOSOVO": "XKX",
    "LETONIA": "LVA",
    "LIECHTENSTEIN": "LIE",
    "LITUANIA": "LTU",
    "LUXEMBURGO": "LUX",
    "MACEDONIA DEL NORTE": "MKD",
    "MALTA": "MLT",
    "MOLDAVIA": "MDA",
    "MONACO": "MCO",
    "MONTENEGRO": "MNE",
    "NORUEGA": "NOR",
    "PAISES BAJOS": "NLD",
    "POLONIA": "POL",
    "PORTUGAL": "PRT",
    "REINO UNIDO": "GBR",
    "REPUBLICA CHECA": "CZE",
    "RUMANIA": "ROU",
    "RUSIA": "RUS",
    "SAN MARINO": "SMR",
    "SERBIA": "SRB",
    "SUECIA": "SWE",
    "SUIZA": "CHE",
    "UCRANIA": "UKR",
    "CIUDAD DEL VATICANO": "VAT",

    "ANTIGUA Y BARBUDA": "ATG",
    "ARGENTINA": "ARG",
    "BAHAMAS": "BHS",
    "BARBADOS": "BRB",
    "BELICE": "BLZ",
    "BOLIVIA": "BOL",
    "BRASIL": "BRA",
    "CANADA": "CAN",
    "CHILE": "CHL",
    "COLOMBIA": "COL",
    "COSTA RICA": "CRI",
    "CUBA": "CUB",
    "DOMINICA": "DMA",
    "ECUADOR": "ECU",
    "EL SALVADOR": "SLV",
    "ESTADOS UNIDOS AMERICA": "USA",
    "GRANADA": "GRD",
    "GUATEMALA": "GTM",
    "GUYANA": "GUY",
    "HAITI": "HTI",
    "HONDURAS": "HND",
    "JAMAICA": "JAM",
    "MEXICO": "MEX",
    "NICARAGUA": "NIC",
    "PANAMA": "PAN",
    "PARAGUAY": "PRY",
    "PERU": "PER",
    "REPUBLICA DOMINICANA": "DOM",
    "SAN CRISTOBAL Y NIEVES": "KNA",
    "SAN VICENTE Y LAS GRANADINAS": "VCT",
    "SANTA LUCIA": "LCA",
    "SURINAM": "SUR",
    "TRINIDAD Y TOBAGO": "TTO",
    "URUGUAY": "URY",
    "VENEZUELA": "VEN",

    "ARGELIA": "DZA",
    "ANGOLA": "AGO",
    "BENIN": "BEN",
    "BOTSUANA": "BWA",
    "BURKINA FASO": "BFA",
    "BURUNDI": "BDI",
    "CABO VERDE": "CPV",
    "CAMERUN": "CMR",
    "CHAD": "TCD",
    "COMORAS": "COM",
    "COSTA DE MARFIL": "CIV",
    "DJIBOUTI": "DJI",
    "EGIPTO": "EGY",
    "ERITREA": "ERI",
    "ESUATINI": "SWZ",
    "ETIOPIA": "ETH",
    "GABON": "GAB",
    "GAMBIA": "GMB",
    "GHANA": "GHA",
    "GUINEA": "GIN",
    "GUINEA BISSAU": "GNB",
    "GUINEA ECUATORIAL": "GNQ",
    "KENIA": "KEN",
    "LESOTO": "LSO",
    "LIBERIA": "LBR",
    "LIBIA": "LBY",
    "MADAGASCAR": "MDG",
    "MALAUI": "MWI",
    "MALI": "MLI",
    "MARRUECOS": "MAR",
    "MAURICIO": "MUS",
    "MAURITANIA": "MRT",
    "MOZAMBIQUE": "MOZ",
    "NAMIBIA": "NAM",
    "NIGER": "NER",
    "NIGERIA": "NGA",
    "REPUBLICA CENTROAFRICANA": "CAF",
    "REPUBLICA CONGO": "COG",
    "REPUBLICA DEMOCRATICA CONGO": "COD",
    "RUANDA": "RWA",
    "SANTO TOME Y PRINCIPE": "STP",
    "SENEGAL": "SEN",
    "SEYCHELLES": "SYC",
    "SIERRA LEONA": "SLE",
    "SAHARA": "ESH",
    "SOMALIA": "SOM",
    "SUDAFRICA": "ZAF",
    "SUDAN": "SDN",
    "SUDAN DEL SUR": "SSD",
    "TANZANIA": "TZA",
    "TOGO": "TGO",
    "TUNEZ": "TUN",
    "UGANDA": "UGA",
    "ZAMBIA": "ZMB",
    "ZIMBABUE": "ZWE",
    "SAHARA OCCIDENTAL": "ESH",

    "AFGANISTAN": "AFG",
    "ARABIA SAUDI": "SAU",
    "ARMENIA": "ARM",
    "AZERBAYAN": "AZE",
    "BANGLADESH": "BGD",
    "BAREIN": "BHR",
    "BIRMANIA": "MMR",
    "BRUNEI": "BRN",
    "BUTAN": "BTN",
    "CAMBOYA": "KHM",
    "CATAR": "QAT",
    "CHINA": "CHN",
    "COREA DEL NORTE": "PRK",
    "COREA DEL SUR": "KOR",
    "EMIRATOS ARABES UNIDOS": "ARE",
    "FILIPINAS": "PHL",
    "GEORGIA": "GEO",
    "INDIA": "IND",
    "INDONESIA": "IDN",
    "IRAK": "IRQ",
    "IRAN": "IRN",
    "ISRAEL": "ISR",
    "JAPON": "JPN",
    "JORDANIA": "JOR",
    "KAZAJISTAN": "KAZ",
    "KIRGUISTAN": "KGZ",
    "KUWAIT": "KWT",
    "LAOS": "LAO",
    "LIBANO": "LBN",
    "MALASIA": "MYS",
    "MALDIVAS": "MDV",
    "MONGOLIA": "MNG",
    "NEPAL": "NPL",
    "OMAN": "OMN",
    "PAKISTAN": "PAK",
    "SINGAPUR": "SGP",
    "SIRIA": "SYR",
    "SRI LANKA": "LKA",
    "TAYIKISTAN": "TJK",
    "TAILANDIA": "THA",
    "TIMOR ORIENTAL": "TLS",
    "TURKMENISTAN": "TKM",
    "TURQUIA": "TUR",
    "UZBEKISTAN": "UZB",
    "VIETNAM": "VNM",
    "YEMEN": "YEM",

    "AUSTRALIA": "AUS",
    "FIYI": "FJI",
    "ISLAS MARSHALL": "MHL",
    "ISLAS SALOMON": "SLB",
    "KIRIBATI": "KIR",
    "MICRONESIA": "FSM",
    "NAURU": "NRU",
    "NUEVA ZELANDA": "NZL",
    "PALAOS": "PLW",
    "PAPUA NUEVA GUINEA": "PNG",
    "SAMOA": "WSM",
    "TONGA": "TON",
    "TUVALU": "TUV",
    "VANUATU": "VUT",

    "ESPAÑA": "ESP"
  };

  function toIso3Entry(name){
    return { name: name, iso3: BY_NAME[name] || null };
  }

  const src = window.PAISES || { featured: [], groups: [] };

  const groups = (src.groups || []).map((g) => ({
    label: g.label,
    items: (g.items || []).map(toIso3Entry)
  }));

  const featured = (src.featured || []).map(toIso3Entry);

  const codeSet = new Set();
  const byIso3 = {};
  Object.keys(BY_NAME).forEach((k) => {
    const c = BY_NAME[k];
    if (c){
      codeSet.add(c);
      if (!byIso3[c]) byIso3[c] = k;
    }
  });

  function _norm(s){
    return String(s || '')
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '');
  }

  function countryNameFromIso3(iso3){
    const code = String(iso3 || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (code.length !== 3) return null;
    return byIso3[code] || null;
  }

  function iso3FromCountryName(name){
    const n = _norm(name);
    if (!n) return null;
    return BY_NAME[n] || null;
  }

  function replaceIso3InText(text){
    const s = String(text || '');
    if (!s) return s;
    return s.replace(/\b([A-Za-z]{3})\b/g, (m, g1) => {
      const n = countryNameFromIso3(g1);
      return n || m;
    });
  }

  function extractCountryFromText(value){
    const v = String(value || '').trim();
    if (!v) return null;
    const direct = countryNameFromIso3(v);
    if (direct) return direct;

    // Caso tipo "MONAGAS-VEN", "CARACAS / VEN", "XXXXX, VEN"
    const tail = v.match(/(?:[-,\/\s])([A-Za-z]{3})\s*$/);
    if (tail){
      const n = countryNameFromIso3(tail[1]);
      if (n) return n;
    }
    return null;
  }

  function normalizeField(value, fieldName){
    const v = String(value || '').trim();
    if (!v) return v;
    const f = _norm(fieldName || '');

    // Si campo objetivo y termina en -ISO3 => SOLO el país
    if (f === _norm('Nacionalidad') || f === _norm('Lugar de nacimiento') || !f){
      const extracted = extractCountryFromText(v);
      if (extracted){
        // Nacionalidad siempre país; lugar también si detectamos patrón ...-ISO
        if (f === _norm('Nacionalidad')) return extracted;
        if (/(?:[-,\/\s])[A-Za-z]{3}\s*$/.test(v)) return extracted;
      }
    }

    const direct = countryNameFromIso3(v);
    if (direct) return direct;
    return replaceIso3InText(v);
  }

  function _fieldNameForEl(el){
    if (!el || !el.getAttribute) return '';
    const k = String(el.getAttribute('data-k') || '').trim();
    if (k) return k;
    const id = String(el.id || '').toLowerCase();
    if (id.includes('nacional')) return 'Nacionalidad';
    if (id.includes('lugar') && id.includes('nac')) return 'Lugar de nacimiento';
    return '';
  }

  function _shouldNormalizeField(name){
    const n = _norm(name);
    return n === _norm('Nacionalidad') || n === _norm('Lugar de nacimiento');
  }

  function _normalizeElement(el){
    if (!el || typeof el.value !== 'string') return;
    if (el.dataset && el.dataset.iso3NormLock === '1') return;
    const fname = _fieldNameForEl(el);
    if (!_shouldNormalizeField(fname)) return;
    const prev = String(el.value || '');
    const next = normalizeField(prev, fname);
    if (!next || next === prev) return;
    if (el.dataset) el.dataset.iso3NormLock = '1';
    el.value = next;
    try{
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }catch{}
    if (el.dataset) setTimeout(() => { try{ delete el.dataset.iso3NormLock; }catch{} }, 0);
  }

  function normalizeDomFields(root){
    const host = root || document;
    const sel = [
      'input[data-k=\"Nacionalidad\"]',
      'input[data-k=\"Lugar de nacimiento\"]',
      'textarea[data-k=\"Nacionalidad\"]',
      'textarea[data-k=\"Lugar de nacimiento\"]',
      'select[data-k=\"Nacionalidad\"]',
      'select[data-k=\"Lugar de nacimiento\"]',
      'input[id*=\"nacional\" i]',
      'input[id*=\"lugar\" i][id*=\"nac\" i]',
      'textarea[id*=\"nacional\" i]',
      'textarea[id*=\"lugar\" i][id*=\"nac\" i]'
    ].join(',');
    host.querySelectorAll(sel).forEach(_normalizeElement);
    _syncPickerCountryInputs(host);
    _collapseEditorsInitial(host);
  }

  function _findPickerPanelForAnchor(anchor){
    if (!anchor || !anchor.parentElement) return null;
    const wrap = anchor.parentElement;
    let panel = wrap.nextElementSibling;
    if (panel && panel.classList && panel.classList.contains('domicilio-panel-compa')) return panel;
    panel = anchor.nextElementSibling;
    if (panel && panel.classList && panel.classList.contains('domicilio-panel-compa')) return panel;
    return null;
  }

  function _setPickerCountryFromAnchor(anchor){
    const field = _fieldNameForEl(anchor);
    if (!_shouldNormalizeField(field)) return;
    const country = extractCountryFromText(anchor.value) || countryNameFromIso3(anchor.value);
    if (!country) return;
    const panel = _findPickerPanelForAnchor(anchor);
    if (!panel) return;
    const countryInput = panel.querySelector('input[type="text"]');
    if (!countryInput) return;
    if (String(countryInput.value || '').trim().toUpperCase() === country) return;
    countryInput.value = country;
    try{
      countryInput.dispatchEvent(new Event('input', { bubbles: true }));
      countryInput.dispatchEvent(new Event('change', { bubbles: true }));
    }catch{}
  }

  function _syncPickerCountryInputs(root){
    const host = root || document;
    const anchors = host.querySelectorAll('input[data-k="Lugar de nacimiento"], input[data-k="Domicilio"]');
    anchors.forEach(_setPickerCountryFromAnchor);
  }

  function _collapsePanel(panel){
    if (!panel || !panel.classList || !panel.classList.contains('domicilio-panel-compa')) return;
    if (panel.dataset && panel.dataset.iso3CollapsedOnce === '1') return;
    panel.style.display = 'none';
    const wrap = panel.previousElementSibling;
    if (wrap){
      const btn = wrap.querySelector('button[aria-expanded]');
      if (btn){
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '✏️';
      }
    }
    if (panel.dataset) panel.dataset.iso3CollapsedOnce = '1';
  }

  function _collapseEditorsInitial(root){
    const host = root || document;
    host.querySelectorAll('.domicilio-panel-compa').forEach(_collapsePanel);
  }

  function installAutoNormalizer(){
    if (typeof document === 'undefined') return;

    const onAnyInput = (ev) => {
      _normalizeElement(ev.target);
    };

    document.addEventListener('input', onAnyInput, true);
    document.addEventListener('change', onAnyInput, true);

    const run = () => normalizeDomFields(document);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();

    if (typeof MutationObserver !== 'undefined'){
      const mo = new MutationObserver((mut) => {
        for (const m of mut){
          if (m.type === 'childList' && m.addedNodes && m.addedNodes.length){
            for (const n of m.addedNodes){
              if (!(n instanceof Element)) continue;
              if (n.matches && (n.matches('input,textarea,select') || n.querySelector('input,textarea,select'))){
                normalizeDomFields(n);
              }
            }
          }
        }
      });
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }

    // fallback suave por si el render reemplaza valores sin mutar nodos
    setInterval(run, 900);
  }

  window.PAISES_ISO3 = {
    featured,
    groups,
    byName: BY_NAME,
    byIso3: byIso3,
    codes: Array.from(codeSet).sort(),
    countryNameFromIso3,
    iso3FromCountryName,
    replaceIso3InText,
    normalizeField,
    extractCountryFromText,
    normalizeDomFields
  };

  installAutoNormalizer();
})();
