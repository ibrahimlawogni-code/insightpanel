// PERFORMANCE TEAM VALLEE — Google Apps Script
// ─────────────────────────────────────────────────────────────
// INSTALLATION :
//   1. Créer un nouveau Google Sheets (nom suggéré : "Team Vallée")
//   2. Ouvrir Extensions > Apps Script
//   3. Coller ce code (remplacer tout le contenu existant)
//   4. Renseigner VALLEE_SHEET_ID ci-dessous avec l'ID du nouveau Sheets
//      (URL Sheets : .../spreadsheets/d/[ID_ICI]/edit)
//   5. Enregistrer > Déployer > Nouveau déploiement > Type : Application Web
//      - Exécuter en tant que : Moi
//      - Accès : Tout le monde
//   6. Copier l'URL et la coller dans InsightPanel.html à la variable VALLEE_URL
//
// FEUILLES créées automatiquement au premier accès :
//   - "SaisiesVallee"  : saisies journalières des superviseurs
//   - "StockVallee"    : réceptions et mouvements de stock SIM
// ─────────────────────────────────────────────────────────────

const VALLEE_SHEET_ID = '18d-gD9pg8CYQLRgonL87pqHX1n7TJM6WNcz2VPVHd34'; // ← RENSEIGNER ICI l'ID du Google Sheets Team Vallée

// ─────────────────────────────────────────────────────────────
// POINT D'ENTRÉE
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  /* Verrou global : les upserts (KPI réel, objectifs) et la génération de référence
     de courrier lisent puis réécrivent. Sans verrou, deux appels simultanés se marchent
     dessus (doublon de référence, écrasement d'un mois). 20 s d'attente maximum. */
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (_) {
    return jsonResponse({ success: false, error: 'Serveur occupé, réessayez dans un instant.' });
  }

  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'getSaisiesVallee')    return handleGetSaisiesVallee(data);
    if (data.action === 'saveSaisieVallee')    return handleSaveSaisieVallee(data);
    if (data.action === 'updateSaisieVallee')  return handleUpdateSaisieVallee(data);
    if (data.action === 'getStockVallee')      return handleGetStockVallee(data);
    if (data.action === 'saveStockVallee')     return handleSaveStockVallee(data);
    if (data.action === 'getDysfVallee')       return handleGetDysfVallee(data);
    if (data.action === 'saveDysfVallee')      return handleSaveDysfVallee(data);
    if (data.action === 'getKpiReelVallee')    return handleGetKpiReelVallee(data);
    if (data.action === 'saveKpiReelVallee')   return handleSaveKpiReelVallee(data);
    if (data.action === 'getEnlevementsVallee')  return handleGetEnlevementsVallee(data);
    if (data.action === 'saveEnlevementVallee')  return handleSaveEnlevementVallee(data);
    if (data.action === 'getSwapVallee')       return handleGetSwapVallee(data);
    if (data.action === 'saveSwapVallee')      return handleSaveSwapVallee(data);
    if (data.action === 'loginVallee')            return handleLoginVallee(data);
    if (data.action === 'getUtilisateursVallee')  return handleGetUtilisateursVallee(data);
    if (data.action === 'saveUtilisateurVallee')  return handleSaveUtilisateurVallee(data);
    if (data.action === 'getDemandesVallee')      return handleGetDemandesVallee(data);
    if (data.action === 'saveDemandeVallee')      return handleSaveDemandeVallee(data);
    if (data.action === 'getObjectifsVallee')     return handleGetObjectifsVallee(data);
    if (data.action === 'saveObjectifVallee')     return handleSaveObjectifVallee(data);
    return jsonResponse({ success: false, error: 'Action inconnue : ' + data.action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('PERFORMANCE TEAM VALLEE — API active — ' + new Date().toLocaleString('fr-FR'))
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─────────────────────────────────────────────────────────────
// SAISIES — lecture
// Colonnes : Date | SupID | SupNom | Zone | GrossAdd | MoMoUser | TotalDFA | DFAActif | Observation | Horodatage
// ─────────────────────────────────────────────────────────────
function handleGetSaisiesVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateSaisiesVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    date:        headers.indexOf('date'),
    supId:       headers.indexOf('supid'),
    supNom:      headers.indexOf('supnom'),
    zone:        headers.indexOf('zone'),
    grossAdd:    headers.indexOf('grossadd'),
    momoUser:    headers.indexOf('momouser'),
    totalDfa:    headers.indexOf('totaldfa'),
    dfaActif:    headers.indexOf('dfaactif'),
    observation: headers.indexOf('observation'),
    horodatage:  headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.supId]) continue;
    entries.push({
      date:        _cellStr(row[COL.date]),
      supId:       _cellStr(row[COL.supId]),
      supNom:      _cellStr(row[COL.supNom]),
      zone:        _cellStr(row[COL.zone]),
      grossAdd:    Number(row[COL.grossAdd])  || 0,
      momoUser:    Number(row[COL.momoUser])  || 0,
      totalDfa:    COL.totalDfa >= 0 ? (Number(row[COL.totalDfa]) || 0) : null,
      dfaActif:    COL.dfaActif >= 0 ? (Number(row[COL.dfaActif]) || 0) : null,
      observation: _cellStr(row[COL.observation]),
      horodatage:  _tsStr(row[COL.horodatage]),
      _row:        i + 1
    });
  }

  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// SAISIES — écriture
