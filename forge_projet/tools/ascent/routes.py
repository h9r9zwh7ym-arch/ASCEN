# Vraies voies d'ascension : sentiers OpenStreetMap (et arêtes suivies sur le relief quand la voie n'y est pas),
# projetés dans chaque vue validée ; parties cachées derrière un relief repérées pour être estompées.
import sys, math, copy, json, os
import numpy as np
from PIL import Image, ImageDraw
from render import render, shade, dest, bearing, R_EARTH
from cfg import SCENES, FINE, CAM, EXP
from osm import load, graph, nearest, shortest, dist

ROOT = sys.argv[1]; OSM = sys.argv[2]; OUT = sys.argv[3]
keys = sys.argv[4].split(",") if len(sys.argv) > 4 else list(CAM)
W, H = 780, 940
SUM = {k: tuple(SCENES[k]["summit"]) for k in CAM}

# voie : suite de tronçons
#   ("osm", [points de passage])  plus court chemin sur les sentiers OSM entre les points
#   ("line", [points])            segments drapés sur le relief (glacier, pente sans sentier tracé)
#   ("crest", départ, cap, alt)   arête suivie sur le relief depuis le sommet vers le bas, jusqu'à l'altitude donnée
ROUTES = {
 "moleson": dict(osm="moleson", parts=[("osm", [(46.55564, 7.02376), (46.54894, 7.01714)])],
                 camps=[(46.55564, 7.02376, "Plan-Francey")]),
 "pilatus": dict(osm="pilatus", parts=[("osm", [(46.99082, 8.25137), (46.97926, 8.25564)]), ("line", [(46.97926, 8.25564), SUM["pilatus"]])],
                 camps=[(46.99082, 8.25137, "Fräkmüntegg")]),
 "titlis": dict(osm="titlis", parts=[("osm", [(46.79324, 8.39867), (46.78253, 8.41735)]), ("osm", [(46.78253, 8.41735), (46.77013, 8.42495), (46.77203, 8.43781)])],
                camps=[(46.79324, 8.39867, "Trübsee"), (46.78253, 8.41735, "Stand"), (46.77013, 8.42495, "Klein Titlis")]),
 "eiger": dict(osm="trio", parts=[("osm", [(46.5748, 7.97486), (46.5770, 7.9851)]), ("line", [(46.5770, 7.9851), (46.5772, 7.9920), (46.5775, 7.9990), SUM["eiger"]])],
               camps=[(46.5748, 7.97486, "Eigergletscher")]),
 "monch": dict(osm="trio", parts=[("osm", [(46.5748, 7.97486), (46.56275, 7.9744)]), ("line", [(46.56275, 7.9744), "CREST0"]), ("crest", SUM["monch"], 276, 3100)],
               camps=[(46.5748, 7.97486, "Eigergletscher"), (46.56275, 7.9744, "Guggihütte")]),
 "jungfrau": dict(osm="trio", parts=[("osm", [(46.5748, 7.97486), (46.56275, 7.9744)]),
                  ("line", [(46.56275, 7.9744), (46.5560, 7.9690), (46.5493, 7.9618), (46.5440, 7.9560), (46.5395, 7.9530), (46.5378, 7.9575), SUM["jungfrau"]])],
                  camps=[(46.5748, 7.97486, "Eigergletscher"), (46.56275, 7.9744, "Guggihütte"), (46.5395, 7.9530, "Silberlücke")]),
 "dentblanche": dict(osm="dentblanche", parts=[("osm", [(46.0591, 7.5501), (46.0308, 7.5837), (46.0203, 7.6010), SUM["dentblanche"]])],
                     camps=[(46.0591, 7.5501, "Ferpècle"), (46.0469, 7.5665, "Bricola"), (46.0215, 7.5990, "Cabane de la Dent Blanche"), (46.02073, 7.60624, "Wandfluelücke")]),
 "cervin": dict(osm="cervin", parts=[("osm", [(45.9922, 7.70907), (45.9822, 7.67701), (45.97643, 7.6586)])],
                camps=[(45.9922, 7.70907, "Schwarzsee"), (45.9822, 7.67701, "Hörnlihütte"), (45.9787, 7.6629, "Cabane Solvay")]),
 "montblanc": dict(osm="montblanc", parts=[("osm", [(45.85639, 6.79943), (45.8550, 6.8176), (45.8511, 6.8307), (45.84258, 6.84347), (45.8391, 6.8521), (45.83271, 6.86517)])],
                   camps=[(45.85639, 6.79943, "Nid d'Aigle"), (45.8550, 6.8176, "Tête Rousse"), (45.8511, 6.8307, "Refuge du Goûter"), (45.84258, 6.84347, "Dôme du Goûter"), (45.8391, 6.8521, "Abri Vallot")]),
 "kili_machame": dict(osm="rel_8737224", parts=[("osm", [(-3.1734, 37.2386), (-3.0545, 37.2752), (-3.0614, 37.3131), (-3.0954, 37.3297), (-3.1070, 37.3467), (-3.1009, 37.3784), (-3.0793, 37.3638), (-3.0764, 37.3540)])],
                     camps=[(-3.1734, 37.2386, "Machame Gate"), (-3.0545, 37.2752, "Shira"), (-3.0614, 37.3131, "Lava Tower"), (-3.0954, 37.3297, "Barranco"), (-3.1009, 37.3784, "Barafu"), (-3.0793, 37.3638, "Stella Point")]),
 "kili_marangu": dict(osm="rel_8737292", parts=[("osm", [(-3.2436, 37.5177), (-3.1515, 37.4759), (-3.0811, 37.3920), (-3.0781, 37.3767), (-3.0764, 37.3540)])],
                     camps=[(-3.2436, 37.5177, "Marangu Gate"), (-3.1765, 37.5164, "Mandara Hut"), (-3.1382, 37.4464, "Horombo Hut"), (-3.0811, 37.3920, "Kibo Hut"), (-3.0781, 37.3767, "Gilman's Point")]),
 "kilimanjaro": None,
 "aconcagua": dict(osm="aconcagua", exclude=[589314270], last_entry=True, parts=[("osm", [(-32.8233, -69.9423), (-32.7561, -69.9725), (-32.6498, -70.0575), (-32.6535, -70.0161), (-32.65315, -70.01196)])],
                   camps=[(-32.8233, -69.9423, "Horcones"), (-32.7561, -69.9725, "Confluencia"), (-32.6498, -70.0575, "Plaza de Mulas"), (-32.6404, -70.0380, "Nido de Cóndores"),
                          (-32.6369, -70.0206, "Cólera"), (-32.6470, -70.0161, "Independencia"), (-32.6535, -70.0161, "Canaleta")]),
 "k2": dict(osm="k2", parts=[("line", [(35.83454, 76.50927), (35.8450, 76.5250), (35.8582, 76.5412)]), ("osm", [(35.8582, 76.5412), (35.8666, 76.5357)]),
                             ("line", [(35.8666, 76.5357), (35.866, 76.53609), (35.86849, 76.53295), (35.87241, 76.53164), "CREST0"]), ("crest", (35.88165, 76.51347), 123, 7300)],
            camps=[(35.83454, 76.50927, "Camp de base"), (35.8582, 76.5412, "Camp avancé"), ("ALT", 6050, "Camp 1"), ("ALT", 6700, "Camp 2"),
                   ("ALT", 7200, "Camp 3"), ("ALT", 7800, "Camp 4")]),
 "everest": dict(osm="everest", parts=[("osm", [(28.13653, 86.85547), (28.08227, 86.91936), (28.03046, 86.94036), (28.01637, 86.92332), (28.00624, 86.9299), (27.99902, 86.93219), (27.98806, 86.92521)])],
                 camps=[(28.13653, 86.85547, "Camp de base"), (28.08227, 86.91936, "Camp intermédiaire"), (28.03046, 86.94036, "Camp de base avancé"),
                        (28.01637, 86.92332, "Col Nord"), ("ALT", 7790, "Camp 2"), ("ALT", 8300, "Camp 3")]),
}

