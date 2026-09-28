// ================= PICTOGRAMMES DES EXERCICES =================
// Silhouettes au trait (24×24, trait « currentColor ») : une par famille de mouvement.
// La tête est un disque plein ; le reste est tracé en lignes arrondies.
const PICTO_PATHS = {
  squat:    { h:[13,4.3], d:"M12.6 6.6 10 12l5.3.8-.9 6.2M11.4 8.6l5.8 1.1M8.5 19h8" },
  lunge:    { h:[11,4.2], d:"M11 6.6v5.9l4.8.4v6.1M11 12.5l-3.4 4.1-3.6.4M11 8.4l2.6 3.2M4 19h14" },
  hinge:    { h:[5.6,7.4], d:"M7.5 8.6 15 11.2l-.3 7.8M15 11.2l3 7.8M9 9.2v6M5.8 15.2h6.4M5.8 14v2.4M12.2 14v2.4" },
  bench:    { h:[4.6,13.8], d:"M6.6 14.6h10.6l2.6 4.6M9 14.6V8.4M6 8.4h6M6 7.2v2.4M12 7.2v2.4M4 17.4h15M6 17.4V21M17 17.4V21" },
  fly:      { h:[12,4.4], d:"M12 6.8v8.4M12 9C9.6 9 7.4 8 5.4 5.8M12 9c2.4 0 4.6-1 6.6-3.2M4.4 4.8l2 2M17.6 6.8l2-2M12 15.2l-2.4 4.8M12 15.2l2.4 4.8" },
  pushup:   { h:[4.6,9.6], d:"M6.5 10.6 20 15.6M8.6 11.4v5.6M3.5 18.4h17" },
  dips:     { h:[12,4.4], d:"M12 6.8v7.4M10.4 7.8 7.4 11M13.6 7.8l3 3.2M4 11h5M15 11h5M12 14.2l-1.4 5M12 14.2l3 3.6" },
  overhead: { h:[12,7.6], d:"M12 10v5.8M12 15.8l-2.4 5M12 15.8l2.4 5M10.6 10.6 8.2 3.6M13.4 10.6l2.4-7M5 3.6h14M5 2.4v2.4M19 2.4v2.4" },
  raise:    { h:[12,4.4], d:"M12 6.8v7.6M12 14.4l-2.4 5.6M12 14.4l2.4 5.6M12 8.6H5M12 8.6h7M5 7v3.2M19 7v3.2" },
  row:      { h:[5.2,8], d:"M7 9 14.6 11l.4 8M14.6 11l3 8M8.8 9.6l2.8-2.4.4 5M10.6 12.2h2.8" },
  hang:     { h:[12,6.4], d:"M3.5 3h17M8 3l2.6 5.2M16 3l-2.6 5.2M12 8.8v6.4M12 15.2l-1 5.6M12 15.2l1 5.6" },
  curl:     { h:[9.6,4.4], d:"M9.6 6.8v7.6M9.6 14.4l-2.2 5.6M9.6 14.4l2.2 5.6M9.8 8.4l1.4 4.4 4-3.8M13.8 7.6l2.8 2.8" },
  triceps:  { h:[9.4,6.8], d:"M9.4 9.2v6M9.4 15.2l-2 5.6M9.4 15.2l2 5.6M10.8 9.4l2.4-6 2.6 4.6M14.8 8.8l2-2" },
  bridge:   { h:[4.4,15.6], d:"M6.4 16.4 12.6 12l4.6.4 1.4 5.8M3 18.6h18M9 14.4l-1 4.2" },
  plank:    { h:[5,10.6], d:"M6.8 11.6 20 14.6M8.2 12v5h3M20 14.6l.4 3.2M3.5 18.4h17.5" },
  crunch:   { h:[6.2,9.6], d:"M7.6 11 12.4 16l3.8-4.4 2.8 5.8M9.6 12.2l1.8-2.6M3.5 18.4h17" },
  calf:     { h:[11,4.2], d:"M11 6.6v7.6M11 14.2v4.6l1.6 1.6M11 8.4l2.8 3.2M8 21h8M18 18v-6M16.2 13.8 18 12l1.8 1.8" },
  cardio:   { h:[12,4.4], d:"M12 6.8v6.8M12 8.4 7.4 4M12 8.4 16.6 4M12 13.6l-4.2 6.2M12 13.6l4.2 6.2M3.6 9.4h2M18.4 9.4h2" },
  carry:    { h:[12,4.2], d:"M12 6.6v7.6M12 14.2l-2.8 6M12 14.2l2.6 5.8M12 8.4l-3.6 5M12 8.4l3.6 5M6.6 13.6h3.6M13.8 13.6h3.6" },
};

