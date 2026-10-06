// ================= POSES DES EXERCICES ANIMÉS (squelette, v3.5) =================
// Chaque exercice est décrit par deux poses (A départ, B fin du mouvement) sur un squelette aux
// proportions fixes (voir BONE_L dans data_pictos.js) : impossible d'avoir un membre étiré,
// raccourci ou détaché. Une pose donne :
//   P:[x,y]  position du bassin     t  angle du tronc (bassin → épaules)     h  angle de la tête
//   K F      angles de la cuisse et du tibia      E W   angles du bras et de l'avant-bras
//   K2 F2 E2 W2 : second membre (par défaut identique au premier)
//   pin:{ F, F2, W, W2 }  extrémités posées (sol, barre, banc) : le membre est plié tout seul pour
//   les atteindre (cinématique inverse), du côté donné par l'angle du membre s'il est fourni.
// Angles en degrés, repère de l'écran : 0 = droite, 90 = bas, 180 = gauche, -90 = haut.
// face : 1 regarde vers la droite (défaut), -1 vers la gauche (plie genoux et coudes du bon côté).
// Sol : y = 20.8 (pieds et mains posés). Viewbox 24 × 24.
const G = 20.8;
const RAD = Math.PI/180;
// debout, pieds joints sous le bassin
const stand = (x, o)=>Object.assign({ P:[x==null?12:x, 12.4], t:-90, E:74, W:96, pin:{ F:[x==null?12:x, G] } }, o||{});
// corps gainé en ligne droite des pieds (ou genoux) aux épaules, épaules à la hauteur Ny
function bodyLine(F, Ny, face, len){
  len = len || 14; face = face || -1;
  const dy = F[1]-Ny, dx = Math.sqrt(Math.max(0, len*len-dy*dy)), N = [F[0]+face*dx, Ny];
  const a = Math.atan2(N[1]-F[1], N[0]-F[0]), leg = len-5.6;
  return { P:[F[0]+Math.cos(a)*leg, F[1]+Math.sin(a)*leg], t:a/RAD, face };
}
// allongé sur le dos, tête à gauche, bassin en (x, y)
const supine = (x, y, o)=>Object.assign({ P:[x, y], t:182, h:204, face:-1, E:4, W:0 }, o||{});
// quatre pattes, tête à gauche : mains sous les épaules, genoux sous les hanches
const QUAD_N = [7, 14.7], QUAD_P = [12.4, 16.2];
const quad = o=>Object.assign({ P:QUAD_P.slice(), t:Math.atan2(QUAD_N[1]-QUAD_P[1], QUAD_N[0]-QUAD_P[0])/RAD, h:-172, face:-1, K:90, F:0, pin:{ W:[7,G] } }, o||{});
// bras orientés selon le tronc : décale des angles de bras d'un même angle (tronc penché)
const rot = (o, d)=>{ const r = {}; Object.keys(o).forEach(k=>r[k] = o[k]+d); return r; };
// développé debout vue de face : charges aux épaules (A) ou bras tendus (B)
const PRESS_LOW = { E:160, W:-95, E2:20, W2:-85 }, PRESS_UP = { E:-112, W:-96, E2:-68, W2:-84 };
const FRONT = (o)=>Object.assign({ front:true, P:[12,12.36], t:-90, pin:{ F:[11.1,G], F2:[12.9,G] }, E:100, W:94, E2:80, W2:86 }, o||{});
// barre sur le haut du dos / devant les épaules (debout, tronc vertical) ; tourner avec rot()
const BAR_BACK = { E:150, W:-60 }, BAR_FRONT = { E:2, W:-150 }, GOBLET = { E:108, W:-62 };
// bancs, chaise, décor
const FL = "M1.5 21h21";
const ENV = {
  bench:  FL+"M4.5 16.3h13.5M6.5 16.3V21M16 16.3V21",
  incline:FL+"M6.2 11.2L13.4 15.6H18.2M8.6 12.7V21M16.6 15.6V21",
  hipBench: FL+"M1.5 16.4h6M2.6 16.4V21M6.6 16.4V21",
  lowBench: FL+"M14 16.5h6.6M14.8 16.5V21M20 16.5V21",
  chair:  FL+"M14 16.5h6M14.8 16.5V21M19.6 16.5V21M19.6 16.5V9.6",
  box:    FL+"M13.4 19h7M14 19V21M19.8 19V21",
  seat:   FL+"M7.8 16.6h6.2M8.6 16.6V21M13.2 16.6V21",
  bar:    "M3 1.2h18",
  dip:    FL+"M8 12.4h9.8",
  wall:   FL+"M8.6 1.5V21",
  table:  FL+"M1.5 9.2h16.5M2.4 9.2V21M17.2 9.2V21",
  rack:   FL+"M1.5 9.2h8M3.4 9.2V21",
};

// ---------- poses de base réutilisées ----------
const SQ_A = stand(12, { E:40, W:8 });
const SQ_B = { P:[9.2,16.1], t:-58, h:-50, E:0, W:0, K:10, pin:{ F:[12,G] } };
const PUSH_A = Object.assign(bodyLine([20.4,G], 14.7), { h:-160, E:-40, pin:{ F:[20.4,G], W:[7.8,G] } });
const PUSH_B = Object.assign(bodyLine([20.4,G], 18.5), { h:-172, E:-40, pin:{ F:[20.4,G], W:[7.8,G] } });
const ROW_A = { P:[10.6,12.9], t:-20, h:-15, K:80, E:90, W:90, pin:{ F:[12,G] } };
const ROW_B = Object.assign({}, ROW_A, { E:-160, W:92 });
const HANG = (Ny, o)=>Object.assign({ front:true, P:[12, Ny+5.6], t:-90, h:-90, K:92, F:92, K2:88, F2:88, pin:{ W:[8.8,1.2], W2:[15.2,1.2] }, E:180, E2:0 }, o||{});
const BENCH_LIE = (o)=>Object.assign({ P:[13.8,14.9], t:180, h:196, face:-1, K:-35, pin:{ F:[18.8,G] } }, o||{});
const INCL_LIE = (o)=>Object.assign({ P:[13.9,14.8], t:-148, h:-150, face:-1, K:-15, pin:{ F:[19,G] } }, o||{});
const FLOOR_LIE = (o)=>supine(13, 19.7, Object.assign({ K:-40, pin:{ F:[17.6,G] } }, o||{}));
const LUNGE_B = (x, o)=>Object.assign({ P:[x,16.2], t:-90, K:15, K2:100, pin:{ F:[x+3.8,G], F2:[x-4,G] } }, o||{});
const BENT = (o)=>Object.assign({}, ROW_A, o||{});