ROUTES["kilimanjaro"] = ROUTES["kili_machame"]

def densify(pts, step=12.0):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(dist(a, b)/step))
        for t in np.linspace(0, 1, n+1)[1:]: out.append((a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t))
    return out

def crest(M, start, brg, stop_alt, step=40.0, win=10):
    # arête rayonnant du sommet : à chaque distance, le cap (proche du précédent) où le relief est le plus haut
    out = [start]; b = brg
    for i in range(1, 120):
        d = i*step; cands = np.arange(max(b - win, brg - 14), min(b + win, brg + 14) + 0.1, 1.0)   # cap borné autour de l'arête visée
        la = np.array([dest(start[0], start[1], math.radians(c), d)[0] for c in cands]); lo = np.array([dest(start[0], start[1], math.radians(c), d)[1] for c in cands])
        z = M.sample(la, lo); j = int(np.argmax(z)); b = 0.5*b + 0.5*float(cands[j])
        out.append((float(la[j]), float(lo[j])))
        if z[j] < stop_alt: break
    return out[::-1]

def build(k, M):
    spec = ROUTES[k]; files = [f"{OSM}/{spec['osm']}.osm"]
    N, Wy, R = load(files)
    for x in spec.get("exclude", []): Wy.pop(x, None)
    G = graph(N, Wy)
    crest_pts = None
    for part in spec["parts"]:
        if part[0] == "crest": crest_pts = crest(M, part[1], part[2], part[3])
    pts = []
    for part in spec["parts"]:
        if part[0] == "osm":
            wps = part[1]
            for a, b in zip(wps, wps[1:]):
                na, nb = nearest(N, G, a), nearest(N, G, b)
                da, db = dist(N[na], a), dist(N[nb], b)
                path = shortest(G, na, nb)
                if path is None: print(f"  {k}: pas de chemin OSM {a} → {b}, ligne droite"); seg = [a, b]
                else: seg = [a] * (da > 25) + [(N[n][0], N[n][1]) for n in path] + [b] * (db > 25)
                if da > 150 or db > 150: print(f"  {k}: accroche lointaine {da:.0f} m / {db:.0f} m")
                pts += seg if not pts else seg[1:]
        elif part[0] == "line":
            seg = [crest_pts[0] if q == "CREST0" else q for q in part[1]]
            pts += seg if not pts else seg[1:]
        elif part[0] == "crest":
            pts += crest_pts if not pts else crest_pts[1:]
    return densify(pts)

