// InsightPanel — Google Apps Script
// Coller ce code dans : Google Sheet > Extensions > Apps Script
// Puis déployer comme Web App (voir instructions)

const SHEET_ID = '1heK1_Gfv7BaaZ4k3I5oae7MQ8ueMG336-akYHUMLtgw';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const data  = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.date         || new Date().toLocaleDateString('fr-FR'),
      data.dfa          || '',
      data.equipe       || '',
      data.activation   || 0,
      data.stockRestant || 0,
      data.observation  || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Données enregistrées avec succès.' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test rapide : ouvrir cette URL dans le navigateur doit renvoyer "InsightPanel API active"
function doGet(e) {
  return ContentService
    .createTextOutput('InsightPanel API active')
    .setMimeType(ContentService.MimeType.TEXT);
}