const RIGS = {
  // ---------------- pompes (tête à gauche) ----------------
  pompes:          { icon:"A", A:PUSH_A, B:PUSH_B },
  pompes_sangles:  { icon:"A", env:FL+"M7.6 1.5V16.4", A:Object.assign(bodyLine([20.4,G], 12.4), { h:-150, E:-30, pin:{ F:[20.4,G], W:[7.6,16.4] } }),
                     B:Object.assign(bodyLine([20.4,G], 15.2), { h:-160, E:-30, pin:{ F:[20.4,G], W:[7.6,16.4] } }) },
  pompes_genoux:   { icon:"A", A:{ P:[12.1,17.8], t:-150, h:-162, face:-1, K:22, F:-38, E:-40, pin:{ W:[7.9,G] } },
                     B:{ P:[12.2,18.7], t:-171, h:-172, face:-1, K:12, F:-40, E:-40, pin:{ W:[7.9,G] } } },
  pompes_surelevees:{ icon:"A", env:FL+"M7.4 17.6h5.4M8.2 17.6V21M12 17.6V21",
                     A:Object.assign(bodyLine([20.6,G], 11.5), { h:-145, E:-40, pin:{ F:[20.6,G], W:[10.1,17.6] } }),
                     B:Object.assign(bodyLine([20.6,G], 15.2), { h:-160, E:-40, pin:{ F:[20.6,G], W:[10.1,17.6] } }) },
  pompes_declinees:{ icon:"A", env:FL+"M16.8 16.4h5M17.6 16.4V21M21.2 16.4V21",
                     A:Object.assign(bodyLine([21,16.4], 14.7), { h:-165, E:-40, pin:{ F:[21,16.4], W:[7.2,G] } }),
                     B:Object.assign(bodyLine([21,16.4], 18.2), { h:-178, E:-40, pin:{ F:[21,16.4], W:[7.2,G] } }) },
  pompes_diamant:  { icon:"A", env:FL+"M8.6 20.4l.9-1 .9 1", A:Object.assign({}, PUSH_A, { E:-60, pin:{ F:[20.4,G], W:[9.4,G] } }), B:Object.assign({}, PUSH_B, { E:-60, pin:{ F:[20.4,G], W:[9.4,G] } }) },
  pompes_larges:   { icon:"A", A:Object.assign({}, PUSH_A, { E:-120, pin:{ F:[20.4,G], W:[6.2,G] } }), B:Object.assign({}, PUSH_B, { E:-110, pin:{ F:[20.4,G], W:[6.2,G] } }) },
  pompes_archer:   { icon:"A", A:Object.assign(bodyLine([20.4,G], 16), { h:-160, E:-40, pin:{ F:[20.4,G], W:[8.6,G], W2:[3.4,G] } }),
                     B:Object.assign(bodyLine([20.4,G], 18.6), { h:-172, E:-40, E2:-160, pin:{ F:[20.4,G], W:[8.6,G], W2:[3.4,G] } }) },
  pompe_pike:      { A:{ P:[15.4,13.2], t:135, h:176, face:-1, E:-10, pin:{ F:[19.2,G], W:[7.8,G] } },
                     B:{ P:[14.8,14.2], t:128, h:178, face:-1, E:-40, pin:{ F:[19.2,G], W:[7.8,G] } } },
  pompes_hindoues: { dur:3, A:{ P:[15.4,13.2], t:135, h:176, face:-1, E:-10, pin:{ F:[19.2,G], W:[7.8,G] } },
                     B:{ P:[10.9,18.6], t:-142, h:-112, face:-1, E:-30, pin:{ F:[19.2,G], W:[7.8,G] } } },
  mountain_climbers:{ dur:1.1, A:PUSH_A, B:Object.assign({}, PUSH_A, { K:150, pin:{ F:[13.4,G], F2:[20.4,G], W:[7.8,G] } }) },
  renegade_row:    { icon:"A", A:Object.assign({}, PUSH_A, { pin:{ F:[20.4,G], W:[7.8,G], W2:[7.8,G] } }),
                     B:Object.assign({}, PUSH_A, { E:-30, W:95, pin:{ F:[20.4,G], W2:[7.8,G] } }) },
  burpees:         { dur:1.8, A:stand(12, { E:-100, W:-92 }), B:Object.assign({}, PUSH_A) },

  // ---------------- dips ----------------
  dips_barres:     { env:ENV.dip, A:{ P:[12,12.1], t:-92, h:-92, K:100, F:165, E:92, pin:{ W:[13.6,12.4] } },
                     B:{ P:[11.9,15.2], t:-80, h:-78, K:100, F:165, E:-140, pin:{ W:[13.6,12.4] } } },
  releve_genoux_barres:{ env:ENV.dip, A:{ P:[12,12.1], t:-90, K:88, F:92, E:92, pin:{ W:[13.6,12.4] } }, B:{ P:[12,12.1], t:-94, K:-8, F:88, E:92, pin:{ W:[13.6,12.4] } } },
  l_sit:           { env:ENV.dip, dur:3.6, A:{ P:[12,12.1], t:-90, K:88, F:92, E:92, pin:{ W:[13.6,12.4] } }, B:{ P:[12,12.0], t:-94, K:-2, F:0, E:92, pin:{ W:[13.6,12.4] } } },
  dips_banc:       { env:ENV.lowBench, A:{ P:[12.8,16.1], t:-92, h:-100, face:-1, K:-150, E:60, pin:{ F:[6,G], W:[14.5,16.5] } },
                     B:{ P:[12.0,17.6], t:-86, h:-96, face:-1, K:-150, E:-40, pin:{ F:[6,G], W:[14.5,16.5] } } },
  dips_chaise:     { env:ENV.chair, A:{ P:[12.8,16.1], t:-92, h:-100, face:-1, K:-150, E:60, pin:{ F:[6,G], W:[14.5,16.5] } },
                     B:{ P:[12.0,17.6], t:-86, h:-96, face:-1, K:-150, E:-40, pin:{ F:[6,G], W:[14.5,16.5] } } },

  // ---------------- squats (de profil, regard à droite) ----------------
  squat_pdc:       { A:SQ_A, B:SQ_B },
  squat_saute:     { dur:1.6, A:{ P:[12,11.6], t:-90, h:-88, K:94, F:84, E:-100, W:-95 }, B:Object.assign({}, SQ_B, { E:130, W:120 }) },
  chaise_murale:   { env:ENV.wall, dur:3.6, A:{ P:[10,16.6], t:-90, h:-90, K:0, F:90, E:40, W:0 }, B:{ P:[10,16.7], t:-91, h:-92, K:1, F:90, E:42, W:0 } },
  squat_gobelet:   { A:stand(12, GOBLET), B:Object.assign({}, SQ_B, { E:92, W:-50 }) },
  goblet_squat_kb: { A:stand(12, GOBLET), B:Object.assign({}, SQ_B, { E:92, W:-50 }) },
  squat_barre:     { A:stand(12, BAR_BACK), B:Object.assign({}, SQ_B, rot(BAR_BACK, 32)) },
  front_squat_barre:{ A:stand(12, BAR_FRONT), B:Object.assign({}, SQ_B, { t:-66, h:-60 }, rot(BAR_FRONT, 24)) },
  squat_elastique: { env:FL+"M10.6 20.6h3", A:stand(12, { E:80, W:-100 }), B:Object.assign({}, SQ_B, { E:104, W:-76 }) },
  squat_sangles:   { env:FL+"M18.6 1.5V8.6", A:stand(12, { E:-25, W:-15, K2:40, F2:100, pin:{ F:[12,G] } }),
                     B:{ P:[9.6,16.3], t:-55, h:-45, K:8, K2:-8, F2:-8, E:-12, W:-8, pin:{ F:[12,G] } } },
  squat_sumo_haltere:{ A:FRONT({ P:[12,12.9], pin:{ F:[8.8,G], F2:[15.2,G] }, E:100, W:80, E2:80, W2:100 }),
                     B:FRONT({ P:[12,16.2], K:160, K2:20, pin:{ F:[8.4,G], F2:[15.6,G] }, E:100, W:80, E2:80, W2:100 }) },
  band_walk:       { env:FL+"M9.6 16.8h4.8", dur:1.4, A:FRONT({ P:[12,13.0], K:120, K2:60, pin:{ F:[9.6,G], F2:[14.8,G] } }),
                     B:FRONT({ P:[13,13.0], K:120, K2:60, pin:{ F:[11.8,G], F2:[14.8,G] } }) },

  // ---------------- fentes ----------------
  fentes_avant:    { A:stand(10, { E:125, W:20 }), B:LUNGE_B(12.6, { E:125, W:20, pin:{ F:[16.4,G], F2:[10,G] } }) },
  fentes_arriere:  { A:stand(15.6, { E:125, W:20 }), B:LUNGE_B(12, { E:125, W:20, pin:{ F:[15.6,G], F2:[7.8,G] } }) },
  fentes_marchees: { A:stand(9, { E:125, W:20 }), B:LUNGE_B(13, { E:125, W:20, pin:{ F:[16.8,G], F2:[9,G] } }) },
  fentes_halteres: { A:stand(10), B:LUNGE_B(12.6, { pin:{ F:[16.4,G], F2:[10,G] } }) },
  fente_arriere_barre:{ A:stand(15.6, BAR_BACK), B:LUNGE_B(12, Object.assign({ pin:{ F:[15.6,G], F2:[7.8,G] } }, BAR_BACK)) },
  fente_goblet_kb: { A:stand(15.6, GOBLET), B:LUNGE_B(12, Object.assign({ pin:{ F:[15.6,G], F2:[7.8,G] } }, GOBLET)) },
  fentes_sautees:  { dur:1.6, A:{ P:[12,11.3], t:-90, K:60, F:100, K2:118, F2:78, E:-60, W:-70, E2:120, W2:100 }, B:LUNGE_B(12, { E:120, W:100, E2:60, W2:70 }) },
  fentes_laterales:{ A:FRONT({ P:[12,12.7], pin:{ F:[9.8,G], F2:[14.2,G] }, E:120, W:40, E2:60, W2:140 }),
                     B:FRONT({ P:[9.4,15.6], t:-80, K:150, pin:{ F:[7.2,G], F2:[15.8,G] }, E:120, W:40, E2:60, W2:140 }) },
  step_up:         { env:ENV.box, A:{ P:[11.2,12.6], t:-90, K:20, K2:90, pin:{ F:[16.2,19], F2:[11,G] } },
                     B:{ P:[15.6,10.4], t:-90, K2:98, F2:130, pin:{ F:[16.2,19] } } },
  montees_chaise:  { env:ENV.box, A:{ P:[11.2,12.6], t:-90, K:20, K2:90, E:110, W:30, pin:{ F:[16.2,19], F2:[11,G] } },
                     B:{ P:[15.6,10.4], t:-90, K2:-10, F2:90, E:110, W:30, pin:{ F:[16.2,19] } } },
  squat_bulgare_pdc:{ env:FL+"M1.8 17.2h6M2.6 17.2V21M7 17.2V21", A:{ P:[11.2,12.8], t:-90, K:10, K2:112, E:125, W:20, pin:{ F:[12.8,G], F2:[6.2,17.2] } },
                     B:{ P:[10.6,16.2], t:-84, K:0, K2:100, E:125, W:20, pin:{ F:[13.6,G], F2:[6.2,17.2] } } },
  squat_bulgare_halteres:{ env:FL+"M1.8 17.2h6M2.6 17.2V21M7 17.2V21", A:{ P:[11.2,12.8], t:-90, K:10, K2:112, pin:{ F:[12.8,G], F2:[6.2,17.2] } },
                     B:{ P:[10.6,16.2], t:-84, K:0, K2:100, pin:{ F:[13.6,G], F2:[6.2,17.2] } } },
  etir_psoas:      { dur:5, A:{ P:[11.4,16.2], t:-90, K:20, K2:92, F2:178, E:60, W:10, pin:{ F:[15.6,G] } },
                     B:{ P:[12.6,16.8], t:-97, h:-100, K:10, K2:100, F2:178, E:55, W:5, pin:{ F:[15.6,G] } } },

  // ---------------- ponts, hip thrust (allongé, tête à gauche) ----------------
  pont_fessier:    { A:supine(12.2,19.6, { K:-45, pin:{ F:[15.8,G] } }), B:{ P:[11.3,16.3], t:146, h:200, face:-1, E:0, W:0, K:-45, pin:{ F:[15.8,G] } } },
  pont_fessier_elastique:{ env:FL+"M14.6 17.2v1.6", A:supine(12.2,19.6, { K:-45, pin:{ F:[15.8,G] } }), B:{ P:[11.3,16.3], t:146, h:200, face:-1, E:0, W:0, K:-45, pin:{ F:[15.8,G] } } },
  pont_fessier_uni:{ A:supine(12.2,19.6, { K:-45, K2:-35, F2:-30, pin:{ F:[15.8,G] } }), B:{ P:[11.3,16.3], t:146, h:200, face:-1, E:0, W:0, K:-45, K2:-25, F2:-25, pin:{ F:[15.8,G] } } },
  hip_thrust_barre:{ env:ENV.hipBench, A:{ P:[11.2,19.4], t:-142, h:-155, face:-1, K:-40, E:36, W:46, pin:{ F:[16.4,G] } },
                     B:{ P:[12.2,16.1], t:178, h:-165, face:-1, K:-40, E:2, W:4, pin:{ F:[16.4,G] } } },
  hip_thrust_haltere:{ env:ENV.hipBench, A:{ P:[11.2,19.4], t:-142, h:-155, face:-1, K:-40, E:36, W:46, pin:{ F:[16.4,G] } },
                     B:{ P:[12.2,16.1], t:178, h:-165, face:-1, K:-40, E:2, W:4, pin:{ F:[16.4,G] } } },
  kickback_fessier_elastique:{ A:quad({ pin:{ W:[7,G], F:[16.6,20.4] } }), B:quad({ K:-18, F:-65, K2:90, F2:0 }) },

  // ---------------- gainage au sol ----------------
  planche:         { dur:3.6, A:Object.assign(bodyLine([20.6,G], 17.1), { h:-168, E:92, pin:{ F:[20.6,G], W:[3.6,20.3] } }),
                     B:Object.assign(bodyLine([20.6,G], 16.8), { h:-168, E:92, pin:{ F:[20.6,G], W:[3.6,20.3] } }) },
  planche_laterale:{ dur:3.6, A:Object.assign(bodyLine([20.6,G], 17.1), { h:-168, E:92, E2:-92, W2:-90, pin:{ F:[20.6,G], W:[3.6,20.3] } }),
                     B:Object.assign(bodyLine([20.6,G], 16.4), { h:-168, E:92, E2:-92, W2:-90, pin:{ F:[20.6,G], W:[3.6,20.3] } }) },
  planche_commando:{ A:Object.assign(bodyLine([20.6,G], 17.1), { h:-168, E:92, pin:{ F:[20.6,G], W:[3.6,20.3] } }),
                     B:Object.assign(bodyLine([20.6,G], 14.8), { h:-160, E:-40, pin:{ F:[20.6,G], W:[7.4,G] } }) },
  extension_triceps_sol:{ A:Object.assign(bodyLine([20.6,G], 17.1), { h:-168, E:92, pin:{ F:[20.6,G], W:[3.6,20.3] } }),
                     B:Object.assign(bodyLine([20.6,G], 16.0), { h:-164, E:-60, pin:{ F:[20.6,G], W:[3.6,20.3] } }) },
  superman:        { A:{ P:[12.6,19.1], t:180, h:196, face:-1, K:0, F:0, E:182, W:180 }, B:{ P:[12.6,19.1], t:195, h:208, face:-1, K:-12, F:-12, E:200, W:198 } },
  ytw_sol:         { A:{ P:[12.6,19.1], t:180, h:196, face:-1, K:0, F:0, E:192, W:190 }, B:{ P:[12.6,19.1], t:188, h:200, face:-1, K:0, F:0, E:-35, W:15 } },
  bird_dog:        { A:quad({ pin:{ W:[7,G], F:[16.6,20.4] } }), B:quad({ K:2, F:0, K2:90, F2:0, E:184, W:182, pin:{ W2:[7,G] } }) },
  marche_ours:     { dur:1.6, A:quad({ P:[12.4,15.2], t:-178, K:115, pin:{ W:[7.2,G], F:[16.4,G], F2:[16.4,G] } }),
                     B:quad({ P:[11.4,15.2], t:-178, K:115, K2:115, pin:{ W:[5.6,G], W2:[7.2,G], F:[16.4,G], F2:[14.2,G] } }) },
  roue_abdo_genoux:{ dur:3, A:{ P:[14.0,16.4], t:-148, h:-160, face:-1, K:60, E:95, pin:{ F:[19.4,20.4], W:[8.6,19.4] } },
                     B:{ P:[12.4,17.6], t:-172, h:-178, face:-1, K:60, E:185, W:180, pin:{ F:[19.4,20.4] } } },
  roue_abdo_debout:{ dur:3.2, A:{ P:[15.4,13.4], t:132, h:170, face:-1, K:-20, E:95, pin:{ F:[19.4,G], W:[10.4,19.4] } },
                     B:{ P:[11.6,18.6], t:-174, h:-178, face:-1, K:-20, E:182, W:180, pin:{ F:[19.4,G] } } },
  fallout_sangles: { env:FL+"M6.8 1.5l-1.2 7", dur:3, A:{ P:[14.3,12.5], t:-100, h:-100, face:-1, E:175, W:178, pin:{ F:[15.8,G] } },
                     B:{ P:[11.6,13.6], t:-120, h:-125, face:-1, E:-160, W:-162, pin:{ F:[15.8,G] } } },
  etir_enfant:     { dur:5, A:{ P:[13.8,15.9], t:-95, h:-100, face:-1, K:150, E:-120, W:-122, pin:{ F:[16.4,20.4] } },
                     B:{ P:[15.6,16.9], t:164, h:175, face:-1, K:150, E:180, pin:{ F:[16.4,20.4], W:[4.4,20.3] } } },
  etir_cobra:      { dur:4.6, A:{ P:[12.6,19.1], t:180, h:196, face:-1, K:0, F:0, E:-60, pin:{ W:[8.4,20.3] } },
                     B:{ P:[12.6,19.1], t:-148, h:-128, face:-1, K:0, F:0, E:-60, pin:{ W:[8.4,20.3] } } },
  etir_chat_vache: { dur:4, A:quad({ P:[12.4,16.0], h:120, pin:{ W:[7,G], F:[16.6,20.4] } }), B:quad({ P:[12.4,16.6], h:-150, pin:{ W:[7,G], F:[16.6,20.4] } }) },

  // ---------------- abdos (allongé, tête à gauche) ----------------
  crunch:          { A:supine(12.4,19.6, { K:-50, E:-20, W:-10, pin:{ F:[17.6,G] } }), B:supine(12.4,19.6, { t:-152, h:-140, K:-50, E:-8, W:-4, pin:{ F:[17.6,G] } }) },
  releve_jambes:   { A:supine(12.4,19.6, { K:0, F:0 }), B:supine(12.4,19.6, { K:-88, F:-90 }) },
  gainage_creux:   { dur:3.6, A:supine(12.4,19.6, { t:192, h:204, K:-12, F:-12, E:196, W:194 }), B:supine(12.4,19.6, { t:190, h:202, K:-10, F:-10, E:194, W:192 }) },
  dead_bug:        { A:supine(12.4,19.6, { K:-90, F:0, E:-92, W:-90 }), B:supine(12.4,19.6, { K:-4, F:0, K2:-90, F2:0, E:-92, W:-90, E2:192, W2:190 }) },
  russian_twist:   { dur:1.8, A:{ P:[13.4,19.4], t:-62, h:-80, face:-1, K:-160, F:160, E:150, W:175 }, B:{ P:[13.4,19.4], t:-62, h:-70, face:-1, K:-160, F:160, E:80, W:40 } },
  flutter_kicks:   { dur:.9, A:supine(12.4,19.6, { K:-14, F:-14, K2:-4, F2:-4 }), B:supine(12.4,19.6, { K:-4, F:-4, K2:-14, F2:-14 }) },
  etir_fessiers:   { dur:5, A:supine(12.4,19.6, { K:-50, K2:-60, F2:150, pin:{ F:[17.6,G] } }), B:supine(12.4,19.6, { K:-80, F:10, K2:-95, F2:175, E:-40, W:-10 }) },

  // ---------------- cardio ----------------
  jumping_jacks:   { dur:1, A:FRONT({ P:[12,12.5], pin:{ F:[11,G], F2:[13,G] }, E:100, W:95, E2:80, W2:85 }),
                     B:FRONT({ P:[12,13.1], pin:{ F:[8.8,G], F2:[15.2,G] }, E:-140, W:-118, E2:-40, W2:-62 }) },
  montees_genoux:  { dur:.9, A:{ P:[12,12.4], t:-90, K:-12, F:90, E:60, W:-40, E2:125, W2:100, pin:{ F2:[12,G] } },
                     B:{ P:[12,12.4], t:-90, K2:-12, F2:90, E:125, W:100, E2:60, W2:-40, pin:{ F:[12,G] } } },
  corde_a_sauter:  { dur:.7, env:"M5.6 20.6Q12 23.4 18.4 20.6", A:FRONT({ P:[12,12.4], pin:{ F:[11.4,G], F2:[12.6,G] }, E:112, W:40, E2:68, W2:140 }),
                     B:FRONT({ P:[12,11.2], K:94, F:88, K2:86, F2:92, E:112, W:40, E2:68, W2:140, pin:{} }) },

  // ---------------- mollets ----------------
  mollets_pdc:     { env:FL+"M7.6 20.8h8.8", A:stand(12), B:stand(12, { P:[12,10.9], pin:{ F:[12.4,19.3] } }) },
  mollets_halteres:{ A:stand(12), B:stand(12, { P:[12,10.9], pin:{ F:[12.4,19.3] } }) },
  mollets_uni_pdc: { A:stand(12, { K2:96, F2:150, pin:{ F:[12,G] } }), B:stand(12, { P:[12,10.9], K2:96, F2:150, pin:{ F:[12.4,19.3] } }) },
  mollets_assis_haltere:{ env:ENV.seat, A:{ P:[10.6,16.3], t:-90, K:0, F:90, E:40, W:20 }, B:{ P:[10.6,16.3], t:-90, K:-6, F:92, E:34, W:14 } },
  etir_mollets:    { env:FL+"M20.6 1.5V21", dur:5, A:{ P:[11.8,12.9], t:-86, K:30, K2:100, E:0, W:0, pin:{ F:[14.6,G], F2:[8.8,G] } },
                     B:{ P:[12.6,13.0], t:-68, h:-60, K:30, K2:100, pin:{ F:[14.6,G], F2:[8.8,G], W:[20.1,8.6] } } },

  // ---------------- charnière de hanche (regard à droite) ----------------
  rdl_halteres:    { A:stand(12), B:{ P:[10.1,12.9], t:-14, h:-8, K:80, E:90, W:90, pin:{ F:[12,G] } } },
  rdl_barre:       { A:stand(12), B:{ P:[10.1,12.9], t:-14, h:-8, K:80, E:90, W:90, pin:{ F:[12,G] } } },
  souleve_elastique:{ env:FL+"M10.8 20.6h2.6", A:stand(12), B:{ P:[10.1,12.9], t:-14, h:-8, K:80, E:90, W:90, pin:{ F:[12,G] } } },
  rdl_uni_haltere: { A:stand(12), B:{ P:[11.4,12.9], t:-10, h:-5, K:88, K2:180, F2:180, E:90, W:90, pin:{ F:[12,G] } } },
  deadlift_barre:  { A:stand(12), B:{ P:[9.6,14.8], t:-28, h:-20, K:15, E:90, W:90, pin:{ F:[12,G] } } },
  deadlift_kb:     { A:stand(12), B:{ P:[9.6,14.8], t:-28, h:-20, K:15, E:90, W:90, pin:{ F:[12,G] } } },
  swing_kb:        { dur:1.4, A:{ P:[9.8,13.8], t:-20, h:-12, K:40, E:112, W:118, pin:{ F:[12,G] } }, B:stand(12, { E:2, W:0 }) },
  swing_kb_uni:    { dur:1.4, A:{ P:[9.8,13.8], t:-20, h:-12, K:40, E:112, W:118, pin:{ F:[12,G] } }, B:stand(12, { E:2, W:0 }) },
  kb_sumo_deadlift:{ A:FRONT({ P:[12,13.0], pin:{ F:[8.8,G], F2:[15.2,G] }, E:100, W:80, E2:80, W2:100 }),
                     B:FRONT({ P:[12,16.0], K:162, K2:18, pin:{ F:[8.6,G], F2:[15.4,G] }, E:98, W:84, E2:82, W2:96 }) },
  good_morning_barre:{ A:stand(12, BAR_BACK), B:Object.assign({ P:[10.2,12.8], t:-12, h:-5, K:82, pin:{ F:[12,G] } }, rot(BAR_BACK, 78)) },
  nordic_curl:     { env:FL+"M13 20.8h8", dur:3.2, A:{ P:[14.4,16.2], t:-90, h:-90, face:-1, K:90, E:100, W:80, pin:{ F:[18.4,20.0] } },
                     B:{ P:[10.5,18.9], t:-164, h:-170, face:-1, K:20, E:125, W:188, pin:{ F:[18.4,20.0] } } },
  etir_ischios:    { dur:5, A:stand(12), B:{ P:[10.6,12.6], t:40, h:62, E:20, W:40, pin:{ F:[12.6,G] } } },

  // ---------------- développé, écarté (allongé sur banc, tête à gauche) ----------------
  dc_haltere:      { env:ENV.bench, A:BENCH_LIE({ E:22, W:-90 }), B:BENCH_LIE({ E:-90, W:-90 }) },
  dc_barre:        { env:ENV.bench, A:BENCH_LIE({ E:22, W:-90 }), B:BENCH_LIE({ E:-90, W:-90 }) },
  dc_serre_barre:  { env:ENV.bench, A:BENCH_LIE({ E:40, W:-100 }), B:BENCH_LIE({ E:-88, W:-90 }) },
  squeeze_press:   { env:ENV.bench, A:BENCH_LIE({ E:30, W:-95 }), B:BENCH_LIE({ E:-80, W:-86 }) },
  ecarte_couche:   { env:ENV.bench, A:BENCH_LIE({ E:32, W:14 }), B:BENCH_LIE({ E:-82, W:-96 }) },
  pullover_haltere:{ env:ENV.bench, A:BENCH_LIE({ E:192, W:188 }), B:BENCH_LIE({ E:-82, W:-84 }) },
  extension_triceps_allonge:{ env:ENV.bench, A:BENCH_LIE({ E:-104, W:150 }), B:BENCH_LIE({ E:-104, W:-100 }) },
  barre_front:     { env:ENV.bench, A:BENCH_LIE({ E:-104, W:150 }), B:BENCH_LIE({ E:-104, W:-100 }) },
  dc_incline_haltere:{ env:ENV.incline, A:INCL_LIE({ E:30, W:-100 }), B:INCL_LIE({ E:-100, W:-100 }) },
  dc_incline_barre:{ env:ENV.incline, A:INCL_LIE({ E:30, W:-100 }), B:INCL_LIE({ E:-100, W:-100 }) },
  ecarte_incline:  { env:ENV.incline, A:INCL_LIE({ E:42, W:26 }), B:INCL_LIE({ E:-94, W:-106 }) },
  floor_press_haltere:{ A:FLOOR_LIE({ E:4, W:-90 }), B:FLOOR_LIE({ E:-90, W:-90 }) },
  ecarte_sol:      { A:FLOOR_LIE({ E:4, W:2 }), B:FLOOR_LIE({ E:-86, W:-94 }) },
  ecarte_elastique_pect:{ A:FRONT({ E:176, W:172, E2:4, W2:8 }), B:FRONT({ E:150, W:30, E2:30, W2:150 }) },

  // ---------------- tirage buste penché (regard à droite) ----------------
  rowing_deux_halteres:{ A:ROW_A, B:ROW_B },
  rowing_barre:    { A:ROW_A, B:ROW_B },
  rowing_uni_kb:   { env:FL+"M14.4 15.2h6M15 15.2V21M19.8 15.2V21", A:BENT({ E:90, W:90, pin:{ F:[12,G], W2:[16.4,15.2] } }), B:BENT({ E:-160, W:92, pin:{ F:[12,G], W2:[16.4,15.2] } }) },
  rowing_uni_haltere:{ env:FL+"M14.4 15.2h6M15 15.2V21M19.8 15.2V21", A:BENT({ E:90, W:90, pin:{ F:[12,G], W2:[16.4,15.2] } }), B:BENT({ E:-160, W:92, pin:{ F:[12,G], W2:[16.4,15.2] } }) },
  oiseau_haltere:  { A:ROW_A, B:BENT({ E:18, W:14 }) },
  kickback_triceps:{ env:FL+"M14.4 15.2h6M15 15.2V21M19.8 15.2V21", A:BENT({ E:170, W:90, pin:{ F:[12,G], W2:[16.4,15.2] } }), B:BENT({ E:170, W:168, pin:{ F:[12,G], W2:[16.4,15.2] } }) },
  tirage_elastique:{ env:FL+"M21.8 7.6v4", A:stand(12, { E:0, W:0 }), B:stand(12, { E:160, W:10 }) },
  rowing_appui_banc:{ env:ENV.incline, A:INCL_LIE({ P:[14.2,15.6], t:-146, h:-140, E:90, W:90 }), B:INCL_LIE({ P:[14.2,15.6], t:-146, h:-140, E:-118, W:92 }) },
  rowing_sangles:  { env:FL+"M6 1.5 10.4 7.6", A:{ P:[12.8,13.5], t:-60, h:-62, face:1, E:-160, pin:{ F:[8.6,G], W:[10.4,7.6] } },
                     B:{ P:[10.8,12.7], t:-76, h:-80, face:1, E:120, pin:{ F:[8.6,G], W:[11.2,7.2] } } },
  curl_sangles:    { env:FL+"M6 1.5 10.4 7.6", A:{ P:[12.8,13.5], t:-60, h:-62, face:1, E:-160, pin:{ F:[8.6,G], W:[10.4,7.6] } },
                     B:{ P:[10.8,12.7], t:-78, h:-82, face:1, E:-150, W:20, pin:{ F:[8.6,G] } } },
  rowing_inverse_barre:{ env:ENV.rack, A:Object.assign(bodyLine([20.4,G], 15.3), { h:-178, E:20, pin:{ F:[20.4,G], W:[7.6,9.2] } }),
                     B:Object.assign(bodyLine([20.4,G], 12.3), { h:-172, E:40, pin:{ F:[20.4,G], W:[7.6,9.2] } }) },
  rowing_table:    { env:ENV.table, A:Object.assign(bodyLine([20.4,G], 15.3), { h:-178, E:20, pin:{ F:[20.4,G], W:[7.6,9.2] } }),
                     B:Object.assign(bodyLine([20.4,G], 12.3), { h:-172, E:40, pin:{ F:[20.4,G], W:[7.6,9.2] } }) },

  // ---------------- développé debout, épaules (vue de face) ----------------
  dev_epaules_haltere:{ A:FRONT(PRESS_LOW), B:FRONT(PRESS_UP) },
  militaire_barre: { A:FRONT(PRESS_LOW), B:FRONT(PRESS_UP) },
  kb_overhead_press:{ A:FRONT(PRESS_LOW), B:FRONT(PRESS_UP) },
  dev_epaules_elastique:{ env:FL+"M10.6 20.6h2.8", A:FRONT(PRESS_LOW), B:FRONT(PRESS_UP) },
  arnold_press:    { A:FRONT({ E:96, W:-86, E2:84, W2:-94 }), B:FRONT(PRESS_UP) },
  thruster_haltere:{ dur:2, A:Object.assign({}, SQ_B, { E:98, W:-70 }), B:stand(12, { E:-84, W:-88 }) },
  woodchopper_haltere:{ A:FRONT({ P:[12,13.4], t:-102, h:-104, K:108, K2:66, pin:{ F:[9.6,G], F2:[14.4,G] }, E:128, W:126, E2:134, W2:124 }),
                     B:FRONT({ P:[12,12.6], t:-82, h:-78, pin:{ F:[9.6,G], F2:[14.4,G] }, E:-42, W:-40, E2:-48, W2:-36 }) },
  halo_kb:         { A:FRONT({ E:-150, W:-40, E2:-160, W2:-30 }), B:FRONT({ E:-30, W:-140, E2:-20, W2:-150 }) },
  elevations_laterales:{ A:FRONT({ E:100, W:95, E2:80, W2:85 }), B:FRONT({ E:182, W:178, E2:-2, W2:2 }) },
  ecarte_elastique:{ A:FRONT({ E:150, W:30, E2:30, W2:150 }), B:FRONT({ E:178, W:180, E2:2, W2:0 }) },
  shrugs_halteres: { dur:1.6, A:FRONT({ E:94, W:92, E2:86, W2:88 }), B:FRONT({ nk:1.9, E:98, W:84, E2:82, W2:96 }) },
  shrugs_barre:    { dur:1.6, A:FRONT({ E:94, W:92, E2:86, W2:88 }), B:FRONT({ nk:1.9, E:98, W:84, E2:82, W2:96 }) },

  // ---------------- bras (regard à droite) ----------------
  curl_biceps:     { A:stand(12, { E:80, W:94 }), B:stand(12, { E:86, W:-52 }) },
  curl_barre:      { A:stand(12, { E:80, W:94 }), B:stand(12, { E:86, W:-52 }) },
  curl_zottman:    { A:stand(12, { E:80, W:94 }), B:stand(12, { E:86, W:-52 }) },
  curl_marteau:    { grip:"v", A:stand(12, { E:80, W:94 }), B:stand(12, { E:86, W:-52 }) },
  curl_biceps_elastique:{ env:FL+"M11 20.6h2.6", A:stand(12, { E:80, W:94 }), B:stand(12, { E:86, W:-52 }) },
  curl_concentre:  { env:ENV.seat, A:{ P:[10.8,16.2], t:-62, h:-55, K:0, F:90, E:82, W:92 }, B:{ P:[10.8,16.2], t:-62, h:-55, K:0, F:90, E:82, W:-100 } },
  curl_poignets:   { env:ENV.seat, A:{ P:[10.8,16.2], t:-80, h:-70, K:0, F:90, E:70, W:4 }, B:{ P:[10.8,16.2], t:-80, h:-70, K:0, F:90, E:70, W:-18 } },
  curl_incline:    { env:FL+"M7.6 4.4L11.4 15.6H16.6M15.8 15.6V21M12 15.6V21", A:{ P:[12.4,15.2], t:-112, h:-100, K:4, F:90, E:96, W:90 }, B:{ P:[12.4,15.2], t:-112, h:-100, K:4, F:90, E:96, W:-40 } },
  extension_triceps_nuque:{ A:FRONT({ E:-110, W:32, E2:-70, W2:148 }), B:FRONT({ E:-98, W:-86, E2:-82, W2:-94 }) },
  extension_triceps_elastique:{ env:FL+"M15.6 1.5v3", A:stand(12, { E:92, W:-45 }), B:stand(12, { E:94, W:88 }) },
  elevations_frontales:{ A:stand(12, { E:92, W:90 }), B:stand(12, { E:2, W:0 }) },
  face_pull_elastique:{ env:FL+"M21.8 5.2v3.2", A:stand(12, { E:-8, W:-6 }), B:stand(12, { E:184, W:-10 }) },
  pallof_press:    { env:FL+"M21.8 8.6v3", dur:3, A:stand(12, { E:112, W:-30 }), B:stand(12, { E:4, W:2 }) },

  // ---------------- suspension (vue de face) ----------------
  tractions:       { env:ENV.bar, A:HANG(7.2), B:HANG(4.7, { K:96, F:100, K2:84, F2:80 }) },
  tractions_suppination:{ env:ENV.bar, A:HANG(7.2, { pin:{ W:[10,1.2], W2:[14,1.2] } }), B:HANG(4.7, { K:96, F:100, K2:84, F2:80, pin:{ W:[10,1.2], W2:[14,1.2] } }) },
  tractions_negatives:{ env:ENV.bar, dur:4.2, A:HANG(4.7, { K:96, F:100, K2:84, F2:80 }), B:HANG(7.2) },
  suspension_barre:{ env:ENV.bar, dur:3.6, A:HANG(7.0), B:HANG(7.25) },
  tractions_scapulaires:{ env:ENV.bar, A:HANG(7.3), B:HANG(6.3) },
  releve_genoux_suspendu:{ env:ENV.bar, A:{ P:[12,12.0], t:-90, h:-90, K:90, F:90, E:-86, pin:{ W:[12.6,1.2] } }, B:{ P:[12,12.0], t:-94, h:-92, K:-12, F:92, E:-86, pin:{ W:[12.6,1.2] } } },
  releve_jambes_suspendu:{ env:ENV.bar, A:{ P:[12,12.0], t:-90, h:-90, K:90, F:90, E:-86, pin:{ W:[12.6,1.2] } }, B:{ P:[12,12.0], t:-96, h:-92, K:-4, F:-4, E:-86, pin:{ W:[12.6,1.2] } } },
  tirage_vertical_elastique:{ env:FL+"M12.6 1.5v1.4", A:{ P:[12,16.2], t:-90, K:90, F:180, E:-84, W:-88 }, B:{ P:[12,16.2], t:-90, K:90, F:180, E:160, W:-72 } },

  // ---------------- porter, marcher ----------------
  marche_fermier:  { dur:1.2, A:{ P:[12,12.7], t:-90, E:66, W:100, K:20, K2:110, pin:{ F:[14.4,G], F2:[9.8,G] } }, B:{ P:[12,12.7], t:-90, E:66, W:100, K:110, K2:20, pin:{ F:[9.8,G], F2:[14.4,G] } } },
  kb_fermier:      { dur:1.2, A:{ P:[12,12.7], t:-90, E:66, W:100, K:20, K2:110, pin:{ F:[14.4,G], F2:[9.8,G] } }, B:{ P:[12,12.7], t:-90, E:66, W:100, K:110, K2:20, pin:{ F:[9.8,G], F2:[14.4,G] } } },

  // ---------------- étirements debout ----------------
  etir_quadriceps: { dur:5, A:stand(12, { K2:100, F2:180, E2:115, W2:110, E:20, W:0, pin:{ F:[12,G] } }), B:stand(12, { K2:96, F2:-102, E2:125, W2:40, E:20, W:0, pin:{ F:[12,G] } }) },
  etir_pectoraux:  { env:FL+"M17.6 1.5V21", dur:5, A:stand(12, { pin:{ F:[12,G], W:[17.3,4.2] } }), B:{ P:[12.8,12.5], t:-78, h:-72, pin:{ F:[12,G], W:[17.3,4.2] } } },
  etir_epaules:    { dur:4.6, A:FRONT(), B:FRONT({ E:6, W:2, E2:60, W2:-40 }) },
  etir_triceps:    { dur:4.6, A:FRONT({ E:-94, W:-92 }), B:FRONT({ E:-78, W:160, E2:-120, W2:10 }) },
  etir_avantbras:  { dur:4, A:stand(12, { E:4, W:2, E2:36, W2:-10 }), B:stand(12, { E:4, W:8, E2:40, W2:-4 }) },
  // ---------------- 4.0 : Pilates et poids du corps ----------------
  pilates_cent:    { dur:.8, A:supine(12.4,19.6, { t:200, h:222, K:-90, F:0, E:2, W:0 }), B:supine(12.4,19.6, { t:200, h:222, K:-90, F:0, E:12, W:10 }) },
  enroule_pilates: { dur:3.2, A:supine(11,19.8, { K:0, F:0, E:184, W:182, pin:{ F:[19.4,20.3] } }), B:{ P:[11,19.8], t:-38, h:-20, face:-1, K:0, F:0, E:-24, W:-18, pin:{ F:[19.4,20.3] } } },
  cercles_jambe:   { dur:1.6, A:supine(11.6,19.6, { K:-74, F:-74, K2:0, F2:0 }), B:supine(11.6,19.6, { K:-104, F:-104, K2:0, F2:0 }) },
  teaser_pilates:  { dur:3, A:supine(12.4,19.6, { K:-32, F:-32, E:196, W:194 }), B:{ P:[12.4,19.9], t:-122, h:-110, face:-1, K:-48, F:-48, E:-36, W:-36 } },
  nage_pilates:    { dur:.9, A:{ P:[12.6,19.1], t:193, h:204, face:-1, K:-3, F:-3, K2:-20, F2:-20, E:212, W:208, E2:188, W2:186 },
                     B:{ P:[12.6,19.1], t:193, h:204, face:-1, K:-20, F:-20, K2:-3, F2:-3, E:188, W:186, E2:212, W2:208 } },
  // allongé sur le côté, vu de face (hanches et épaules empilées, tête posée sur le bras du dessous) :
  // genoux pliés, le genou du dessus s'ouvre vers le plafond, pieds collés
  coquillage:      { dur:1.6, A:{ front:true, P:[12.4,18.8], t:180, h:184, face:-1, K:4, F:178, K2:2, F2:178, E:180, W:180, E2:6, W2:4 },
                     B:{ front:true, P:[12.4,18.8], t:180, h:184, face:-1, K:4, F:178, K2:-40, F2:135, E:180, W:180, E2:6, W2:4 } },
  elevation_jambe_cote:{ dur:1.6, A:{ front:true, P:[11.4,18.8], t:180, h:184, face:-1, K:2, F:0, K2:-2, F2:-2, E:180, W:180, E2:6, W2:4 },
                     B:{ front:true, P:[11.4,18.8], t:180, h:184, face:-1, K:2, F:0, K2:-32, F2:-32, E:180, W:180, E2:6, W2:4 } },
  kickback_quadrupedie:{ A:quad({ pin:{ W:[7,G], F:[16.6,20.4] } }), B:quad({ K:-6, F:-96, K2:90, F2:0 }) },
  crunch_velo:     { dur:1.4, A:supine(12.4,19.6, { t:204, h:226, K:-128, F:-30, K2:-18, F2:-18, E:-118, W:150 }), B:supine(12.4,19.6, { t:204, h:226, K:-18, F:-18, K2:-128, F2:-30, E:-118, W:150 }) },
  fente_croisee:   { A:FRONT({ E:118, W:30, E2:62, W2:150 }), B:FRONT({ P:[12.6,15.8], E:118, W:30, E2:62, W2:150, pin:{ F:[16.2,G], F2:[11,G] } }) },
  pompes_mur:      { icon:"A", env:FL+"M5 1.5V21", A:Object.assign(bodyLine([15.6,G], 7.8), { h:-140, E:-170, pin:{ F:[15.6,G], W:[5.3,8.4] } }),
                     B:Object.assign(bodyLine([15.6,G], 9.4), { h:-120, E:-120, pin:{ F:[15.6,G], W:[5.3,8.4] } }) },
  planche_touches: { dur:1.4, A:PUSH_A, B:Object.assign({}, PUSH_A, { E2:40, W2:-150, pin:{ F:[20.4,G], W:[7.8,G] } }) },
  // ---------------- 4.0 : étirements ----------------
  etir_pigeon:     { dur:5, A:{ P:[12,18.4], t:-104, h:-104, face:-1, K:162, F:12, K2:12, F2:4, E:100, W:80, pin:{ F2:[19.9,20.5] } },
                     B:{ P:[12,18.4], t:186, h:192, face:-1, K:162, F:12, K2:12, F2:4, E:180, W:180, pin:{ F2:[19.9,20.5] } } },
  // assis vu de face : genoux ouverts sur les côtés, plantes de pieds jointes devant le bassin
  etir_papillon:   { dur:2.4, A:FRONT({ P:[12,19.3], K:186, F:22, K2:-6, F2:158, pin:{ W:[11,19.6], W2:[13,19.6] } }),
                     B:FRONT({ P:[12,19.3], K:178, F:16, K2:2, F2:164, pin:{ W:[11,19.6], W2:[13,19.6] } }) },
  etir_cou:        { dur:4.6, A:FRONT(), B:FRONT({ h:-58, E2:-40, W2:-150 }) },
  etir_torsion:    { dur:5, env:"M2.6 3.4h18.8v17.2H2.6z", A:{ front:true, P:[14.4,12.6], t:180, h:180, face:-1, K:12, F:174, K2:-2, F2:0, E:102, W:100, E2:-102, W2:-100 },
                     B:{ front:true, P:[14.4,12.6], t:180, h:160, face:-1, K:-46, F:118, K2:-2, F2:0, E:102, W:100, E2:-102, W2:-100 } },
  etir_chien:      { dur:4, icon:"A", A:{ P:[13.4,13.4], t:138, h:118, face:-1, pin:{ F:[17.8,G], W:[5,G] } }, B:{ P:[13.4,13.4], t:138, h:118, face:-1, K:-20, pin:{ F:[16.8,19.6], F2:[17.8,G], W:[5,G] } } },
  etir_dorsaux:    { env:ENV.chair, dur:5, A:{ P:[8.6,12.8], t:-30, h:-24, pin:{ F:[9,G], W:[19.4,9.8] } }, B:{ P:[9.6,12.9], t:10, h:62, pin:{ F:[9,G], W:[19.4,9.8] } } },
  etir_lateral:    { dur:4.6, A:FRONT({ E:-96, W:-94, E2:60, W2:150 }), B:FRONT({ t:-72, h:-66, E:-56, W:-30, E2:60, W2:150 }) },
  etir_biceps:     { env:FL+"M17.6 1.5V21", dur:5, A:stand(12, { h:-90, face:-1, pin:{ F:[12,G], W:[17.2,7.6] } }), B:{ P:[11.8,12.5], t:-96, h:-108, face:-1, pin:{ F:[12,G], W:[17.2,7.6] } } },
  etir_livre:      { dur:3.6, A:{ front:true, P:[13.4,18.8], t:180, h:184, face:-1, K:4, F:178, K2:2, F2:178, E:180, W:180, E2:60, pin:{ W2:[9.6,20.4] } },
                     B:{ front:true, P:[13.4,18.8], t:180, h:226, face:-1, K:4, F:178, K2:2, F2:178, E:180, W:180, E2:-112, W2:-120 } },
};
