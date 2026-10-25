// ================= GRAPHIQUES (sans dépendance) =================
// Une seule série par graphique, couleur d'accent, texte en jetons de texte.
// Colonnes et calendrier en HTML (les animations CSS dans un SVG bouclent sous Safari
// quand un conteneur parent anime, cf. Zeste) ; courbes en SVG, révélées par un
// clip-path animé sur leur conteneur HTML.

function niceStep(max, count){
  const raw = max/(count||3);
  const mag = Math.pow(10, Math.floor(Math.log10(raw||1)));
  const n = raw/mag;
  return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*mag;
}
function niceTicks(max, count){
  if(!(max>0)) return [0,1];
  const step = niceStep(max, count);
  const ticks = [];
  for(let v=0; v<=max+step*0.999; v+=step) ticks.push(round1(v));
  if(ticks[ticks.length-1]<max) ticks.push(round1(ticks[ticks.length-1]+step));
  return ticks;
}
function fmtTick(v){ return v>=10000 ? fmtDec(v/1000)+"k" : v%1 ? fmtDec(v) : fmtNum(v); }

// values: [{label, v, tip}] — la dernière colonne (période en cours) est mise en valeur
function columnChart(values, opts){
  opts = opts||{};
  const max = Math.max(1, ...values.map(x=>x.v), opts.goal||0);
  const ticks = niceTicks(max, 3), top = ticks[ticks.length-1];
  const every = Math.ceil(values.length/4);
  const grid = ticks.map(t=>`<div class="cc-gl" style="bottom:${t/top*100}%"><span>${fmtTick(t)}</span></div>`).join("");
  const goal = opts.goal ? `<div class="cc-goal" style="bottom:${opts.goal/top*100}%"><span>objectif</span></div>` : "";
  const cols = values.map((x,i)=>{
    const last = i===values.length-1;
    const h = x.v/top*100;
    return `<div class="cc-col" data-tip="${esc(x.tip||(x.label+" : "+fmtTick(x.v)))}" tabindex="0">
      ${last && x.v>0 ? `<div class="cc-val" style="bottom:${h}%">${esc(opts.fmt?opts.fmt(x.v):fmtTick(x.v))}</div>`:""}
      <div class="cc-bar ${last?"cur":""}" style="height:${h}%;--i:${i}"></div>
    </div>`;
  }).join("");
  const xl = values.map((x,i)=>`<span>${(i%every===0||i===values.length-1)?esc(x.label):""}</span>`).join("");
  return `<div class="colchart"><div class="cc-plot">${grid}${goal}<div class="cc-bars">${cols}</div></div><div class="cc-x">${xl}</div></div>`;
}

