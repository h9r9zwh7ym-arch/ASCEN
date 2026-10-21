// ================= TIMER DE REPOS =================
let restState = null; // {endAt, totalSec, label, exoIdx}
let restInterval = null;

// arrived : le repos s'affiche déjà sur l'exercice qui vient ensuite (pas de nouveau saut à la fin)
// src : la série qui vient d'être validée (pour noter son ressenti pendant le repos)
function startRestTimer(sec, label, exoIdx, arrived, src){
  restState = { endAt: Date.now()+sec*1000, totalSec:sec, label:label||"Repos", exoIdx, arrived:!!arrived, src:src||null };
  renderRestBar();
  clearInterval(restInterval);
  restInterval = setInterval(tickRest, 250);
}
function adjustRestTimer(delta){
  if(!restState) return;
  restState.endAt += delta*1000;
  tickRest();
}
// fin du repos (décompte écoulé ou « Passer ») : on amène l'écran sur ce qui vient ensuite
function endRest(){
  const idx = restState ? restState.exoIdx : null, arrived = restState && restState.arrived;
  if(typeof restAdvance==="function") restAdvance(idx, arrived);
  stopRestTimer();
}
function stopRestTimer(){
  restState = null;
  clearInterval(restInterval);
  const bar = qs("#restbar");
  if(bar) bar.classList.remove("show");
  if(typeof refreshFocusRegion==="function") refreshFocusRegion();
}
function tickRest(){
  if(!restState) return;
  const remain = Math.round((restState.endAt-Date.now())/1000);
  if(remain<=0){
    // fini pendant que l'app était en arrière-plan : pas de sonnerie ni de vibration en retard
    const late = document.hidden || Date.now()-restState.endAt > 3000;
    // à zéro, l'anneau passe à l'orange (« C'est reparti ») un court instant, puis la série suivante s'affiche
    if(!late && !restState.over){
      restState.over = Date.now();
      if(navigator.vibrate) try{ navigator.vibrate([120,60,120]); }catch(e){}
      sfx("restEnd"); renderRestBar(0);
      if(typeof ringOver==="function" && ringOver(true)) return;
    }
    if(!late && restState.over && Date.now()-restState.over < 1100) return;
    if(late || !qs(".sx-ring")) toast(late ? "Repos terminé : série suivante" : "C'est reparti : série suivante", "bolt");
    if(typeof restReady!=="undefined") restReady = true;
    endRest();
    return;
  }
  if(restState.over){ restState.over = 0; if(typeof ringOver==="function") ringOver(false); }
  // 3 dernières secondes : l'anneau bat et le téléphone vibre à chaque seconde
  const wrap = document.querySelector(".ring-wrap");
  if(wrap) wrap.classList.toggle("ending", remain<=3);
  if(remain<=3 && remain!==restState.lastTick && !document.hidden){ restState.lastTick = remain; if(navigator.vibrate) try{ navigator.vibrate(10); }catch(e){} sfx("restTick"); }
  renderRestBar(remain);
  if(typeof updateFocusRing==="function") updateFocusRing(remain, restState.totalSec);
}
function fmtMMSS(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${s<10?"0":""}${s}`;
}
function renderRestBar(remainOverride){
  const bar = qs("#restbar");
  if(!bar || !restState) return;
  const remain = remainOverride!=null? remainOverride : Math.max(0,Math.round((restState.endAt-Date.now())/1000));
  // sur l'onglet Aujourd'hui, l'anneau du mode focus remplace la pastille tant que
  // l'exercice au repos est celui affiché ; sinon la pastille reste visible partout.
  const focusShowing = typeof currentTab!=="undefined" && currentTab==="today" && typeof liveFocusIdx!=="undefined" && liveFocusIdx===restState.exoIdx;
  // iPhone à Dynamic Island : la pastille se range dans l'île (anneau + temps), toucher = revenir au repos
  const isl = typeof moIsland==="function" && moIsland();
  bar.classList.toggle("island", isl);
  if(focusShowing){ bar.classList.remove("show"); return; }
  const was = bar.classList.contains("show");
  bar.classList.add("show");
  // appelé 4 fois par seconde : on ne touche qu'au texte une fois la pastille construite
  const tEl = bar.querySelector(".rt-time"), key = (isl ? "île:" : "") + restState.label;
  const arc = ()=>{ const a = isl && bar.querySelector(".ri-arc"); if(a) a.style.strokeDashoffset = (100*(1 - remain/Math.max(1, restState.totalSec))).toFixed(1); };
  if(tEl && bar._label===key){ const t = fmtMMSS(remain); if(tEl.textContent!==t) tEl.textContent = t; arc(); return; }
  bar._label = key;
  bar.innerHTML = isl
    ? `<button class="ri-hit" data-a="restOpen" aria-label="Repos en cours, revenir au repos"><span class="ri-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#3A3A3C" stroke-width="4"/><circle class="ri-arc" cx="18" cy="18" r="14" fill="none" stroke="#E07A55" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="100"/></svg></span><span class="rt-time">${fmtMMSS(remain)}</span></button>`
    : `<div class="rt-time">${fmtMMSS(remain)}</div><div class="rt-label">${esc(restState.label)}</div>
    <button data-a="restAdjust" data-d="-15">−15</button><button data-a="restAdjust" data-d="15">+15</button><button data-a="restSkip">Passer</button>`;
  arc();
  if(isl && !was && typeof moIslandIn==="function") moIslandIn(bar);
}
Object.assign(ACT, {
  restAdjust(d){ adjustRestTimer(parseInt(d.d,10)); },
  restSkip(){ endRest(); },
});
