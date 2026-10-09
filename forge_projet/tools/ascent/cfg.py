# Réglages des 13 vues validées (planche du 9 octobre) et données d'expédition pour la maquette
from render import SCENES
SCENES["eiger"] = dict(SCENES["trio"], name="Eiger", summit=(46.5775, 8.0053), sharpen=[])
SCENES["monch"] = dict(SCENES["trio"], name="Mönch", summit=(46.5586, 7.9975), sharpen=[])
SCENES["jungfrau"] = dict(SCENES["trio"], name="Jungfrau", summit=(46.5367, 7.9628))
SCENES["kilimanjaro"]["snow"] = 5450
FINE = {"cervin": (45.9763, 7.6586, 3.4), "dentblanche": (46.0342, 7.6119, 3.4), "eiger": (46.5586, 7.9900, 4.4), "monch": (46.5586, 7.9900, 4.4),
        "jungfrau": (46.5586, 7.9900, 4.4), "titlis": (46.7720, 8.4373, 2.9), "pilatus": (46.9787, 8.2550, 2.9), "moleson": (46.5486, 7.0172, 2.9)}
CAM = {"moleson": (20, 9, 1300, 13), "pilatus": (30, 10, 900, 16), "titlis": (345, 13, 3100, 15), "eiger": (320, 7, 2500, 28), "monch": (300, 6, 2600, 28),
       "jungfrau": (340, 8, 2600, 28), "dentblanche": (320, 12, 3300, 16), "cervin": (55, 8, 2700, 16), "montblanc": (300, 18, 2400, 26),
       "kilimanjaro": (190, 32, 2200, 14), "aconcagua": (160, 19, 4200, 16), "k2": (180, 15, 5600, 22), "everest": (337, 25, 5600, 18)}
# nom, altitude, région, départ de l'expédition (m), refuges connus (altitude, nom)
EXP = {
 "moleson": ("Moléson", 2002, "Gruyère", 1520, [(1520, "Plan-Francey")]),
 "pilatus": ("Pilatus", 2128, "Lucerne", 1416, [(1416, "Fräkmüntegg")]),
 "titlis": ("Titlis", 3238, "Engelberg", 1800, [(1800, "Trübsee"), (2428, "Stand"), (3028, "Klein Titlis")]),
 "eiger": ("Eiger", 3967, "Oberland bernois", 2320, [(2320, "Eigergletscher")]),
 "monch": ("Mönch", 4107, "Oberland bernois", 2320, [(2320, "Eigergletscher")]),
 "jungfrau": ("Jungfrau", 4158, "Oberland bernois", 2320, [(2320, "Eigergletscher"), (2791, "Guggihütte")]),
 "dentblanche": ("Dent Blanche", 4357, "Val d'Hérens", 1770, [(1770, "Ferpècle"), (2415, "Bricola"), (3507, "Cabane de la Dent Blanche")]),
 "cervin": ("Cervin", 4478, "Zermatt", 1608, [(1608, "Zermatt"), (2583, "Schwarzsee"), (3260, "Hörnlihütte"), (4003, "Cabane Solvay")]),
 "montblanc": ("Mont Blanc", 4806, "Pays du Mont-Blanc", 2372, [(2372, "Nid d'Aigle"), (3167, "Tête Rousse"), (3835, "Refuge du Goûter"), (4362, "Abri Vallot")]),
 "kilimanjaro": ("Kilimandjaro", 5895, "Tanzanie", 1800, [(4673, "Barafu"), (5756, "Stella Point")]),
 "aconcagua": ("Aconcagua", 6961, "Argentine", 2950, [(2950, "Horcones"), (4300, "Plaza de Mulas"), (5560, "Nido de Cóndores")]),
 "k2": ("K2", 8611, "Karakoram", 5000, [(5000, "Camp de base"), (6100, "Camp 1"), (6700, "Camp 2"), (7350, "Camp 3"), (7900, "Camp 4")]),
 "everest": ("Everest", 8849, "Tibet, face nord", 5150, [(5150, "Camp de base"), (6400, "Camp avancé"), (7020, "Col Nord"), (8300, "Camp 3")]),
}
