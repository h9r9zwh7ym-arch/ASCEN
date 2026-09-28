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
  // v3.0
  dips_chaise:"dips", extension_triceps_sol:"plank", pompes_hindoues:"pushup", rowing_table:"row", montees_chaise:"lunge", nordic_curl:"hinge",
  // v3.1 : étirements
  etir_ischios:"hinge", etir_quadriceps:"lunge", etir_fessiers:"bridge", etir_mollets:"calf", etir_pectoraux:"fly", etir_enfant:"plank", etir_epaules:"raise", etir_triceps:"triceps", etir_avantbras:"curl", etir_psoas:"lunge", etir_cobra:"plank", etir_chat_vache:"plank",
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
// ---- variantes par exercice ----
// Deux exercices voisins (pompes classiques, sur les genoux, diamant, archer…) partageaient la
// même animation. Chaque variante part d'une pose de base et remplace les articulations qui
// changent réellement (genoux au sol, pieds surélevés, bras tendu, saut, appui sur une chaise…),
// avec son décor (banc, chaise, mur, table) et son tempo (explosif, lent, maintien).
const ENV_BENCH_L = "M3 14.4h7.4M4.2 14.4V21M9.2 14.4V21", ENV_BENCH_R = "M15 13.8h7.4M16.2 13.8V21M21.2 13.8V21";
const ENV_CHAIR_BACK = "M13 12.4h6.4M13.8 12.4V21M18.8 12.4V21M18.8 12.4V5.8", ENV_BOX = "M13.2 18.4h7M14 18.4V21M19.4 18.4V21";
const PUSH_DOWN = { H:[4.8,16.4], N:[6.9,17.3], P:[13.6,18.6], K:[17.1,19.4], F:[20.6,20] };
const LIE = { H:[4.2,19.2], N:[6.4,19.9], P:[12.6,20.2], K:[16.6,20.3], F:[20.8,20.4] };
const ANIM_VARIANT = {
  // --- pompes ---
  pompes_genoux:   { base:"pushup", A:{ H:[5,11.8], N:[7.1,13], P:[12.6,16.8], K:[15.8,20.4], F:[19.6,17], E:[7.2,16.6] }, B:{ H:[5,16.4], N:[7.1,17.4], P:[12.6,19], K:[15.8,20.4], F:[19.6,17], E:[10.2,16.2] } },
  pompes_surelevees:{ base:"pushup", env:ENV_BENCH_L, A:{ H:[4.8,5], N:[6.9,6.3], P:[13.8,14.6], K:[17.2,17.8], F:[20.6,20.8], E:[7,10.4], W:[6.8,14.4] }, B:{ H:[5,10.2], N:[7.2,11.4], P:[14,16.4], K:[17.3,18.8], F:[20.6,20.8], E:[10.4,10.8], W:[6.8,14.4] } },
  pompes_declinees:{ base:"pushup", env:ENV_BENCH_R, A:{ H:[4.8,11.4], N:[6.9,12.5], P:[13.6,13], K:[17.6,13.2], F:[21.4,13.6] }, B:{ H:[4.8,16.8], N:[6.9,17.4], P:[13.6,15.6], K:[17.6,14.2], F:[21.4,13.6], E:[10.2,16.2] } },
  pompes_diamant:  { base:"pushup", env:"M8.4 20.4l1-1.1 1 1.1", A:{ E:[8.8,16.6], W:[9.4,20.6] }, B:{ ...PUSH_DOWN, E:[12.6,17], W:[9.4,20.6] } },
  pompes_larges:   { base:"pushup", A:{ E:[5.2,16.2], W:[3.4,20.6] }, B:{ ...PUSH_DOWN, E:[6.6,15], W:[3.4,20.6] } },
  pompes_archer:   { base:"pushup", A:{ E2:[4.6,16.6], W2:[2.2,20.6] }, B:{ H:[5.6,16.2], N:[7.6,17.2], P:[14,18.6], K:[17.3,19.4], F:[20.6,20], E:[10.6,16], W:[7.3,20.6], E2:[4.8,19], W2:[2.2,20.6] } },
  pompe_pike:      { base:"pushup", A:{ H:[8.6,15.8], N:[9.4,13.6], P:[13.2,8.8], K:[16.4,14.8], F:[19.4,20.8], E:[8.6,17.2], W:[7.8,20.6] }, B:{ H:[7.6,19], N:[9,17.2], P:[13.2,9.8], K:[16.4,15.2], F:[19.4,20.8], E:[11,17.4], W:[7.8,20.6] } },
  pompes_hindoues: { base:"pushup", dur:3, A:{ H:[8.6,15.8], N:[9.4,13.6], P:[13.2,8.8], K:[16.4,14.8], F:[19.4,20.8], E:[8.6,17.2], W:[7.8,20.6] }, B:{ H:[5.2,12.8], N:[7,14.6], P:[13.8,19.2], K:[17.2,20], F:[20.6,20.6], E:[7.2,17.6], W:[7.3,20.6] } },
  planche_commando:{ base:"plank", B:{ H:[4.8,11.2], N:[6.9,12.5], P:[13.6,15.5], K:[17.1,17.8], F:[20.6,20], E:[7.1,16.4], W:[7.3,20.6] } },
  extension_triceps_sol:{ base:"plank", A:{ H:[4.8,12.8], N:[6.9,14], P:[13.6,16.2], K:[17.1,18], F:[20.6,20.2], E:[7.1,20.6], W:[3.8,20.6] }, B:{ H:[4.6,10.6], N:[6.7,11.8], P:[13.6,15], K:[17.1,17.6], F:[20.6,20.2], E:[5.6,16.2], W:[3.8,20.6] } },
  mountain_climbers:{ base:"pushup", dur:1.1, A:{ H:[4.8,11.2], N:[6.9,12.5], P:[13.6,15.6], E:[7.1,16.4], W:[7.3,20.6] }, B:{ H:[4.8,11.2], N:[6.9,12.5], P:[13.6,15.6], K:[10.8,16.6], F:[12.8,19.8], K2:[17.1,17.8], F2:[20.6,20], E:[7.1,16.4], W:[7.3,20.6] } },
  // --- gainage au sol ---
  bird_dog:        { base:"plank", A:{ H:[4.6,12.4], N:[6.8,13.4], P:[14.4,13.4], K:[14.4,20.4], F:[18.8,20.8], E:[6.8,17], W:[6.8,20.6] }, B:{ H:[4.6,12.2], N:[6.8,13.4], P:[14.4,13.4], K:[18.6,13.2], F:[22.4,13.4], K2:[14.4,20.4], F2:[18.8,20.8], E:[3.8,12.8], W:[1,12.6], E2:[6.8,17], W2:[6.8,20.6] } },
  superman:        { base:"plank", A:{ ...LIE, H:[3.8,19.4], E:[2.6,20.4], W:[0.6,20.4] }, B:{ H:[4.4,16.8], N:[6.4,18], P:[13,20.2], K:[17,19.6], F:[21,17.6], E:[3,17.2], W:[1,16.4] } },
  planche_laterale:{ base:"plank", dur:3.6, A:{ H:[4.8,12], N:[7.2,13.2], P:[13.2,16.4], K:[16.8,18.4], F:[20.6,20.4], E:[7.4,20.6], W:[3.8,20.6], E2:[7.6,9.6], W2:[7.8,6.6] }, B:{ H:[4.8,12.4], N:[7.2,13.6], P:[13.2,17.6], K:[16.8,19.2], F:[20.6,20.4], E:[7.4,20.6], W:[3.8,20.6], E2:[7.6,10], W2:[7.8,7] } },
  // --- abdos ---
  releve_jambes:   { base:"crunch", A:{ ...LIE, E:[7,20.4], W:[9.6,20.6] }, B:{ ...LIE, K:[13.6,15.2], F:[14.4,10.2], E:[7,20.4], W:[9.6,20.6] } },
  dead_bug:        { base:"crunch", A:{ ...LIE, K:[12.8,15.2], F:[16.8,15.2], E:[6.6,16.2], W:[6.8,12.6] }, B:{ ...LIE, K:[16.8,18.8], F:[21,19.4], K2:[12.8,15.2], F2:[16.8,15.2], E:[6.6,16.2], W:[6.8,12.6], E2:[4.4,17], W2:[1.6,17.6] } },
  gainage_creux:   { base:"crunch", dur:3.6, A:{ H:[5,16.8], N:[6.8,18.4], P:[12.6,20.2], K:[16.6,19], F:[20.6,17.6], E:[4.2,16.4], W:[1.8,15.4] }, B:{ H:[5,16.4], N:[6.8,18.1], P:[12.6,20.2], K:[16.6,18.7], F:[20.6,17.2], E:[4.2,16], W:[1.8,15] } },
  russian_twist:   { base:"crunch", dur:1.8, A:{ H:[10.4,9.4], N:[11,12], P:[13.6,19.6], K:[17.2,15.6], F:[20.6,17.4], E:[10.6,14.6], W:[9.2,16.2] }, B:{ H:[10.6,9.4], N:[11.2,12], P:[13.6,19.6], K:[17.2,15.6], F:[20.6,17.4], E:[14.4,14.2], W:[16.2,15.2] } },
  flutter_kicks:   { base:"crunch", dur:.9, A:{ ...LIE, K:[16.6,19], F:[20.8,17.2], K2:[16.6,19.8], F2:[20.8,19.6], E:[7,20.4], W:[9.6,20.6] }, B:{ ...LIE, K:[16.6,19.8], F:[20.8,19.6], K2:[16.6,19], F2:[20.8,17.2], E:[7,20.4], W:[9.6,20.6] } },
  // --- jambes ---
  squat_saute:     { base:"squat", dur:1.6, A:{ H:[12,2.6], N:[12,5.4], P:[12,11], K:[12.2,15.1], F:[12.6,19], E:[13.6,8], W:[14.8,5.8] } },
  chaise_murale:   { base:"squat", env:"M8.6 1.5V21", dur:3.6, A:{ H:[9.8,5.6], N:[9.8,8.4], P:[9.8,13.8], K:[14.8,13.8], F:[14.8,20.8], E:[12,11.4], W:[14.2,13.2] }, B:{ H:[9.8,5.9], N:[9.8,8.7], P:[9.8,13.9], K:[14.8,13.9], F:[14.8,20.8], E:[12,11.6], W:[14.2,13.3] } },
  squat_gobelet:   { base:"squat", A:{ E:[13.6,9.8], W:[13.2,7.8] }, B:{ E:[15.2,13.2], W:[14.8,11.2] } },
  goblet_squat_kb: { base:"squat", A:{ E:[13.6,9.8], W:[13.2,7.8] }, B:{ E:[15.2,13.2], W:[14.8,11.2] } },
  squat_sumo_haltere:{ base:"squat", A:{ H:[12,4.2], N:[12,7], P:[12,12.6], K:[9,16.8], F:[7.4,20.8], K2:[15,16.8], F2:[16.6,20.8], E:[11.4,10], W:[12,14.4], E2:[12.6,10], W2:[12,14.4] }, B:{ H:[12,7.6], N:[12,10.4], P:[12,15.4], K:[7.6,16], F:[7.4,20.8], K2:[16.4,16], F2:[16.6,20.8], E:[11.2,13.4], W:[12,17.2], E2:[12.8,13.4], W2:[12,17.2] } },
  fentes_avant:    { base:"lunge", A:{ K:[12.2,16.8], F:[12.2,20.8], K2:[11.8,16.8], F2:[11.8,20.8] } },
  fentes_arriere:  { base:"lunge", A:{ H:[13,4.2], N:[13,7], P:[13,12.6], K:[13.2,16.8], F:[13,20.8], K2:[12.8,16.8], F2:[12.8,20.8], E:[13.4,10], W:[13.5,13] }, B:{ H:[10,7.4], N:[10,10.2], P:[10,15.2], K:[13.6,15.9], F:[13.4,20.8], K2:[8.2,19.8], F2:[4.6,20.6], E:[10.4,13.2], W:[10.5,16] } },
  fentes_sautees:  { base:"lunge", dur:1.6, A:{ H:[12,3], N:[12,5.8], P:[12,11.2], K:[9.4,14.4], F:[9,18.6], K2:[14.6,14.8], F2:[15.2,19], E:[13.6,8.6], W:[15,10.6] } },
  fentes_laterales:{ base:"lunge", A:{ H:[12,4.2], N:[12,7], P:[12,12.6], K:[10.4,16.8], F:[9.6,20.8], K2:[13.6,16.8], F2:[14.4,20.8], E:[11.2,10.4], W:[12,13.2] }, B:{ H:[10.6,7.2], N:[10.6,10], P:[9.8,15.2], K:[6.8,16.6], F:[5.4,20.8], K2:[13.8,18.2], F2:[17.8,20.8], E:[11.2,13.2], W:[12.4,15.2] } },
  montees_chaise:  { base:"lunge", env:ENV_BOX, A:{ H:[10.4,4.2], N:[10.4,7], P:[10.6,12.6], K:[15,14.2], F:[15.8,18.4], K2:[10.6,16.8], F2:[10.4,20.8], E:[10.8,10], W:[10.9,13] }, B:{ H:[16,2.6], N:[16,5.2], P:[16,10.6], K:[16.2,14.6], F:[16,18.4], K2:[17.4,14.8], F2:[17.6,18.4], E:[16.2,8], W:[16.3,11] } },
  step_up:         { base:"lunge", env:ENV_BOX, A:{ H:[10.4,4.2], N:[10.4,7], P:[10.6,12.6], K:[15,14.2], F:[15.8,18.4], K2:[10.6,16.8], F2:[10.4,20.8], E:[10.8,10], W:[10.9,13] }, B:{ H:[16,2.6], N:[16,5.2], P:[16,10.6], K:[16.2,14.6], F:[16,18.4], K2:[17.4,14.8], F2:[17.6,18.4], E:[16.2,8], W:[16.3,11] } },
  squat_bulgare_pdc:{ base:"lunge", env:ENV_BENCH_R, A:{ H:[11,4.4], N:[11,7.2], P:[11.4,12.8], K:[9.4,16.8], F:[9,20.8], K2:[15,15.2], F2:[18.6,13.8] }, B:{ H:[11.6,7.6], N:[11.4,10.4], P:[12,15.6], K:[8.2,16.4], F:[9,20.8], K2:[14.2,19.4], F2:[18.6,13.8] } },
  pont_fessier_uni:{ base:"bridge", A:{ K2:[16.6,17.4], F2:[20.6,15.6] }, B:{ K2:[19.4,12.6], F2:[23,11.4] } },
  hip_thrust_haltere:{ base:"bridge", env:"M1.5 16.4h6M2.6 16.4V21M6.6 16.4V21", A:{ H:[3.2,13.8], N:[5.4,15.6], P:[11,19.6], K:[15.4,15.2], F:[17.6,20.8], E:[7.6,17.4], W:[10.2,18.6] }, B:{ H:[3.2,13.6], N:[5.4,15.6], P:[11.6,14.2], K:[15.8,13.8], F:[17.6,20.8], E:[8,14.2], W:[11,13.8] } },
  hip_thrust_barre:{ base:"bridge", env:"M1.5 16.4h6M2.6 16.4V21M6.6 16.4V21", A:{ H:[3.2,13.8], N:[5.4,15.6], P:[11,19.6], K:[15.4,15.2], F:[17.6,20.8], E:[7.6,17.4], W:[10.2,18.6] }, B:{ H:[3.2,13.6], N:[5.4,15.6], P:[11.6,14.2], K:[15.8,13.8], F:[17.6,20.8], E:[8,14.2], W:[11,13.8] } },
  mollets_uni_pdc: { base:"calf", A:{ K2:[13.6,15.8], F2:[15.4,17.8] }, B:{ K2:[13.6,14.4], F2:[15.4,16.4] } },
  nordic_curl:     { base:"hinge", env:"M15 20.8h6", dur:3.2, A:{ H:[13.8,6], N:[14,8.8], P:[14.2,14.4], K:[14.4,20.4], F:[19.6,20.6], E:[12.6,11.4], W:[12.2,13.6] }, B:{ H:[4.6,18.6], N:[6.8,17.6], P:[11.4,15.4], K:[14.4,20.4], F:[19.6,20.6], E:[6,20.2], W:[4.4,20.6] } },
  swing_kb:        { base:"hinge", dur:1.4, B:{ H:[12,4.2], N:[12,7], P:[11.6,12.6], K:[11.8,16.8], F:[11.8,20.8], E:[15.8,8.6], W:[19.4,8.6] }, A:{ H:[18.6,9.8], N:[16.2,10.4], P:[10.4,12.6], K:[11.6,16.8], F:[11.8,20.8], E:[14,14.4], W:[11.6,16.8] } },
  rdl_uni_haltere: { base:"hinge", B:{ K2:[6.6,12.2], F2:[2.8,11.2] } },
  // --- développé, écarté, pull-over : banc incliné, au sol, bras au-dessus de la tête ---
  dc_incline_haltere:{ base:"bench", env:"M6 11.6L14.6 16.4H18M8.6 13V21M16.6 16.4V21", A:{ H:[6.2,9.6], N:[8.4,11], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[11.2,13.8], W:[10.4,9.4] }, B:{ H:[6.2,9.6], N:[8.4,11], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[9.8,6.8], W:[9.4,3.2] } },
  dc_incline_barre:{ base:"bench", env:"M6 11.6L14.6 16.4H18M8.6 13V21M16.6 16.4V21", A:{ H:[6.2,9.6], N:[8.4,11], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[11.2,13.8], W:[10.4,9.4] }, B:{ H:[6.2,9.6], N:[8.4,11], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[9.8,6.8], W:[9.4,3.2] } },
  ecarte_incline:  { base:"bench", env:"M6 11.6L14.6 16.4H18M8.6 13V21M16.6 16.4V21", A:{ H:[6.2,9.6], N:[8.4,11], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[11.6,12.2], W:[13.8,13.6] }, B:{ H:[6.2,9.6], N:[8.4,11], P:[14.4,15], K:[17.6,12.4], F:[19.6,20.8], E:[10.4,7], W:[9.6,3.8] } },
  floor_press_haltere:{ base:"bench", env:"M1.5 21h21", A:{ H:[4.2,18.8], N:[6.5,19.5], P:[13,20], K:[16.6,15.4], F:[19.4,20.8], E:[9.6,20.4], W:[9,16.2] }, B:{ H:[4.2,18.8], N:[6.5,19.5], P:[13,20], K:[16.6,15.4], F:[19.4,20.8], E:[8.4,15.4], W:[8.2,11] } },
  ecarte_sol:      { base:"bench", env:"M1.5 21h21", A:{ H:[4.2,18.8], N:[6.5,19.5], P:[13,20], K:[16.6,15.4], F:[19.4,20.8], E:[9.8,19.6], W:[12.6,20.2] }, B:{ H:[4.2,18.8], N:[6.5,19.5], P:[13,20], K:[16.6,15.4], F:[19.4,20.8], E:[7.8,15.2], W:[7.4,11.4] } },
  ecarte_couche:   { base:"bench", A:{ E:[11,15.6], W:[13.6,16.4] }, B:{ E:[8.8,10.6], W:[8.4,6.6] } },
  pullover_haltere:{ base:"bench", A:{ E:[3.4,12.2], W:[1,14.6] }, B:{ E:[7.8,10.4], W:[8.4,6.6] } },
  extension_triceps_allonge:{ base:"bench", A:{ E:[8,9], W:[5.2,11.6] }, B:{ E:[8,9], W:[7.8,4.2] } },
  barre_front:     { base:"bench", A:{ E:[8,9], W:[5.2,11.6] }, B:{ E:[8,9], W:[7.8,4.2] } },
  // --- debout : élévations, tirages et presses à l'élastique ---
  elevations_frontales:{ base:"curl", A:{ E:[12.4,10], W:[12.6,13.2] }, B:{ E:[15.4,7.6], W:[18.8,7.4] } },
  oiseau_haltere:  { base:"row", A:{ E:[8,13.4], W:[8,16.6] }, B:{ E:[10.6,8], W:[10.2,5] } },
  face_pull_elastique:{ base:"curl", env:"M21.8 6.2v3.2", A:{ E:[15.6,8], W:[19,8] }, B:{ E:[9.6,7.4], W:[13.2,5.6] } },
  pallof_press:    { base:"curl", env:"M21.8 8v3", dur:3, A:{ E:[13.6,11], W:[14.6,9.6] }, B:{ E:[16,9.4], W:[19.6,9.4] } },
  extension_triceps_elastique:{ base:"curl", env:"M14.6 1.5v3", A:{ E:[12.6,10.2], W:[15.2,9.2] }, B:{ E:[12.6,10.2], W:[12.9,13.6] } },
  tirage_vertical_elastique:{ base:"hang", env:"M12 1.2v1.6", A:{ H:[12,5.8], N:[12,8.6], P:[12.4,14.2], K:[12.6,20.4], F:[17.4,20.8], E:[9.8,5], W:[9.2,1.8], E2:[14.2,5], W2:[14.8,1.8] }, B:{ H:[12,5.8], N:[12,8.6], P:[12.4,14.2], K:[12.6,20.4], F:[17.4,20.8], E:[9,9.6], W:[9.2,6.6], E2:[15,9.6], W2:[14.8,6.6] } },
  thruster_haltere:{ base:"overhead", dur:2, A:{ H:[13.4,8.8], N:[12.9,11.4], P:[8.8,15.4], K:[13.8,15.9], F:[12,20.8], K2:[13.8,15.9], F2:[12,20.8], E:[14.6,12.8], W:[14,10.4], E2:[14.6,12.8], W2:[14,10.4] } },
  woodchopper_haltere:{ base:"overhead", A:{ H:[11.6,5.4], N:[11.8,8.2], P:[12,13.2], K:[10.2,16.8], F:[9.6,20.8], K2:[13.8,16.8], F2:[14.4,20.8], E:[9.4,12.4], W:[7.6,15.4], E2:[10,12.4], W2:[7.6,15.4] }, B:{ H:[12.2,4.2], N:[12,7], P:[12,12.6], K:[10.8,16.8], F:[9.6,20.8], K2:[13.4,16.8], F2:[14.4,20.8], E:[14.6,5], W:[16.8,2.4], E2:[14.2,5.4], W2:[16.8,2.4] } },
  halo_kb:         { base:"overhead", A:{ E:[9.6,7.2], W:[8.8,4.4], E2:[10.8,7.8], W2:[8.8,4.4] }, B:{ E:[14.4,7.2], W:[15.2,4.4], E2:[13.2,7.8], W2:[15.2,4.4] } },
  // --- soulevés depuis le sol, haussements ---
  deadlift_barre:  { base:"hinge", B:{ H:[16.8,11], N:[15,11.8], P:[9.8,13.4], K:[13.4,16.2], F:[11.8,20.8], E:[15.2,14.8], W:[15,18.2] } },
  deadlift_kb:     { base:"hinge", B:{ H:[16.8,11], N:[15,11.8], P:[9.8,13.4], K:[13.4,16.2], F:[11.8,20.8], E:[15.2,14.8], W:[15,18.2] } },
  good_morning_barre:{ base:"hinge", A:{ E:[13.8,8.4], W:[12.8,6.8] }, B:{ E:[18,12.4], W:[16.8,10.6] } },
  shrugs_halteres: { base:"carry", A:{ ...STAND, E:[12.3,10], W:[12.4,13.2] }, B:{ H:[12,4.2], N:[12,6.1], P:[12,12.6], K:[12.2,16.8], F:[12,20.8], E:[12.3,9.1], W:[12.4,12.3] } },
  shrugs_barre:    { base:"carry", A:{ ...STAND, E:[12.3,10], W:[12.4,13.2] }, B:{ H:[12,4.2], N:[12,6.1], P:[12,12.6], K:[12.2,16.8], F:[12,20.8], E:[12.3,9.1], W:[12.4,12.3] } },
  mollets_assis_haltere:{ base:"calf", env:"M5.6 14.4h7M6.4 14.4V21M11.8 14.4V21", A:{ H:[10.4,5.4], N:[10.6,8.2], P:[11,14.2], K:[16,14.2], F:[16,20.8], E:[13.6,12.8], W:[15.4,13.6] }, B:{ H:[10.4,5.4], N:[10.6,8.2], P:[11,14.2], K:[16,13.2], F:[16.3,20], E:[13.6,11.8], W:[15.4,12.6] } },
  // --- gainage dynamique ---
  roue_abdo_genoux:{ base:"plank", dur:3, A:{ H:[6.4,12.8], N:[8.6,13.6], P:[14.2,14.4], K:[15.6,20.4], F:[19.4,20.8], E:[8.4,17], W:[8.4,19.6] }, B:{ H:[3.8,16.4], N:[6,17], P:[12.6,18.2], K:[15.6,20.4], F:[19.4,20.8], E:[3.2,18.4], W:[2,19.6] } },
  roue_abdo_debout:{ base:"plank", dur:3.2, A:{ H:[8.4,16], N:[9.4,14.2], P:[13.6,9.8], K:[16.6,15.2], F:[19.4,20.8], E:[9,17.4], W:[8.8,19.6] }, B:{ H:[3,17.8], N:[5.2,17.8], P:[13.2,18.6], K:[16.4,19.6], F:[19.4,20.8], E:[2.6,19], W:[1.2,19.6] } },
  fallout_sangles: { base:"plank", dur:3, A:{ H:[9.8,5.4], N:[10.6,8], P:[12.8,13.2], K:[14.4,17], F:[15.8,20.8], E:[13.4,9.6], W:[14.6,11.4] }, B:{ H:[6.2,9.4], N:[8,11.2], P:[12.4,15.4], K:[14.2,18], F:[15.8,20.8], E:[5,8.6], W:[2.6,7.2] } },
  marche_ours:     { base:"plank", dur:1.6, A:{ H:[4.6,12.4], N:[6.8,13.4], P:[14.4,12.6], K:[15.4,17.6], F:[19,20.8], E:[6.8,17], W:[6.8,20.6] }, B:{ H:[4.2,12.4], N:[6.4,13.4], P:[14,12.6], K:[12.6,17.4], F:[16.2,20.8], K2:[15.4,17.6], F2:[19,20.8], E:[4.8,17], W:[4,20.6], E2:[6.8,17], W2:[6.8,20.6] } },
  ytw_sol:         { base:"plank", A:{ ...LIE, H:[3.8,19.4], E:[2.6,20.2], W:[0.6,20.2] }, B:{ ...LIE, H:[3.8,18.8], N:[6.2,19.6], E:[3,17.6], W:[1,16.4] } },
  // --- étirements : mouvement lent vers la position, puis maintien ---
  etir_ischios:    { base:"hinge", dur:5, A:{ ...STAND, E:[12.2,10], W:[12.3,13.2] }, B:{ H:[15.6,13.8], N:[14.8,11.8], P:[10.4,12.4], K:[11.4,16.8], F:[11.8,20.8], E:[14.2,15.4], W:[13.2,18.8] } },
  etir_quadriceps: { base:"curl", dur:5, A:{ ...STAND, K2:[12.4,16.6], F2:[10.6,19.2], E:[13.6,9.8], W:[15.4,11.4], E2:[11.4,10], W2:[10.8,13] }, B:{ ...STAND, K2:[12.4,16.8], F2:[9.6,12.8], E:[13.6,9.8], W:[15.4,11.4], E2:[10.6,10.4], W2:[9.8,12.8] } },
  etir_fessiers:   { base:"crunch", dur:5, A:{ ...LIE, K:[15.2,15.6], F:[18.6,20.6], K2:[17.4,16.8], F2:[15.4,15.2], E:[7,20.4], W:[9.6,20.6] }, B:{ ...LIE, K:[13.8,14.6], F:[17.4,17.8], K2:[16,15.6], F2:[14,14], E:[9.4,17.6], W:[12.6,15.6] } },
  etir_mollets:    { base:"calf", env:"M20.6 2v19", dur:5, A:{ H:[16.2,4.8], N:[15.6,7.4], P:[12.8,12.6], K:[14.6,16.6], F:[15.2,20.8], K2:[10.8,16.8], F2:[8.4,20.8], E:[18,8.4], W:[20.4,8.6] }, B:{ H:[17,5.6], N:[16.4,8.2], P:[13.4,13], K:[15.8,16.4], F:[15.2,20.8], K2:[11.2,17], F2:[8.4,20.8], E:[18.4,9.4], W:[20.4,9.2] } },
  etir_pectoraux:  { base:"curl", env:"M17.4 1.5V21", dur:5, A:{ ...STAND, E:[14.6,7.4], W:[17.2,5.4] }, B:{ H:[11,4.6], N:[11.2,7.4], P:[11.8,12.8], K:[12.2,16.8], F:[12,20.8], E:[14.2,8], W:[17.2,5.4] } },
  etir_enfant:     { base:"plank", dur:5, A:{ H:[13,9], N:[13.2,11.8], P:[14.6,17.8], K:[10.4,20.4], F:[15.8,20.6], E:[11.4,14.6], W:[10.6,17.4] }, B:{ H:[6.8,18.6], N:[9.2,17.6], P:[15,18.2], K:[10.4,20.4], F:[15.8,20.6], E:[5.2,19.2], W:[2.2,20.2] } },
  etir_epaules:    { base:"curl", dur:4.6, A:{ ...STAND, E:[13.4,10], W:[13.6,13.2], E2:[10.6,10], W2:[10.4,13.2] }, B:{ ...STAND, E:[9.6,8.6], W:[6.8,8.6], E2:[13.2,10.4], W2:[10.6,8.6] } },
  etir_triceps:    { base:"curl", dur:4.6, A:{ ...STAND, E:[13.8,5.6], W:[15.4,3], E2:[10.6,10], W2:[10.4,13.2] }, B:{ ...STAND, E:[13.2,2.6], W:[11.6,7.2], E2:[10.2,5], W2:[12.4,2.8] } },
  etir_avantbras:  { base:"curl", dur:4, A:{ ...STAND, E:[15.2,8.8], W:[18.6,8.8], E2:[13.6,11], W2:[17.6,9.8] }, B:{ ...STAND, E:[15.2,8.8], W:[18.6,8.8], E2:[13.8,11.4], W2:[18.4,11] } },
  etir_psoas:      { base:"lunge", dur:5, A:{ H:[11,5.6], N:[11,8.4], P:[11.2,14], K:[15.4,14.6], F:[15.6,20.8], K2:[8.8,20.4], F2:[4.6,20.6], E:[11.6,11.4], W:[12.4,14.4] }, B:{ H:[11.8,6.8], N:[11.8,9.6], P:[12.4,15.4], K:[16.2,15], F:[15.6,20.8], K2:[9.6,20.4], F2:[5.2,20.6], E:[12.6,12.6], W:[13.4,15.6] } },
  etir_cobra:      { base:"plank", dur:4.6, A:{ ...LIE, H:[4,19.4], E:[7.4,17.6], W:[6.6,20.6] }, B:{ H:[4.6,13.4], N:[6.4,15.4], P:[13,20], K:[17,20.3], F:[21,20.4], E:[6.9,17.8], W:[6.6,20.6] } },
  etir_chat_vache: { base:"plank", dur:4, A:{ H:[4.2,11.4], N:[6.8,13.8], P:[14.4,14], K:[14.4,20.4], F:[18.8,20.8], E:[6.8,17], W:[6.8,20.6] }, B:{ H:[5.6,16.2], N:[6.8,13], P:[14.4,13.2], K:[14.4,20.4], F:[18.8,20.8], E:[6.8,17], W:[6.8,20.6] } },
  // --- tirage ---
  rowing_uni_haltere:{ base:"row", env:"M3.5 15.4h6.5M4.5 15.4V21M9 15.4V21", A:{ E2:[6.6,12.6], W2:[6.4,15.4] }, B:{ E2:[6.6,12.6], W2:[6.4,15.4] } },
  rowing_table:    { base:"row", env:"M1.5 8.6h16.5M2.4 8.6V21M17.2 8.6V21", A:{ H:[4.4,13], N:[6.4,13.8], P:[13.6,17.6], K:[17.4,19.2], F:[21,20.6], E:[5.8,11.2], W:[5.4,8.8] }, B:{ H:[4.4,11], N:[6.6,11.2], P:[13.8,16], K:[17.4,18.4], F:[21,20.6], E:[9.4,10.6], W:[5.4,8.8] } },
  releve_genoux_suspendu:{ base:"hang", B:{ H:[12,7], N:[12,9.6], P:[12,15.2], K:[15.4,12.4], F:[18,16.2], E:[9.4,6.2], W:[8.6,2.6], E2:[14.6,6.2], W2:[15.4,2.6] } },
  releve_jambes_suspendu:{ base:"hang", B:{ H:[12,7], N:[12,9.6], P:[12,15.2], K:[16.6,14.2], F:[21.2,13.4], E:[9.4,6.2], W:[8.6,2.6], E2:[14.6,6.2], W2:[15.4,2.6] } },
  suspension_barre:{ base:"hang", dur:3.6, B:{ H:[12,6.6], N:[12,9.2], P:[12,14.8], K:[11.4,18], F:[12,21.2], E:[9.2,5.8], W:[8.6,2.6], E2:[14.8,5.8], W2:[15.4,2.6] } },
  tractions_scapulaires:{ base:"hang", B:{ H:[12,5.8], N:[12,8.4], P:[12,14], K:[11.4,17.2], F:[12,20.4], E:[9,5.6], W:[8.6,2.6], E2:[15,5.6], W2:[15.4,2.6] } },
  tractions_negatives:{ base:"hang", dur:4.2 },
  // --- bras ---
  curl_marteau:    { base:"curl", grip:"v" },
  curl_concentre:  { base:"curl", env:"M8 15.6h8M9 15.6V21M15 15.6V21", A:{ H:[9.4,6.4], N:[10,9], P:[11,15.2], K:[15.6,15.6], F:[16,20.8], E:[14.4,14.2], W:[14.6,17.6] }, B:{ H:[9.4,6.4], N:[10,9], P:[11,15.2], K:[15.6,15.6], F:[16,20.8], E:[14.4,14.2], W:[12.8,10.8] } },
  kickback_triceps:{ base:"row", A:{ E:[11.2,11.2], W:[10.8,15] }, B:{ E:[11.2,11.2], W:[15,10.4] } },
  dips_chaise:     { base:"dips", env:ENV_CHAIR_BACK, A:{ H:[11.2,4.4], N:[11.4,7.2], P:[11.4,12.6], K:[6.4,12.8], F:[4.4,20.8], E:[13,9.6], W:[13.6,12.4] }, B:{ H:[11.4,8], N:[11.6,10.8], P:[11.6,16.2], K:[6.4,15.2], F:[4.4,20.8], E:[15.8,9.8], W:[13.6,12.4] } },
  dips_banc:       { base:"dips", env:"M13 12.4h7M13.8 12.4V21M19.4 12.4V21", A:{ H:[11.2,4.4], N:[11.4,7.2], P:[11.4,12.6], K:[6.4,12.8], F:[4.4,20.8], E:[13,9.6], W:[13.6,12.4] }, B:{ H:[11.4,8], N:[11.6,10.8], P:[11.6,16.2], K:[6.4,15.2], F:[4.4,20.8], E:[15.8,9.8], W:[13.6,12.4] } },
  l_sit:           { base:"dips", dur:3.6, B:{ H:[12,3.8], N:[12,6.6], P:[12,12.2], K:[8.2,12.4], F:[4.6,12.6], E:[12.6,9.2], W:[12.9,11.8] } },
  releve_genoux_barres:{ base:"dips", B:{ K:[9.2,11.4], F:[8.4,15.4] } },
  // --- cardio ---
  burpees:         { base:"cardio", dur:1.8, A:{ H:[12,2.6], N:[12,5.4], P:[12,11], K:[12,15.1], F:[12,19.2], K2:[12,15.1], F2:[12,19.2], E:[9.4,3.6], W:[8.2,1.2], E2:[14.6,3.6], W2:[15.8,1.2] }, B:{ H:[4.8,11.2], N:[6.9,12.5], P:[13.6,15.6], K:[17.1,17.8], F:[20.6,20], K2:[17.1,17.8], F2:[20.6,20], E:[7.1,16.4], W:[7.3,20.6], E2:[7.1,16.4], W2:[7.3,20.6] } },
  montees_genoux:  { base:"cardio", dur:.9, A:{ ...STAND, K:[14.8,12.8], F:[14,17], K2:[12,16.8], F2:[12,20.8], E:[13.8,9.6], W:[15.2,7.6], E2:[10.4,10], W2:[9.6,12.6] }, B:{ ...STAND, K:[12,16.8], F:[12,20.8], K2:[14.8,12.8], F2:[14,17], E:[10.4,10], W:[9.6,12.6], E2:[13.8,9.6], W2:[15.2,7.6] } },
  corde_a_sauter:  { base:"cardio", dur:.7, A:{ ...STAND, K2:[12,16.8], F2:[12,20.8], E:[10.2,10.4], W:[8.8,13.2], E2:[13.8,10.4], W2:[15.2,13.2] }, B:{ H:[12,2.8], N:[12,5.6], P:[12,11.2], K:[12.2,15.4], F:[12.4,19.2], K2:[12.2,15.4], F2:[12.4,19.2], E:[10.2,9], W:[8.8,11.8], E2:[13.8,9], W2:[15.2,11.8] } },
};
// muscle principal surligné sur le segment qui travaille (bras pour les triceps, cuisse pour les quadriceps…)
const FOCUS_SEG = { pect:["N","P",0,.38], dos:["N","P",.05,.7], abdos:["N","P",.4,1], epaules:["N","E",0,.55], triceps:["N","E",.1,1], biceps:["N","E",.1,1], avantbras:["E","W",0,1], quadriceps:["P","K",0,1], ischios:["P","K",0,1], fessiers:["P","K",0,.45], mollets:["K","F",0,.8] };
function animPose(def){
  const v = ANIM_VARIANT[def.id], base = ANIM_POSES[(v && v.base) || pictoKey(def)] || ANIM_POSES.squat;
  if(!v) return base;
  const A = { ...base.A, ...(v.A||{}) };
  // une variante qui ne décrit que le départ garde la fin de la pose de base, et inversement
  const B = { ...base.B, ...(v.B||{}) };
  return { env:[base.env||FLOOR, v.env].filter(Boolean).join(""), A, B, dur:v.dur, grip:v.grip };
}
function animPath(p){
  const q = k=>(p[k]||p[k.replace("2","")]).map(v=>v.toFixed(2)).join(" ");
  return `M${q("N")}L${q("P")}M${q("P")}L${q("K")}L${q("F")}M${q("P")}L${q("K2")}L${q("F2")}M${q("N")}L${q("E")}L${q("W")}M${q("N")}L${q("E2")}L${q("W2")}`;
}
function focusPath(p, seg){
  const a = p[seg[0]], b = p[seg[1]], at = t=>[(a[0]+(b[0]-a[0])*t).toFixed(2), (a[1]+(b[1]-a[1])*t).toFixed(2)].join(" ");
  return `M${at(seg[2])}L${at(seg[3])}`;
}
// charge tenue : disque aux mains pour les exercices chargés (pas les élastiques)
function exoAnimSVG(def){
  const pose = animPose(def);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lt = typeof loadableTypeOf==="function" ? loadableTypeOf(def) : null, w = lt && lt!=="bands" ? (lt==="barbell" ? 1.9 : 1.3) : 0;
  const A = pose.A, B = pose.B, dur = (pose.dur || (isTimed(def) ? 3.6 : 2.4)) + "s";
  const spl = `calcMode="spline" keyTimes="0;.45;1" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${dur}" repeatCount="indefinite"`;
  const anim = (attr, a, b)=> reduce ? "" : `<animate attributeName="${attr}" values="${a};${b};${a}" ${spl}/>`;
  const pt = (P, k)=>P[k]||P[k.replace("2","")];
  const dot = (k, r, cls)=>{ const a = pt(A,k), b = pt(B,k);
    return `<circle class="${cls}" cx="${a[0]}" cy="${a[1]}" r="${r}">${anim("cx", a[0], b[0])}${anim("cy", a[1], b[1])}</circle>`; };
  // prise marteau : charge verticale (ellipse) au lieu d'un disque
  const load = k=> pose.grip==="v" ? (()=>{ const a = pt(A,k), b = pt(B,k);
    return `<ellipse class="ea-load" cx="${a[0]}" cy="${a[1]}" rx="${(w*.55).toFixed(2)}" ry="${(w*1.25).toFixed(2)}">${anim("cx", a[0], b[0])}${anim("cy", a[1], b[1])}</ellipse>`; })() : dot(k, w, "ea-load");
  const two = A.W2 || B.W2;
  const seg = FOCUS_SEG[def.muscles[0]];
  const focus = seg ? `<path class="ea-focus" d="${focusPath(A, seg)}">${anim("d", focusPath(A, seg), focusPath(B, seg))}</path>` : "";
  return `<svg class="exo-anim" viewBox="0 0 24 24" aria-label="Animation du mouvement">
    <path class="ea-env" d="${pose.env||FLOOR}"/>
    <path class="ea-body" d="${animPath(A)}">${anim("d", animPath(A), animPath(B))}</path>
    ${focus}
    ${dot("H", 2.15, "ea-head")}
    ${w ? load("W") + (two ? load("W2") : "") : ""}
  </svg>`;
}
