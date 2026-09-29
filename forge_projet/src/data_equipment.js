// ================= MATÉRIEL =================
// Catalogue du matériel reconnu par le moteur de suggestion. Chaque exercice de la
// bibliothèque référence un sous-ensemble de ces identifiants. `loadable` signifie que
// l'utilisateur peut renseigner les charges réellement possédées (utilisé pour la
// progression de charge). `always` signifie que l'équipement est toujours disponible
// (poids du corps) et n'a donc pas de case à cocher.
const EQUIP_TYPES = [
  { id:"bodyweight", n:"Poids du corps", always:true },
  { id:"dumbbells",  n:"Haltères", loadable:true, unit:"kg", hint:"Renseigne les paires que tu possèdes (ex. 8 kg, 12 kg)." },
  { id:"barbell",    n:"Barre + disques", loadable:true, unit:"kg", hint:"Poids total que tu peux charger (barre comprise)." },
  { id:"kettlebell", n:"Kettlebell", loadable:true, unit:"kg", hint:"Renseigne les kettlebells que tu possèdes." },
  { id:"bench",      n:"Banc plat", hint:"Banc de musculation à plat (ou banc solide)." },
  { id:"bench_incline", n:"Banc inclinable", hint:"Dossier réglable : développé et curl inclinés." },
  { id:"bench_press",n:"Banc de développé couché", hint:"Banc avec supports de barre : développé couché à la barre." },
  { id:"rack",       n:"Rack / supports de squat", hint:"Indispensable pour le squat à la barre en sécurité." },
  { id:"pullup_bar", n:"Barre de traction" },
  { id:"dip_bars",   n:"Barres parallèles (dips)" },
  { id:"suspension", n:"Sangles de suspension", hint:"Type TRX, fixées à une porte ou une barre." },
  { id:"ab_roller",  n:"Roue abdominale" },
  { id:"bands",      n:"Élastiques", loadable:true, unit:"niveau", hint:"Coche les résistances que tu possèdes." },
  { id:"jump_rope",  n:"Corde à sauter" },
  { id:"mat",        n:"Tapis de sol" },
];
// un équipement en implique d'autres (un banc de développé ou inclinable s'utilise aussi à plat)
const EQUIP_IMPLIES = { bench_press:["bench"], bench_incline:["bench"] };
// résistances d'élastiques : des niveaux, pas des kilos
const BAND_LEVELS = ["", "Très légère", "Légère", "Moyenne", "Forte", "Très forte"];
function bandLabel(v){ return BAND_LEVELS[Math.round(v)] || ("Niveau "+v); }
const EQUIP_MAP = {};
EQUIP_TYPES.forEach(e=>EQUIP_MAP[e.id]=e);

// Incréments de charge par défaut utilisés par le moteur de progression quand
// l'équipement n'a pas de liste de poids explicite (ex. barre non détaillée).
const DEFAULT_INCREMENT = { barbell:2.5, dumbbells:1, kettlebell:2, bands:1 };

function defaultEquipment(){
  return {
    owned:{ bodyweight:true, dumbbells:false, barbell:false, kettlebell:false, bench:false, bench_incline:false, bench_press:false, rack:false, pullup_bar:false, dip_bars:false, suspension:false, ab_roller:false, bands:false, jump_rope:false, mat:false },
    weights:{ dumbbells:[], barbell:[], kettlebell:[], bands:[2,3,4] }, // kg ; élastiques : niveaux de résistance 1 à 5
    custom:[] // [{id,n}] équipements libres, informatifs (extensibles au fil du temps)
  };
}

function ownsEquip(eq, id){
  if(id==="bodyweight" || eq.owned[id]) return true;
  return Object.keys(EQUIP_IMPLIES).some(k=>eq.owned[k] && EQUIP_IMPLIES[k].includes(id));
}
// chaque élément de la liste est requis ; « a|b » = l'un ou l'autre suffit
function hasEquip(eq, list){
  if(!list || !list.length) return true;
  return list.every(id=>id.split("|").some(x=>ownsEquip(eq, x)));
}

// Catégories d'affichage des exercices : l'équipement principal qui les caractérise
// (le banc est un accessoire, il ne crée pas de catégorie).
const EXO_CATS = [
  { id:"bodyweight", n:"Poids du corps" },
  { id:"dumbbells",  n:"Haltères" },
  { id:"barbell",    n:"Barre & disques" },
  { id:"kettlebell", n:"Kettlebell" },
  { id:"bands",      n:"Élastiques" },
  { id:"pullup_bar", n:"Barre de traction" },
  { id:"dip_bars",   n:"Barres parallèles" },
  { id:"suspension", n:"Sangles de suspension" },
  { id:"ab_roller",  n:"Roue abdominale" },
  { id:"jump_rope",  n:"Corde à sauter" },
  { id:"stretch",    n:"Étirements" },
];
const EXO_CAT_ORDER = ["dumbbells","barbell","kettlebell","bands","pullup_bar","dip_bars","suspension","ab_roller","jump_rope"];
function exoCategory(e){
  if(e._cat) return e._cat;   // ne dépend que de la fiche : calculé une fois
  let c = "bodyweight";
  if(e.pattern==="stretch") c = "stretch";
  else for(const k of EXO_CAT_ORDER) if(e.equip.includes(k)){ c = k; break; }
  return (e._cat = c);
}
