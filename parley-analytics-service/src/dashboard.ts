// The served manager dashboard (single self-contained page; fetches /api/stats).
export const DASHBOARD_HTML = (orgId: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>Parley — Manager Dashboard</title>
<style>
  :root{--bg:#0e1014;--panel:#161a21;--line:rgba(255,255,255,.08);--text:#e9edf2;--muted:#8a93a0;--accent:#4c8dff;--ok:#36d399}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,Inter,system-ui,sans-serif;padding:32px}
  h1{font-size:22px;margin:0 0 4px}.sub{color:var(--muted);font-size:13px;margin-bottom:24px}
  .cards{display:flex;gap:14px;margin-bottom:24px;flex-wrap:wrap}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 20px;min-width:150px}
  .kpi .n{font-size:28px;font-weight:700}.kpi .l{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);font-size:13px}
  th{color:var(--muted);font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.04em}
  .bar{height:6px;background:#222836;border-radius:3px;overflow:hidden;width:120px;display:inline-block;vertical-align:middle}
  .bar>span{display:block;height:100%;background:var(--accent)}
  .muted{color:var(--muted)}
</style></head><body>
  <h1>🎯 Parley — Manager Dashboard</h1>
  <div class="sub">Org <code>${orgId}</code> · live from analytics-service</div>
  <div class="cards" id="kpis"></div>
  <table><thead><tr><th>Rep</th><th>Day</th><th>Calls</th><th>Avg score</th><th>Appts</th></tr></thead><tbody id="rows"></tbody></table>
<script>
  const orgId=${JSON.stringify(orgId)};
  fetch('/api/stats?orgId='+encodeURIComponent(orgId)).then(r=>r.json()).then(rows=>{
    const calls=rows.reduce((a,r)=>a+Number(r.calls),0);
    const appts=rows.reduce((a,r)=>a+Number(r.appts),0);
    const avg=rows.length?(rows.reduce((a,r)=>a+Number(r.avg_score||0),0)/rows.length).toFixed(1):'—';
    document.getElementById('kpis').innerHTML=
      [['Calls',calls],['Appointments',appts],['Avg score',avg],['Conv. rate',calls?Math.round(appts/calls*100)+'%':'—']]
      .map(([l,n])=>'<div class="kpi"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');
    document.getElementById('rows').innerHTML = rows.length ? rows.map(r=>
      '<tr><td>'+String(r.rep_id).slice(0,8)+'…</td><td>'+String(r.day).slice(0,10)+'</td><td>'+r.calls+'</td>'+
      '<td><span class="bar"><span style="width:'+(r.avg_score||0)+'%"></span></span> '+(r.avg_score??'—')+'</td><td>'+r.appts+'</td></tr>'
    ).join('') : '<tr><td colspan="5" class="muted">No calls yet.</td></tr>';
  }).catch(e=>{document.getElementById('rows').innerHTML='<tr><td colspan=5 class=muted>error: '+e+'</td></tr>'});
</script></body></html>`;