// points: [{label, v, tip}] en ordre chronologique
function lineChart(points, opts){
  opts = opts||{};
  if(points.length<2) return `<div class="chart-empty">${points.length? "Encore une séance et la courbe apparaît." : "Pas encore de données."}</div>`;
  const W=320, H=150, L=34, R=14, T=14, B=24;
  const vals = points.map(p=>p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if(opts.zero) lo = 0;
  const pad = (hi-lo)*0.15 || Math.max(1,hi*0.1);
  const step = niceStep(hi-lo+pad*2, 3);
  const y0 = Math.max(opts.zero?0:-Infinity, Math.floor((lo-pad)/step)*step), y1 = Math.ceil((hi+pad)/step)*step;
  const X = i => L + i*(W-L-R)/(points.length-1);
  const Y = v => T + (1-(v-y0)/(y1-y0))*(H-T-B);
  const grid = [];
  for(let v=y0; v<=y1+step*0.001; v+=step){
    grid.push(`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="lc-grid"/><text x="${L-6}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end" class="lc-tick">${(opts.tickFmt||fmtTick)(round1(v))}</text>`);
  }
  const pts = points.map((p,i)=>[X(i),Y(p.v)]);
  const line = pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${H-B} L${pts[0][0].toFixed(1)},${H-B} Z`;
  const last = pts[pts.length-1];
  const hits = points.map((p,i)=>`<circle cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="12" class="lc-hit" data-tip="${esc(p.tip||(p.label+" : "+p.v))}" tabindex="0"/>`).join("");
  return `<div class="linechart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria||"Évolution")}">
    ${grid.join("")}
    <path d="${area}" class="lc-area"/>
    <path d="${line}" class="lc-line"/>
    <line class="lc-cursor" x1="0" x2="0" y1="${T}" y2="${H-B}"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4.5" class="lc-dot"/>
    <text x="${Math.min(last[0],W-R).toFixed(1)}" y="${(last[1]-10).toFixed(1)}" text-anchor="end" class="lc-endlbl">${esc(opts.fmt?opts.fmt(points[points.length-1].v):fmtDec(points[points.length-1].v))}</text>
    <text x="${L}" y="${H-6}" class="lc-tick">${esc(points[0].label)}</text>
    <text x="${W-R}" y="${H-6}" text-anchor="end" class="lc-tick">${esc(points[points.length-1].label)}</text>
    ${hits}
    <circle class="lc-cdot" cx="0" cy="0" r="5"/>
  </svg></div>`;
}

function sparkline(vals){
  if(vals.length<2) return "";
  const W=64, H=22, lo=Math.min(...vals), hi=Math.max(...vals), span=(hi-lo)||1;
  const pts = vals.map((v,i)=>[2+i*(W-6)/(vals.length-1), H-3-(v-lo)/span*(H-6)]);
  const last = pts[pts.length-1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ")}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6"/></svg>`;
}


// tableau équivalent (accessibilité : toute valeur reste lisible sans survol)
function dataTable(headers, rows){
  return `<details class="dtable"><summary>Voir les données</summary><table>
    <thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
}

// ---------- parcourir un graphique au doigt ----------
// Glisser horizontalement sur une courbe ou des colonnes : la bulle suit le doigt et
// indique la valeur et la date, comme dans l'app Santé. Le défilement vertical reste libre.
(function(){
  let scrub = null;
  function nearest(root, x){
    let best = null, bd = Infinity;
    qsa(".cc-col, .lc-hit", root).forEach(el=>{ const r = el.getBoundingClientRect(), d = Math.abs(r.left+r.width/2-x); if(d<bd){ bd = d; best = el; } });
    return best;
  }
  function at(x){
    const el = nearest(scrub.root, x);
    if(!el || el===scrub.cur) return;
    const first = !scrub.cur; scrub.cur = el;
    showTip(el);
    if(el.classList.contains("lc-hit")){
      const svg = el.ownerSVGElement, c = qs(".lc-cursor", svg), d = qs(".lc-cdot", svg), cx = el.getAttribute("cx"), cy = el.getAttribute("cy");
      if(c){ c.setAttribute("x1", cx); c.setAttribute("x2", cx); c.classList.add("on"); }
      if(d){ d.setAttribute("cx", cx); d.setAttribute("cy", cy); d.classList.add("on"); }
    }
    if(!first && typeof haptic==="function") haptic(3);
  }
  // le graphique touché ; pendant son apparition (révélé de gauche à droite), la partie encore masquée ne
  // reçoit pas le doigt : un toucher sur la carte, à hauteur du tracé, le vise quand même
  function plotAt(e){
    if(!e.target.closest) return null;
    const direct = e.target.closest(".colchart .cc-plot, .linechart"); if(direct) return direct;
    const card = e.target.closest(".chart-card"), p = card && qs(".colchart .cc-plot, .linechart", card); if(!p) return null;
    const r = p.getBoundingClientRect();
    return e.clientY>=r.top && e.clientY<=r.bottom && e.clientX>=r.left && e.clientX<=r.right ? p : null;
  }
  document.addEventListener("pointerdown", e=>{
    const root = plotAt(e);
    if(!root){ scrub = null; return; }
    scrub = { root, cur:null, id:e.pointerId };
    at(e.clientX);
  });
  document.addEventListener("pointermove", e=>{ if(scrub && e.pointerId===scrub.id) at(e.clientX); }, { passive:true });
  const end = e=>{ if(scrub && (!e || e.pointerId===scrub.id)) scrub = null; };
  document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  document.addEventListener("ascen:suspend", ()=>{ scrub = null; hideTip(); });
})();
