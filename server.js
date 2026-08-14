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
    period TEXT NOT NULL, value REAL NOT NULL, source TEXT NOT NULL, source_url TEXT NOT NULL,
    UNIQUE(indicator_id, period, source)
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
  ['Foreign-exchange reserves', 'USD bn', 'World Bank / National Bank of Ethiopia']
];
const addCompany = db.prepare('INSERT OR IGNORE INTO companies(name,ticker,sector,listed_on,website) VALUES(?,?,?,?,?)');
const addIndicator = db.prepare('INSERT OR IGNORE INTO indicators(name,unit,source) VALUES(?,?,?)');
companies.forEach(row => addCompany.run(...row));
indicators.forEach(row => addIndicator.run(...row));

const facts = [
  ['GDP growth', 'FY 2024/25', 9.2, 'National Bank of Ethiopia', 'https://nbe.gov.et/mpc7/'],
  ['Inflation rate', '2026-05', 13.4, 'National Bank of Ethiopia', 'https://nbe.gov.et/mpc7/'],
  ['ETB per USD', '2026-08-14', 163.3398, 'NBE via BankFXAPI', 'https://bankfxapi.com/bank/51'],
  ['Policy rate', '2026-07-13', 16, 'National Bank of Ethiopia', 'https://nbe.gov.et/mpc7/'],
  ['Foreign-exchange reserves', '2024', 3.784387425, 'World Bank (IMF IFS)', 'https://data.worldbank.org/indicator/FI.RES.TOTL.CD?locations=ET']
];
const addValue = db.prepare(`INSERT OR IGNORE INTO indicator_values(indicator_id,period,value,source,source_url)
  VALUES((SELECT id FROM indicators WHERE name=?),?,?,?,?)`);
facts.forEach(row => addValue.run(...row));

const json = value => ({ status: 200, type: 'application/json', body: JSON.stringify(value) });
const readBody = req => new Promise((resolve, reject) => {
  let body=''; req.on('data', c => { body+=c; if(body.length>1e6) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(body||'{}')); } catch(e) { reject(e); } }); req.on('error', reject);
});
async function api(req, url) {
  if (url.pathname === '/api/companies') return json(db.prepare('SELECT * FROM companies ORDER BY listed_on DESC').all());
  if (url.pathname === '/api/indicators') return json(db.prepare(`
    SELECT i.id,i.name,i.unit,v.period,v.value,COALESCE(v.source,i.source) source,v.source_url FROM indicators i
    LEFT JOIN indicator_values v ON v.id=(SELECT id FROM indicator_values WHERE indicator_id=i.id ORDER BY period DESC LIMIT 1)
    ORDER BY i.id`).all());
  if (req.method === 'POST' && url.pathname === '/api/import') {
    if (process.env.IMPORT_KEY && req.headers['x-import-key'] !== process.env.IMPORT_KEY) return {status:401,type:'application/json',body:'{"error":"Invalid import key"}'};
    const { indicators: rows=[] } = await readBody(req);
    const valid=rows.filter(x => x.name && x.period && Number.isFinite(Number(x.value)));
    valid.forEach(x => addValue.run(x.name,String(x.period),Number(x.value),x.source||'Excel import',x.source_url||''));
    return { ...json({ imported: valid.length }), status: 201 };
  }
  if (req.method === 'POST' && url.pathname === '/api/sync/world-bank') {
    const series=[['GDP growth','NY.GDP.MKTP.KD.ZG',1],['Inflation rate','FP.CPI.TOTL.ZG',1],['Foreign-exchange reserves','FI.RES.TOTL.CD',1e9]];
    for (const [name,code,scale] of series) {
      const data=await fetch(`https://api.worldbank.org/v2/country/ETH/indicator/${code}?format=json&per_page=70`).then(r=>r.json());
      for (const x of data[1]||[]) if(x.value!=null) addValue.run(name,x.date,x.value/scale,'World Bank API',`https://api.worldbank.org/v2/country/ETH/indicator/${code}`);
    }
    return json({ synced: true });
  }
  return null;
}

const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const result = await api(req, url);
    if (result) return res.writeHead(result.status, { 'Content-Type': result.type }).end(result.body);
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (!['index.html','app.js','style.css','extra.css'].includes(file)) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': types[extname(file)] }).end(await readFile(join('public', file)));
  } catch (error) { res.writeHead(500).end(error.message); }
});

if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
module.exports = { server, db };