// ─────────────────────────────────────────────────────────────
function handleSaveSaisieVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateSaisiesVallee(ss);
  const ts    = _nowTs();

  /* Lire les en-têtes réels pour insérer dans les bonnes colonnes */
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());

  /* Doublon date + superviseur : une seconde saisie du même jour doublait le Gross Add
     dans tous les cumuls sans que rien ne le signale. On refuse, sauf demande explicite
     (data.force), et on renvoie l'horodatage existant pour que le client propose la
     modification de la ligne déjà en place. */
  if (!data.force) {
    const cDate = headers.indexOf('date');
    const cSup  = headers.indexOf('supid');
    const cTs   = headers.indexOf('horodatage');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1 && cDate >= 0 && cSup >= 0) {
      const existants = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      const cleDate   = _dateKey(data.date);
      const cleSup    = _cellStr(data.supId).toLowerCase();
      for (let i = 0; i < existants.length; i++) {
        if (_cellStr(existants[i][cSup]).toLowerCase() !== cleSup) continue;
        if (_dateKey(existants[i][cDate]) !== cleDate) continue;
        return jsonResponse({
          success: false,
          code: 'DOUBLON',
          horodatage: cTs >= 0 ? _tsStr(existants[i][cTs]) : '',
          error: 'Une saisie existe déjà pour ce superviseur à cette date.'
        });
      }
    }
  }

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };

  set('date',        data.date || _todayFR());
  set('supid',       data.supId       || '');
  set('supnom',      data.supNom      || '');
  set('zone',        data.zone        || '');
  set('grossadd',    Number(data.grossAdd)  || 0);
  set('momouser',    Number(data.momoUser)  || 0);
  set('totaldfa',    Number(data.totalDfa)  || 0);
  set('dfaactif',    Number(data.dfaActif)  || 0);
  set('observation', data.observation || '');
  set('horodatage',  ts);

  sheet.appendRow(row);
  return jsonResponse({ success: true, message: 'Saisie enregistrée.', horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// SAISIES — mise à jour (identifiée par supId + horodatage)
// ─────────────────────────────────────────────────────────────
function handleUpdateSaisieVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateSaisiesVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    supId:       headers.indexOf('supid'),
    horodatage:  headers.indexOf('horodatage'),
    grossAdd:    headers.indexOf('grossadd'),
    momoUser:    headers.indexOf('momouser'),
    totalDfa:    headers.indexOf('totaldfa'),
    dfaActif:    headers.indexOf('dfaactif'),
    observation: headers.indexOf('observation')
  };

  /* Comparaison insensible à la casse sur l'identifiant : les saisies enregistrées
     avec une casse différente restaient introuvables. */
  const idIn = _cellStr(data.supId).toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const rowId = _cellStr(rows[i][COL.supId]).toLowerCase();
    const rowTs = _tsStr(rows[i][COL.horodatage]);
    if (rowId === idIn && rowTs === data.horodatage) {
      const rowNum = i + 1;
      /* Toutes les colonnes sont testées avant écriture : un en-tête renommé
         produisait un getRange(ligne, 0) et une erreur brute côté client. */
      const set = (colIdx, val) => { if (colIdx >= 0) sheet.getRange(rowNum, colIdx + 1).setValue(val); };
      set(COL.grossAdd,    Number(data.grossAdd) || 0);
      set(COL.momoUser,    Number(data.momoUser) || 0);
      set(COL.totalDfa,    Number(data.totalDfa) || 0);
      set(COL.dfaActif,    Number(data.dfaActif) || 0);
      set(COL.observation, data.observation || '');
      return jsonResponse({ success: true, message: 'Saisie mise à jour.' });
    }
  }

  return jsonResponse({ success: false, error: 'Saisie introuvable (horodatage ' + data.horodatage + ').' });
}

// ─────────────────────────────────────────────────────────────
// STOCK — lecture
// Colonnes : Date | SimDebut | SimFin | Quantite | AuteurId | AuteurNom | AuteurRole | Horodatage | Type
// ─────────────────────────────────────────────────────────────
function handleGetStockVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateStockVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    date:       headers.indexOf('date'),
    simDebut:   headers.indexOf('simdebut'),
    simFin:     headers.indexOf('simfin'),
    quantite:   headers.indexOf('quantite'),
    auteurId:   headers.indexOf('auteurid'),
    auteurNom:  headers.indexOf('auteurnom'),
    auteurRole: headers.indexOf('auteurrole'),
    horodatage: headers.indexOf('horodatage'),
    type:       headers.indexOf('type')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.auteurId]) continue;
    entries.push({
      date:       _cellStr(row[COL.date]),
      simDebut:   _cellStr(row[COL.simDebut]),
      simFin:     _cellStr(row[COL.simFin]),
      quantite:   Number(row[COL.quantite]) || 0,
      auteurId:   _cellStr(row[COL.auteurId]),
      auteurNom:  _cellStr(row[COL.auteurNom]),
      auteurRole: _cellStr(row[COL.auteurRole]),
      horodatage: _tsStr(row[COL.horodatage]),
      type:       _cellStr(row[COL.type]) || 'p100'
    });
  }

  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// STOCK — écriture
