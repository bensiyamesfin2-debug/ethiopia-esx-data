const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { extname, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(process.env.DB_FILE || 'data.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, ticker TEXT UNIQUE NOT NULL,
    sector TEXT NOT NULL, listed_on TEXT NOT NULL, website TEXT
  );
  CREATE TABLE IF NOT EXISTS indicators (
    id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, unit TEXT NOT NULL, source TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS indicator_values (
    id INTEGER PRIMARY KEY, indicator_id INTEGER NOT NULL REFERENCES indicators(id),
    period TEXT NOT NULL, value REAL NOT NULL, UNIQUE(indicator_id, period)
  );
`);

const companies = [
  ['Bank of Abyssinia Share Company', 'BOAX', 'Financial Services', '2026-07-28', 'https://www.bankofabyssinia.com'],
  ['Abay Bank Share Company', 'ABAYB', 'Financial Services', '2026-06-25', 'https://www.abaybank.com.et'],
  ['Ethio Telecom Share Company', 'TELE', 'Telecommunications', '2026-05-26', 'https://www.ethiotelecom.et'],
  ['Awash Bank Share Company', 'AWAB', 'Financial Services', '2026-04-23', 'https://www.awashbank.com']
];
const indicators = [
  ['GDP growth', '%', 'World Bank / Ministry of Planning'],
  ['Inflation rate', '%', 'Ethiopian Statistical Service'],
  ['ETB per USD', 'ETB', 'National Bank of Ethiopia'],
  ['Policy rate', '%', 'National Bank of Ethiopia'],
  ['Foreign-exchange reserves', 'USD', 'National Bank of Ethiopia']
];
const addCompany = db.prepare('INSERT OR IGNORE INTO companies(name,ticker,sector,listed_on,website) VALUES(?,?,?,?,?)');
const addIndicator = db.prepare('INSERT OR IGNORE INTO indicators(name,unit,source) VALUES(?,?,?)');
companies.forEach(row => addCompany.run(...row));
indicators.forEach(row => addIndicator.run(...row));

const json = value => ({ status: 200, type: 'application/json', body: JSON.stringify(value) });
function api(url) {
  if (url.pathname === '/api/companies') return json(db.prepare('SELECT * FROM companies ORDER BY listed_on DESC').all());
  if (url.pathname === '/api/indicators') return json(db.prepare(`
    SELECT i.*, v.period, v.value FROM indicators i
    LEFT JOIN indicator_values v ON v.id=(SELECT id FROM indicator_values WHERE indicator_id=i.id ORDER BY period DESC LIMIT 1)
    ORDER BY i.id`).all());
  return null;
}

const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const result = api(url);
    if (result) return res.writeHead(result.status, { 'Content-Type': result.type }).end(result.body);
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (!['index.html','app.js','style.css'].includes(file)) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': types[extname(file)] }).end(await readFile(join('public', file)));
  } catch (error) { res.writeHead(500).end(error.message); }
});

if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
module.exports = { server, db };
