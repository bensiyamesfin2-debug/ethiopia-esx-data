let companies=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showCompanies(q=''){
  const rows=companies.filter(x=>(x.name+x.ticker+x.sector).toLowerCase().includes(q.toLowerCase()));
  document.querySelector('#companies').innerHTML=rows.map(x=>`<tr><td><a href="${esc(x.website)}" target="_blank">${esc(x.name)}</a></td><td><b>${esc(x.ticker)}</b></td><td>${esc(x.sector)}</td><td>${esc(x.listed_on)}</td></tr>`).join('')||'<tr><td colspan="4">No companies found.</td></tr>';
}
Promise.all([fetch('/api/companies').then(r=>r.json()),fetch('/api/indicators').then(r=>r.json())]).then(([c,i])=>{
  companies=c; showCompanies();
  document.querySelector('#indicators').innerHTML=i.map(x=>`<article><small>${esc(x.name)}</small><strong>${x.value==null?'—':Number(x.value).toLocaleString(undefined,{maximumFractionDigits:4})+' '+esc(x.unit)}</strong><span>${x.period?'As of '+esc(x.period):'Awaiting verified data'}</span>${x.source_url?`<a href="${esc(x.source_url)}" target="_blank">${esc(x.source)} ↗</a>`:''}</article>`).join('');
});
document.querySelector('#search').addEventListener('input',e=>showCompanies(e.target.value));
document.querySelector('#sync').onclick=async e=>{e.target.disabled=true;e.target.textContent='Syncing…';try{await fetch('/api/sync/world-bank',{method:'POST'});location.reload()}catch{e.target.textContent='Sync failed';e.target.disabled=false}};
document.querySelector('#excel').onchange=async e=>{
  const message=document.querySelector('#message'); message.textContent='Reading workbook…';
  try{
    const workbook=XLSX.read(await e.target.files[0].arrayBuffer());
    const sheet=workbook.Sheets.Indicators; if(!sheet) throw Error('Add a sheet named Indicators.');
    const indicators=XLSX.utils.sheet_to_json(sheet,{defval:''});
    const key=prompt('Import key (leave blank if not configured):')||'';
    const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json','X-Import-Key':key},body:JSON.stringify({indicators})});
    if(!response.ok) throw Error((await response.json()).error||'Import failed');
    message.textContent=`Imported ${indicators.length} rows.`; setTimeout(()=>location.reload(),700);
  }catch(error){message.textContent=error.message}
};