// ─────────────────────────────────────────────────────────────
function handleSaveStockVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateStockVallee(ss);
  const ts    = _nowTs();

  /* Écriture par nom d'en-tête, comme tous les autres handlers : le tableau positionnel
     précédent aurait décalé silencieusement les valeurs à la première insertion de colonne. */
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());
  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };

  set('date',       data.date       || _todayFR());
  set('simdebut',   data.simDebut   || '');
  set('simfin',     data.simFin     || '');
  set('quantite',   Number(data.quantite) || 0);
  set('auteurid',   data.auteurId   || '');
  set('auteurnom',  data.auteurNom  || '');
  set('auteurrole', data.auteurRole || 'superviseur');
  set('horodatage', ts);
  set('type',       data.type       || 'p100');

  sheet.appendRow(row);
  return jsonResponse({ success: true, message: 'Stock enregistré.', horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION AUTOMATIQUE DES FEUILLES
// ─────────────────────────────────────────────────────────────
function _getOrCreateSaisiesVallee(ss) {
  let sheet = ss.getSheetByName('SaisiesVallee');
  if (!sheet) {
    sheet = ss.insertSheet('SaisiesVallee');
    const headers = ['Date', 'SupID', 'SupNom', 'Zone', 'GrossAdd', 'MoMoUser', 'TotalDFA', 'DFAActif', 'Observation', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [110, 160, 180, 150, 100, 110, 100, 100, 250, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  } else {
    /* Migration : ajouter TotalDFA et DFAActif si absents */
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => h.toString().toLowerCase().trim());

    const toAdd = [
      { name: 'TotalDFA', key: 'totaldfa' },
      { name: 'DFAActif', key: 'dfaactif' }
    ];
    toAdd.forEach(col => {
      if (headers.indexOf(col.key) < 0) {
        /* Insérer avant "observation" */
        const obsIdx = headers.indexOf('observation');
        const pos    = obsIdx >= 0 ? obsIdx + 1 : headers.length + 1;
        sheet.insertColumnBefore(pos);
        const cell = sheet.getRange(1, pos);
        cell.setValue(col.name);
        cell.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
        sheet.setColumnWidth(pos, 100);
        headers.splice(pos - 1, 0, col.key);
      }
    });
  }
  return sheet;
}

function _getOrCreateStockVallee(ss) {
  let sheet = ss.getSheetByName('StockVallee');
  if (!sheet) {
    sheet = ss.insertSheet('StockVallee');
    const headers = ['Date', 'SimDebut', 'SimFin', 'Quantite', 'AuteurId', 'AuteurNom', 'AuteurRole', 'Horodatage', 'Type'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(2, 130);
    sheet.setColumnWidth(3, 130);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 160);
    sheet.setColumnWidth(6, 180);
    sheet.setColumnWidth(7, 130);
    sheet.setColumnWidth(8, 160);
    sheet.setColumnWidth(9, 100);
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// DYSFONCTIONNEMENTS — lecture
// Colonnes : Date | Localite | Nature | HeureDebut | HeureFin | Duree | Impact | AuteurId | AuteurNom | Horodatage
// ─────────────────────────────────────────────────────────────
function handleGetDysfVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateDysfVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    date:       headers.indexOf('date'),
    localite:   headers.indexOf('localite'),
    nature:     headers.indexOf('nature'),
    heureDebut: headers.indexOf('heuredebut'),
    heureFin:   headers.indexOf('heurefin'),
    duree:      headers.indexOf('duree'),
    impact:     headers.indexOf('impact'),
    impactSims: headers.indexOf('impactsims'),
    auteurId:   headers.indexOf('auteurid'),
    auteurNom:  headers.indexOf('auteurnom'),
    horodatage: headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.date] && !row[COL.nature]) continue;
    entries.push({
      date:       _cellStr(row[COL.date]),
      localite:   _cellStr(row[COL.localite]),
      nature:     _cellStr(row[COL.nature]),
      heureDebut: _timeStr(row[COL.heureDebut]),
      heureFin:   _timeStr(row[COL.heureFin]),
      duree:      _cellStr(row[COL.duree]),
      impact:     _cellStr(row[COL.impact]),
      impactSims: COL.impactSims >= 0 ? _cellStr(row[COL.impactSims]) : '',
      auteurId:   _cellStr(row[COL.auteurId]),
      auteurNom:  _cellStr(row[COL.auteurNom]),
      horodatage: _tsStr(row[COL.horodatage]),
      _row: i + 1
    });
  }

  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// DYSFONCTIONNEMENTS — écriture
// ─────────────────────────────────────────────────────────────
function handleSaveDysfVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateDysfVallee(ss);
  const ts    = _nowTs();

  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());

  if (headers.indexOf('impactsims') < 0) {
    const col = headers.length + 1;
    sheet.getRange(1, col).setValue('ImpactSims')
      .setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setColumnWidth(col, 100);
    headers.push('impactsims');
  }

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };

  set('date',       data.date        || _todayFR());
  set('localite',   data.localite    || '');
  set('nature',     data.nature      || '');
  set('heuredebut', data.heureDebut  || '');
  set('heurefin',   data.heureFin    || '');
  set('duree',      data.duree       || '');
  set('impact',     data.impact      || '');
  set('impactsims', (data.impactSims !== undefined && data.impactSims !== null) ? data.impactSims : '');
  set('auteurid',   data.auteurId    || '');
  set('auteurnom',  data.auteurNom   || '');
  set('horodatage', ts);

  sheet.appendRow(row);
  return jsonResponse({ success: true, message: 'Dysfonctionnement enregistré.', horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION AUTOMATIQUE — feuille DysfVallee
// ─────────────────────────────────────────────────────────────
function _getOrCreateDysfVallee(ss) {
  let sheet = ss.getSheetByName('DysfVallee');
  if (!sheet) {
    sheet = ss.insertSheet('DysfVallee');
    const headers = ['Date', 'Localite', 'Nature', 'HeureDebut', 'HeureFin', 'Duree', 'Impact', 'ImpactSims', 'AuteurId', 'AuteurNom', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [110, 150, 300, 90, 90, 80, 90, 100, 160, 180, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// KPI NEW ADD RÉEL — lecture (chiffre officiel validé, mensuel)
// ─────────────────────────────────────────────────────────────
function handleGetKpiReelVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateKpiReelVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    periode:    headers.indexOf('periode'),
    kpiNewAdd:  headers.indexOf('kpinewadd'),
    auteurId:   headers.indexOf('auteurid'),
    auteurNom:  headers.indexOf('auteurnom'),
    horodatage: headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.periode]) continue;
    entries.push({
      periode:    _periodeStr(row[COL.periode]),
      kpiNewAdd:  Number(row[COL.kpiNewAdd]) || 0,
      auteurId:   _cellStr(row[COL.auteurId]),
      auteurNom:  _cellStr(row[COL.auteurNom]),
      horodatage: _tsStr(row[COL.horodatage]),
      _row: i + 1
    });
  }

  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// KPI NEW ADD RÉEL — écriture (upsert par période)
// ─────────────────────────────────────────────────────────────
function handleSaveKpiReelVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateKpiReelVallee(ss);
  const ts    = _nowTs();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());
  const periodeCol = headers.indexOf('periode') + 1;

  let targetRow = -1;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1 && data.periode) {
    const periodes = sheet.getRange(2, periodeCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < periodes.length; i++) {
      if (_periodeStr(periodes[i][0]) === data.periode) { targetRow = i + 2; break; }
    }
  }

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };
  set('periode',    data.periode    || '');
  set('kpinewadd',  (data.kpiNewAdd !== undefined && data.kpiNewAdd !== null) ? data.kpiNewAdd : '');
  set('auteurid',   data.auteurId   || '');
  set('auteurnom',  data.auteurNom  || '');
  set('horodatage', ts);

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return jsonResponse({ success: true, message: 'KPI NEW ADD réel enregistré.', horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION AUTOMATIQUE — feuille KpiReelVallee
// ─────────────────────────────────────────────────────────────
function _getOrCreateKpiReelVallee(ss) {
  let sheet = ss.getSheetByName('KpiReelVallee');
  if (!sheet) {
    sheet = ss.insertSheet('KpiReelVallee');
    const headers = ['Periode', 'KpiNewAdd', 'AuteurId', 'AuteurNom', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [90, 110, 160, 180, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
    // Colonne Periode ('2026-06') en texte brut : sans ça, Sheets la convertit en date au format local.
    // Appliqué à la création seulement : le format persiste, le réappliquer à chaque
    // requête ajoutait une écriture sur la feuille à chaque simple lecture.
    sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  }
  return sheet;
}

// Reconvertit la cellule Periode en 'YYYY-MM', que Sheets l'ait gardée en texte
// ou (anciennes lignes) auto-convertie en date.
function _periodeStr(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM');
  return val.toString().trim();
}

// ─────────────────────────────────────────────────────────────
// ENLÈVEMENTS GLOBAUX — lecture (plages SIM réellement retirées chez MTN, RA)
// ─────────────────────────────────────────────────────────────
function handleGetEnlevementsVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateEnlevementsVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    date:       headers.indexOf('date'),
    simDebut:   headers.indexOf('simdebut'),
    simFin:     headers.indexOf('simfin'),
    quantite:   headers.indexOf('quantite'),
    type:       headers.indexOf('type'),
    auteurId:   headers.indexOf('auteurid'),
    auteurNom:  headers.indexOf('auteurnom'),
    horodatage: headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.simDebut] && !row[COL.simFin]) continue;
    entries.push({
      date:       _cellStr(row[COL.date]),
      simDebut:   _cellStr(row[COL.simDebut]),
      simFin:     _cellStr(row[COL.simFin]),
      quantite:   Number(row[COL.quantite]) || 0,
      type:       _cellStr(row[COL.type]),
      auteurId:   _cellStr(row[COL.auteurId]),
      auteurNom:  _cellStr(row[COL.auteurNom]),
      horodatage: _tsStr(row[COL.horodatage]),
      _row: i + 1
    });
  }

  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// ENLÈVEMENTS GLOBAUX — écriture
// ─────────────────────────────────────────────────────────────
function handleSaveEnlevementVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateEnlevementsVallee(ss);
  const ts    = _nowTs();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());
  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };

  set('date',       data.date       || _todayFR());
  set('simdebut',   data.simDebut   || '');
  set('simfin',     data.simFin     || '');
  set('quantite',   data.quantite   || '');
  set('type',       data.type       || '');
  set('auteurid',   data.auteurId   || '');
  set('auteurnom',  data.auteurNom  || '');
  set('horodatage', ts);

  sheet.appendRow(row);
  return jsonResponse({ success: true, message: 'Enlèvement enregistré.', horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION AUTOMATIQUE — feuille EnlevementsVallee
// ─────────────────────────────────────────────────────────────
function _getOrCreateEnlevementsVallee(ss) {
  let sheet = ss.getSheetByName('EnlevementsVallee');
  if (!sheet) {
    sheet = ss.insertSheet('EnlevementsVallee');
    const headers = ['Date', 'SimDebut', 'SimFin', 'Quantite', 'Type', 'AuteurId', 'AuteurNom', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [110, 150, 150, 90, 90, 160, 180, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// SWAP — lecture
// ─────────────────────────────────────────────────────────────
function handleGetSwapVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateSwapVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    date:       headers.indexOf('date'),
    sim:        headers.indexOf('sim'),
    swaper:     headers.indexOf('swaper'),
    auteurId:   headers.indexOf('auteurid'),
    auteurNom:  headers.indexOf('auteurnom'),
    horodatage: headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.sim] && !row[COL.swaper]) continue;
    entries.push({
      date:       _cellStr(row[COL.date]),
      sim:        _cellStr(row[COL.sim]),
      swaper:     _cellStr(row[COL.swaper]),
      auteurId:   _cellStr(row[COL.auteurId]),
      auteurNom:  _cellStr(row[COL.auteurNom]),
      horodatage: _tsStr(row[COL.horodatage]),
      _row: i + 1
    });
  }

  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// SWAP — écriture
// ─────────────────────────────────────────────────────────────
function handleSaveSwapVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateSwapVallee(ss);
  const ts    = _nowTs();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());
  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };

  set('date',       data.date       || _todayFR());
  set('sim',        data.sim        || '');
  set('swaper',     data.swaper     || '');
  set('auteurid',   data.auteurId   || '');
  set('auteurnom',  data.auteurNom  || '');
  set('horodatage', ts);

  sheet.appendRow(row);
  return jsonResponse({ success: true, message: 'SWAP enregistré.', horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION AUTOMATIQUE — feuille SwapVallee
// ─────────────────────────────────────────────────────────────
function _getOrCreateSwapVallee(ss) {
  let sheet = ss.getSheetByName('SwapVallee');
  if (!sheet) {
    sheet = ss.insertSheet('SwapVallee');
    const headers = ['Date', 'Sim', 'Swaper', 'AuteurId', 'AuteurNom', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [110, 150, 150, 160, 180, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
    // Sim/Swaper en texte brut pour éviter toute conversion numérique par Sheets.
    sheet.getRange(2, 2, Math.max(sheet.getMaxRows() - 1, 1), 2).setNumberFormat('@');
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// UTILISATEURS TEAMVALLEE — comptes créés depuis Paramètres
// (superviseurs, agences, services CARE). Ne s'ajoute PAS aux comptes
// existants codés en dur côté client : système indépendant, en secours.
// ─────────────────────────────────────────────────────────────
function handleLoginVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateUtilisateursVallee(ss);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: false, error: 'Identifiant ou mot de passe incorrect.' });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    id:        headers.indexOf('id'),
    password:  headers.indexOf('password'),
    nom:       headers.indexOf('nom'),
    role:      headers.indexOf('role'),
    libelle:   headers.indexOf('libelle'),
    initiales: headers.indexOf('initiales')
  };

  const idIn  = _cellStr(data.id).toLowerCase();
  const pwdIn = _cellStr(data.pwd);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (_cellStr(row[COL.id]).toLowerCase() === idIn && _cellStr(row[COL.password]) === pwdIn) {
      return jsonResponse({
        success: true,
        user: {
          id:        _cellStr(row[COL.id]),
          nom:       _cellStr(row[COL.nom]),
          role:      _cellStr(row[COL.role]),
          libelle:   _cellStr(row[COL.libelle]),
          initiales: _cellStr(row[COL.initiales])
        }
      });
    }
  }
  return jsonResponse({ success: false, error: 'Identifiant ou mot de passe incorrect.' });
}

// Liste des comptes SANS mot de passe (alimente VALLEE_SUPS et la liste en Paramètres).
function handleGetUtilisateursVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateUtilisateursVallee(ss);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    id:         headers.indexOf('id'),
    nom:        headers.indexOf('nom'),
    role:       headers.indexOf('role'),
    libelle:    headers.indexOf('libelle'),
    initiales:  headers.indexOf('initiales'),
    horodatage: headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.id]) continue;
    entries.push({
      id:         _cellStr(row[COL.id]),
      nom:        _cellStr(row[COL.nom]),
      role:       _cellStr(row[COL.role]),
      libelle:    _cellStr(row[COL.libelle]),
      initiales:  _cellStr(row[COL.initiales]),
      horodatage: _tsStr(row[COL.horodatage])
    });
  }
  return jsonResponse({ success: true, data: entries });
}

function handleSaveUtilisateurVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateUtilisateursVallee(ss);
  const ts    = _nowTs();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());
  const idCol = headers.indexOf('id') + 1;

  const idIn = _cellStr(data.id).toLowerCase();
  if (!idIn) return jsonResponse({ success: false, error: 'Identifiant requis.' });

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (_cellStr(ids[i][0]).toLowerCase() === idIn) {
        return jsonResponse({ success: false, error: 'Cet identifiant existe déjà.' });
      }
    }
  }

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };
  set('id',         data.id         || '');
  set('password',   data.pwd        || '');
  set('nom',        data.nom        || '');
  set('role',       data.role       || '');
  set('libelle',    data.libelle    || '');
  set('initiales',  data.initiales  || '');
  set('creepar',    data.auteurId   || '');
  set('horodatage', ts);

  sheet.appendRow(row);
  return jsonResponse({ success: true, message: 'Compte créé.', horodatage: ts });
}

function _getOrCreateUtilisateursVallee(ss) {
  let sheet = ss.getSheetByName('UtilisateursVallee');
  if (!sheet) {
    sheet = ss.insertSheet('UtilisateursVallee');
    const headers = ['Id', 'Password', 'Nom', 'Role', 'Libelle', 'Initiales', 'CreePar', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [140, 100, 180, 110, 180, 90, 160, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
    // Colonnes texte brut pour Id/Password : évite toute conversion numérique/date par Sheets.
    sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 2).setNumberFormat('@');
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// DEMANDES D'EXPLICATION — lecture
// ─────────────────────────────────────────────────────────────
function handleGetDemandesVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateDemandesVallee(ss);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    ref:               headers.indexOf('ref'),
    type:              headers.indexOf('type'),
    date:              headers.indexOf('date'),
    destinatairenom:   headers.indexOf('destinatairenom'),
    destinataireemail: headers.indexOf('destinataireemail'),
    destinatairetype:  headers.indexOf('destinatairetype'),
    motif:             headers.indexOf('motif'),
    contexte:          headers.indexOf('contexte'),
    message:           headers.indexOf('message'),
    decision:          headers.indexOf('decision'),
    dateeffet:         headers.indexOf('dateeffet'),
    datelimite:        headers.indexOf('datelimite'),
    cc:                headers.indexOf('cc'),
    statut:            headers.indexOf('statut'),
    reponse:           headers.indexOf('reponse'),
    datereponse:       headers.indexOf('datereponse'),
    auteurid:          headers.indexOf('auteurid'),
    horodatage:        headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.ref]) continue;
    entries.push({
      ref:               _cellStr(row[COL.ref]),
      type:              _cellStr(row[COL.type]) || 'demande',
      date:              _cellStr(row[COL.date]),
      destinataireNom:   _cellStr(row[COL.destinatairenom]),
      destinataireEmail: _cellStr(row[COL.destinataireemail]),
      destinataireType:  _cellStr(row[COL.destinatairetype]),
      motif:             _cellStr(row[COL.motif]),
      contexte:          _cellStr(row[COL.contexte]),
      message:           _cellStr(row[COL.message]),
      decision:          _cellStr(row[COL.decision]),
      dateEffet:         _cellStr(row[COL.dateeffet]),
      dateLimite:        _cellStr(row[COL.datelimite]),
      cc:                _cellStr(row[COL.cc]),
      statut:            _cellStr(row[COL.statut]),
      reponse:           _cellStr(row[COL.reponse]),
      dateReponse:       _cellStr(row[COL.datereponse]),
      auteurId:          _cellStr(row[COL.auteurid]),
      horodatage:        _tsStr(row[COL.horodatage])
    });
  }
  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// DEMANDES D'EXPLICATION — écriture (génère la référence côté serveur)