// Famille de mouvement de chaque exercice (repli : famille déduite du pattern).
const PICTO_OF = {
  pompes:"pushup", pompes_genoux:"pushup", pompes_surelevees:"pushup", pompes_declinees:"pushup", pompes_diamant:"pushup", pompes_larges:"pushup", pompe_pike:"pushup",
  dips_banc:"dips",
  squat_pdc:"squat", squat_gobelet:"squat", squat_barre:"squat", goblet_squat_kb:"squat", squat_elastique:"squat", squat_sumo_haltere:"squat", squat_saute:"squat", chaise_murale:"squat", band_walk:"squat", thruster_haltere:"overhead",
  squat_bulgare_pdc:"lunge", fentes_avant:"lunge", fentes_arriere:"lunge", fentes_marchees:"lunge", fentes_laterales:"lunge", fentes_halteres:"lunge", step_up:"lunge",
  pont_fessier:"bridge", pont_fessier_uni:"bridge", pont_fessier_elastique:"bridge", hip_thrust_barre:"bridge", hip_thrust_haltere:"bridge",
  rdl_halteres:"hinge", rdl_uni_haltere:"hinge", deadlift_barre:"hinge", rdl_barre:"hinge", deadlift_kb:"hinge", kb_sumo_deadlift:"hinge", swing_kb:"hinge", superman:"plank",
  planche:"plank", planche_laterale:"plank", mountain_climbers:"plank", bird_dog:"plank", gainage_creux:"crunch", dead_bug:"crunch", crunch:"crunch", releve_jambes:"crunch",
  burpees:"cardio", jumping_jacks:"cardio",
  mollets_pdc:"calf", mollets_uni_pdc:"calf", mollets_halteres:"calf",
  tractions:"hang", tractions_suppination:"hang", suspension_barre:"hang", releve_genoux_suspendu:"hang",
  dc_haltere:"bench", dc_incline_haltere:"bench", dc_barre:"bench", dc_incline_barre:"bench", dc_serre_barre:"bench", floor_press_haltere:"bench", squeeze_press:"bench", pullover_haltere:"bench",
  ecarte_couche:"fly", ecarte_incline:"fly", ecarte_sol:"fly", ecarte_elastique_pect:"fly",
  rowing_uni_haltere:"row", rowing_deux_halteres:"row", rowing_barre:"row", rowing_uni_kb:"row", renegade_row:"row", tirage_elastique:"row",
  dev_epaules_haltere:"overhead", militaire_barre:"overhead", arnold_press:"overhead", kb_overhead_press:"overhead", dev_epaules_elastique:"overhead",
  elevations_laterales:"raise", elevations_frontales:"raise", oiseau_haltere:"raise", ecarte_elastique:"raise", face_pull_elastique:"raise",
  curl_biceps:"curl", curl_marteau:"curl", curl_concentre:"curl", curl_incline:"curl", curl_barre:"curl", curl_biceps_elastique:"curl", curl_poignets:"curl",
  extension_triceps_nuque:"triceps", kickback_triceps:"triceps", extension_triceps_allonge:"triceps", barre_front:"triceps", extension_triceps_elastique:"triceps",
  shrugs_halteres:"carry", marche_fermier:"carry", kb_fermier:"carry",
  // v2.2
  roue_abdo_genoux:"plank", roue_abdo_debout:"plank", dips_barres:"dips", releve_genoux_barres:"dips", l_sit:"dips",
  rowing_sangles:"row", pompes_sangles:"pushup", squat_sangles:"squat", curl_sangles:"curl", fallout_sangles:"plank",
  rowing_inverse_barre:"row", tractions_scapulaires:"hang", corde_a_sauter:"cardio",
  // v1.7
  pompes_archer:"pushup", planche_commando:"plank", russian_twist:"crunch", flutter_kicks:"crunch", montees_genoux:"cardio", fentes_sautees:"lunge",
  ytw_sol:"raise", marche_ours:"plank", rowing_appui_banc:"row", squat_bulgare_halteres:"lunge", curl_zottman:"curl", mollets_assis_haltere:"calf",
  woodchopper_haltere:"overhead", front_squat_barre:"squat", fente_arriere_barre:"lunge", shrugs_barre:"carry", good_morning_barre:"hinge",
  halo_kb:"overhead", fente_goblet_kb:"lunge", swing_kb_uni:"hinge", tirage_vertical_elastique:"hang", pallof_press:"plank",
  souleve_elastique:"hinge", kickback_fessier_elastique:"bridge", tractions_negatives:"hang", releve_jambes_suspendu:"hang",
};
const PICTO_BY_PATTERN = { squat:"squat", hinge:"hinge", push:"pushup", pull:"row", lunge:"lunge", core:"plank", calf:"calf" };

