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

    if (rowId === data.id && rowPwd === data.pwd && rowStatut === 'actif') {
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

  sheet.appendRow([
    data.date        || new Date().toLocaleDateString('fr-FR'),
    data.dfa         || '',   // ID (ex: Jules.Akindes)
    data.dfaNom      || '',   // Nom complet (ex: Jules AKINDES)
    data.equipe      || '',
    Number(data.activation) || 0,
    Number(data.momoUser)   || 0,
    Number(data.stockSIM)   || Number(data.stockRestant) || 0,
    data.simRecu !== undefined && data.simRecu !== '' ? Number(data.simRecu) : '',
    data.observation || '',
    data.simList     || '',
    data.mtnList     || '',
    new Date().toLocaleString('fr-FR')
  ]);

  return jsonResponse({
    success: true,
    message: 'Saisie enregistrée avec succès.',
    grossAdd: Number(data.activation) || 0
  });
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
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Demande introuvable.' });
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
    new Date().toLocaleString('fr-FR')
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
      horodatage: r[7] ? r[7].toString().trim() : ''
    });
  }
  return jsonResponse({ success: true, data: result });
}

function _initStockSIMSheet(sheet) {
  const headers = [
    'Date', 'N° SIM Début', 'N° SIM Fin', 'Quantité', 'Auteur ID', 'Auteur Nom', 'Rôle', 'Horodatage'
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
// UTILITAIRE
// ─────────────────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