// ─────────────────────────────────────────────────────────────
function handleSaveDemandeVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateDemandesVallee(ss);
  const ts    = _nowTs();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());

  const type   = data.type || 'demande';
  const prefix = type === 'avertissement' ? 'AVT' : type === 'notification' ? 'NOT' : 'DEM';
  const refCol = headers.indexOf('ref');
  /* Numéro suivant = plus grand numéro déjà attribué + 1, et non le nombre de lignes + 1.
     Compter les lignes redonnait une référence déjà utilisée dès qu'une ligne était
     supprimée, alors que c'est cette référence qui sert de clé à l'archivage des réponses. */
  let maxNum = 0;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1 && refCol >= 0) {
    const refs = sheet.getRange(2, refCol + 1, lastRow - 1, 1).getValues();
    refs.forEach(r => {
      const m = _cellStr(r[0]).match(new RegExp('^' + prefix + '-(\\d+)$'));
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    });
  }
  const ref = prefix + '-' + (maxNum + 1);

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };
  set('ref',               ref);
  set('type',              type);
  set('date',               data.date              || _todayFR());
  set('destinatairenom',   data.destinataireNom    || '');
  set('destinataireemail', data.destinataireEmail  || '');
  set('destinatairetype',  data.destinataireType   || '');
  set('motif',              data.motif              || '');
  set('contexte',           data.contexte           || '');
  set('message',            data.message            || '');
  set('decision',          data.decision           || '');
  set('dateeffet',         data.dateEffet          || '');
  set('datelimite',        data.dateLimite         || '');
  set('cc',                data.cc                 || '');
  set('statut',             'En attente');
  set('reponse',            '');
  set('datereponse',       '');
  set('auteurid',          data.auteurId           || '');
  set('horodatage',        ts);

  sheet.appendRow(row);

  // Envoi direct de l'email depuis le serveur : évite les limites de longueur
  // des liens mailto: (constatées avec le gestionnaire Gmail du navigateur).
  if (data.destinataireEmail && data.emailBody) {
    const typeLabels = { demande: "Demande d'explication", avertissement: 'Avertissement', notification: 'Notification de sanction' };
    const subject = '[' + ref + '] ' + (typeLabels[type] || typeLabels.demande) + ' — ' + (data.motif || '');
    try {
      const options = {};
      if (data.cc) options.cc = data.cc;
      if (data.attachments && data.attachments.length) {
        options.attachments = data.attachments.map(a =>
          Utilities.newBlob(Utilities.base64Decode(a.base64), a.mimeType || 'application/octet-stream', a.filename || 'piece-jointe')
        );
      }
      GmailApp.sendEmail(data.destinataireEmail, subject, data.emailBody, options);
    } catch (err) {
      return jsonResponse({ success: true, ref: ref, horodatage: ts, emailError: err.toString() });
    }
  }

  return jsonResponse({ success: true, ref: ref, horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION AUTOMATIQUE — feuille DemandesVallee
// ─────────────────────────────────────────────────────────────
function _getOrCreateDemandesVallee(ss) {
  let sheet = ss.getSheetByName('DemandesVallee');
  if (!sheet) {
    sheet = ss.insertSheet('DemandesVallee');
    const headers = ['Ref', 'Type', 'Date', 'DestinataireNom', 'DestinataireEmail', 'DestinataireType',
      'Motif', 'Contexte', 'Message', 'Decision', 'DateEffet', 'DateLimite', 'Cc', 'Statut', 'Reponse', 'DateReponse', 'AuteurId', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [80, 110, 90, 160, 180, 110, 180, 260, 260, 220, 100, 90, 180, 90, 300, 130, 140, 140].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// DEMANDES D'EXPLICATION — archivage automatique des réponses
// ⚠️ Cette fonction n'est PAS appelée par doPost. Elle doit être exécutée
// périodiquement via un déclencheur temporel (Éditeur Apps Script >
// Déclencheurs > Ajouter un déclencheur > checkDemandesReponses >
// Basé sur le temps > toutes les 15 ou 30 minutes). Elle scrute la boîte
// Gmail du compte qui exécute le script pour retrouver les réponses aux
// demandes envoyées (repérées par la référence "[DEM-x]" dans l'objet).
// ─────────────────────────────────────────────────────────────
function checkDemandesReponses() {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateDemandesVallee(ss);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return;

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    ref:    headers.indexOf('ref'),
    statut: headers.indexOf('statut'),
    email:  headers.indexOf('destinataireemail')
  };

  /* Adresse du compte qui exécute le script : tout message parti de cette adresse est
     un envoi ou une relance de notre côté, jamais une réponse du destinataire. */
  const moi = (Session.getEffectiveUser().getEmail() || '').toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    if (_cellStr(rows[i][COL.statut]) !== 'En attente') continue;
    const ref = _cellStr(rows[i][COL.ref]);
    if (!ref) continue;
    const destEmail = COL.email >= 0 ? _cellStr(rows[i][COL.email]).toLowerCase() : '';

    const threads = GmailApp.search('subject:"[' + ref + ']"', 0, 5);
    let latestReply = null;
    threads.forEach(thread => {
      thread.getMessages().forEach(msg => {
        const from = (msg.getFrom() || '').toLowerCase();
        /* On écarte nos propres messages, et si le destinataire est connu on exige
           que la réponse vienne bien de lui. */
        if (moi && from.indexOf(moi) !== -1) return;
        if (destEmail && from.indexOf(destEmail) === -1) return;
        if (!latestReply || msg.getDate() > latestReply.getDate()) latestReply = msg;
      });
    });

    if (latestReply) {
      const rowIndex = i + 1;
      const set = (key, val) => { const c = headers.indexOf(key); if (c >= 0) sheet.getRange(rowIndex, c + 1).setValue(val); };
      set('statut', 'Répondu');
      set('reponse', latestReply.getPlainBody().substring(0, 3000));
      set('datereponse', Utilities.formatDate(latestReply.getDate(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));
    }
  }
}

// ─────────────────────────────────────────────────────────────
// OBJECTIFS MENSUELS — lecture
// Les cibles vivaient dans le localStorage du navigateur qui les avait saisies : chaque
// utilisateur calculait donc ses pourcentages contre une cible différente. Elles sont
// désormais partagées par tout le monde.
// ─────────────────────────────────────────────────────────────
function handleGetObjectifsVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateObjectifsVallee(ss);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    periode:    headers.indexOf('periode'),
    ga:         headers.indexOf('ga'),
    momo:       headers.indexOf('momo'),
    auteurId:   headers.indexOf('auteurid'),
    auteurNom:  headers.indexOf('auteurnom'),
    horodatage: headers.indexOf('horodatage')
  };

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.periode]) continue;
    entries.push({
      periode:    _periodeStr(row[COL.periode]),
      ga:         Number(row[COL.ga])   || 0,
      momo:       Number(row[COL.momo]) || 0,
      auteurId:   _cellStr(row[COL.auteurId]),
      auteurNom:  _cellStr(row[COL.auteurNom]),
      horodatage: _tsStr(row[COL.horodatage])
    });
  }

  return jsonResponse({ success: true, data: entries });
}

