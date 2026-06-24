// InsightPanel — Google Apps Script
// ─────────────────────────────────────────────────────────────
// INSTALLATION :
//   1. Ouvrir Google Sheets > Extensions > Apps Script
//   2. Coller ce code (remplacer tout le contenu existant)
//   3. Enregistrer (icône disquette)
//   4. Déployer > Nouveau déploiement > Type : Application Web
//      - Exécuter en tant que : Moi
//      - Accès : Tout le monde
//   5. Copier l'URL générée et la coller dans InsightPanel.html
//      à la variable APPS_SCRIPT_URL
//
// FEUILLES REQUISES dans ce Google Sheets :
//   - "Utilisateurs"  : gestion des comptes (voir colonnes ci-dessous)
//   - "Saisies"       : créée automatiquement au premier envoi
//   - "StockSIM"      : créée automatiquement au premier envoi de stock
// ─────────────────────────────────────────────────────────────

const SHEET_ID = '1heK1_Gfv7BaaZ4k3I5oae7MQ8ueMG336-akYHUMLtgw';

// ─────────────────────────────────────────────────────────────
// POINT D'ENTRÉE PRINCIPAL
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'login')               return handleLogin(data);
    if (data.action === 'saisie')              return handleSaisie(data);
    if (data.action === 'getSaisies')          return handleGetSaisies(data);
    if (data.action === 'getUsers')            return handleGetUsers(data);
    if (data.action === 'submitDemande')       return handleSubmitDemande(data);
    if (data.action === 'getDemandes')         return handleGetDemandes(data);
    if (data.action === 'updateDemande')       return handleUpdateDemande(data);
    if (data.action === 'getNotifications')    return handleGetNotifications(data);
    if (data.action === 'markNotificationRead') return handleMarkNotificationRead(data);
    if (data.action === 'saveStockSIM')         return handleSaveStockSIM(data);
    if (data.action === 'getStockSIM')          return handleGetStockSIM(data);
    if (data.action === 'resetPassword')        return handleResetPassword(data);
    if (data.action === 'changeMyProfile')      return handleChangeMyProfile(data);
    if (data.action === 'savePerfSup')          return handleSavePerfSup(data);
    if (data.action === 'getPerfSup')           return handleGetPerfSup(data);
    if (data.action === 'saveTransfert')        return handleSaveTransfert(data);
    if (data.action === 'getTransferts')        return handleGetTransferts(data);
    if (data.action === 'acceptTransfert')      return handleAcceptTransfert(data);
    if (data.action === 'rejectTransfert')      return handleRejectTransfert(data);
    if (data.action === 'migrateActivations')   return handleMigrateActivations();
    if (data.action === 'getActivations')       return handleGetActivations(data);
    if (data.action === 'deduplicateSaisies')   return handleDeduplicateSaisies(data);

    // Compatibilité ancienne version (sans champ action)
    return handleSaisie(data);

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('InsightPanel API active — ' + new Date().toLocaleString('fr-FR'))
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─────────────────────────────────────────────────────────────
// AUTHENTIFICATION
// Feuille "Utilisateurs" — colonnes attendues (ligne 1 = en-têtes) :
//   ID | Mot de passe | Nom | Role | Zone | Initiales | Statut
// Exemple de valeurs :
//   Jules.Akindes | Zephir@2026 | Jules AKINDES | agent | Avrankou | JA | actif
// ─────────────────────────────────────────────────────────────
function handleLogin(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Utilisateurs');

  if (!sheet) {
    return jsonResponse({
      success: false,
      error: 'Feuille "Utilisateurs" introuvable. Créez-la dans ce Google Sheets.'
    });
  }

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());

  const COL = {
    id:      headers.indexOf('id'),
    pwd:     headers.indexOf('pwd'),
    nom:     headers.indexOf('nom'),
    role:    headers.indexOf('role'),
    zone:    headers.indexOf('zone'),
    init:    headers.indexOf('initiales'),
    statut:  headers.indexOf('statut')
  };

  // Vérifier que toutes les colonnes existent
  const missing = Object.entries(COL).filter(([, v]) => v === -1).map(([k]) => k);
  if (missing.length) {
    return jsonResponse({
      success: false,
      error: 'Colonnes manquantes dans "Utilisateurs" : ' + missing.join(', ')
    });
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowId     = row[COL.id].toString().trim();
    const rowPwd    = row[COL.pwd].toString().trim();
    const rowStatut = row[COL.statut].toString().toLowerCase().trim();

    if (rowId.toLowerCase() === data.id.toLowerCase() && rowPwd === data.pwd && rowStatut === 'actif') {
      return jsonResponse({
        success: true,
        user: {
          id:        rowId,
          nom:       row[COL.nom].toString().trim(),
          role:      row[COL.role].toString().toLowerCase().trim(),
          zone:      row[COL.zone].toString().trim(),
          initiales: row[COL.init].toString().trim(),
          statut:    'actif'
        }
      });
    }
  }

  return jsonResponse({ success: false, error: 'Identifiant ou mot de passe incorrect.' });
}