function pictoKey(def){ return PICTO_OF[def.id] || PICTO_BY_PATTERN[def.pattern] || "squat"; }
function pictoSVG(key){
  const p = PICTO_PATHS[key] || PICTO_PATHS.squat;
  return `<svg class="picto" viewBox="0 0 24 24" aria-hidden="true"><circle cx="${p.h[0]}" cy="${p.h[1]}" r="2.1" fill="currentColor"/><path d="${p.d}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ---- code couleur par zone du corps (couleur + pictogramme + libellé : jamais la couleur seule) ----
const REGIONS = {
  push: { n:"Poussée",          muscles:["pect","epaules","triceps"] },
  pull: { n:"Tirage",           muscles:["dos","biceps","avantbras"] },
  legs: { n:"Jambes",           muscles:["quadriceps","ischios","fessiers","mollets"] },
  core: { n:"Gainage & cardio", muscles:["abdos","cardio"] },
};
const REGION_OF_MUSCLE = {};
Object.keys(REGIONS).forEach(r=>REGIONS[r].muscles.forEach(m=>REGION_OF_MUSCLE[m]=r));
function regionOf(def){ return def._region || (def._region = REGION_OF_MUSCLE[def.muscles[0]] || "core"); }

// tuile d'exercice : pictogramme sur fond de la couleur de zone
function exoIcon(def, size){
  const k = size||""; def._ico = def._ico || {};
  return def._ico[k] || (def._ico[k] = `<span class="xico r-${regionOf(def)} ${k}" title="${esc(REGIONS[regionOf(def)].n)}">${pictoSVG(pictoKey(def))}</span>`);
}

// ================= EXERCICES ANIMÉS (fiche technique) =================
// Silhouette articulée (tête, cou, bassin, genoux, pieds, coudes, mains) décrite par deux
// positions : départ (A) et fin du mouvement (B). L'animation SVG native (SMIL) passe de
// l'une à l'autre en boucle, sans script ni image. Vue de profil sauf mention contraire.
const FLOOR = "M1.5 21h21";
const STAND = { H:[12,4.2], N:[12,7], P:[12,12.6], K:[12.2,16.8], F:[12,20.8] };
const ANIM_POSES = {
  squat:    { env:FLOOR, A:{ ...STAND, E:[14.4,8.8], W:[17,9.2] },
                         B:{ H:[13.4,8.8], N:[12.9,11.4], P:[8.8,15.4], K:[13.8,15.9], F:[12,20.8], E:[15.6,12.2], W:[18.3,12.4] } },
  lunge:    { env:FLOOR, A:{ ...STAND, K:[12.9,16.8], F:[13.2,20.8], K2:[11.4,16.8], F2:[11,20.8], E:[12.4,10], W:[12.5,13] },
                         B:{ H:[12,7.4], N:[12,10.2], P:[12,15.2], K:[16,15.9], F:[16.4,20.8], K2:[10.6,19.8], F2:[7,20.6], E:[12.4,13.2], W:[12.5,16] } },
  hinge:    { env:FLOOR, A:{ H:[12,4.2], N:[12,7], P:[11.4,12.6], K:[11.8,16.8], F:[11.8,20.8], E:[12.1,10], W:[12.2,13.2] },
                         B:{ H:[18.6,9.8], N:[16.2,10.4], P:[10.4,12.6], K:[11.6,16.8], F:[11.8,20.8], E:[16.3,13.4], W:[16.4,16.4] } },
  bench:    { env:"M4.5 16.2h13.5M6.5 16.2V21M16 16.2V21M1.5 21h21", A:{ H:[5.4,14.2], N:[7.8,14.8], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[10.4,17.2], W:[9.4,12.6] },
                         B:{ H:[5.4,14.2], N:[7.8,14.8], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[8.6,10.4], W:[8.4,6.2] } },
  fly:      { env:FLOOR, A:{ ...STAND, K:[10.9,16.8], F:[10.5,20.8], K2:[13.1,16.8], F2:[13.5,20.8], E:[7.4,8.2], W:[4.2,8.8], E2:[16.6,8.2], W2:[19.8,8.8] },
                         B:{ ...STAND, K:[10.9,16.8], F:[10.5,20.8], K2:[13.1,16.8], F2:[13.5,20.8], E:[9.8,8.4], W:[11.4,7.2], E2:[14.2,8.4], W2:[12.6,7.2] } },
  pushup:   { env:FLOOR, A:{ H:[4.8,11.2], N:[6.9,12.5], P:[13.6,15.6], K:[17.1,17.8], F:[20.6,20], E:[7.1,16.4], W:[7.3,20.6] },
                         B:{ H:[4.8,16.4], N:[6.9,17.3], P:[13.6,18.6], K:[17.1,19.4], F:[20.6,20], E:[10.2,16], W:[7.3,20.6] } },
  dips:     { env:"M8 11.8h8.5", A:{ H:[12,3.6], N:[12,6.4], P:[12,12.2], K:[13,15.4], F:[11.6,18.2], E:[12.6,9.2], W:[12.9,11.8] },
                         B:{ H:[12,7.2], N:[12,10], P:[12,15.6], K:[13,18.8], F:[11.6,21.4], E:[9.2,10.8], W:[12.9,11.8] } },
  overhead: { env:FLOOR, A:{ ...STAND, K:[10.9,16.8], F:[10.5,20.8], K2:[13.1,16.8], F2:[13.5,20.8], E:[8.4,10.4], W:[8.3,7.2], E2:[15.6,10.4], W2:[15.7,7.2] },
                         B:{ ...STAND, K:[10.9,16.8], F:[10.5,20.8], K2:[13.1,16.8], F2:[13.5,20.8], E:[8.7,4.8], W:[9.3,1.8], E2:[15.3,4.8], W2:[14.7,1.8] } },
  raise:    { env:FLOOR, A:{ ...STAND, K:[10.9,16.8], F:[10.5,20.8], K2:[13.1,16.8], F2:[13.5,20.8], E:[10.6,10], W:[10.3,13.2], E2:[13.4,10], W2:[13.7,13.2] },
                         B:{ ...STAND, K:[10.9,16.8], F:[10.5,20.8], K2:[13.1,16.8], F2:[13.5,20.8], E:[8.2,7.4], W:[4.8,7.6], E2:[15.8,7.4], W2:[19.2,7.6] } },
  row:      { env:FLOOR, A:{ H:[5.8,8.2], N:[8.2,9.8], P:[14.8,11.8], K:[14.4,16.2], F:[15.2,20.8], E:[8.6,13.4], W:[8.8,16.6] },
                         B:{ H:[5.8,8.2], N:[8.2,9.8], P:[14.8,11.8], K:[14.4,16.2], F:[15.2,20.8], E:[12.6,8.6], W:[10.2,12.4] } },
  hang:     { env:"M3 2.6h18", A:{ H:[12,7], N:[12,9.6], P:[12,15.2], K:[11.4,18.4], F:[12,21.6], E:[9.4,6.2], W:[8.6,2.6], E2:[14.6,6.2], W2:[15.4,2.6] },
                         B:{ H:[12,1.6], N:[12,4.4], P:[12,10], K:[11.4,13.2], F:[12,16.4], E:[7.4,5], W:[8.6,2.6], E2:[16.6,5], W2:[15.4,2.6] } },
  curl:     { env:FLOOR, A:{ ...STAND, E:[12.3,9.9], W:[12.6,13.2] }, B:{ ...STAND, E:[12.3,9.9], W:[15.4,7.6] } },
  triceps:  { env:FLOOR, A:{ ...STAND, E:[13.4,3.2], W:[10.2,5.4] }, B:{ ...STAND, E:[13.4,3.2], W:[13.8,0.4] } },
  bridge:   { env:FLOOR, A:{ H:[4.2,18.6], N:[6.5,19], P:[12,20], K:[15.8,15], F:[18.4,20.8], E:[8.4,20.4], W:[10.6,20.6] },
                         B:{ H:[4.2,18.6], N:[6.5,19], P:[12,13.8], K:[16.4,13.2], F:[18.4,20.8], E:[8.4,20.4], W:[10.6,20.6] } },
  plank:    { env:FLOOR, A:{ H:[4.8,12.2], N:[6.9,13.4], P:[13.6,15.6], K:[17.1,17.6], F:[20.6,20], E:[7.1,20.6], W:[10.4,20.6] },
                         B:{ H:[4.8,12.6], N:[6.9,13.7], P:[13.6,14.6], K:[17.1,17.2], F:[20.6,20], E:[7.1,20.6], W:[10.4,20.6] } },
  crunch:   { env:FLOOR, A:{ H:[4.2,18.2], N:[6.5,19], P:[12.2,20], K:[15.6,15], F:[18.8,20.8], E:[6.6,15.8], W:[4.6,16.8] },
                         B:{ H:[7.4,13.8], N:[8.8,16.2], P:[12.2,20], K:[15.6,15], F:[18.8,20.8], E:[9.8,13], W:[7.4,12.6] } },
  calf:     { env:"M7 20.8h10", A:{ ...STAND, E:[12.3,10], W:[12.4,13.2] },
                         B:{ H:[12,2.8], N:[12,5.6], P:[12,11.2], K:[12.2,15.4], F:[12.6,19.6], E:[12.3,8.6], W:[12.4,11.8] } },
  cardio:   { env:FLOOR, A:{ ...STAND, K:[11.4,16.8], F:[11.2,20.8], K2:[12.6,16.8], F2:[12.8,20.8], E:[10.6,10], W:[10.4,13], E2:[13.4,10], W2:[13.6,13] },
                         B:{ H:[12,3.6], N:[12,6.4], P:[12,12], K:[9.6,16.2], F:[7.8,20.2], K2:[14.4,16.2], F2:[16.2,20.2], E:[8.6,4.4], W:[7,1.6], E2:[15.4,4.4], W2:[17,1.6] } },
  carry:    { env:FLOOR, A:{ ...STAND, K:[13.4,16.6], F:[14.6,20.8], K2:[11,16.8], F2:[9.8,20.8], E:[12.2,10], W:[12.3,13.4] },
                         B:{ ...STAND, K:[11,16.8], F:[9.8,20.8], K2:[13.4,16.6], F2:[14.6,20.8], E:[12.2,10], W:[12.3,13.4] } },
};
function animPath(p){
  const q = k=>(p[k]||p[k.replace("2","")]).map(v=>v.toFixed(2)).join(" ");
  return `M${q("N")}L${q("P")}M${q("P")}L${q("K")}L${q("F")}M${q("P")}L${q("K2")}L${q("F2")}M${q("N")}L${q("E")}L${q("W")}M${q("N")}L${q("E2")}L${q("W2")}`;
}
// charge tenue : disque aux mains pour les exercices chargés (pas les élastiques)
function exoAnimSVG(def){
  const key = pictoKey(def), pose = ANIM_POSES[key] || ANIM_POSES.squat;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lt = typeof loadableTypeOf==="function" ? loadableTypeOf(def) : null, w = lt && lt!=="bands" ? (lt==="barbell" ? 1.9 : 1.3) : 0;
  const A = pose.A, B = pose.B, dur = isTimed(def) ? "3.6s" : "2.4s";
  const spl = `calcMode="spline" keyTimes="0;.45;1" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${dur}" repeatCount="indefinite"`;
  const anim = (attr, a, b)=> reduce ? "" : `<animate attributeName="${attr}" values="${a};${b};${a}" ${spl}/>`;
  const dot = (k, r, cls)=>{ const a = A[k]||A[k.replace("2","")], b = B[k]||B[k.replace("2","")];
    return `<circle class="${cls}" cx="${a[0]}" cy="${a[1]}" r="${r}">${anim("cx", a[0], b[0])}${anim("cy", a[1], b[1])}</circle>`; };
  const two = A.W2 || B.W2;
  return `<svg class="exo-anim" viewBox="0 0 24 24" aria-label="Animation du mouvement">
    <path class="ea-env" d="${pose.env||FLOOR}"/>
    <path class="ea-body" d="${animPath(A)}">${anim("d", animPath(A), animPath(B))}</path>
    ${dot("H", 2.15, "ea-head")}
    ${w ? dot("W", w, "ea-load") + (two ? dot("W2", w, "ea-load") : "") : ""}
  </svg>`;
}
