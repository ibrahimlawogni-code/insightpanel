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
// ─────────────────────────────────────────────────────────────

const SHEET_ID = '1heK1_Gfv7BaaZ4k3I5oae7MQ8ueMG336-akYHUMLtgw';

// ─────────────────────────────────────────────────────────────
// POINT D'ENTRÉE PRINCIPAL
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'login')  return handleLogin(data);
    if (data.action === 'saisie') return handleSaisie(data);

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
// UTILITAIRE
// ─────────────────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