// ─────────────────────────────────────────────────────────────
// ENREGISTREMENT D'UNE SAISIE
// Feuille "Saisies" — créée automatiquement si absente
// Colonnes : Date | DFA (ID) | Nom DFA | Zone | Gross Add | New MoMo User |
//            Stock SIM | SIM Disponible | Observation | N° SIMs | N° MTNs | Horodatage
// Note : "DFA" contient l'identifiant (ex: Jules.Akindes) pour la synchronisation des dashboards
// Note : "SIM Disponible" est renseigné uniquement à la première saisie du DFA chaque jour
// ─────────────────────────────────────────────────────────────
function handleSaisie(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let sheet = ss.getSheetByName('Saisies');
  if (!sheet) {
    sheet = ss.insertSheet('Saisies');
    _initSaisiesSheet(sheet);
  }

  const dateStr = data.date || new Date().toLocaleDateString('fr-FR');
  const ts      = new Date().toLocaleString('fr-FR');

  sheet.appendRow([
    dateStr,
    data.dfa         || '',
    data.dfaNom      || '',
    data.equipe      || '',
    Number(data.activation) || 0,
    Number(data.momoUser)   || 0,
    Number(data.stockSIM)   || Number(data.stockRestant) || 0,
    data.simRecu !== undefined && data.simRecu !== '' ? Number(data.simRecu) : '',
    data.observation || '',
    data.simList     || '',
    data.mtnList     || '',
    ts
  ]);

  /* Écriture individuelle dans ACTIVATIONS (une ligne par SIM+MTN) */
  if (data.simList) {
    _appendActivations(ss, dateStr, data.dfa || '', data.dfaNom || '', data.equipe || '', data.simList, data.mtnList || '', ts);
  }

  return jsonResponse({
    success: true,
    message: 'Saisie enregistrée avec succès.',
    grossAdd: Number(data.activation) || 0
  });
}

// ─────────────────────────────────────────────────────────────
// FEUILLE ACTIVATIONS — écriture des lignes individuelles
// ─────────────────────────────────────────────────────────────
function _getOrCreateActivationsSheet(ss) {
  let sheet = ss.getSheetByName('Activations');
  if (!sheet) {
    sheet = ss.insertSheet('Activations');
    sheet.appendRow(['Horodatage', 'Date', 'DFA ID', 'DFA Nom', 'Zone', 'N° SIM', 'N° MTN']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f8c200');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 110);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 130);
    sheet.setColumnWidth(6, 130);
    sheet.setColumnWidth(7, 130);
  }
  return sheet;
}

function _appendActivations(ss, dateStr, dfaId, dfaNom, zone, simList, mtnList, ts) {
  const actSheet = _getOrCreateActivationsSheet(ss);
  const sims = simList.split(',').map(s => s.trim()).filter(Boolean);
  const mtns = mtnList ? mtnList.split(',').map(s => s.trim()) : [];
  const rows = sims.map((sim, i) => [ts, dateStr, dfaId, dfaNom, zone, sim, mtns[i] || '']);
  if (rows.length > 0) {
    actSheet.getRange(actSheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }
}

// ─────────────────────────────────────────────────────────────
// MIGRATION : explode les simList/mtnList existantes en lignes individuelles
// ─────────────────────────────────────────────────────────────
function handleMigrateActivations() {
  const ss        = SpreadsheetApp.openById(SHEET_ID);
  const saisies   = ss.getSheetByName('Saisies');
  if (!saisies) return jsonResponse({ success: false, error: 'Feuille Saisies introuvable.' });

  /* Lire toutes les saisies existantes (colonnes : date=0, dfaId=1, dfaNom=2, zone=3, simList=9, mtnList=10) */
  const data   = saisies.getDataRange().getValues();
  const header = data[0].map(h => h.toString().toLowerCase());
  const idx    = {
    date:    header.indexOf('date'),
    dfaId:   header.indexOf('dfa id') !== -1 ? header.indexOf('dfa id') : 1,
    dfaNom:  header.indexOf('dfa nom') !== -1 ? header.indexOf('dfa nom') : 2,
    zone:    header.indexOf('zone') !== -1 ? header.indexOf('zone') : 3,
    simList: header.indexOf('simliste') !== -1 ? header.indexOf('simliste') : 9,
    mtnList: header.indexOf('mtnliste') !== -1 ? header.indexOf('mtnliste') : 10,
    ts:      header.indexOf('horodatage') !== -1 ? header.indexOf('horodatage') : 11
  };

  /* Récupérer les SIMs déjà dans Activations pour éviter les doublons */
  const actSheet   = _getOrCreateActivationsSheet(ss);
  const existingRows = actSheet.getLastRow() > 1 ? actSheet.getRange(2, 6, actSheet.getLastRow() - 1, 1).getValues().flat().map(s => s.toString().trim()) : [];
  const existingSet  = new Set(existingRows.filter(Boolean));

  const newRows = [];
  for (let i = 1; i < data.length; i++) {
    const row     = data[i];
    const simList = (row[idx.simList] || '').toString().trim();
    if (!simList) continue;
    const mtnList = (row[idx.mtnList] || '').toString().trim();
    const sims    = simList.split(',').map(s => s.trim()).filter(Boolean);
    const mtns    = mtnList ? mtnList.split(',').map(s => s.trim()) : [];
    const dateStr = row[idx.date] ? row[idx.date].toString() : '';
    const ts      = row[idx.ts]   ? row[idx.ts].toString()   : dateStr;

    sims.forEach((sim, j) => {
      if (existingSet.has(sim)) return;   // déjà migré, skip
      existingSet.add(sim);
      newRows.push([ts, dateStr, (row[idx.dfaId]||'').toString(), (row[idx.dfaNom]||'').toString(), (row[idx.zone]||'').toString(), sim, mtns[j] || '']);
    });
  }

  if (newRows.length > 0) {
    actSheet.getRange(actSheet.getLastRow() + 1, 1, newRows.length, 7).setValues(newRows);
  }

  return jsonResponse({ success: true, migrated: newRows.length, message: newRows.length + ' activations migrées dans la feuille Activations.' });
}

// ─────────────────────────────────────────────────────────────
// LECTURE ACTIVATIONS (lecture paginée ou filtrée)
// ─────────────────────────────────────────────────────────────
function handleGetActivations(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Activations');
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: true, activations: [] });

  const rows   = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  const dfaId  = data.dfaId  || null;
  const depuis = data.depuis || null;

  const activations = rows
    .filter(r => {
      if (!r[5]) return false;                             // SIM vide → skip
      if (dfaId  && r[2].toString() !== dfaId) return false;
      if (depuis && r[1].toString() < depuis)  return false;
      return true;
    })
    .map(r => ({
      ts:     r[0].toString(),
      date:   r[1].toString(),
      dfaId:  r[2].toString(),
      dfaNom: r[3].toString(),
      zone:   r[4].toString(),
      sim:    r[5].toString().trim(),
      mtn:    r[6].toString().trim()
    }));

  return jsonResponse({ success: true, activations });
}

