let companies=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showCompanies(q=''){
  const rows=companies.filter(x=>(x.name+x.ticker+x.sector).toLowerCase().includes(q.toLowerCase()));
  document.querySelector('#companies').innerHTML=rows.map(x=>`<tr><td><a href="${esc(x.website)}" target="_blank">${esc(x.name)}</a></td><td><b>${esc(x.ticker)}</b></td><td>${esc(x.sector)}</td><td>${esc(x.listed_on)}</td></tr>`).join('')||'<tr><td colspan="4">No companies found.</td></tr>';
}
Promise.all([fetch('/api/companies').then(r=>r.json()),fetch('/api/indicators').then(r=>r.json())]).then(([c,i])=>{
  companies=c; showCompanies();
  document.querySelector('#indicators').innerHTML=i.map(x=>`<article><small>${esc(x.name)}</small><strong>${x.value==null?'—':esc(x.value)+' '+esc(x.unit)}</strong><span>${x.period?'As of '+esc(x.period):'Awaiting verified data'}</span></article>`).join('');
});
document.querySelector('#search').addEventListener('input',e=>showCompanies(e.target.value));