def project(r, view, lat, lon, z):
    lat = np.asarray(lat); lon = np.asarray(lon)
    y = (lat - view[0])*110540.0; x = (lon - view[1])*111320.0*math.cos(math.radians(view[0]))
    az = np.arctan2(x, y); d = np.hypot(x, y)
    da = (az - r["az_c"] + math.pi) % (2*math.pi) - math.pi
    col = W/2 + da/r["dth"]
    elev = np.arctan2(z - d*d/(2*R_EARTH)*0.87 - r["eye"], d)
    row = (r["top"] - elev)/r["dth"]
    return col, row, d

def runs_clean(flag, n):
    # supprime les basculements visibles/cachés plus courts que n points (bruit en bord de crête)
    f = flag.copy(); i = 0
    while i < len(f):
        j = i
        while j < len(f) and f[j] == f[i]: j += 1
        if j - i < n and i > 0 and j < len(f): f[i:j] = f[i-1]
        i = j
    return f

def simplify(P, keep, tol=0.7):
    # Douglas-Peucker en pixels ; garde les points imposés (changements visible/caché, camps)
    P = np.asarray(P); mark = np.zeros(len(P), bool); mark[0] = mark[-1] = True; mark[list(keep)] = True
    idx = np.nonzero(mark)[0]
    def dp(a, b):
        if b <= a+1: return
        A, B = P[a, :2], P[b, :2]; v = B-A; L = np.hypot(*v) or 1.0
        dd = np.abs((P[a+1:b, 0]-A[0])*v[1] - (P[a+1:b, 1]-A[1])*v[0])/L
        m = int(np.argmax(dd))
        if dd[m] > tol: mark[a+1+m] = True; dp(a, a+1+m); dp(a+1+m, b)
    for a, b in zip(idx, idx[1:]): dp(a, b)
    return np.nonzero(mark)[0]