// ─────────────────────────────────────────────────────────────
// INITIALISATION DE LA FEUILLE SAISIES (en-têtes + mise en forme)
// ─────────────────────────────────────────────────────────────
function _initSaisiesSheet(sheet) {
  const headers = [
    'Date', 'DFA (ID)', 'Nom DFA', 'Zone', 'Gross Add', 'New MoMo User',
    'Stock SIM', 'SIM Disponible', 'Observation', 'N° SIMs', 'N° MTNs', 'Horodatage'
  ];
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#F6B924');
  headerRange.setFontColor('#000000');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // Largeurs de colonnes
  sheet.setColumnWidth(1, 90);   // Date
  sheet.setColumnWidth(2, 150);  // DFA (ID)
  sheet.setColumnWidth(3, 160);  // Nom DFA
  sheet.setColumnWidth(4, 160);  // Zone
  sheet.setColumnWidth(5, 80);   // Gross Add
  sheet.setColumnWidth(6, 110);  // New MoMo User
  sheet.setColumnWidth(7, 80);   // Stock SIM
  sheet.setColumnWidth(8, 100);  // SIM Disponible
  sheet.setColumnWidth(9, 200);  // Observation
  sheet.setColumnWidth(10, 300); // N° SIMs
  sheet.setColumnWidth(11, 300); // N° MTNs
  sheet.setColumnWidth(12, 140); // Horodatage
}

// ─────────────────────────────────────────────────────────────
// LECTURE DES SAISIES — pour alimenter les dashboards
// Retourne toutes les lignes de la feuille "Saisies" en JSON
// ─────────────────────────────────────────────────────────────
function handleGetSaisies(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Saisies');
  if (!sheet) return jsonResponse({ success: true, saisies: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, saisies: [] });

  const saisies = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue; // ligne vide
    saisies.push({
      date:     r[0]  ? r[0].toString().trim()  : '',
      dfaId:    r[1]  ? r[1].toString().trim()  : '',
      dfaNom:   r[2]  ? r[2].toString().trim()  : '',
      zone:     r[3]  ? r[3].toString().trim()  : '',
      grossAdd: Number(r[4]) || 0,
      momoUser: Number(r[5]) || 0,
      stockSIM: Number(r[6]) || 0,
      simDispo: (r[7] !== '' && r[7] !== null && r[7] !== undefined) ? Number(r[7]) : null,
      obs:      r[8]  ? r[8].toString().trim()  : '',
      simList:  r[9]  ? r[9].toString().trim()  : '',
      mtnList:  r[10] ? r[10].toString().trim() : '',
      ts:       r[11] ? r[11].toString().trim() : ''
    });
  }
  return jsonResponse({ success: true, saisies });
}

