import { connect, JSONCodec } from "nats";
import { randomUUID } from "node:crypto";
import { SUBJECTS } from "@parley/contracts";
const jc = JSONCodec(); const ORG = process.argv[2];
const REP = "11111111-2222-3333-4444-555555555555";
const nc = await connect({ servers: "nats://localhost:4222" });
const env = (s:any,d:any)=>({id:randomUUID(),subject:s,orgId:ORG,traceId:"t",occurredAt:new Date().toISOString(),data:d});
for (const [appt, tr] of [[true,0.48],[true,0.52],[false,0.75],[true,0.45],[false,0.8]] as [boolean,number][]) {
  const callId = randomUUID();
  nc.publish(SUBJECTS.callStarted, jc.encode(env(SUBJECTS.callStarted,{callId,repId:REP,modeId:"expired"})));
  await new Promise(r=>setTimeout(r,120));
  nc.publish(SUBJECTS.callTranscript, jc.encode(env(SUBJECTS.callTranscript,{callId,speaker:"prospect",text:"i'm not interested",isFinal:true})));
  await new Promise(r=>setTimeout(r,150));
  nc.publish(SUBJECTS.callEnded, jc.encode(env(SUBJECTS.callEnded,{callId,repId:REP,disposition:appt?"Appointment set":"Callback",talkRatioRep:tr,appointmentSet:appt})));
  await new Promise(r=>setTimeout(r,200));
}
await new Promise(r=>setTimeout(r,2500)); await nc.drain();
console.log("seeded 5 calls");