// ─────────────────────────────────────────────────────────────
// OBJECTIFS MENSUELS — écriture (upsert par période, suppression si ga = 0)
// ─────────────────────────────────────────────────────────────
function handleSaveObjectifVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateObjectifsVallee(ss);
  const ts    = _nowTs();

  if (!data.periode) return jsonResponse({ success: false, error: 'Période requise.' });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());
  const periodeCol = headers.indexOf('periode') + 1;

  let targetRow = -1;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const periodes = sheet.getRange(2, periodeCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < periodes.length; i++) {
      if (_periodeStr(periodes[i][0]) === data.periode) { targetRow = i + 2; break; }
    }
  }

  /* Cible vidée dans le formulaire : on retire la ligne pour revenir à la valeur par défaut. */
  if (!Number(data.ga)) {
    if (targetRow > 0) sheet.deleteRow(targetRow);
    return jsonResponse({ success: true, message: 'Objectif supprimé.' });
  }

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };
  set('periode',    data.periode);
  set('ga',         Number(data.ga)   || 0);
  set('momo',       Number(data.momo) || 0);
  set('auteurid',   data.auteurId  || '');
  set('auteurnom',  data.auteurNom || '');
  set('horodatage', ts);

  if (targetRow > 0) sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  else               sheet.appendRow(row);

  return jsonResponse({ success: true, message: 'Objectif enregistré.', horodatage: ts });
}