// ─────────────────────────────────────────────────────────────
// LISTE DES UTILISATEURS — sans mots de passe (pour les dashboards)
// ─────────────────────────────────────────────────────────────
function handleGetUsers(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Utilisateurs');
  if (!sheet) return jsonResponse({ success: true, users: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, users: [] });

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const COL = {
    id:     headers.indexOf('id'),
    nom:    headers.indexOf('nom'),
    role:   headers.indexOf('role'),
    zone:   headers.indexOf('zone'),
    init:   headers.indexOf('initiales'),
    statut: headers.indexOf('statut')
  };

  const users = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[COL.id] || r[COL.id].toString().trim() === '') continue;
    users.push({
      id:        r[COL.id].toString().trim(),
      nom:       COL.nom    >= 0 ? r[COL.nom].toString().trim()                          : '',
      role:      COL.role   >= 0 ? r[COL.role].toString().toLowerCase().trim()           : '',
      zone:      COL.zone   >= 0 ? r[COL.zone].toString().trim()                         : '',
      initiales: COL.init   >= 0 ? r[COL.init].toString().trim()                         : '',
      statut:    COL.statut >= 0 ? r[COL.statut].toString().toLowerCase().trim()         : 'actif'
    });
  }
  return jsonResponse({ success: true, users });
}

// ─────────────────────────────────────────────────────────────
// DEMANDES D'ACCÈS
// Feuille "Demandes" — colonnes :
//   ID | Date | Nom | Zone | Superviseur ID | Superviseur Nom |
//   Téléphone | Identifiant | Mot de passe | Message | Statut | Commentaire | Horodatage
// ─────────────────────────────────────────────────────────────
function handleSubmitDemande(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Demandes');
  if (!sheet) {
    sheet = ss.insertSheet('Demandes');
    _initDemandesSheet(sheet);
  }

  const id = 'DEM-' + Date.now();
  sheet.appendRow([
    id,
    data.date           || new Date().toLocaleDateString('fr-FR'),
    data.nom            || '',
    data.zone           || '',
    data.superviseurId  || '',
    data.superviseurNom || '',
    data.telephone      || '',
    data.identifiant    || '',
    data.pwd            || '',
    data.message        || '',
    'en_attente',
    '',
    new Date().toLocaleString('fr-FR')
  ]);

  return jsonResponse({ success: true, message: 'Demande enregistrée.', id });
}

function handleGetDemandes(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Demandes');
  if (!sheet) return jsonResponse({ success: true, demandes: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, demandes: [] });

  const demandes = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    demandes.push({
      id:             r[0].toString().trim(),
      date:           r[1].toString().trim(),
      nom:            r[2].toString().trim(),
      zone:           r[3].toString().trim(),
      superviseurId:  r[4].toString().trim(),
      superviseurNom: r[5].toString().trim(),
      telephone:      r[6].toString().trim(),
      identifiant:    r[7].toString().trim(),
      message:        r[9].toString().trim(),
      statut:         r[10].toString().trim() || 'en_attente',
      commentaire:    r[11].toString().trim()
    });
  }
  return jsonResponse({ success: true, demandes });
}

function handleUpdateDemande(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Demandes');
  if (!sheet) return jsonResponse({ success: false, error: 'Feuille Demandes introuvable.' });

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().trim() === data.id) {
      sheet.getRange(i + 1, 11).setValue(data.statut      || rows[i][10]);
      sheet.getRange(i + 1, 12).setValue(data.commentaire || rows[i][11]);

      /* Création automatique du compte DFA quand la demande est approuvée */
      if (data.statut === 'approuve') {
        const nom         = rows[i][2].toString().trim();
        const zone        = rows[i][3].toString().trim();
        const identifiant = rows[i][7].toString().trim();
        const pwd         = rows[i][8].toString().trim();

        if (identifiant && pwd) {
          const result = _createUserFromDemande(ss, identifiant, pwd, nom, zone);
          return jsonResponse({ success: true, userCreated: result });
        }
      }

      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Demande introuvable.' });
}

function _createUserFromDemande(ss, id, pwd, nom, zone) {
  const sheet = ss.getSheetByName('Utilisateurs');
  if (!sheet) return false;

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());

  /* Vérifier si le compte existe déjà */
  const idCol = headers.indexOf('id');
  if (idCol !== -1) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idCol].toString().trim() === id) return false; // déjà existant
    }
  }

  /* Générer les initiales depuis le nom */
  const initiales = nom.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 3);

  /* Construire la nouvelle ligne dans l'ordre des colonnes de la feuille */
  const COL = {
    id:       headers.indexOf('id'),
    pwd:      headers.indexOf('pwd'),
    nom:      headers.indexOf('nom'),
    role:     headers.indexOf('role'),
    zone:     headers.indexOf('zone'),
    initiales:headers.indexOf('initiales'),
    statut:   headers.indexOf('statut')
  };

  const newRow = new Array(headers.length).fill('');
  if (COL.id        !== -1) newRow[COL.id]        = id;
  if (COL.pwd       !== -1) newRow[COL.pwd]       = pwd;
  if (COL.nom       !== -1) newRow[COL.nom]       = nom;
  if (COL.role      !== -1) newRow[COL.role]      = 'agent';
  if (COL.zone      !== -1) newRow[COL.zone]      = zone;
  if (COL.initiales !== -1) newRow[COL.initiales] = initiales;
  if (COL.statut    !== -1) newRow[COL.statut]    = 'actif';

  sheet.appendRow(newRow);
  return true;
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// Feuille "Notifications" — colonnes :
//   ID | Date | Destinataire ID | Expéditeur | Message | Lu | Horodatage
// ─────────────────────────────────────────────────────────────
function handleGetNotifications(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return jsonResponse({ success: true, notifications: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, notifications: [] });

  const notifications = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    if (data.userId && r[2].toString().trim() !== data.userId) continue;
    notifications.push({
      id:          r[0].toString().trim(),
      date:        r[1].toString().trim(),
      userId:      r[2].toString().trim(),
      expediteur:  r[3].toString().trim(),
      message:     r[4].toString().trim(),
      lu:          r[5].toString().trim() || '0'
    });
  }
  return jsonResponse({ success: true, notifications });
}

