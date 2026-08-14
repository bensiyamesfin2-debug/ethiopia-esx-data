const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_FILE = ':memory:';
const { server } = require('./server');
test('serves companies, sourced values and imports indicator rows', async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const [companies, indicators] = await Promise.all([
    fetch(base + '/api/companies').then(r=>r.json()), fetch(base + '/api/indicators').then(r=>r.json())
  ]);
  assert.ok(companies.length >= 4); assert.equal(indicators.length, 5); assert.ok(indicators.every(x=>x.value!==null));
  const imported=await fetch(base+'/api/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({indicators:[{name:'Inflation rate',period:'2099-01',value:7,source:'Test'}]})});
  assert.equal(imported.status,201);
  await new Promise(resolve=>server.close(resolve));
});
