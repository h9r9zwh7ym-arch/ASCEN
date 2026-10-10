// ================= ASCENSION : le carnet de route =================
// Chaque camp atteint donne une carte postale : le terrain où il est posé, une ligne de carnet, et pour les
// lieux réels (refuges, cols) et les sommets, une anecdote vraie. Terrains et noms suivent la vraie voie de
// chaque montagne (Pierre Ronde et l'arête des Bosses au Mont Blanc, la Pyramide noire au K2, les ressauts
// de l'Everest…) ; les lignes génériques restent vraies partout où elles tombent.

// terrains : libellés (à tour de rôle), lignes du carnet (à tour de rôle), f : ligne du premier camp quand on
// entre dans ce terrain depuis un autre, art : le dessin de la carte
const ASC_TERRAIN = {
  pre:{ art:"pre", l:["Alpage", "Pâturage", "Prairie", "Lisière", "Chalet d'alpage"], q:[
    "Les cloches des vaches résonnent dans la combe.", "Une marmotte siffle et file dans son terrier.", "La forêt s'arrête ici : le ciel s'ouvre.",
    "Un chalet d'alpage, et l'odeur du foin coupé.", "Gentianes et edelweiss bordent le sentier.", "Une fontaine d'eau fraîche : on remplit la gourde.",
    "Les premiers rayons chauffent l'herbe encore humide."] },
  roc:{ art:"roc", f:"Plus un arbre : la roche prend le relais.", l:["Pierrier", "Éboulis", "Combe", "Ressaut", "Vire", "Couloir"], q:[
    "Les chamois t'observent depuis la crête.", "Le sentier se faufile entre les blocs.", "Un bouquetin immobile te regarde passer.",
    "Les cailloux roulent sous tes pas.", "Les choucas tournoient, à l'affût d'une miette.", "Une main sur le rocher, et on se hisse.",
    "Un cairn indique le chemin.", "Le rocher chauffé par le soleil sent la pierre à feu.", "Une chute de pierres, loin sur la droite."] },
  mor:{ art:"mor", f:"Crampons aux pieds : le glacier commence.", l:["Moraine", "Glacier", "Rive du glacier"], q:[
    "Un lac turquoise dort au pied de la moraine.", "La glace craque doucement sous le soleil.", "Un torrent gronde sous la glace.",
    "On s'encorde : les crevasses guettent.", "Des blocs posés là par le glacier, il y a très longtemps."] },
  nev:{ art:"nev", l:["Névé", "Séracs", "Plateau glaciaire", "Rimaye", "Pente de neige"], q:[
    "Des séracs bleus, gros comme des maisons.", "L'air se fait rare : chaque pas compte.", "La neige crisse dans le froid du matin.",
    "Un grand pas pour franchir la rimaye.", "Le silence, seulement troublé par le vent.", "La neige éblouit : lunettes obligatoires.",
    "La trace monte en lacets réguliers.", "Un pont de neige, franchi sans un bruit."] },
  are:{ art:"are", l:["Arête", "Épaule", "Crête", "Antécime", "Gendarme", "Brèche"], q:[
    "Le vide des deux côtés : un pas après l'autre.", "La vue porte jusqu'à l'horizon.", "Le sommet paraît tout proche.",
    "Le vent siffle sur l'arête.", "Une mer de nuages s'étend sous tes pieds.", "Les premières lueurs dorent les sommets voisins.",
    "Les autres sommets passent un à un sous toi.", "Une prise solide, un pas, une autre prise.", "La lumière rasante sculpte chaque rocher.",
    "Tout paraît plus petit, sauf le ciel."] },
  // Kilimandjaro : désert alpin, pentes de cendres, bord du cratère
  des:{ art:"des", l:["Désert alpin", "Coulée de lave", "Plateau de lave", "Pierrier volcanique"], q:[
    "Plus rien ne pousse : roche et poussière volcanique.", "Le Mawenzi dresse ses aiguilles à l'est.", "Nuits glaciales, journées brûlantes.",
    "« Pole pole » : doucement, comme disent les guides.", "Les nuages restent sous toi, comme une mer.", "Les derniers séneçons géants, plantes d'un autre monde.",
    "Un corbeau à nuque blanche te suit des yeux.", "Le sommet du Kibo, enneigé, paraît tout proche."] },
  cen:{ art:"cen", l:["Pente de cendres", "Lacets", "Pierrier"], q:[
    "Deux pas en avant, un en arrière dans la cendre.", "Les frontales des autres cordées scintillent plus bas.", "Les glaciers du Kibo brillent au-dessus.",
    "Le froid mord : les mains restent dans les poches.", "La frontale éclaire trois mètres de cendre, pas plus.",
    "Les lacets n'en finissent pas : on compte les pas.", "L'aube approche à l'est, derrière le Mawenzi."] },
  crat:{ art:"are", l:["Bord du cratère"], q:["Le cratère du Kibo s'ouvre devant toi.", "Des murs de glace, derniers vestiges des glaciers du Kibo."] },
  // Aconcagua : pierriers, pénitents, vent
  apie:{ art:"des", l:["Pierrier", "Lacets", "Plateau", "Moraine"], q:[
    "Un condor plane au-dessus de la vallée.", "Le vent soulève la poussière du pierrier.", "Les mules sont restées en bas, à Plaza de Mulas.",
    "La cordillère s'étend à perte de vue."] },
  apen:{ art:"nev", l:["Pénitents", "Pente de neige", "Plateau", "Col"], q:[
    "Des pénitents de neige, hauts comme toi.", "Le « viento blanco » se lève l'après-midi.", "L'eau, ici, se gagne en faisant fondre la neige.",
    "Le froid sec craquelle les lèvres.", "Les tentes claquent sous les rafales.", "Des pierres posées sur la tente la tiennent face au vent.",
    "On boit, on boit encore : l'altitude assèche."] },
  // Himalaya, Karakoram
  hmor:{ art:"mor", l:["Moraine", "Glacier"], q:[
    "Le glacier craque et gémit sous les tentes.", "Des pénitents de glace bordent la moraine.", "Les cairns jalonnent la moraine.",
    "Le soleil brûle, le froid mord à l'ombre.", "Une avalanche gronde au loin, sans danger.", "La moraine s'étire, grise et sans fin.",
    "Un torrent de fonte court sous les pierres.", "Des sommets de 7 000 m bordent la vallée."] },
  hpen:{ art:"nev", l:["Cordes fixes", "Pente de glace", "Éperon"], q:[
    "Les cordes fixes claquent dans le vent.", "Le jumar mord la corde, pas après pas.", "Les tentes s'accrochent à un replat taillé dans la glace.",
    "L'aube rosit les sommets voisins.", "Respirer, avancer, respirer.", "Un piolet planté, une longe, une pause.",
    "La glace bleue sonne sous les crampons.", "Le camp suivant n'est qu'un point coloré, là-haut.", "Un thé brûlant, fait avec la neige fondue."] },
  hhaut:{ art:"are", l:["Arête", "Pente de neige"], q:[
    "Le jet-stream hurle sur la crête.", "Chaque pas demande trois respirations.", "La courbure de la Terre se devine à l'horizon.",
    "Le ciel vire au bleu nuit, même en plein jour.", "Les nuages sont loin, très loin dessous.", "Le soleil brûle, l'ombre gèle.",
    "Les sommets de 7 000 m sont maintenant à ta hauteur.", "La nuit, le vent secoue la tente sans relâche."] },
  hmort:{ art:"high", l:["Pente sommitale"], q:[
    "Au-delà de 8 000 m, la zone de la mort : on ne s'attarde pas.", "L'oxygène siffle dans le masque.",
    "Plus haut que presque tous les sommets du monde.", "Le temps compte : redescendre avant la mi-journée.", "Le ciel est presque noir au-dessus de toi.",
    "Les étoiles brillent encore quand on se met en route.", "Chaque pas se décide.", "Les géants alentour ne sont plus que des collines."] },
};
// le terrain de chaque montagne, de bas en haut : [jusqu'à l'altitude (m), terrain, libellés propres à cette voie]
const ASC_ZONES = {
  moleson:[[1700, "pre"], [1870, "roc"], [9e3, "are"]],
  pilatus:[[1700, "pre"], [2000, "roc"], [9e3, "are"]],
  titlis:[[2480, "roc"], [2850, "mor"], [3150, "nev"], [9e3, "are"]],
  eiger:[[3200, "roc", ["Flanc ouest", "Dalles", "Pierrier", "Vire"]], [3650, "nev", ["Névé", "Pente de neige"]], [9e3, "are", ["Arête", "Crête"]]],
  monch:[[2300, "pre"], [2800, "roc"], [3300, "mor"], [3850, "nev"], [9e3, "are"]],
  jungfrau:[[3150, "mor"], [3850, "nev"], [9e3, "are"]],
  dentblanche:[[3700, "nev"], [9e3, "are", ["Arête sud", "Gendarme", "Brèche"]]],
  cervin:[[3280, "roc", ["Moraine", "Pierrier", "Sentier du Hörnli"]], [4150, "are", ["Arête du Hörnli"]], [4300, "are", ["Épaule"]], [9e3, "are", ["Cordes fixes", "Arête sommitale"]]],
  montblanc:[[3100, "roc", ["Désert de Pierre Ronde", "Pierrier", "Moraine"]], [3300, "roc", ["Grand Couloir"]], [3830, "roc", ["Aiguille du Goûter", "Arête rocheuse"]],
    [4340, "nev", ["Pente de neige", "Névé", "Combe"]], [9e3, "are", ["Arête des Bosses"]]],
  kilimanjaro:[[5000, "des"], [5700, "cen"], [9e3, "crat"]],
  aconcagua:[[5450, "apie"], [6300, "apen"], [6560, "are", ["Portezuelo del Viento"]], [6680, "are", ["Gran Travesía"]], [9e3, "are", ["Filo del Guanaco"]]],
  k2:[[5400, "hmor", ["Glacier Godwin-Austen", "Moraine"]], [6580, "hpen", ["Éperon des Abruzzes", "Cordes fixes", "Pente de glace"]], [6690, "hpen", ["Cheminée House"]],
    [7250, "hhaut", ["Pyramide noire"]], [7700, "hhaut", ["Pente de neige", "Arête"]], [8000, "hmort", ["Épaule"]], [8250, "hmort", ["Goulet"]],
    [8450, "hmort", ["Traversée du sérac"]], [9e3, "hmort"]],
  everest:[[5780, "hmor", ["Glacier de Rongbuk Est", "Moraine"]], [6390, "hmor", ["Pénitents", "Moraine médiane"]], [7010, "hpen", ["Mur du col Nord", "Cordes fixes"]],
    [7800, "hhaut", ["Arête nord", "Pente de neige"]], [8300, "hmort", ["Dalles", "Arête nord"]], [8430, "hmort", ["Bande jaune"]], [8540, "hmort", ["Premier ressaut"]],
    [8650, "hmort", ["Deuxième ressaut"]], [9e3, "hmort", ["Troisième ressaut"]]],
};
// lignes propres à une montagne : posées sur le camp générique le plus proche de l'altitude donnée
const ASC_LINES = {
  moleson:[[1630, "Le lac de la Gruyère brille en contrebas."]],
  pilatus:[[1586, "Le lac des Quatre-Cantons scintille en contrebas."]],
  eiger:[[2608, "Le train de la Jungfrau passe sous tes pieds, dans la montagne."], [3116, "La face nord plonge juste à côté : 1 800 m de vide."]],
  monch:[[2203, "L'Eiger, le Mönch et la Jungfrau, alignés au-dessus de toi."]],
  jungfrau:[[4094, "De l'autre côté, le glacier d'Aletsch, le plus grand des Alpes, file vers le sud."]],
  dentblanche:[[4294, "Le Cervin, tout proche, te fait face."]],
  cervin:[[2838, "Le lac Noir brille en contrebas."], [3693, "Zermatt n'est plus qu'un point lumineux, tout en bas."]],
  montblanc:[[2506, "Le tramway du Mont-Blanc s'arrête au Nid d'Aigle, juste en dessous."], [3699, "Des câbles aident dans les rochers de l'Aiguille du Goûter."],
    [4026, "Chamonix dort, 3 000 m plus bas."], [4683, "La neige se resserre en une arête fine : le sommet est au bout."]],
  aconcagua:[[6509, "Le « col du vent » porte bien son nom."], [6842, "L'arête entre les deux sommets : le but est là."]],
  k2:[[5076, "Le Broad Peak se dresse juste en face."], [8181, "Le grand sérac surplombe le Goulet : on passe vite."]],
  everest:[[5264, "La face nord s'élève au fond de la vallée."], [8590, "Une échelle, posée par une expédition chinoise en 1975, aide à franchir ce mur."],
    [8701, "Plus qu'une pente de neige jusqu'au toit du monde."]],
};
// lieux réels : [ce que c'est, anecdote]
const ASC_PLACES = {
  "titlis/Stand":["Station du Stand", "D'ici part le Rotair, la première télécabine tournante du monde (1992)."],
  "titlis/Klein Titlis":["Station du Klein Titlis", "Le Titlis Cliff Walk, un pont suspendu à 500 m au-dessus du vide."],
  "monch/Guggihütte":["Cabane", "Une petite cabane perchée au-dessus du glacier du Guggi."],
  "jungfrau/Silberlücke":["Col", "La brèche entre le Silberhorn et la Jungfrau."],
  "dentblanche/Wandfluelücke":["Col", "D'ici part l'arête sud, la voie normale, hérissée de gendarmes."],
  "cervin/Hörnlihütte":["Cabane", "Au pied de l'arête du Hörnli, rénovée pour les 150 ans de la première ascension (2015)."],
  "cervin/Cabane Solvay":["Abri", "Un abri d'urgence accroché à l'arête, offert par l'industriel belge Ernest Solvay (1915)."],
  "montblanc/Tête Rousse":["Refuge", "Juste avant le Grand Couloir, qu'on traverse vite : les pierres y tombent souvent."],
  "montblanc/Refuge du Goûter":["Refuge", "Une capsule d'acier ovale, ouverte en 2013, posée au bord du vide."],
  "montblanc/Dôme du Goûter":["Dôme", "Un immense dôme de neige : le sommet apparaît enfin."],
  "montblanc/Abri Vallot":["Abri", "Un abri d'urgence ; Joseph Vallot fit bâtir son observatoire juste à côté, en 1890."],
  "kilimanjaro/Barafu":["Camp", "« Barafu » veut dire « glace » en swahili. On en part vers minuit pour le sommet."],
  "kilimanjaro/Stella Point":["Bord du cratère", "Le soleil se lève sur le cratère ; Uhuru Peak est à moins d'une heure."],
  "aconcagua/Nido de Cóndores":["Camp", "« Le nid des condors » : un replat face à la cordillère."],
  "aconcagua/Cólera":["Camp", "Le dernier camp, exposé au vent : on en part de nuit."],
  "aconcagua/Independencia":["Abri", "Une petite cabane de bois en ruine, à 6 380 m."],
  "aconcagua/Canaleta":["Couloir", "Le dernier couloir : un pierrier raide, le passage le plus dur de la voie."],
  "k2/Camp avancé":["Camp", "Au pied de l'éperon des Abruzzes, sur le glacier Godwin-Austen."],
  "k2/Camp 1":["Camp", "Perché sur l'éperon, au bout des premières cordes fixes."],
  "k2/Camp 2":["Camp", "Juste au-dessus de la cheminée House, gravie par Bill House en 1938."],
  "k2/Camp 3":["Camp", "Au-dessus de la Pyramide noire, la partie la plus raide de l'éperon."],
  "k2/Camp 4":["Camp", "Sur l'Épaule, à 7 800 m : au-dessus, le Goulet et son grand sérac."],
  "everest/Camp intermédiaire":["Camp", "Le long du glacier de Rongbuk Est, entre les pénitents de glace."],
  "everest/Camp de base avancé":["Camp", "À 6 400 m, au pied du mur du col Nord, sur la moraine."],
  "everest/Col Nord":["Col", "Le camp IV de Mallory et Irvine en 1924, accroché au col."],
  "everest/Camp 2":["Camp", "Des tentes calées sur les dalles de l'arête nord."],
  "everest/Camp 3":["Camp", "Le plus haut camp, à 8 300 m : on part pour le sommet vers minuit."],
};
// sommets : l'anecdote de la carte du sommet
const ASC_TOPS = {
  moleson:"Le belvédère de la Gruyère : par beau temps, la vue va du Jura aux Alpes et au Léman.",
  pilatus:"Le train à crémaillère le plus raide du monde y monte depuis 1889 : jusqu'à 48 % de pente.",
  titlis:"Gravi dès 1744 : l'un des tout premiers sommets glaciaires conquis dans les Alpes.",
  eiger:"Sa face nord, 1 800 m de paroi, n'a été gravie qu'en 1938.",
  monch:"Le « moine », entre l'Eiger et la Jungfrau ; gravi pour la première fois en 1857.",
  jungfrau:"Gravie en 1811 par les frères Meyer ; à ses pieds, la gare du Jungfraujoch, la plus haute d'Europe.",
  dentblanche:"Gravie en 1862 : l'un des 4 000 les plus exigeants de Suisse.",
  cervin:"Première ascension le 14 juillet 1865, par Edward Whymper et sa cordée.",
  montblanc:"Le toit des Alpes, gravi le 8 août 1786 par Jacques Balmat et Michel-Gabriel Paccard.",
  kilimanjaro:"Le toit de l'Afrique, la plus haute montagne isolée du monde ; gravie en 1889.",
  aconcagua:"Le toit des Amériques, gravi en 1897 par le guide suisse Matthias Zurbriggen.",
  k2:"La « montagne sauvage », gravie en 1954 par Lino Lacedelli et Achille Compagnoni.",
  everest:"Le toit du monde, gravi le 29 mai 1953 par Edmund Hillary et Tenzing Norgay.",
};