function handleMarkNotificationRead(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return jsonResponse({ success: false });

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().trim() === data.id) {
      sheet.getRange(i + 1, 6).setValue('1');
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Notification introuvable.' });
}

function _initDemandesSheet(sheet) {
  const headers = [
    'ID', 'Date', 'Nom', 'Zone', 'Superviseur ID', 'Superviseur Nom',
    'Téléphone', 'Identifiant', 'Mot de passe', 'Message', 'Statut', 'Commentaire', 'Horodatage'
  ];
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  const hr = sheet.getRange(1, 1, 1, headers.length);
  hr.setBackground('#F6B924');
  hr.setFontColor('#000000');
  hr.setFontWeight('bold');
  hr.setHorizontalAlignment('center');
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 130);
  sheet.setColumnWidth(10, 200);
  sheet.setColumnWidth(11, 100);
  sheet.setColumnWidth(12, 200);
  sheet.setColumnWidth(13, 140);
}

// ─────────────────────────────────────────────────────────────
// STOCK SIM GSM — ENREGISTREMENT
// Feuille "StockSIM" — colonnes :
//   Date | N° SIM Début | N° SIM Fin | Quantité | Auteur ID | Auteur Nom | Rôle | Horodatage
// ─────────────────────────────────────────────────────────────
function handleSaveStockSIM(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('StockSIM');
  if (!sheet) {
    sheet = ss.insertSheet('StockSIM');
    _initStockSIMSheet(sheet);
  }

  sheet.appendRow([
    data.date       || new Date().toLocaleDateString('fr-FR'),
    data.simDebut   || '',
    data.simFin     || '',
    Number(data.quantite) || 0,
    data.auteurId   || '',
    data.auteurNom  || '',
    data.auteurRole || '',
    new Date().toLocaleString('fr-FR'),
    (data.type || 'p100').toLowerCase()
  ]);

  return jsonResponse({ success: true, message: 'Stock enregistré avec succès.' });
}

// ─────────────────────────────────────────────────────────────
// STOCK SIM GSM — LECTURE
// ─────────────────────────────────────────────────────────────
function handleGetStockSIM(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('StockSIM');
  if (!sheet) return jsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;
    result.push({
      date:       r[0] ? r[0].toString().trim() : '',
      simDebut:   r[1] ? r[1].toString().trim() : '',
      simFin:     r[2] ? r[2].toString().trim() : '',
      quantite:   Number(r[3]) || 0,
      auteurId:   r[4] ? r[4].toString().trim() : '',
      auteurNom:  r[5] ? r[5].toString().trim() : '',
      auteurRole: r[6] ? r[6].toString().trim() : '',
      horodatage: r[7] ? r[7].toString().trim() : '',
      type:       r[8] ? r[8].toString().trim().toLowerCase() : 'p100'
    });
  }
  return jsonResponse({ success: true, data: result });
}

function _initStockSIMSheet(sheet) {
  const headers = [
    'Date', 'N° SIM Début', 'N° SIM Fin', 'Quantité', 'Auteur ID', 'Auteur Nom', 'Rôle', 'Horodatage', 'Type'
  ];
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);

  const hr = sheet.getRange(1, 1, 1, headers.length);
  hr.setBackground('#F6B924');
  hr.setFontColor('#000000');
  hr.setFontWeight('bold');
  hr.setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 90);   // Date
  sheet.setColumnWidth(2, 130);  // N° SIM Début
  sheet.setColumnWidth(3, 130);  // N° SIM Fin
  sheet.setColumnWidth(4, 80);   // Quantité
  sheet.setColumnWidth(5, 150);  // Auteur ID
  sheet.setColumnWidth(6, 160);  // Auteur Nom
  sheet.setColumnWidth(7, 90);   // Rôle
  sheet.setColumnWidth(8, 140);  // Horodatage
}

// ─────────────────────────────────────────────────────────────
// PERFORMANCE SUPERVISEUR — ENREGISTREMENT
// Feuille "PerfSup" — colonnes :
//   Date | Sup ID | Sup Nom | Zone | Perf Jour | Perf Globale | Horodatage
// ─────────────────────────────────────────────────────────────
function handleSavePerfSup(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('PerfSup');
  if (!sheet) {
    sheet = ss.insertSheet('PerfSup');
    _initPerfSupSheet(sheet);
  }
  sheet.appendRow([
    data.date       || new Date().toISOString().slice(0, 10),
    data.supId      || '',
    data.supNom     || '',
    data.zone       || '',
    Number(data.perfJour)    || 0,
    Number(data.perfGlobale) || 0,
    new Date().toLocaleString('fr-FR')
  ]);
  return jsonResponse({ success: true, message: 'Performance enregistrée.' });
}

