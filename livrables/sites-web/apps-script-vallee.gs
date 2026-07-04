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
    return jsonResponse({ success: false, error: 'Action inconnue : ' + data.action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
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
      horodatage:  _cellStr(row[COL.horodatage]),
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
  const ts    = new Date().toLocaleString('fr-FR');

  /* Lire les en-têtes réels pour insérer dans les bonnes colonnes */
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());

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

  for (let i = 1; i < rows.length; i++) {
    const rowId = _cellStr(rows[i][COL.supId]);
    const rowTs = _cellStr(rows[i][COL.horodatage]);
    if (rowId === data.supId && rowTs === data.horodatage) {
      const rowNum = i + 1;
      sheet.getRange(rowNum, COL.grossAdd + 1).setValue(Number(data.grossAdd) || 0);
      sheet.getRange(rowNum, COL.momoUser + 1).setValue(Number(data.momoUser) || 0);
      if (COL.totalDfa >= 0) sheet.getRange(rowNum, COL.totalDfa + 1).setValue(Number(data.totalDfa) || 0);
      if (COL.dfaActif >= 0) sheet.getRange(rowNum, COL.dfaActif + 1).setValue(Number(data.dfaActif) || 0);
      sheet.getRange(rowNum, COL.observation + 1).setValue(data.observation || '');
      return jsonResponse({ success: true, message: 'Saisie mise à jour.' });
    }
  }

  return jsonResponse({ success: false, error: 'Saisie introuvable.' });
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
    auteurRole: headers.indexOf('auteurRole') !== -1 ? headers.indexOf('auteurRole') : headers.indexOf('auteurRole'.toLowerCase()),
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
      horodatage: _cellStr(row[COL.horodatage]),
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
  const ts    = new Date().toLocaleString('fr-FR');

  sheet.appendRow([
    data.date        || _todayFR(),
    data.simDebut    || '',
    data.simFin      || '',
    Number(data.quantite) || 0,
    data.auteurId    || '',
    data.auteurNom   || '',
    data.auteurRole  || 'superviseur',
    ts,
    data.type        || 'p100'
  ]);

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
      heureDebut: _cellStr(row[COL.heureDebut]),
      heureFin:   _cellStr(row[COL.heureFin]),
      duree:      _cellStr(row[COL.duree]),
      impact:     _cellStr(row[COL.impact]),
      impactSims: COL.impactSims >= 0 ? _cellStr(row[COL.impactSims]) : '',
      auteurId:   _cellStr(row[COL.auteurId]),
      auteurNom:  _cellStr(row[COL.auteurNom]),
      horodatage: _cellStr(row[COL.horodatage]),
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
  const ts    = new Date().toLocaleString('fr-FR');

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
      horodatage: _cellStr(row[COL.horodatage]),
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
  const ts    = new Date().toLocaleString('fr-FR');

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
  }
  // Colonne Periode ('2026-06') en texte brut : sans ça, Sheets la convertit en date au format local.
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
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
      horodatage: _cellStr(row[COL.horodatage]),
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
  const ts    = new Date().toLocaleString('fr-FR');

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
      horodatage: _cellStr(row[COL.horodatage]),
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
  const ts    = new Date().toLocaleString('fr-FR');

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
  }
  // Sim/Swaper en texte brut pour éviter toute conversion numérique par Sheets.
  sheet.getRange(2, 2, Math.max(sheet.getMaxRows() - 1, 1), 2).setNumberFormat('@');
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
      horodatage: _cellStr(row[COL.horodatage])
    });
  }
  return jsonResponse({ success: true, data: entries });
}

