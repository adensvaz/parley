// Drive several calls with real outcomes and confirm the bandit posterior moves.
const sleep=(m:number)=>new Promise(r=>setTimeout(r,m));
async function call(token:string, appt:boolean){
  const ws:any=new WebSocket(`ws://localhost:8080/rt?token=${encodeURIComponent(token)}`);
  let card:any=null;
  ws.onmessage=(e:any)=>{const m=JSON.parse(e.data); if(m.type==="card"&&m.kind==="objection"&&!card)card=m;};
  await new Promise<void>(r=>{ws.onopen=()=>r()});
  ws.send(JSON.stringify({type:"start",modeId:"expired"}));
  await sleep(400);
  ws.send(JSON.stringify({type:"transcript",speaker:"prospect",text:"not interested",isFinal:true}));
  await sleep(1200);
  ws.close();            // close → gateway publishes call.ended → bandit learns
  await sleep(700);
  return card;
}
const T="dev:user_learn:org_learn";
const first=await call(T,true);
console.log("call 1 stats:", JSON.stringify(first?.stats));
for(let i=0;i<5;i++) await call(T,true);
const last=await call(T,true);
console.log("call 7 stats:", JSON.stringify(last?.stats));
console.log(last?.stats?.used > 0 ? "✅ bandit is learning (used > 0)" : "❌ no learning recorded");
process.exit(0);