// ─────────────────────────────────────────────────────────────
// PERFORMANCE SUPERVISEUR — LECTURE (filtré par supId)
// ─────────────────────────────────────────────────────────────
function handleGetPerfSup(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('PerfSup');
  if (!sheet) return jsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const result = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;
    const supId = r[1] ? r[1].toString().trim() : '';
    if (data.supId && supId.toLowerCase() !== data.supId.toLowerCase()) continue;
    const dateVal = r[0] instanceof Date
      ? Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : (r[0] ? r[0].toString().trim() : '');
    result.push({
      date:        dateVal,
      supId,
      supNom:      r[2] ? r[2].toString().trim() : '',
      zone:        r[3] ? r[3].toString().trim() : '',
      perfJour:    Number(r[4]) || 0,
      perfGlobale: Number(r[5]) || 0,
      horodatage:  r[6] ? r[6].toString().trim() : ''
    });
    if (result.length >= 30) break;
  }
  return jsonResponse({ success: true, data: result });
}

function _initPerfSupSheet(sheet) {
  const headers = ['Date', 'Sup ID', 'Sup Nom', 'Zone', 'Perf Jour', 'Perf Globale', 'Horodatage'];
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  const hr = sheet.getRange(1, 1, 1, headers.length);
  hr.setBackground('#F6B924');
  hr.setFontColor('#000000');
  hr.setFontWeight('bold');
  hr.setHorizontalAlignment('center');
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 90);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 150);
}