function handleSaveUtilisateurVallee(data) {
  const ss    = SpreadsheetApp.openById(VALLEE_SHEET_ID);
  const sheet = _getOrCreateUtilisateursVallee(ss);
  const ts    = new Date().toLocaleString('fr-FR');

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
  }
  // Colonnes texte brut pour Id/Password : évite toute conversion numérique/date par Sheets.
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 2).setNumberFormat('@');
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
    date:              headers.indexOf('date'),
    destinatairenom:   headers.indexOf('destinatairenom'),
    destinataireemail: headers.indexOf('destinataireemail'),
    destinatairetype:  headers.indexOf('destinatairetype'),
    motif:             headers.indexOf('motif'),
    contexte:          headers.indexOf('contexte'),
    message:           headers.indexOf('message'),
    datelimite:        headers.indexOf('datelimite'),
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
      date:              _cellStr(row[COL.date]),
      destinataireNom:   _cellStr(row[COL.destinatairenom]),
      destinataireEmail: _cellStr(row[COL.destinataireemail]),
      destinataireType:  _cellStr(row[COL.destinatairetype]),
      motif:             _cellStr(row[COL.motif]),
      contexte:          _cellStr(row[COL.contexte]),
      message:           _cellStr(row[COL.message]),
      dateLimite:        _cellStr(row[COL.datelimite]),
      statut:            _cellStr(row[COL.statut]),
      reponse:           _cellStr(row[COL.reponse]),
      dateReponse:       _cellStr(row[COL.datereponse]),
      auteurId:          _cellStr(row[COL.auteurid]),
      horodatage:        _cellStr(row[COL.horodatage])
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
  const ts    = new Date().toLocaleString('fr-FR');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => h.toString().toLowerCase().trim());

  const numero = Math.max(sheet.getLastRow() - 1, 0) + 1;
  const ref = 'DEM-' + numero;

  const row = new Array(headers.length).fill('');
  const set = (key, val) => { const i = headers.indexOf(key); if (i >= 0) row[i] = val; };
  set('ref',               ref);
  set('date',               data.date              || _todayFR());
  set('destinatairenom',   data.destinataireNom    || '');
  set('destinataireemail', data.destinataireEmail  || '');
  set('destinatairetype',  data.destinataireType   || '');
  set('motif',              data.motif              || '');
  set('contexte',           data.contexte           || '');
  set('message',            data.message            || '');
  set('datelimite',        data.dateLimite         || '');
  set('statut',             'En attente');
  set('reponse',            '');
  set('datereponse',       '');
  set('auteurid',          data.auteurId           || '');
  set('horodatage',        ts);

  sheet.appendRow(row);
  return jsonResponse({ success: true, ref: ref, horodatage: ts });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION AUTOMATIQUE — feuille DemandesVallee
// ─────────────────────────────────────────────────────────────
function _getOrCreateDemandesVallee(ss) {
  let sheet = ss.getSheetByName('DemandesVallee');
  if (!sheet) {
    sheet = ss.insertSheet('DemandesVallee');
    const headers = ['Ref', 'Date', 'DestinataireNom', 'DestinataireEmail', 'DestinataireType',
      'Motif', 'Contexte', 'Message', 'DateLimite', 'Statut', 'Reponse', 'DateReponse', 'AuteurId', 'Horodatage'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setFontWeight('bold').setBackground('#f8c200').setFontColor('#000000');
    sheet.setFrozenRows(1);
    [80, 90, 160, 180, 110, 180, 260, 260, 90, 90, 300, 130, 140, 140].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
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
  const COL = { ref: headers.indexOf('ref'), statut: headers.indexOf('statut') };

  for (let i = 1; i < rows.length; i++) {
    if (_cellStr(rows[i][COL.statut]) !== 'En attente') continue;
    const ref = _cellStr(rows[i][COL.ref]);
    if (!ref) continue;

    const threads = GmailApp.search('subject:"[' + ref + ']"', 0, 5);
    let latestReply = null;
    threads.forEach(thread => {
      const messages = thread.getMessages();
      if (messages.length > 1) {
        const last = messages[messages.length - 1];
        if (!latestReply || last.getDate() > latestReply.getDate()) latestReply = last;
      }
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
// UTILITAIRES
// ─────────────────────────────────────────────────────────────
function _cellStr(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  return val.toString().trim();
}

function _todayFR() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
