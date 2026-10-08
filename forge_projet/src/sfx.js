// ================= SONS =================
// Sons synthétisés en direct avec Web Audio (aucun fichier) : courts, doux et
// accordés entre eux (gamme de do majeur), pour accompagner les animations.
// Le contexte audio n'existe qu'après un premier toucher (règle de Safari iOS) ;
// avant cela, et si les sons sont coupés dans le Profil, sfx() ne fait rien.

let AC = null, SFX_OUT = null, NOISE = null, SFX_WET = null;
// bus de sortie temporaire (le Rewind y joue les sons d'une diapo pour pouvoir les couper net) ;
// son envoi vers la réverbération passe par le même bus, coupé en même temps
let SFX_BUS = null, SFX_BUS_WET = null;
function sfxDest(){ return SFX_BUS || SFX_OUT; }
function sfxWet(){ return SFX_BUS_WET || SFX_WET; }
// Réverbération douce, comme une pièce calme : réponse synthétisée (souffle stéréo qui s'éteint
// en ~1,4 s et s'assombrit en s'éteignant). Seuls les sons musicaux (cloches, accords) y sont
// envoyés, en petite quantité ; les « toc » de l'interface restent secs et précis.
function buildReverb(){
  const sr = AC.sampleRate, len = Math.floor(sr*1.4), ir = AC.createBuffer(2, len, sr);
  for(let c=0;c<2;c++){
    const d = ir.getChannelData(c); let lp = 0;
    for(let i=0;i<len;i++){
      const t = i/sr, k = 0.55 - 0.45*Math.min(1, t/1.1); // filtre qui se ferme : la queue s'assombrit
      lp += k*((Math.random()*2-1) - lp);
      d[i] = lp*Math.pow(1-i/len, 2.2)*(t<0.012 ? t/0.012 : 1);
    }
  }
  const conv = AC.createConvolver(); conv.buffer = ir;
  const send = AC.createGain(); send.gain.value = 0.32;
  send.connect(conv); return { send, conv };
}
// iOS : les sons d'ASCEN se mélangent à la musique au lieu de l'interrompre (et ne sont
// plus coupés quand une autre app reprend la main sur l'audio).
try{ if(navigator.audioSession) navigator.audioSession.type = "ambient"; }catch(e){}
function buildAudio(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return false;
  try{ if(AC && AC.state!=="closed") AC.close(); }catch(e){}
  try{
    AC = new Ctx();
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    SFX_OUT = AC.createGain(); SFX_OUT.gain.value = 0.9;
    SFX_OUT.connect(comp); comp.connect(AC.destination);
    try{ const r = buildReverb(); r.conv.connect(comp); SFX_WET = r.send; }catch(e){ SFX_WET = null; }
    NOISE = null; // les buffers sont recréés avec le nouveau contexte
  }catch(e){ AC = null; return false; }
  return true;
}
function audioReady(){
  if(!AC || AC.state==="closed") if(!buildAudio()) return false;
  if(AC.state!=="running") AC.resume().catch(()=>{});
  return true;
}
function playSilent(){ try{ const b = AC.createBuffer(1,1,22050), src = AC.createBufferSource(); src.buffer = b; src.connect(AC.destination); src.start(0); }catch(e){} }
// Le contexte audio se met en pause (écran verrouillé, appli en arrière-plan, appel,
// autre appli qui joue du son) et iOS le laisse parfois bloqué en « interrupted » :
// à chaque geste on le relance, et s'il ne repart pas on en crée un neuf.
let reviveTimer = null, audioStale = false, audioHiddenAt = 0;
["pointerdown","touchend","keydown"].forEach(ev=>document.addEventListener(ev, ()=>{
  if(!soundOn()) return;
  // après une longue absence, iOS peut rendre un contexte « en marche » mais muet :
  // on repart d'un contexte neuf au premier geste (coût négligeable)
  if(audioStale){ audioStale = false; if(AC) buildAudio(); }
  if(!audioReady()) return;
  playSilent();
  if(AC.state!=="running" && !reviveTimer){
    reviveTimer = setTimeout(()=>{
      reviveTimer = null;
      if(AC && AC.state!=="running"){ buildAudio(); if(AC){ AC.resume().catch(()=>{}); playSilent(); } }
    }, 250);
  }
}, { passive:true, capture:true }));
function wakeAudio(){ if(AC && AC.state!=="running" && AC.state!=="closed") AC.resume().catch(()=>{}); }
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){
    // en arrière-plan : on suspend proprement (sinon iOS l'interrompt à sa façon, parfois sans retour)
    audioHiddenAt = Date.now();
    if(AC && AC.state==="running") AC.suspend().catch(()=>{});
  } else {
    if(audioHiddenAt && Date.now()-audioHiddenAt > 20000) audioStale = true;
    audioHiddenAt = 0; wakeAudio();
  }
});
window.addEventListener("pageshow", wakeAudio);
window.addEventListener("focus", wakeAudio);

