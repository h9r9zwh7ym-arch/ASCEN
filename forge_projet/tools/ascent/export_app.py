# Exporte les scènes calculées vers l'app :
#   src/data_ascent.js       : petit, embarqué (altitudes, camps, silhouette de chaque sommet)
#   vendor/ascent-scenes.js  : les 13 scènes vectorielles et les voies, chargé à la demande
# Usage : python export_app.py <dossier avec scenes.json et les .npz> <racine forge_projet>
import json, re, sys
import numpy as np
SRC, ROOT = sys.argv[1], sys.argv[2]
ORDER = ["moleson", "pilatus", "titlis", "eiger", "monch", "jungfrau", "dentblanche", "cervin", "montblanc", "kilimanjaro", "aconcagua", "k2", "everest"]
d = json.load(open(f"{SRC}/scenes.json"))

TOK = re.compile(r"[MCLZmclz]|-?\d+(?:\.\d+)?")
def join(nums):
    s = ""
    for n in nums: s += n if (not s or n.startswith("-")) else " " + n
    return s
def rel(p, tx, ty):
    # tracé vtracer (absolu, décalé par translate) → commandes relatives entières, commande répétée implicite
    t = TOK.findall(p); i = 0; out = []; cx = cy = sx = sy = 0; first = True
    while i < len(t):
        c = t[i]; i += 1
        if c in "Zz": out.append("z"); cx, cy = sx, sy; continue
        n = {"M": 2, "L": 2, "C": 6}[c.upper()]
        while i < len(t) and t[i] not in "MCLZmclz":
            vals = [float(v) for v in t[i:i+n]]; i += n
            if c == "M":
                ax, ay = round(vals[0] + tx), round(vals[1] + ty)
                out.append(("M" + join([str(ax), str(ay)])) if first else ("m" + join([str(ax-cx), str(ay-cy)])))
                cx, cy = sx, sy = ax, ay; first = False; c = "L"; continue
            pts = [(round(vals[j] + tx), round(vals[j+1] + ty)) for j in range(0, n, 2)]
            rels = []
            for (x, y) in pts: rels += [str(x-cx), str(y-cy)]
            cmd = "c" if n == 6 else "l"
            if out and out[-1][:1] == cmd:
                body = join(rels); out[-1] += body if body.startswith("-") else " " + body
            else: out.append(cmd + join(rels))
            cx, cy = pts[-1]
    return "".join(out)

def dp(P, tol):
    P = np.asarray(P, float); keep = np.zeros(len(P), bool); keep[0] = keep[-1] = True; st = [(0, len(P)-1)]
    while st:
        a, b = st.pop()
        if b <= a+1: continue
        A, B = P[a], P[b]; v = B-A; L = np.hypot(*v) or 1
        dd = np.abs((P[a+1:b, 0]-A[0])*v[1]-(P[a+1:b, 1]-A[1])*v[0])/L; m = int(np.argmax(dd))
        if dd[m] > tol: keep[a+1+m] = True; st += [(a, a+1+m), (a+1+m, b)]
    return P[keep]

small, big = {}, {}
for k in ORDER:
    v = d[k]
    idx = np.load(f"{SRC}/{k}.npz")["idx"]; H, W = idx.shape
    xs = list(range(0, W, 3)) + [W-1]
    ys = [int(np.argmax(idx[:, x] != 255)) for x in xs]
    sky = " ".join(f"{round(x/5)} {round(y/5)}" for x, y in dp(list(zip(xs, ys)), 3.0))
    small[k] = dict(n=v["name"], top=v["top"], region=v["region"], start=v["start"], from_=v.get("startName"), fromAlt=v.get("startReal") or v["start"],
                    camps=[[c[0], c[1], c[2]] for c in v["camps"]], sky=sky, sx=round(v["summit"][0]/5), sy=round(v["summit"][1]/5), pal=v["pal"])
    big[k] = dict(W=v["W"], H=v["H"], summit=[round(x) for x in v["summit"]],
                  paths=[[c, rel(p, tx, ty)] for c, p, tx, ty in v["paths"]], land=[rel(p, tx, ty) for p, tx, ty in v["land"]],
                  route=[[round(x), round(y), a, h] for x, y, a, h in v["route"]])
js = json.dumps(small, separators=(",", ":"), ensure_ascii=False).replace('"from_"', '"from"')
open(f"{ROOT}/src/data_ascent.js", "w").write(
    "// ================= ASCENSION : données des 13 sommets (générées par tools/ascent/export_app.py) =================\n"
    "// start/top : altitudes de l'expédition ; camps : [progression, nom, altitude réelle] ; sky : silhouette (vue 156 × 188).\n"
    f"const ASC_DATA = {js};\n")
open(f"{ROOT}/vendor/ascent-scenes.js", "w").write(
    "/* ASCEN — scènes de l'ascension : relief swisstopo swissALTI3D / Copernicus GLO-30, voies © OpenStreetMap (ODbL). Généré par tools/ascent/export_app.py */\n"
    "window.ASC_SCENES=" + json.dumps(big, separators=(",", ":"), ensure_ascii=False) + ";\n")
print("data_ascent.js", len(js)//1024, "Ko ; ascent-scenes.js", len(json.dumps(big, separators=(",", ":")))//1024, "Ko")
