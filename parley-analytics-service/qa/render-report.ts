import { REPORT_HTML } from "../src/report.js";
import { analyzeBehaviour } from "../../parley-copilot-service/src/behaviour.js";
import type { BehaviourSample } from "@parley/contracts";
import { writeFileSync } from "fs";
const S = (o: Partial<BehaviourSample>): BehaviourSample => ({ atMs:0, heat:30, valence:0, arousal:0.3, resonance:0.3, emotion:"neutral", speaker:"prospect", words:10, ...o });
const behaviour = analyzeBehaviour("demo1234", [
  S({atMs:0,heat:24,valence:-0.1,resonance:0.32,emotion:"skeptical",words:6}),
  S({atMs:6e3,heat:36,valence:0.06,resonance:0.42,emotion:"curious",words:13}),
  S({atMs:14e3,heat:55,valence:0.28,resonance:0.63,emotion:"warming",words:19}),
  S({atMs:22e3,heat:71,valence:0.42,resonance:0.74,emotion:"warming",words:21}),
  S({atMs:29e3,heat:81,valence:0.5,resonance:0.82,emotion:"positive",words:18}),
], 0.48);
const sc:any = { callId:"demo1234-aa", repId:"rep1", score:82,
  stages:[{stage:"opener",status:"strong",note:"permission-based open"},{stage:"discovery",status:"strong",note:"4 questions"},{stage:"objection",status:"ok",note:"1 handled"},{stage:"close",status:"strong",note:"booked"}],
  fix:{title:"Go for the specific ask sooner",detail:"They were hot by 0:29 — offer two concrete times the moment momentum peaks.",playbook:"assumptive close"},
  moments:[{atMs:14000,speaker:"prospect",quote:"Okay, that actually makes sense.",tag:"buying signal"}],
  talkRatioRep:0.48, objectionsHandled:1, appointmentSet:true, behaviour };
writeFileSync("/tmp/report.html", REPORT_HTML(sc));
console.log("wrote /tmp/report.html · momentum", behaviour.momentum, "rapport", behaviour.rapport);