OFFICIAL = {"Plan-Francey": 1517, "Fräkmüntegg": 1416, "Trübsee": 1796, "Stand": 2428, "Klein Titlis": 3028, "Eigergletscher": 2320, "Guggihütte": 2791,
            "Silberlücke": 3685, "Cabane de la Dent Blanche": 3507, "Wandfluelücke": 3701, "Schwarzsee": 2583, "Hörnlihütte": 3260, "Cabane Solvay": 4003,
            "Nid d'Aigle": 2372, "Tête Rousse": 3167, "Refuge du Goûter": 3835, "Dôme du Goûter": 4304, "Abri Vallot": 4362,
            "Lava Tower": 4630, "Barranco": 3960, "Karanga": 4035, "Barafu": 4673, "Stella Point": 5756, "Plaza de Mulas": 4300, "Nido de Cóndores": 5560,
            "Confluencia": 3390, "Cólera": 5970, "Independencia": 6380, "Horcones": 2950, "Camp de base avancé": 6400, "Col Nord": 7020, "Camp intermédiaire": 5800}
def camps_for(k, lat, lon, alt, hid, start, top, i0, z, inside):
    name, _, _, _, _ = EXP[k]; out = []
    for c in ROUTES[k]["camps"]:
        if c[0] == "ALT":
            j = int(np.argmin(np.abs(alt - c[1])))
        else:
            dd = [(dist((lat[i], lon[i]), (c[0], c[1])), i) for i in range(len(lat))]
            dm, j = min(dd)
            if dm > 400: print(f"  {k}: camp {c[-1]} loin de la voie ({dm:.0f} m)"); continue
        if j < i0: continue            # hors champ, avant l'entrée de la voie dans l'image
        out.append([round(float(alt[j])), c[-1], j])
    real = {n: OFFICIAL.get(n, (c[1] if c[0] == "ALT" else None)) for c in ROUTES[k]["camps"] for n in [c[-1]]}
    named = sorted(out)
    dplus = top - start; n_target = 5 if dplus <= 700 else 7 if dplus <= 1600 else 9 if dplus <= 3200 else 10
    allc = [(a, n, j) for a, n, j in named if start + 15 < a < top - 15]
    for i in range(1, n_target+1):
        a = start + dplus*i/(n_target+1)
        if all(abs(a - b) > dplus*0.07 for b, _, _ in allc): allc.append((a, None, int(np.argmin(np.abs(alt - a)))))
    allc.sort(); res = []; g = 0
    numbered = any(n and n.startswith("Camp ") for _, n, _ in allc)
    for a, n, j in allc:
        ra = real.get(n) if n else None
        if n is None:
            g += 1; n = f"Bivouac {g}" if numbered else f"Camp {len(res)+1}"
        res.append([round(a), n, round(ra if ra else a), 2 if not inside[j] else int(hid[j])])   # camps génériques : altitude atteinte
    return res

data = json.load(open(f"{OUT}/scenes.json"))
os.makedirs(f"{OUT}/routes", exist_ok=True)
OVR = {}
for o in filter(None, os.environ.get("CAMS", "").split(";")):
    kk, v = o.split(":"); OVR[kk] = tuple(float(x) for x in v.split(","))
TAG = os.environ.get("TAG", "")
ALT = os.environ.get("ALTR", "")
if ALT:
    for o in ALT.split(";"):
        kk, v = o.split("="); ROUTES[kk] = ROUTES[v]
