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
    if(navigator.vibrate) try{ navigator.vibrate([120,60,120]); }catch(e){}
    toast("⚡ C'est reparti — série suivante");
    if(typeof restReady!=="undefined") restReady = true;
    sfx("restEnd");
    endRest();
    return;
  }
  // 3 dernières secondes : l'anneau bat et le téléphone vibre à chaque seconde
  const wrap = document.querySelector(".ring-wrap");
  if(wrap) wrap.classList.toggle("ending", remain<=3);
  if(remain<=3 && remain!==restState.lastTick){ restState.lastTick = remain; if(navigator.vibrate) try{ navigator.vibrate(10); }catch(e){} sfx("restTick"); }
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
  if(focusShowing){ bar.classList.remove("show"); return; }
  bar.classList.add("show");
  // appelé 4 fois par seconde : on ne touche qu'au texte une fois la pastille construite
  const tEl = bar.querySelector(".rt-time");
  if(tEl && bar._label===restState.label){ const t = fmtMMSS(remain); if(tEl.textContent!==t) tEl.textContent = t; return; }
  bar._label = restState.label;
  bar.innerHTML = `<div class="rt-time">${fmtMMSS(remain)}</div><div class="rt-label">${esc(restState.label)}</div>
    <button data-a="restAdjust" data-d="-15">−15</button><button data-a="restAdjust" data-d="15">+15</button><button data-a="restSkip">Passer</button>`;
}
Object.assign(ACT, {
  restAdjust(d){ adjustRestTimer(parseInt(d.d,10)); },
  restSkip(){ endRest(); },
});