// ─────────────────────────────────────────────────────────────
// RÉINITIALISATION MOT DE PASSE — ra et admin uniquement
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// PROFIL UTILISATEUR — auto-modification numéro et mot de passe
// data: { userId, currentPwd, newPwd? (opt.), telephone? (opt.) }
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// PROFIL UTILISATEUR — auto-modification numéro et mot de passe
// data: { userId, telephone? } OU { userId, currentPwd, newPwd }
// Téléphone : pas de vérification de mot de passe (faible risque)
// Mot de passe : currentPwd obligatoire pour vérification
// ─────────────────────────────────────────────────────────────
function handleChangeMyProfile(data) {
  if (!data.userId) {
    return jsonResponse({ success: false, error: 'Identifiant utilisateur manquant.' });
  }
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Utilisateurs');
  if (!sheet) return jsonResponse({ success: false, error: 'Feuille Utilisateurs introuvable.' });

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const colId   = headers.indexOf('id');
  const colPwd  = headers.indexOf('pwd');
  const colTel  = headers.indexOf('telephone');

  if (colId === -1 || colPwd === -1) {
    return jsonResponse({ success: false, error: 'Structure Utilisateurs invalide.' });
  }

  for (let i = 1; i < rows.length; i++) {
    const rowId = rows[i][colId] ? rows[i][colId].toString().trim() : '';
    if (rowId.toLowerCase() !== data.userId.toLowerCase()) continue;

    // Changement de mot de passe — vérification obligatoire
    if (data.newPwd) {
      if (!data.currentPwd) {
        return jsonResponse({ success: false, error: 'Mot de passe actuel requis.' });
      }
      const storedPwd = rows[i][colPwd] ? rows[i][colPwd].toString().trim() : '';
      if (storedPwd !== data.currentPwd) {
        return jsonResponse({ success: false, error: 'Mot de passe actuel incorrect.' });
      }
      if (data.newPwd.length < 6) {
        return jsonResponse({ success: false, error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
      }
      sheet.getRange(i + 1, colPwd + 1).setValue(data.newPwd);
    }

    // Mise à jour du téléphone
    if (data.telephone !== undefined && data.telephone !== null) {
      if (colTel !== -1) {
        sheet.getRange(i + 1, colTel + 1).setValue(data.telephone);
      } else {
        const lastCol = headers.length + 1;
        sheet.getRange(1, lastCol).setValue('Telephone');
        sheet.getRange(i + 1, lastCol).setValue(data.telephone);
      }
    }

    return jsonResponse({ success: true, message: 'Profil mis à jour.' });
  }

  return jsonResponse({ success: false, error: 'Utilisateur introuvable.' });
}

function handleResetPassword(data) {
  const allowedRoles = ['ra', 'admin'];
  if (!allowedRoles.includes(data.requesterRole)) {
    return jsonResponse({ success: false, error: 'Accès non autorisé.' });
  }
  if (!data.targetId || !data.newPwd || data.newPwd.length < 6) {
    return jsonResponse({ success: false, error: 'Paramètres invalides.' });
  }

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Utilisateurs');
  if (!sheet) return jsonResponse({ success: false, error: 'Feuille Utilisateurs introuvable.' });

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const colId   = headers.indexOf('id');
  const colPwd  = headers.indexOf('mot de passe');
  if (colId === -1 || colPwd === -1) {
    return jsonResponse({ success: false, error: 'Colonnes ID ou Mot de passe introuvables.' });
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colId] && rows[i][colId].toString().trim().toLowerCase() === data.targetId.toLowerCase()) {
      sheet.getRange(i + 1, colPwd + 1).setValue(data.newPwd);
      return jsonResponse({ success: true, message: 'Mot de passe mis à jour.' });
    }
  }
  return jsonResponse({ success: false, error: 'Utilisateur introuvable : ' + data.targetId });
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRE
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// TRANSFERTS INTER-SUPERVISEURS — ENREGISTREMENT
// Colonnes : ID | Date | Source ID | Source Nom | Dest ID | Dest Nom | SIM List | Quantité | Horodatage
// ─────────────────────────────────────────────────────────────
function handleSaveTransfert(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Transferts');
  if (!sheet) {
    sheet = ss.insertSheet('Transferts');
    const headers = ['ID','Date','Source ID','Source Nom','Dest ID','Dest Nom','N° SIM Début','N° SIM Fin','Quantité','Horodatage'];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    const hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setBackground('#F6B924'); hr.setFontColor('#000000');
    hr.setFontWeight('bold'); hr.setHorizontalAlignment('center');
    [130,90,150,160,150,160,130,130,80,140].forEach((w,i) => sheet.setColumnWidth(i+1,w));
  }

  const id = 'TRF-' + Date.now();
  sheet.appendRow([
    id,
    data.date      || new Date().toLocaleDateString('fr-FR'),
    data.sourceId  || '',
    data.sourceNom || '',
    data.destId    || '',
    data.destNom   || '',
    data.simDebut  || '',
    data.simFin    || '',
    Number(data.quantite) || 0,
    new Date().toLocaleString('fr-FR'),
    'en_attente'
  ]);

  return jsonResponse({ success: true, message: 'Transfert enregistré.', id });
}

// ─────────────────────────────────────────────────────────────
// TRANSFERTS INTER-SUPERVISEURS — LECTURE
// Superviseur : voit seulement ses transferts (source ou dest)
// RA / Admin / DG / DGA / DC / DCC : voient tout
// ─────────────────────────────────────────────────────────────
function handleGetTransferts(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Transferts');
  if (!sheet) return jsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return jsonResponse({ success: true, data: [] });

  const globalRoles = ['ra','admin','dg','dga','dc','dcc'];
  const isGlobal    = globalRoles.includes((data.role || '').toLowerCase());

  const result = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    const r = rows[i];
    if (!r[0]) continue;
    const sourceId = r[2] ? r[2].toString().trim() : '';
    const destId   = r[4] ? r[4].toString().trim() : '';

    if (!isGlobal && data.userId) {
      if (sourceId.toLowerCase() !== data.userId.toLowerCase() &&
          destId.toLowerCase()   !== data.userId.toLowerCase()) continue;
    }

    result.push({
      id:        r[0] ? r[0].toString().trim() : '',
      date:      r[1] ? r[1].toString().trim() : '',
      sourceId,
      sourceNom: r[3] ? r[3].toString().trim() : '',
      destId,
      destNom:   r[5] ? r[5].toString().trim() : '',
      simDebut:  r[6] ? r[6].toString().trim() : '',
      simFin:    r[7] ? r[7].toString().trim() : '',
      quantite:  Number(r[8]) || 0,
      horodatage: r[9] ? r[9].toString().trim() : '',
      statut:    r[10] ? r[10].toString().trim() : 'accepté'
    });
  }
  return jsonResponse({ success: true, data: result });
}

// ─────────────────────────────────────────────────────────────
// TRANSFERTS — ACCEPTATION
// Destinataire accepte : statut → 'accepté' + ligne créée dans StockSIM
// ─────────────────────────────────────────────────────────────
function handleAcceptTransfert(data) {
  if (!data.userId || !data.transfertId) return jsonResponse({ success: false, error: 'Données manquantes.' });

  const ss     = SpreadsheetApp.openById(SHEET_ID);
  const tSheet = ss.getSheetByName('Transferts');
  if (!tSheet) return jsonResponse({ success: false, error: 'Feuille Transferts introuvable.' });

  const rows = tSheet.getDataRange().getValues();
  let foundRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toString() === data.transfertId) { foundRow = i + 1; break; }
  }
  if (foundRow === -1) return jsonResponse({ success: false, error: 'Transfert introuvable.' });

  const row    = rows[foundRow - 1];
  const destId = row[4] ? row[4].toString().trim() : '';
  if (destId.toLowerCase() !== data.userId.toLowerCase()) return jsonResponse({ success: false, error: 'Non autorisé.' });

  const currentStatut = row[10] ? row[10].toString().trim() : '';
  if (currentStatut !== '' && currentStatut !== 'en_attente') return jsonResponse({ success: false, error: 'Ce transfert a déjà été traité.' });

  /* Marquer accepté (colonne 11) */
  tSheet.getRange(foundRow, 11).setValue('accepté');

  /* Créer la plage dans StockSIM pour le destinataire */
  let sSheet = ss.getSheetByName('StockSIM');
  if (!sSheet) { sSheet = ss.insertSheet('StockSIM'); _initStockSIMSheet(sSheet); }

  sSheet.appendRow([
    row[1] ? row[1].toString().trim() : new Date().toLocaleDateString('fr-FR'),
    row[6] ? row[6].toString().trim() : '',
    row[7] ? row[7].toString().trim() : '',
    Number(row[8]) || 0,
    destId,
    row[5] ? row[5].toString().trim() : '',
    'superviseur',
    new Date().toLocaleString('fr-FR'),
    'transfert'
  ]);

  return jsonResponse({ success: true, message: 'Transfert accepté. La plage a été ajoutée à votre stock.' });
}