function soundOn(){ return !(typeof S!=="undefined" && S.settings && S.settings.sound===false); }

// note : fréquence, départ (s, relatif), durée, options
function tone(f, t, dur, o){
  o = o||{};
  const t0 = AC.currentTime + t;
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(f, t0);
  if(o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0+dur);
  const peak = o.gain==null ? 0.25 : o.gain, att = o.att || 0.006;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0+att);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  osc.connect(g);
  if(o.pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(sfxDest()); }
  else g.connect(sfxDest());
  // envoi vers la réverbération (o.wet : 0 = sec) ; le gain de l'envoi est partagé, pas de nœud en plus
  const wet = sfxWet(); if(o.wet && wet) g.connect(wet);
  osc.start(t0); osc.stop(t0+dur+0.05);
}
// cloche : fondamentale + une copie à peine désaccordée (léger battement, plus vivant), partiels
// inharmoniques qui s'éteignent plus vite, et une frappe très brève (la mailloche) ; un peu de salle
function bell(f, t, dur, gain){
  tone(f, t, dur, { gain:gain*0.8, wet:1 });
  tone(f*1.0028, t, dur*0.9, { gain:gain*0.28, wet:1 });
  tone(f*2.76, t, dur*0.45, { gain:gain*0.32, wet:1 });
  tone(f*5.4, t, dur*0.18, { gain:gain*0.1 });
  tone(f*8.1, t, 0.03, { gain:gain*0.06, att:0.001 });
}
// nappe : note tenue (attaque lente, palier, relâche), doublée d'une copie à peine désaccordée
function pad(f, t, dur, gain){
  const t0 = AC.currentTime + t, g = AC.createGain(), att = Math.min(0.7, dur*0.3), rel = Math.min(1.4, dur*0.4);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0+att);
  g.gain.setValueAtTime(gain, t0+dur-rel); g.gain.linearRampToValueAtTime(0, t0+dur);
  g.connect(sfxDest()); const wet = sfxWet(); if(wet) g.connect(wet);
  [1, 1.0035].forEach((k,i)=>{ const o = AC.createOscillator(); o.type = i ? "triangle" : "sine"; o.frequency.value = f*k; o.connect(g); o.start(t0); o.stop(t0+dur+0.05); });
}
// souffle filtré (whoosh)
function whoosh(t, dur, from, to, gain){
  if(!NOISE){
    NOISE = AC.createBuffer(1, AC.sampleRate*1, AC.sampleRate);
    const d = NOISE.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  const t0 = AC.currentTime + t;
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = NOISE; f.type = "bandpass"; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0+dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain||0.2, t0+dur*0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  src.connect(f); f.connect(g); g.connect(sfxDest());
  src.start(t0); src.stop(t0+dur+0.05);
}

// « toc » feutré façon clavier iOS : un souffle très bref filtré (le contact) et un
// corps grave qui s'éteint en 40 ms. Légère variation de hauteur à chaque fois pour
// que la répétition ne fatigue pas l'oreille.
function tok(t, body, gain){
  if(!NOISE){
    NOISE = AC.createBuffer(1, AC.sampleRate*1, AC.sampleRate);
    const d = NOISE.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  const v = 1 + (Math.random()-0.5)*0.08, t0 = AC.currentTime + t, g0 = gain==null ? 1 : gain;
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = NOISE; f.type = "bandpass"; f.frequency.value = 2600*v; f.Q.value = 0.9;
  g.gain.setValueAtTime(0.16*g0, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0+0.014);
  src.connect(f); f.connect(g); g.connect(sfxDest());
  src.start(t0, Math.random()*0.5); src.stop(t0+0.03);
  tone((body||190)*v, t, 0.045, { gain:0.22*g0, to:(body||190)*0.6*v, att:0.002 });
}
let lastTok = 0;
// notes (Hz)
const NT = { C5:523.25, D5:587.33, E5:659.25, G5:783.99, A5:880, C6:1046.5, D6:1174.7, E6:1318.5, G6:1568, A6:1760, C7:2093 };
const SFX = {
  tick(){ tok(0, 200, 0.8); },
  step(up){ tok(0, up ? 230 : 175, 0.9); },
  open(){ tone(260, 0, 0.09, { gain:0.14, to:470, att:0.004 }); tok(0, 210, 0.5); },
  close(){ tone(430, 0, 0.08, { gain:0.12, to:240, att:0.004 }); tok(0, 170, 0.5); },
  seg(){ tok(0, 200, 0.8); },
  swipe(){ whoosh(0, 0.2, 700, 2200, 0.18); },
  set(){ bell(NT.E6, 0, 0.35, 0.16); bell(NT.A6, 0.075, 0.5, 0.14); },
  exo(){ [NT.C6, NT.E6, NT.G6, NT.C7].forEach((f,i)=>bell(f, i*0.07, 0.55, 0.13)); },
  pr(){ [NT.G6, NT.C7, NT.E6, NT.G6, NT.C7].forEach((f,i)=>tone(f*(1+Math.random()*0.01), i*0.05, 0.3, { gain:0.2, type:"triangle", pan:(i%2?.4:-.4), wet:1 })); bell(NT.C6, 0, 0.9, 0.12); tone(NT.C5, 0, 0.6, { gain:0.08, type:"triangle", att:0.01, wet:1 }); },
  complete(){
    // accord de do qui s'installe (basse douce), cloches qui montent, souffle d'air au sommet
    tone(NT.C5/2, 0, 1.8, { gain:0.08, att:0.06, wet:1 });
    [NT.C5, NT.E5, NT.G5].forEach((f,i)=>tone(f, i*0.1, 1.5, { gain:0.11, type:"triangle", att:0.03, wet:1 }));
    [NT.C6, NT.E6, NT.G6, NT.C7].forEach((f,i)=>bell(f, 0.32+i*0.08, 1, 0.12));
    whoosh(0.3, 0.6, 3000, 8000, 0.05);
  },
  medal(){ [NT.G5, NT.C6, NT.E6, NT.G6].forEach((f,i)=>bell(f, i*0.09, 0.9, 0.12)); tone(NT.C5, 0.27, 1.1, { gain:0.06, type:"triangle", att:0.04, wet:1 }); },
  count(){ tone(NT.A5, 0, 0.16, { gain:0.42, type:"triangle" }); tone(NT.A5*2, 0, 0.08, { gain:0.14 }); }, // net : les chiffres se suivent vite
  go(){ whoosh(0, 0.5, 400, 4000, 0.16); [NT.C5, NT.G5, NT.C6, NT.E6].forEach((f,i)=>tone(f, 0.05+i*0.03, 0.9, { gain:0.1, type:"triangle", att:0.02, wet:1 })); },
  restTick(){ tone(NT.E5, 0, 0.12, { gain:0.28 }); tok(0, 330, 0.5); },
  restEnd(){ bell(NT.A5, 0, 1.2, 0.2); bell(NT.E6, 0.14, 1.2, 0.16); },
  remove(){ tone(170, 0, 0.12, { gain:0.3, to:95, att:0.003 }); tok(0, 140, 0.7); },
  // étoile des favoris : deux notes claires qui montent (retirer : le « close » habituel)
  fav(){ bell(NT.E6, 0, 0.45, 0.09); bell(NT.A6, 0.06, 0.6, 0.08); },
  // interrupteur : le « toc » monte quand on active, descend quand on coupe
  toggle(on){ tok(0, on ? 250 : 165, 0.85); if(on) tone(NT.E6, 0.01, 0.07, { gain:0.04, att:0.002 }); },
};
const UI_SOUNDS = new Set(["tick","step","open","close","seg","swipe","remove","toggle"]);
function sfx(name, arg){
  // app en arrière-plan : aucun son (il sortirait en retard, en rafale, au retour)
  if(!soundOn() || !SFX[name] || document.hidden) return;
  if(UI_SOUNDS.has(name)){
    if(S.settings.uiSound===false) return;              // clics de l'interface coupés à part
    const now = performance.now(); if(now-lastTok<60) return; lastTok = now; // jamais en rafale
  }
  if(!audioReady()) return;
  const play = ()=>{ try{ SFX[name](arg); }catch(e){} };
  if(AC.state==="running") return play();
  // contexte en pause (ex. fin de repos écran éteint puis rallumé) : on le relance puis on joue,
  // sauf si la relance arrive trop tard pour que le son ait encore du sens
  const t0 = performance.now();
  AC.resume().then(()=>{ if(performance.now()-t0<700) play(); }).catch(()=>{});
}

// petit « toc » uniquement quand on change une sélection (segments, filtres, interrupteurs) :
// ni les onglets, ni la navigation, ni les boutons ordinaires ne font de bruit.
// Phase de capture : on lit l'état *avant* l'action (en phase de bouillonnement, l'action avait déjà
// marqué le segment touché « .on », et le « toc » des sélecteurs ne se jouait jamais).
document.addEventListener("click", e=>{
  // interrupteur : le son dit l'état qu'il va prendre ; ceux des sons ont leur propre retour
  const sw = e.target.closest && e.target.closest(".switch");
  if(sw){ if(!sw.disabled && !/^toggle(Ui)?Sound$/.test(sw.dataset.a||"")) sfx("toggle", !sw.classList.contains("on")); return; }
  const b = e.target.closest && e.target.closest(".seg button:not(.on), .type-chip:not(.on), #pickerCats .chip, #pickerChips .chip, .tpl-daypick button, .chip[data-a^='toggle']");
  if(b && !b.disabled) sfx("seg");
}, true);
