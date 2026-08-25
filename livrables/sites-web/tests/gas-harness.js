// Faux Google Sheets : suffisant pour les handlers testes.
class FakeSheet {
  constructor(nom, rows) { this.nom = nom; this.rows = rows.map(r => r.slice()); }
  getName() { return this.nom; }
  getDataRange() { return this._range(1, 1, this.rows.length, this.maxCols()); }
  maxCols() { return Math.max(...this.rows.map(r => r.length), 1); }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.maxCols(); }
  getMaxRows() { return this._maxRows === undefined ? this.rows.length + 100 : this._maxRows; }
  insertRowsAfter(apres, n) { this._maxRows = this.getMaxRows() + n; }
  appendRow(r) { this.rows.push(r.slice()); }
  deleteRow(n) { this.rows.splice(n - 1, 1); }
  setFrozenRows() {} setColumnWidth() {}
  insertColumnBefore() {}
  getRange(row, col, nr = 1, nc = 1) { return this._range(row, col, nr, nc); }
  _range(row, col, nr, nc) {
    const sh = this;
    // Le vrai getRange refuse de sortir de la grille : appendRow l agrandit, pas getRange.
    if (row + nr - 1 > sh.getMaxRows()) {
      throw new Error('The coordinates or dimensions of the range are invalid.');
    }
    return {
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const src = sh.rows[row - 1 + i] || [];
          const line = [];
          for (let j = 0; j < nc; j++) line.push(src[col - 1 + j] !== undefined ? src[col - 1 + j] : '');
          out.push(line);
        }
        return out;
      },
      setValues(vals) {
        vals.forEach((line, i) => {
          const r = row - 1 + i;
          if (!sh.rows[r]) sh.rows[r] = [];
          line.forEach((v, j) => sh.rows[r][col - 1 + j] = v);
        });
        return this;
      },
      setValue(v) { return this.setValues([[v]]); },
      setNumberFormat() { return this; }, setFontWeight() { return this; },
      setBackground() { return this; }, setFontColor() { return this; }
    };
  }
}

class FakeSS {
  constructor(sheets) { this.sheets = sheets; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { return (this.sheets[n] = new FakeSheet(n, [])); }
}

global.__SS = null;
global.SpreadsheetApp = { openById: () => global.__SS, flush: () => {} };
global.Session = { getScriptTimeZone: () => 'UTC', getEffectiveUser: () => ({ getEmail: () => 'moi@zephir.bj' }) };
global.Utilities = {
  formatDate(d, tz, fmt) {
    const p = n => String(n).padStart(2, '0');
    return fmt.replace('yyyy', d.getUTCFullYear()).replace('dd', p(d.getUTCDate()))
      .replace('MM', p(d.getUTCMonth() + 1)).replace('HH', p(d.getUTCHours()))
      .replace('mm', p(d.getUTCMinutes())).replace('ss', p(d.getUTCSeconds()));
  },
  newBlob: () => ({}), base64Decode: () => []
};
global.ContentService = { MimeType: { JSON: 'json', TEXT: 'text' },
  createTextOutput: t => ({ setMimeType: () => ({ _body: t }) }) };
global.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
global.GmailApp = { search: () => [], sendEmail: () => {} };

const code = require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script-vallee.gs'), 'utf8');
(0, eval)(code + '\nglobalThis.G = { _tsStr, _timeStr, _dateKey, _cellStr, _nowTs, handleSaveSaisieVallee, handleUpdateSaisieVallee, handleGetSaisiesVallee, handleGetDysfVallee, handleSaveDemandeVallee, handleSaveStockVallee, handleGetStockVallee, handleSaveSwapVallee, handleGetSwapVallee, checkDemandesReponses, _getOrCreateSaisiesVallee, _getOrCreateSwapVallee, _poserEntetes, _cellStr };');
global.FakeSheet = FakeSheet; global.FakeSS = FakeSS;
global.rep = r => JSON.parse(r._body);