function _getOrCreateObjectifsVallee(ss) {
  let sheet = ss.getSheetByName('ObjectifsVallee');
  if (!sheet) {
    sheet = ss.insertSheet('ObjectifsVallee');
    const headers = ['Periode', 'Ga', 'Momo', 'AuteurId', 'AuteurNom', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [90, 110, 110, 160, 180, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
    // Periode ('2026-08') en texte brut, sinon Sheets la convertit en date.
    sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────
function _cellStr(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  return val.toString().trim();
}

/* Horodatage. Sheets reconnaît "24/08/2026 14:23:45" comme une date et heure et la
   stocke comme telle : _cellStr la reformatait en jour seul, ce qui rendait deux saisies
   du même jour indistinguables et faisait porter les corrections sur la mauvaise ligne.
   On reformate donc avec l'heure. Tolère aussi la valeur déjà stockée en texte. */
function _tsStr(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  return val.toString().trim();
}

/* Heure seule ("08:30"). Sheets la stocke comme une date au 30/12/1899 : _cellStr
   affichait cette date au lieu de l'heure. */
function _timeStr(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  return val.toString().trim();
}

function _todayFR() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/* Horodatage courant. Même format que celui rendu par _tsStr : le round-trip reste
   exact que Sheets stocke la valeur en texte ou la reconvertisse en date et heure. */
function _nowTs() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

/* Ramène une date à 'yyyy-MM-dd' quelle que soit sa forme : objet Date rendu par
   Sheets, texte ISO envoyé par le client, ou texte 'dd/MM/yyyy'. Sert aux comparaisons. */
function _dateKey(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : s;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
