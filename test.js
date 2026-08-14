const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_FILE = ':memory:';
const { server } = require('./server');
test('serves companies and five indicators', async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const [companies, indicators] = await Promise.all([
    fetch(base + '/api/companies').then(r=>r.json()), fetch(base + '/api/indicators').then(r=>r.json())
  ]);
  assert.ok(companies.length >= 4); assert.equal(indicators.length, 5);
  server.close();
});
