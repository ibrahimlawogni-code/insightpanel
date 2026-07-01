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

const VALLEE_SHEET_ID = ''; // ← RENSEIGNER ICI l'ID du Google Sheets Team Vallée

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