// ─────────────────────────────────────────────────────────────
// TRANSFERTS — REFUS
// ─────────────────────────────────────────────────────────────
function handleRejectTransfert(data) {
  if (!data.userId || !data.transfertId) return jsonResponse({ success: false, error: 'Données manquantes.' });

  const ss     = SpreadsheetApp.openById(SHEET_ID);
  const tSheet = ss.getSheetByName('Transferts');
  if (!tSheet) return jsonResponse({ success: false, error: 'Feuille Transferts introuvable.' });

  const rows = tSheet.getDataRange().getValues();
  let foundRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toString() === data.transfertId) { foundRow = i + 1; break; }
  }
  if (foundRow === -1) return jsonResponse({ success: false, error: 'Transfert introuvable.' });

  const row    = rows[foundRow - 1];
  const destId = row[4] ? row[4].toString().trim() : '';
  if (destId.toLowerCase() !== data.userId.toLowerCase()) return jsonResponse({ success: false, error: 'Non autorisé.' });

  const currentStatut = row[10] ? row[10].toString().trim() : '';
  if (currentStatut !== '' && currentStatut !== 'en_attente') return jsonResponse({ success: false, error: 'Ce transfert a déjà été traité.' });

  tSheet.getRange(foundRow, 11).setValue('refusé');

  return jsonResponse({ success: true, message: 'Transfert refusé.' });
}

// ─────────────────────────────────────────────────────────────
// DÉDUPLICATION — supprime les lignes en doublon
// Saisies    : clé = Date + DFA ID + Gross Add  → garde la plus récente
// Activations : clé = N° SIM                   → garde la première occurrence
// Accès réservé aux rôles ra et admin
// ─────────────────────────────────────────────────────────────
function handleDeduplicateSaisies(data) {
  const allowedRoles = ['ra', 'admin'];
  if (!allowedRoles.includes((data.requesterRole || '').toLowerCase())) {
    return jsonResponse({ success: false, error: 'Accès non autorisé.' });
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const stats = { saisies: 0, activations: 0 };

  /* --- Feuille Saisies : clé = date|dfaId|grossAdd --- */
  const saisiesSheet = ss.getSheetByName('Saisies');
  if (saisiesSheet && saisiesSheet.getLastRow() > 1) {
    const rows    = saisiesSheet.getDataRange().getValues();
    const dataRows = rows.slice(1); // sans en-tête
    const seen    = new Set();
    const toDelete = []; // indices 1-based dans la feuille

    // Parcours de bas en haut : on garde la dernière (plus récente)
    for (let i = dataRows.length - 1; i >= 0; i--) {
      const r   = dataRows[i];
      if (!r[0] && !r[1]) continue; // ligne vide → skip
      const key = [
        (r[0] || '').toString().trim(),
        (r[1] || '').toString().trim().toLowerCase(),
        (r[4] || '').toString().trim()
      ].join('|');

      if (seen.has(key)) {
        toDelete.push(i + 2); // +2 : +1 pour l'en-tête, +1 pour l'index 1-based
      } else {
        seen.add(key);
      }
    }

    // Suppression de bas en haut pour ne pas décaler les indices
    toDelete.sort((a, b) => b - a).forEach(rowNum => saisiesSheet.deleteRow(rowNum));
    stats.saisies = toDelete.length;
  }

  /* --- Feuille Activations : clé = N° SIM (col 6, index 5) --- */
  const actSheet = ss.getSheetByName('Activations');
  if (actSheet && actSheet.getLastRow() > 1) {
    const rows    = actSheet.getDataRange().getValues();
    const dataRows = rows.slice(1);
    const seenSIMs = new Set();
    const toDelete = [];

    // Parcours de bas en haut : on garde la première occurrence (plus ancienne)
    for (let i = dataRows.length - 1; i >= 0; i--) {
      const sim = (dataRows[i][5] || '').toString().trim();
      if (!sim) continue;
      if (seenSIMs.has(sim)) {
        toDelete.push(i + 2);
      } else {
        seenSIMs.add(sim);
      }
    }

    toDelete.sort((a, b) => b - a).forEach(rowNum => actSheet.deleteRow(rowNum));
    stats.activations = toDelete.length;
  }

  const msg = `Déduplication terminée — ${stats.saisies} saisie(s) et ${stats.activations} activation(s) en doublon supprimées.`;
  return jsonResponse({ success: true, message: msg, stats });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