for k in keys:
    brg, dkm, eye_alt, fov = OVR.get(k, CAM[k])
    sc = copy.deepcopy(SCENES[k]); s = sc["summit"]
    la, lo = dest(s[0], s[1], math.radians(brg), dkm*1000.0)
    sc.update(view=(float(la), float(lo)), fov=fov, dmin=400, eye_min=eye_alt, eye=0, R=max(sc.get("R", 40000), dkm*1000+25000))
    if k in FINE: sc.update(fine=[FINE[k]], fine_dir=f"{ROOT}/ch", sharpen=[])
    r = render(sc, W=W, H=H); M = r["M"]
    pts = build(k, M)
    lat = np.array([p[0] for p in pts]); lon = np.array([p[1] for p in pts])
    z = M.sample(lat, lon) + 3.0
    col, row, d = project(r, sc["view"], lat, lon, z)
    inside = (col >= 2) & (col <= W-2) & (row >= 2) & (row <= H-2)
    ci = np.clip(np.round(col).astype(int), 0, W-1); ri = np.clip(np.round(row).astype(int), 0, H-1)
    hd = r["hitd"][ri, ci]
    hidden = np.isfinite(hd) & (hd < d - np.maximum(90.0, 0.035*d))
    hidden = runs_clean(hidden, 8)
    hidden = hidden | ~inside
    ins = np.nonzero(inside)[0]
    i0, i1 = int(ins[0]), int(ins[-1])
    if ROUTES[k].get("last_entry"):      # approche longue hors champ : la voie commence à sa dernière entrée dans l'image
        gaps = np.nonzero(np.diff(ins) > 200)[0]
        if len(gaps): i0 = int(ins[gaps[-1]+1])
    lo_i = i0 + int(np.argmin(z[i0:i1+1]))
    if z[i0] - z[lo_i] > 80: i0 = lo_i       # la voie commence par descendre : l'expédition part du point bas
    if not inside[i0:i1+1].all(): print(f"  {k}: la voie sort de l'image en route ({(~inside[i0:i1+1]).sum()} points)")
    name, top, region, start0, known = EXP[k]
    zr = np.maximum.accumulate(z[i0:i1+1]); start = float(zr[0])
    px = np.r_[0, np.hypot(np.diff(np.clip(col[i0:i1+1], 3, W-3)), np.diff(np.clip(row[i0:i1+1], 3, H-3)))]
    inc = np.maximum(np.r_[0, np.diff(zr)], 0.5*px)          # au moins 0,5 m par pixel parcouru : le grimpeur avance sur les replats
    alt = start + np.cumsum(inc)*(top - start)/max(1.0, inc.sum())
    altfull = np.concatenate([np.full(i0, start), alt, np.full(len(z)-i1-1, top)])
    cps = camps_for(k, lat, lon, altfull, hidden, start, top, i0, z, inside)
    # point de départ nommé s'il est à l'entrée de la voie
    sname = None
    for c in ROUTES[k]["camps"]:
        if c[0] != "ALT" and dist((lat[i0], lon[i0]), (c[0], c[1])) < 600 and abs(OFFICIAL.get(c[-1], z[i0]) - z[i0]) < 80: sname = c[-1]
    cps = [c for c in cps if c[1] != sname]
    sub = np.arange(i0, i1+1)
    P = np.stack([np.clip(col[sub], 3, W-3), np.clip(row[sub], 3, H-3), alt, np.where(inside[sub], hidden[sub], 2)], 1)
    flips = [i for i in range(1, len(P)) if P[i, 3] != P[i-1, 3]] + [i-1 for i in range(1, len(P)) if P[i, 3] != P[i-1, 3]]
    keep = simplify(P, flips)
    route = [[round(float(P[i, 0]), 1), round(float(P[i, 1]), 1), round(float(P[i, 2])), int(P[i, 3])] for i in keep]
    vis = 1 - hidden[sub].mean()
    print(f"{k}: {len(pts)} pts, image {i0}..{i1}, départ {start:.0f} m ({sname}), {len(route)} sommets, visible {vis:.0%}, camps {[c[1] for c in cps]}", flush=True)
    if not TAG: data[k].update(start=round(start), startName=sname, startReal=OFFICIAL.get(sname, round(start)), route=route, camps=cps)
    # contrôle visuel
    img = Image.fromarray(shade(sc, r)); dr = ImageDraw.Draw(img)
    for i in range(1, len(route)):
        a, b = route[i-1], route[i]
        dr.line([a[0], a[1], b[0], b[1]], fill=(255, 140, 60) if not b[3] else (255, 255, 255) if b[3] == 1 else (255, 0, 255), width=4 if not b[3] else 2)
    for a, nm, ra, hd_ in cps:
        j = next((i for i, p in enumerate(route) if p[2] >= a), len(route)-1); x, y = route[j][0], route[j][1]
        dr.ellipse([x-6, y-6, x+6, y+6], fill=(20, 30, 40)); dr.text((x+9, y-8), f"{nm} {ra}", fill=(0, 0, 0))
    img.save(f"{OUT}/routes/{k}{TAG}.png")
    json.dump(data, open(f"{OUT}/scenes.json", "w"), separators=(",", ":"), ensure_ascii=False)
