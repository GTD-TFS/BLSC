(function(){
  const STYLE_ID = "denupol-casebundle-style";

  const INDICATIVOS = [
    "AMÉRICA 1","AMÉRICA 10","AMÉRICA 101","AMÉRICA 103","AMÉRICA 11","AMÉRICA 111","AMÉRICA 112","AMÉRICA 113","AMÉRICA 114","AMÉRICA 115","AMÉRICA 116","AMÉRICA 117","AMÉRICA 118","AMÉRICA 12","AMÉRICA 13","AMÉRICA 14","AMÉRICA 15","AMÉRICA 16","AMÉRICA 17","AMÉRICA 2","AMÉRICA 21","AMÉRICA 22","AMÉRICA 23","AMÉRICA 3","AMÉRICA 31","AMÉRICA 32","AMÉRICA 33","AMÉRICA 34","AMÉRICA 35","AMÉRICA 36","AMÉRICA 37","AMÉRICA 4","AMÉRICA 41","AMÉRICA 42","AMÉRICA 43","AMÉRICA 5","AMÉRICA 51","AMÉRICA 52","AMÉRICA 53","AMÉRICA 54","AMÉRICA 55","AMÉRICA 56","AMÉRICA 57","AMÉRICA 6","AMÉRICA 61","AMÉRICA 62","AMÉRICA 63","AMÉRICA 7","AMÉRICA 71","AMÉRICA 72","AMÉRICA 73","AMÉRICA 74","AMÉRICA 75","AMÉRICA 76","AMÉRICA 77","AMÉRICA 8","AMÉRICA 81","AMÉRICA 82","AMÉRICA 83","AMÉRICA 9","AMÉRICA 91","AMÉRICA 92","AMÉRICA 93","AMÉRICA 94","AMÉRICA 95","AMÉRICA 96","AMÉRICA 97","AMÉRICA102","CHACAL 1","CHACAL 2","CHACAL 3","CHACAL 4","FARO-ADEJE","PUMA-NOCHE","RUTA ADEJE 1","RUTA ADEJE 2","RUTA ADEJE 3","RUTA ADEJE 4","TROYA 1","TROYA 11","TROYA 12","TROYA 13","TROYA 21","TROYA 22","TROYA 23"
  ];

  const CLASES_ACTUACION = ["HECHOS POLICIALES","IDENTIFICADOS","RECLAMADOS","INFRACCIONES","DELITOS"];
  const TIPOS_POR_CLASE = {
    "DELITOS": ["ABANDONO DE ANIMALES DOMÉSTICOS","ABANDONO DESTINO/OMISIÓN DEBER PERSEGUIR DELITOS","ABANDONO FAMILIA","ABANDONO MENOR DE EDAD","ABORTO","ABUSO SEXUAL","ABUSO SEXUAL CON PENETRACIÓN","ACCESO FRAUDULENTO A SERVICIOS DE RADIODIFUSIÓN/TV/OTROS","ACCESO ILEGAL INFORMÁTICO","ACOSO CONTRA LA LIBERTAD DE LAS PERSONAS","ACOSO INMOBILIARIO","ACOSO LABORAL O FUNCIONARIAL","ACOSO SEXUAL","ACUSACION DENUNCIA FALSA","ADMINISTRACIÓN DESLEAL","ADOCTRINAMIENTO, ADIESTRAMIENTO, CAPACITACIÓN TERRORISMO","ADOPCIÓN ILEGAL (trafico de niños)","AGRESIÓN SEXUAL","AGRESIÓN SEXUAL CON PENETRACIÓN","ALLANAMIENTO DE MORADA","ALTERACION DE PRECIOS CONCURSOS/SUBASTAS","AMENAZAS","AMENAZAS A GRUPO ÉTNICO CULTURAL O RELIGIOSO","APROPIACION INDEBIDA","APROPIACIÓN INDEBIDA DE VEHÍCULOS","ASESINATO","ASOCIACIÓN ILÍCITA","ASOCIACIÓN ILÍCITA CON FINES DE ODIO Y DISCRIMINACION","ATAQUES INFORMÁTICOS","ATENTADO AUTORIDAD, AGENTES O FUNC. PUBLICO","BLANQUEO DE CAPITALES","CALUMNIAS","CAZA","COACCIONES","COHECHO","CONDUCCIÓN A VELOCIDAD EXCESIVA","CONDUCCIÓN BAJO INFLUENCIA DROGAS/ALCOHOL","CONDUCCIÓN TEMERARIA","CONDUCIR SIN PERMISO O LICENCIA","CONTRA EL DERECHO DE LOS CIUDADANOS EXTRANJEROS","CONTRA EL DERECHO DE LOS TRABAJADORES","CONTRA EL HONOR","CONTRA EL ORDEN PUBLICO","CONTRA EL PATRIMONIO HISTÓRICO","CONTRA EL PATRIMONIO Y EL ORDEN SOCIOECONOMICO","CONTRA EL RESPETO A LOS DIFUNTOS","CONTRA LA ADMINISTRACCION DE JUSTICIA","CONTRA LA ADMINISTRACCION PUBLICA","CONTRA LA COMUNIDAD INTERNACIONAL","CONTRA LA CONSTITUCION","CONTRA LA HACIENDA DE LA UNIÓN EUROPEA","CONTRA LA HACIENDA PÚBLICA","CONTRA LA HACIENDA PUBLICA Y LA SEGURIDAD SOCIAL","CONTRA LA LIBER. E INDEM. SEXUAL","CONTRA LA LIBERTAD","CONTRA LA LIBERTAD DE CONCIENCIA Y LOS SENTIMIENTOS RELIGIOSOS","CONTRA LA SEGURIDAD COLECTIVA","CONTRA LA SEGURIDAD DEL TRAFICO","CONTRA LA SEGURIDAD SOCIAL","CONTRA LOS DERECHOS TRABAJADORES","CORRUPCIÓN DE MENORES/INCAPACITADOS","CORRUPCIÓN EN EL DEPORTE","CORRUPCIÓN EN LOS NEGOCIOS","CREAR GRAVE RIESGO PARA LA CIRCULACION","DAÑOS","DAÑOS EN VEHÍCULO","DE LAS ORGANIZACIONES Y GRUPOS CRIMINALES","DEFRAUDACIÓN FLUIDO ELECTRICO O ANÁLOGAS","DELITO DE CONTACTO MEDIANTE TECNOLOGÍA CON MENOR DE 16 AÑOS CON FINES SEXUALES","DELITO DE RIESGO CATASTRÓFICO","DELITOS CONTRA LA DEFENSA NACIONAL","DELITOS CONTRA LA PAZ O INDEPENDENCIA DEL ESTADO","DELITOS CONTRA LA PROPIEDAD INDUSTRIAL","DELITOS CONTRA LA PROPIEDAD INTELECTUAL","DELITOS RELATIVOS A LA PROSTITUCIÓN (coaccion/lucro sobre la prostitucion)","DELITOS SOBRE LA ORDENACIÓN DEL TERRITORIO Y EL URBANISMO","DELITOS SOCIETARIOS","DESCUBRIMIENTO Y REVELACIÓN DE SECRETOS E INFORMACIONES RELATIVAS A LA DEFENSA NACIONAL","DESCUBRIMIENTO/REVELACIÓN DE SECRETOS","DESOBEDIENCIA/DENEGACIÓN DE AUXILIO","DESORDENES PÚBLICOS","DETENCIÓN ILEGAL","DISCRIMINACIÓN","EMISIONES, VERTIDOS, DEPÓSITOS TÓXICOS ETC (Emisiones a la atmosfera)","ENCUBRIMIENTO","ESTAFA BANCARIA","ESTAFA DE INVERSORES","ESTAFA O FRAUDE PRESTACIONES SEG. SOCIAL","ESTAFA PROCESAL","ESTAFAS CON TARJETAS DE CRÉDITO, DEBITO Y CHEQUE DE VIAJE","EUTANASIA ACTIVA","EVASIÓN DE ESTABLECIMIENTO PENITENCIARIO","EXHIBICIONISMO","EXPLOTACIÓN DE LA MEDICIDAD","EXTORSIÓN","FABRICACIÓN, TRÁFICO Y DEPÓSITO DE ARMAS Y EXPLOSIVOS","FABRICACIÓN/TENENCIA DE UTILES PARA FALSIFICAR","FALSEDAD CONDICIONES OBTENCIÓN SUBVENCIÓN","FALSEDADES","FALSIFICACIÓN MONEDA, SELLOS Y EF. TIMBRADOS","FALSIFICACIÓN/TRÁFICO DE DNI/PASAPORTE","FALSIFICACIÓN/TRÁFICO TARJETAS CRÉDITO Y DEBITO/CHEQUES VIAJE","FINANCIACIÓN DEL TERRORISMO","FINANCIACIÓN ILEGAL PARTIDOS POLÍTICOS","FRAUDES Y EXACCIONES ILEGALES","FRUSTRACIÓN DE LA EJECUCIÓN","GENOCIDIO","HOMICIDIO (homicidio doloso)","HOMICIDIO IMPRUDENTE","HOMICIDIO Y SUS FORMAS","HURTO","HURTO DE VEHÍCULOS A MOTOR","HURTO EN EL INTERIOR DE VEHICULO","IMPAGO PRESTACIONES ECONÓMICAS","INCENDIOS","INCENDIOS FORESTALES","INDUCCION DE MENORES AL ABANDONO DE DOMICILIO","INDUCCIÓN/COOPERACIÓN SUICIDIO","INFIDELIDAD CUSTODIA DOCUMENTOS/VIOLAC. SECRETOS","INJURIAS","INSOLVENCIA PUNIBLE","INTIMIDAD, PROPIA IMAGEN, INVIOLABILIDAD DE DOMICILIO","INTRUSISMO","LESA HUMANIDAD","LESIONES","LESIONES AL FETO","MALOS TRATOS ÁMBITO FAMILIAR","MALOS TRATOS DE OBRA SIN LESIÓN","MALOS TRATOS HABITUALES AMB. FAMILIAR","MALTRATO DE ANIMAL DOMÉSTICO","MALVERSACIÓN","MANIPULACION GENETICA","MANIPULACION GENÉTICA","MAQUINACIONES PARA ALTERAR PRECIOS","MATRIMONIO FORZADO","MATRIMONIO ILEGAL","MUTILACION GENITAL","NEGATIVA SOMETIMIENTO A PRUEBAS LEGALES","NEGOCIOS O ACTIVIDADES PROHIBIDAS/ABUSOS","OBSTRUCCION A LA JUSTICIA","OBTENCIÓN, TRASPLANTE O TRÁFICO ILEGAL DE ÓRGANOS","OCUPACIÓN DE INMUEBLES","OMISION DEL DEBER DE SOCORRO","ORDENACION DEL TERRITORIO, PROTECCION PATRIMONIO HISTORICO/MEDIO AMBIENTE/FLORA/FAUNA Y OTROS","OTRAS ESTAFAS","OTRAS FALSIFICACIONES DOCUMENTOS","OTRAS FALTAS","OTROS CONTRA LA ADMON. DE JUSTICIA","OTROS CONTRA LA COMUNIDAD INTERNACIONAL","OTROS CONTRA LA CONSTITUCIÓN","OTROS CONTRA LA SALUD PÚBLICA","OTROS CONTRA LA SEGURIDAD DEL TRAFICO","OTROS CONTRA RECURSOS NATURALES Y MEDIO AMBIENTE","OTROS RELATIVOS AL MERCADO/CONSUMIDORES","OTROS RELATIVOS PROTECCIÓN FLORA Y FAUNA","PESCA","PIRATERIA","PORNOGRAFÍA DE MENORES","PREVARICACIÓN ADMINISTRATIVA","PREVARICACIÓN JUDICIAL","PREVARICACIÓN URBANISTICA","PROVOCACIÓN SEXUAL","QUEBRANTAMIENTO DE CONDENA","QUEBRANTAMIENTO DE LOS DEBERES DE CUSTODIA","QUEBRANTAMIENTO DE ORDEN DE PROTECCION Y ALEJAMIENTO","REALIZACIÓN ARBITRARIA DEL PROPIO DERECHO","RECEPTACIÓN/OTRAS COND. AFINES","RELACIONES FAMILIARES","RESISTENCIA/DESOBEDIENCIA","REUNIÓN, MANIFESTACIÓN ILEGAL","RIÑA TUMULTUARIA","ROBO CON FUERZA EN LAS COSAS","ROBO CON FUERZA EN LAS COSAS EN EL INTERIOR DE VEHICULO","ROBO CON VIOLENCIA O INTIMIDACION","ROBO DE VEHÍCULOS A MOTOR","SECUESTRO","SEDICIÓN","SIMULACION DE DELITO","SUPOSICIÓN DE PARTO/SUSTITUCIÓN DE NIÑOS","SUSTRACCIÓN DE COSA PROPIA","SUSTRACCION DE MENORES","TENENCIA DE ARMAS Y EXPLOSIVOS.","TERRORISMO","TORTURA","TORTURA Y OTROS CONTRA LA INTEGRIDAD MORAL","TRÁFICO DE DROGAS","TRAFICO ILEGAL/INMIGRACION CLANDESTINA","TRÁFICO INFLUENCIAS","TRAICIÓN","TRAICION, CONTRA LA PAZ-INDEPENDENCIA DEL ESTADOY RELATIVOS A LA DEFENSA NACIONAL","TRASLADO/ESTABLECIMIENTO TERRITORIO CONTROLADO GRUPO TERRORISTA","TRATA DE SERES HUMANOS CON FINES DE EXPLOTACIÓN LABORAL","TRATA DE SERES HUMANOS CON FINES DE EXPLOTACIÓN SEXUAL","TRATA DE SERES HUMANOS CON FINES DE EXTRACCIÓN ORGANOS CORPORALES","TRATA DE SERES HUMANOS PARA MATRIMONIOS FORZADOS","TRATA DE SERES HUMANOS PARA REALIZAR ACTIVIDADES DELICTIVAS","TRATO DEGRADANTE","USO INDEBIDO UNIFORME, TRAJE E INSIGNIA","USURPACIÓN","USURPACIÓN DE ESTADO CIVIL","USURPACIÓN DE FUNCIONES PÚBLICAS","VEJACIONES LEVES"],
    "HECHOS POLICIALES": ["ABSENTISMO ESCOLAR","ACCIDENTE LABORAL","ACTUACIONES MENORES/INCAPACES EN SITUACIÓN DE RIESGO","AHOGADOS","ATROPELLO DE TREN","AVERIGUACIONES DE DOMICILIO Y PARADERO","COMPROBACIÓN DE ALARMAS","COMUNICACION INFORMACION BASE SIAPSRN","CONCENTRACIÓN LEGAL","DESAPARICIÓN DE PERSONAS","DESCUBRIMIENTO DE CADAVER Y RESTOS HUMANOS IDENTIFICADOS","DESCUBRIMIENTO DE RESTOS HUMANOS SIN IDENTIFICAR","HECHOS DE CARACTER NO PENAL CON FINES DE ODIO Y DISCRIMINACIÓN","HECHOS POLICIALES","INCENDIOS FORESTALES FORTUITOS","INCENDIOS FORTUITOS","INSPECCIONES DE ESTABLECIMIENTOS","INTERVENCIONES EN DESAHUCIOS","MANIFESTACIÓN LEGAL","MUERTE EN INMIGRACION IRREGULAR","MUERTE POR SOBREDOSIS","OTROS AUXILIOS ADMINISTRATIVOS Y AUTORIDAD JUDICIAL","OTROS HECHOS DE INTERES POLICIAL","PÉRDIDA/EXTRAVIO DE OBJETOS/DOCUMENTACIÓN","PUNTO DE VENTA DE DROGA DESACTIVADO","RECUPERACIÓN DE OBJETOS/DOCUMENTACIÓN DE PROCEDENCIA DESCONOCIDA","REINTEGRO DE PERSONAS","RESCATES Y SALVAMENTOS","SERVICIOS HUMANITARIOS","SUICIDIO"],
    "INFRACCIONES": ["ACTIVIDADES CONTRARIAS A LA SEG.NACIONAL","ACTOS RACISTAS, XENÓFOBOS E INTOLERANTES EN EL DEPORTE","AGRESIÓN O INSULTO A POLICÍAS O VIGILANTES DE SEGURIDAD EN COMPETICIONES DEPORTIVAS","AGRESIÓN O INTENTO ÁRBITROS, JUGADORES O LINIERES EN COMPETICIONES DEPORTIVAS","APEDREAR AUTOBUSES DE TRANSPORTE EN COMPETICIONES DEPORTIVAS","art. 35.1 REUNION/MANIFESTACION PROHIBIDA/NO COMUNICA EN INSTALACION ESTRATEGICA Y/O SOBREVUELO","art. 35.2 FABRICA/TENENCIA DE ARMAS/EXPLOSIVOS CON PERJUICIO GRAVE","art. 35.3 ESPECTACULOS PROHIBIDOS","art. 35.4 PROYECCION HACES DE LUZ PILOTOS/CONDUCTORES TRANSPORTE","art. 36.1 PERTURBACION DE SEGURIDAD CIUDADANA EN ACTOS PÚBLICOS","art. 36.10 PORTAR/EXHIBIR/USAR ARMAS PROHIBIDAS","art. 36.11 SOLICITUD/ACEPTACION SERVICIOS SEXUALES RETRIBUIDOS","art. 36.12 FABRICA/TENENCIA DE ARMAS/EXPLOSIVOS","art. 36.13 NEGATIVA INSPECCION ESTABLECIMIENTO","art. 36.14 USO PÚBLICO INDEBIDO UNIFORME/INSIGNIAS OFICIALES","art. 36.15 FALTA/NEGATIVA COLABORACION CON FF Y CC S","art. 36.16 CONSUMO/TENENCIA DROGAS EN VIAS PUBLICAS/ESTABLECIMIENTO/TRANSPORTE- ABANDONO DE INSTRUME","art. 36.17 TRASLADOS FACILITACION CONSUMO DROGAS (CUNDAS)","art. 36.18 PLANTACION DROGAS LUGAR VISIBLE AL PUBLICO","art. 36.19 TOLERANCIA CONSUMO DROGAS /ESTABLECIMIENTOSLOCALES","art. 36.2 PERTURBACION GRAVE SEDE CONGRESO/SENADO/ASAMBLEA","art. 36.20 CARENCIA REGISTROS ACTIVIDADES","art. 36.21 ALEGACION DATOS FALSOS PARA OBTENCION DOCUMENTACION","art. 36.22 IMCUMPLIR RESTRICCIONES NAVEGACION MAR/AIRE","art. 36.23 USO DATOS/IMÁGENES AUTORIDADES/FF Y CC DE S","art. 36.3 DESORDENES PÚBLICOS CON MOBILIARIO URBANO/VEHICULO/OBJETOS","art. 36.4 OBSTRUCCION AUTORIDAD/EMPLEADO PUBLICO EJERCICIO FUNCIONES","art. 36.5 OBSTACULALIZACION SERVICIOS EMERGENCIAS","art. 36.6 RESISTENCIA/DESOBEDIENCIA AUTORIDAD- NEGATIVA A IDENTIFICACION","art. 36.7 NEGATIVA DISOLUCION REUNION/MANIFESTACION","art. 36.8 PERTURBACION REUNION/MANIFESTACION LÍCITA","art. 36.9 INTRUSION/SOBREVUELO EN INFRAESTRUCTURA SERVICIOS BASICOS","art. 37.1 REUNION/MANIFESTACION NO COMUNICADAS/PROHIBIDAS","art. 37.10 OBLIGACION OBTENCION DNI -NEGLIGENCIA PERDIDA/SUSTRACCION","art. 37.11 3º o + PERDIDA/DETERIORO DNI EN 1 AÑO","art. 37.12 NEGATIVA A RETIRADA DNI","art. 37.13 DAÑOS/DESLUCIMIENTO BIENES MUEBLES/INMUEBLES","art. 37.14 ESCALO DE EDIFICIOS/MONUMENTOS","art. 37.15 REMOCION PRECINTOS/VALLAS COLOCADOS FF Y CC DE S","art. 37.16 LIBERAR ANIMAL /FEROZDAÑINO -ABANDONO ANIMAL DOMESTICO","art. 37.17 CONSUMO DE BEBIDAS ALCOHOLICAS LUGARES PUBLICOS","art. 37.2 EXHIBICION OBJETOS PELIGROSOS ÁNIMO INTIMIDATORIO","art. 37.3 INCUMPLIMIENTO RESTRICCIONES PEATONALES","art. 37.4 FALTA RESPETO/CONSIDERACION A FF Y CC DE S.","art. 37.5 REALIZAR O INCITAR ACTOS OBSCENOS CONTRA LIB SEXUAL","art. 37.6 PROYECTAR HACES DE LUZ A FF Y CC DE S","art. 37.7 OCUPACION/PERMANENCIA INMUEBLE/VENTA AMBULANTE NO AUTORIZADA","art. 37.8 OMISION/CONSERVACION DOCUMENTOS ARMAS/EXPLOSIVOS- NO COMUNICAR PERDIDA","art. 37.9 IRREGULARIDAD REGISTROS/DATOS FALSOS- OMISION COMUNICACIÓN EN PLAZOS","CONDENA POR DELITO CON PRIV.LIB.SUP.A UN AÑO","CONDUCTA INDECOROSA EN COMPETICIONES DEPORTIVAS","CONSUMO DE SUSTANCIAS ESTUPEFACIENTES EN COMPETICIONES DEPORTIVAS","CONSUMO, INTRODUCCIÓN DE BEBIDAS ALCOHÓLICAS O/ VENTA DE ENVASES RÍGIDOS EN COMPETICIONES DEPORTIVA","CONTRA LA LEY DE EXTRANJERIA","CONTRABANDO OBRAS DE ARTE","DAÑOS A INSTALACIONES EN RECINTOS DEPORTIVOS","DISPOSICIÓN AUT. GUBERNATIVA","EJECUCIÓN DE EXPULSIÓN POR NO HABER ABANDONADO EL TERRITORIO NACIONAL EN EL PLAZO CONCEDIDO","ENTRADA ILEGAL / INTERCEPTACIONES EN FRONTERAS","ESTANCIA IRREGULAR","EXPULSION DE CONDENADOS","EXPULSION JUDICIAL","EXTRANJERO NO ADMISIBLE (SIS)","INCOACIÓN DE EXPEDIENTE O EXPULSIÓN DE COMUNITARIOS","INFRACCIÓN A LA LEGISLACIÓN SOBRE CASINOS Y SALAS DE JUEGO","INFRACCIÓN A LA LEGISLACIÓN SOBRE LOTERÍAS Y APUESTAS","INFRACCIÓN A LA LEGISLACIÓN SOBRE MÁQUINAS RECREATIVAS Y DE AZAR","INFRACCIÓN A LA LEGISLACIÓN SOBRE RIFAS Y TÓMBOLAS","INFRACCIÓN A LA NORMATIVA SOBRE ACAMPADAS Y ALOJAMIENTOS TURÍSTICOS","INFRACCIÓN A LA NORMATIVA SOBRE AGUAS","INFRACCIÓN A LA NORMATIVA SOBRE ASOCIACIONES","INFRACCIÓN A LA NORMATIVA SOBRE CAZA","INFRACCIÓN A LA NORMATIVA SOBRE COMERCIO O REPARACIÓN DE OBJETOS USADOS","INFRACCIÓN A LA NORMATIVA SOBRE COMPRAVENTA DE JOYAS Y METALES PRECIOSOS","INFRACCIÓN A LA NORMATIVA SOBRE CONTAMINACIÓN ATMOSFÉRICA","INFRACCIÓN A LA NORMATIVA SOBRE COSTAS","INFRACCIÓN A LA NORMATIVA SOBRE DESGUACE DE VEHÍCULOS DE MOTOR","INFRACCIÓN A LA NORMATIVA SOBRE ESPACIOS NATURALES, FLORA Y FAUNA","INFRACCIÓN A LA NORMATIVA SOBRE HOSPEDAJE","INFRACCIÓN A LA NORMATIVA SOBRE MINAS","INFRACCIÓN A LA NORMATIVA SOBRE MONTES","INFRACCIÓN A LA NORMATIVA SOBRE PATRIMONIO HISTÓRICO","INFRACCIÓN A LA NORMATIVA SOBRE PESCA","INFRACCIÓN A LA NORMATIVA SOBRE PROTECCION CIVIL","INFRACCIÓN A LA NORMATIVA SOBRE PROTECCIÓN DE DATOS DE CARÁCTER PERSONAL","INFRACCIÓN A LA NORMATIVA SOBRE PROTECCIÓN DE MENORES","INFRACCIÓN A LA NORMATIVA SOBRE RESIDUOS Y VERTIDOS","INFRACCIÓN A LA NORMATIVA SOBRE URBANISMO Y ORDENACIÓN DE PATRIMONIO","INFRACCIÓN A LA NORMATIVA SOBRE VÍAS PECUARIAS","INFRACCION NORMATIVA ACÚSTICA","INFRACCIÓN NORMATIVA ANIMALES DE COMPAÑÍA Y PELIGROS","INFRACCIÓN NORMATIVA ESPECTÁCULOS TAURINOS","INFRACCIÓN NORMATIVA FINANCIERA, IVA Y OTROS TRIBUTOS","INFRACCIÓN NORMATIVA IMPUESTOS ESPECIALES","INFRACCIÓN NORMATIVA MERCADO DE TABACO","INFRACCION NORMATIVA SANIDAD ANIMAL, EPIZOOTIAS Y MATADEROS","INFRACCION NORMATIVA SANIDAD Y CONSUMO","INFRACCIÓN NORMATIVA SEGURIDAD AEROPORTUARIA Y NAVEGACIÓN AEREA","INFRACCIÓN NORMATIVA SOBRE ARMAS","INFRACCIÓN NORMATIVA SOBRE EXPLOSIVOS","INFRACCIÓN NORMATIVA TELECOMUNICACIONES","INFRACCIONES","INTRODUCIR ARMAS U OBJETOS CONTUNDENTES EN COMPETICIONES DEPORTIVAS","INVASIÓN DEL TERRENO DE JUEGO","L.O. 4/2015 DE PROTECCIÓN DE LA SEGURIDAD CIUDADANA","LANZAMIENTO DE OBJETOS EN COMPETICIONES DEPORTIVAS","LEGISLACION ESPECIAL","LEGISLACION SOBRE CONTROL DE CAMBIOS","LEGISLACION SOBRE EL JUEGO","LEGISLACION SOBRE ESTABLECIMIENTOS, ESPECTACULOS PUBLICOS Y ACTIVIDADES RECREATIVAS","LEGISLACION SOBRE MARINA MERCANTE","LEGISLACION SOBRE REGIMEN ELECTORAL","LEGISLACION SOBRE SEGURIDAD PRIVADA","LEY 19/07 NORMATIVA VIOLENCIA EN EL DEPORTE","LEY TRIBUNAL DEL JURADO","OTRA INFRACCIÓN A LA LEGISLACIÓN SOBRE JUEGO","OTRA LEGISLACIÓN ESPECIAL","OTRAS CAUSAS DE EXPULSION","OTRAS INFRACCIONES","OTRAS INFRACCIONES LEGISLACION SOBRE CONTRABANDO","OTRAS LEYES ESPECIALES","OTROS CONTRA LA LEY DE EXTRANJERÍA","OTROS CONTRA LOS RECURSOS NATURALES, EL MEDIO AMBIENTE Y LA PROTECCION DE LA FLORA Y LA FAUNA","OTROS HECHOS INFRACCIÓN LEY DEPORTE Y LEY 19/07","PANCARTAS O PROPAGANDA INCITANDO A LA VIOLENCIA EN COMPETICIONES DEPORTIVAS","PETARDOS, BENGALAS O BOTES DE HUMO EN COMPETICIONES DEPORTIVAS","PROMOVER O PARTICIPAR EN ALTERCADOS EN COMPETICIONES DEPORTIVAS","QUEBRANTAR PROHIBICION DE ENTRADA"],
    "IDENTIFICADOS": ["IDENTIFICACION LO 4/2015"],
    "RECLAMADOS": ["DETENIDOS POR RECLAMACIÓN POLICIAL","DETENIDOS POR RECLAMACIÓN JUDICIAL NACIONAL","DETENIDOS POR RECLAMACIÓN JUDICIAL INTERNACIONAL"]
  };

  function nowDateISO(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function nowTimeHHMM(){
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  function fromDDMMYYYY(v){
    const m = String(v || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  }

  function toDDMMYYYY(v){
    const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  }

  function safeJSON(v){ try { return JSON.parse(JSON.stringify(v)); } catch(_) { return null; } }
  function existingData(){
    try { if (typeof state !== "undefined" && state && state.lastJson && typeof state.lastJson === "object") return safeJSON(state.lastJson) || {}; } catch(_) {}
    return {};
  }

  function normalizeAgents(text){ return String(text || "").split(/[;,\n]/).map(s => s.trim()).filter(Boolean); }
  function normalizeIndicativos(v){
    if (Array.isArray(v)) return v.map(x => String(x || "").trim()).filter(Boolean);
    return String(v || "").split(/[;\n,]+/).map(x => x.trim()).filter(Boolean);
  }
  function keyNorm(s){ return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

  function ensureCallejero(){
    return new Promise((resolve) => {
      if (window.CALLEJERO && typeof window.CALLEJERO === "object") return resolve(true);
      const id = "cbm-callejero-loader";
      if (document.getElementById(id)) {
        let tries = 0;
        const t = setInterval(() => {
          tries += 1;
          if (window.CALLEJERO && typeof window.CALLEJERO === "object") { clearInterval(t); resolve(true); }
          if (tries > 30) { clearInterval(t); resolve(false); }
        }, 100);
        return;
      }
      const sc = document.createElement("script");
      sc.id = id;
      sc.src = "js/calles.js";
      sc.async = true;
      sc.onload = () => resolve(!!window.CALLEJERO);
      sc.onerror = () => resolve(false);
      document.head.appendChild(sc);
    });
  }

  function getStreetsByMunicipio(m){
    const map = window.CALLEJERO || {};
    const town = map[m] || {};
    const out = [];
    Object.keys(town).forEach(tipo => {
      const arr = Array.isArray(town[tipo]) ? town[tipo] : [];
      arr.forEach(raw => out.push({ tipoVia: String(tipo || "").toUpperCase(), calleRaw: String(raw || "") }));
    });
    return out;
  }

  function stripTipoFromStreet(name, tipoVia){
    const s = String(name || "").trim();
    const t = String(tipoVia || "").trim();
    if (!s || !t) return s.toUpperCase();
    const re = new RegExp(`^${t}\\s+`, "i");
    return s.replace(re, "").trim().toUpperCase();
  }

  function createStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = `
      .cbm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.54);z-index:400000;display:none;align-items:flex-end;justify-content:center;overscroll-behavior:contain}
      .cbm-overlay.open{display:flex}
      .cbm-panel{width:min(760px,calc(100vw - 12px));max-height:92vh;overflow:auto;overflow-x:hidden;overscroll-behavior:contain;background:linear-gradient(165deg,var(--glass-a),var(--glass-b));color:var(--ink);border:1px solid var(--line-soft);border-radius:24px 24px 0 0;padding:14px 14px 92px;font-family:'Inter','Segoe UI',sans-serif;backdrop-filter:blur(var(--blur));-webkit-backdrop-filter:blur(var(--blur));box-shadow:var(--shadow-inner),var(--shadow-outer)}
      .cbm-grid{display:grid;grid-template-columns:1fr;gap:10px}
      .cbm-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .cbm-row > div{min-width:0}
      .cbm-lbl{font-size:12px;font-weight:700;color:var(--ink);margin:2px 0}
      .cbm-in,.cbm-sel,.cbm-ta{display:block;width:100%;max-width:100%;min-width:0;min-height:44px;border-radius:var(--radius-sm);border:1px solid var(--line-soft);background:linear-gradient(165deg,rgba(244,247,252,.2),rgba(223,229,239,.12));color:var(--ink);padding:9px 10px;font-size:15px;box-sizing:border-box}
      #cbmFecha,#cbmHora{-webkit-appearance:none;appearance:none;min-width:0}
      .cbm-sec{border:1px solid var(--line-soft);border-radius:var(--radius-md);padding:10px;margin-top:10px}
      .cbm-sec h3{margin:0 0 8px;font-size:14px}
      .cbm-actions{position:fixed;left:0;right:0;bottom:0;background:linear-gradient(165deg,var(--glass-a),var(--glass-b));border-top:1px solid var(--line-soft);padding:10px;display:flex;gap:8px;z-index:400001;backdrop-filter:blur(var(--blur));-webkit-backdrop-filter:blur(var(--blur))}
      .cbm-btn{flex:1;min-height:44px;border-radius:var(--radius-sm);border:1px solid var(--line);background:linear-gradient(165deg,var(--glass-c),rgba(218,223,233,.18));color:var(--ink);font-weight:700}
      .cbm-btn.primary{border-color:var(--edge-hi)}
      .cbm-err{font-size:12px;color:var(--err);min-height:14px}
      .cbm-check{display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid var(--line-soft);border-radius:var(--radius-sm);background:linear-gradient(165deg,var(--glass-a),var(--glass-b))}
      .cbm-check input{margin-top:2px;width:16px !important;height:16px;min-height:16px;flex:0 0 16px;accent-color:#22c55e}
      .cbm-chipbox{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;border:0;background:transparent;min-height:32px}
      .cbm-chip{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(165deg,var(--glass-c),rgba(218,223,233,.18));border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:12px}
      .cbm-chip button{all:unset;cursor:pointer;font-size:13px;line-height:1;color:var(--err)}
      .cbm-toast{position:sticky;top:6px;z-index:3;display:none;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,120,120,.5);background:rgba(120,20,24,.62);color:#ffe8e8;font-size:13px;font-weight:700}
      .cbm-hint{font-size:11px;color:var(--muted)}
      @media (max-width:640px){.cbm-row{grid-template-columns:1fr}.cbm-panel{padding-bottom:98px}}
    `;
    document.head.appendChild(st);
  }

  function renderTipoHecho(select, clase){
    const list = TIPOS_POR_CLASE[clase] || [];
    select.innerHTML = '<option value="">Seleccione tipo de hecho</option>' + list.map(v => `<option>${v}</option>`).join("");
  }

  function buildModal(){
    createStyle();
    const ov = document.createElement("div");
    ov.className = "cbm-overlay";
    ov.innerHTML = `
      <div class="cbm-panel" role="dialog" aria-modal="true" aria-label="Datos para generar JSON codificado">
        <div class="cbm-check">
          <input id="cbmBypass" type="checkbox" />
          <label for="cbmBypass"><strong>Detenido sin parte de intervención</strong></label>
        </div>
        <div id="cbmToast" class="cbm-toast" role="status" aria-live="polite"></div>
        <div id="cbmErr" class="cbm-err"></div>
        <div class="cbm-sec" data-sec="base">
          <h3>Patrulla e intervención</h3>
          <div class="cbm-grid">
            <div><div class="cbm-lbl">Unidad/grupo</div><input class="cbm-in" id="cbmUnidad"/></div>
            <div>
              <div class="cbm-lbl">Indicativos</div>
              <input class="cbm-in" id="cbmIndicativoInput" list="cbmIndicativos" />
              <div class="cbm-chipbox" id="cbmIndicativosChips"></div>
            </div>
            <div>
              <div class="cbm-lbl">Agentes</div>
              <input class="cbm-in" id="cbmAgenteInput" inputmode="numeric" pattern="[0-9]*" />
              <div class="cbm-chipbox" id="cbmAgentesChips"></div>
            </div>
            <div class="cbm-row">
              <div><div class="cbm-lbl">Fecha inicio</div><input class="cbm-in" id="cbmFecha" type="date"/></div>
              <div><div class="cbm-lbl">Hora inicio</div><input class="cbm-in" id="cbmHora" type="time" step="60"/></div>
            </div>
            <div><div class="cbm-lbl">Origen actuación</div><select class="cbm-sel" id="cbmOrigen"><option value="">Seleccione</option><option>Suceso Sala 091</option><option>A iniciativa propia</option><option>A requerimiento de ciudadano</option><option>Por orden de la superioridad</option></select></div>
            <div><div class="cbm-lbl">Clase actuación</div><select class="cbm-sel" id="cbmClase"></select></div>
            <div><div class="cbm-lbl">Tipo hecho</div><select class="cbm-sel" id="cbmTipoHecho"></select></div>
            <div><div class="cbm-lbl">Naturaleza lugar</div><select class="cbm-sel" id="cbmNaturaleza"><option value="">Seleccione</option><option value="Vía publica urbana">Vía publica urbana</option></select></div>
            <div><div class="cbm-lbl">Municipio</div><select class="cbm-sel" id="cbmMunicipio"><option value="">Seleccione</option><option>ADEJE</option><option>ARONA</option></select></div>
            <div><div class="cbm-lbl">Calle</div><input class="cbm-in" id="cbmCalle" list="cbmCalles" placeholder="Escribe 3 letras"/><div class="cbm-hint">Solo se admite una calle del listado del municipio.</div></div>
          </div>
        </div>
      </div>
      <div class="cbm-actions">
        <button type="button" class="cbm-btn" id="cbmCancel">Cancelar</button>
        <button type="button" class="cbm-btn primary" id="cbmConfirm">Continuar</button>
      </div>
      <datalist id="cbmIndicativos"></datalist>
      <datalist id="cbmCalles"></datalist>
    `;
    document.body.appendChild(ov);
    return ov;
  }

  function wireModal(mode, onDone){
    const ov = buildModal();
    const $ = (id) => ov.querySelector(id);
    const bypass = $("#cbmBypass");
    const toast = $("#cbmToast");
    const err = $("#cbmErr");
    const clase = $("#cbmClase");
    const tipoHecho = $("#cbmTipoHecho");
    const indicativosDL = $("#cbmIndicativos");
    const callesDL = $("#cbmCalles");
    const indicativosChips = $("#cbmIndicativosChips");
    const indicativoInput = $("#cbmIndicativoInput");
    const agentesChips = $("#cbmAgentesChips");
    const agenteInput = $("#cbmAgenteInput");
    const indicativoSet = new Set();
    const agenteSet = new Set();
    const panel = ov.querySelector(".cbm-panel");
    const root = document.documentElement;
    const body = document.body;
    const savedRootOverflow = root.style.overflow;
    const savedBodyOverflow = body.style.overflow;
    const savedBodyPosition = body.style.position;
    const savedBodyTop = body.style.top;
    const savedBodyLeft = body.style.left;
    const savedBodyRight = body.style.right;
    const savedBodyWidth = body.style.width;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    indicativosDL.innerHTML = INDICATIVOS.map(v => `<option value="${v}">`).join("");
    clase.innerHTML = '<option value="">Seleccione</option>' + CLASES_ACTUACION.map(v => `<option>${v}</option>`).join("");

    const existing = existingData();

    const form = {
      unidadGrupo: existing.unidadGrupo || "BLSC",
      indicativos: Array.isArray(existing.indicativos)
        ? existing.indicativos
        : normalizeIndicativos(existing.indicativo),
      agentes: Array.isArray(existing.agentes) ? existing.agentes.map(a => String(a || "").trim()).filter(Boolean) : [],
      fechaInicio: existing.fechaInicio || toDDMMYYYY(nowDateISO()),
      horaInicio: existing.horaInicio || nowTimeHHMM(),
      datosActuacion: existing.datosActuacion || "",
      claseActuacion: existing.claseActuacion || "",
      tipoHecho: existing.tipoHecho || "",
      naturalezaLugar: existing.naturalezaLugar || "",
      municipio: existing.municipio || "",
      calleInput: "",
      selectedStreet: null
    };

    $("#cbmUnidad").value = form.unidadGrupo || "BLSC";
    $("#cbmFecha").value = fromDDMMYYYY(form.fechaInicio) || nowDateISO();
    $("#cbmHora").value = form.horaInicio || nowTimeHHMM();
    $("#cbmOrigen").value = form.datosActuacion;
    $("#cbmNaturaleza").value = form.naturalezaLugar || "";
    $("#cbmMunicipio").value = ["ADEJE","ARONA"].includes(form.municipio) ? form.municipio : "";
    $("#cbmCalle").value = form.calleInput || "";

    function refreshTipo(){
      renderTipoHecho(tipoHecho, clase.value);
      if (form.tipoHecho) tipoHecho.value = form.tipoHecho;
    }

    if (form.claseActuacion) clase.value = form.claseActuacion;
    refreshTipo();
    if (form.tipoHecho) tipoHecho.value = form.tipoHecho;

    function renderIndicativos(){
      indicativosChips.innerHTML = "";
      [...indicativoSet].forEach(v => {
        const chip = document.createElement("span");
        chip.className = "cbm-chip";
        chip.innerHTML = `${v}<button type="button" aria-label="Eliminar ${v}">✕</button>`;
        chip.querySelector("button").onclick = () => { indicativoSet.delete(v); renderIndicativos(); };
        indicativosChips.appendChild(chip);
      });
    }

    function addIndicativo(v){
      const clean = String(v || "").trim();
      if (!clean) return;
      if (!INDICATIVOS.includes(clean)) return;
      indicativoSet.add(clean);
      indicativoInput.value = "";
      renderIndicativos();
    }

    function renderAgentes(){
      agentesChips.innerHTML = "";
      [...agenteSet].forEach(v => {
        const chip = document.createElement("span");
        chip.className = "cbm-chip";
        chip.innerHTML = `${v}<button type="button" aria-label="Eliminar agente ${v}">✕</button>`;
        chip.querySelector("button").onclick = () => { agenteSet.delete(v); renderAgentes(); };
        agentesChips.appendChild(chip);
      });
    }

    function addAgente(v){
      const clean = String(v || "").replace(/\D+/g, "").trim();
      if (!clean) return;
      agenteSet.add(clean);
      agenteInput.value = "";
      renderAgentes();
    }

    form.indicativos.forEach(addIndicativo);
    form.agentes.forEach(addAgente);
    indicativoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ","){
        e.preventDefault();
        addIndicativo(indicativoInput.value);
      }
    });
    indicativoInput.addEventListener("change", () => addIndicativo(indicativoInput.value));
    agenteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ","){
        e.preventDefault();
        addAgente(agenteInput.value);
      }
    });
    agenteInput.addEventListener("input", () => {
      const clean = String(agenteInput.value || "").replace(/\D+/g, "");
      if (agenteInput.value !== clean) agenteInput.value = clean;
    });
    agenteInput.addEventListener("change", () => addAgente(agenteInput.value));

    const streetLookup = new Map();
    function refreshCalles(){
      streetLookup.clear();
      callesDL.innerHTML = "";
      const municipio = $("#cbmMunicipio").value;
      const q = $("#cbmCalle").value.trim();
      if (!municipio || q.length < 3) return;
      const list = getStreetsByMunicipio(municipio);
      const qn = keyNorm(q);
      const filtered = list.filter(x => keyNorm(x.calleRaw).includes(qn)).slice(0, 120);
      filtered.forEach(x => {
        const val = x.calleRaw;
        const op = document.createElement("option");
        op.value = val;
        callesDL.appendChild(op);
        if (!streetLookup.has(keyNorm(val))) streetLookup.set(keyNorm(val), x);
      });
    }

    clase.addEventListener("change", () => { form.tipoHecho = ""; refreshTipo(); });
    $("#cbmMunicipio").addEventListener("change", () => {
      form.selectedStreet = null;
      $("#cbmCalle").value = "";
      refreshCalles();
    });
    $("#cbmCalle").addEventListener("input", () => {
      form.selectedStreet = null;
      refreshCalles();
    });
    $("#cbmCalle").addEventListener("change", () => {
      const hit = streetLookup.get(keyNorm($("#cbmCalle").value));
      form.selectedStreet = hit || null;
    });

    function read(){
      const fechaIso = $("#cbmFecha").value || nowDateISO();
      const horaVal = $("#cbmHora").value || nowTimeHHMM();
      const street = streetLookup.get(keyNorm($("#cbmCalle").value)) || form.selectedStreet;
      return {
        unidadGrupo: ($("#cbmUnidad").value || "BLSC").trim() || "BLSC",
        indicativos: [...indicativoSet],
        agentes: [...agenteSet],
        fechaInicio: toDDMMYYYY(fechaIso),
        horaInicio: horaVal,
        datosActuacion: $("#cbmOrigen").value,
        claseActuacion: clase.value,
        tipoHecho: tipoHecho.value,
        naturalezaLugar: $("#cbmNaturaleza").value,
        municipio: $("#cbmMunicipio").value,
        calleInput: $("#cbmCalle").value.trim(),
        selectedStreet: street || null,
        detenidoSinParteIntervencion: !!bypass.checked
      };
    }

    function validate(data){
      if (data.detenidoSinParteIntervencion) return "";
      if (!data.unidadGrupo) return "Falta Unidad o grupo.";
      if (!Array.isArray(data.indicativos) || data.indicativos.length === 0) return "Añade al menos un indicativo.";
      if (!Array.isArray(data.agentes) || data.agentes.length === 0) return "Añade al menos un agente.";
      if (!data.fechaInicio || !data.horaInicio) return "Faltan Fecha/Hora inicio.";
      if (!data.datosActuacion) return "Selecciona origen de actuación.";
      if (!data.claseActuacion) return "Falta Clase de actuación.";
      if (!data.tipoHecho) return "Falta Tipo de hecho.";
      if (!data.naturalezaLugar) return "Selecciona naturaleza del lugar.";
      if (!data.municipio) return "Selecciona municipio (ADEJE o ARONA).";
      if (!data.calleInput || data.calleInput.length < 3) return "Escribe al menos 3 letras de la calle.";
      if (!data.selectedStreet) return "Debes elegir una calle del listado.";
      return "";
    }

    let toastTimer = null;
    function showToast(msg){
      if (!toast) return;
      toast.textContent = msg || "Faltan campos obligatorios.";
      toast.style.display = "block";
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.style.display = "none"; }, 2500);
    }

    function buildBundle(channel){
      const now = new Date().toISOString();
      const data = read();
      const prev = existingData();
      const prevDoc = (typeof prev.doc === "string" && prev.doc.trim()) ? prev.doc : (
        (typeof prev.comparecencia === "string" && prev.comparecencia.trim()) ? prev.comparecencia : ""
      );
      const prevFiliaciones = Array.isArray(prev.filiaciones) ? prev.filiaciones : [];
      const prevPersonas = Array.isArray(prev.personas) ? prev.personas : [];
      if (data.detenidoSinParteIntervencion){
        return {
          schemaVersion: "caseBundle.v1",
          createdAt: now,
          sourceApp: "compa_api_github_release",
          channel,
          detenidoSinParteIntervencion: true,
          bypassReason: "DETENIDO_SIN_PARTE",
          previo: prev
        };
      }
      const tipoVia = (data.selectedStreet?.tipoVia || "").toUpperCase();
      const calle = stripTipoFromStreet(data.selectedStreet?.calleRaw || data.calleInput, tipoVia);
      return {
        schemaVersion: "caseBundle.v1",
        createdAt: now,
        sourceApp: "compa_api_github_release",
        channel,
        detenidoSinParteIntervencion: false,
        unidadGrupo: data.unidadGrupo,
        agentes: data.agentes,
        indicativos: data.indicativos,
        indicativo: data.indicativos[0] || "",
        fechaInicio: data.fechaInicio,
        horaInicio: data.horaInicio,
        datosActuacion: data.datosActuacion,
        naturalezaLugar: data.naturalezaLugar,
        municipio: data.municipio,
        tipoVia,
        calle,
        claseActuacion: data.claseActuacion,
        tipoHecho: data.tipoHecho,
        clickGuardarContinuar: true,
        esperaGuardarMs: 5000,
        // Compat: conservar datos existentes de comparecencia/filiaciones para otras apps.
        doc: prevDoc || "",
        comparecencia: prevDoc || "",
        filiaciones: prevFiliaciones,
        personas: prevPersonas,
        previo: prev
      };
    }

    function close(ok){
      ov.classList.remove("open");
      root.style.overflow = savedRootOverflow;
      body.style.overflow = savedBodyOverflow;
      body.style.position = savedBodyPosition;
      body.style.top = savedBodyTop;
      body.style.left = savedBodyLeft;
      body.style.right = savedBodyRight;
      body.style.width = savedBodyWidth;
      window.scrollTo(0, scrollY);
      setTimeout(() => ov.remove(), 120);
      if (!ok) onDone(null);
    }

    $("#cbmCancel").onclick = () => close(false);
    $("#cbmConfirm").onclick = () => {
      const data = read();
      const msg = validate(data);
      if (msg){ err.textContent = msg; showToast(msg); return; }
      const bundle = buildBundle(mode);
      close(true);
      onDone(bundle);
    };

    bypass.addEventListener("change", () => {
      const disabled = bypass.checked;
      ov.querySelectorAll("[data-sec='base'] .cbm-in,[data-sec='base'] .cbm-sel,[data-sec='base'] .cbm-ta").forEach(el => { el.disabled = disabled; });
      err.textContent = disabled ? "Modo rápido activo: se enviarán solo datos previos." : "";
    });

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    let touchStartY = 0;
    ov.addEventListener("wheel", (e) => {
      if (!panel.contains(e.target)) e.preventDefault();
    }, { passive: false });
    ov.addEventListener("touchstart", (e) => {
      touchStartY = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
    }, { passive: false });
    ov.addEventListener("touchmove", (e) => {
      if (!panel.contains(e.target)) { e.preventDefault(); return; }
      const y = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
      const dy = y - touchStartY;
      const atTop = panel.scrollTop <= 0;
      const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1;
      if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
    }, { passive: false });

    ov.classList.add("open");
  }

  function setBundleAsCurrent(bundle){
    try {
      if (typeof state !== "undefined" && state) state.lastJson = bundle;
    } catch(_) {}
  }

  function hookButton(btnId, mode){
    const btn = document.getElementById(btnId);
    if (!btn || btn.dataset.casebundleHooked === "1") return;
    const original = btn.onclick;
    btn.onclick = async function(ev){
      if (btn.disabled) return;
      ev && ev.preventDefault && ev.preventDefault();
      await ensureCallejero();
      wireModal(mode, async (bundle) => {
        if (!bundle) return;
        setBundleAsCurrent(bundle);
        if (typeof original === "function") await original.call(this, ev);
      });
    };
    btn.dataset.casebundleHooked = "1";
  }

  function init(){
    hookButton("btnDescargar", "download");
    hookButton("btnCloud", "inbox");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
