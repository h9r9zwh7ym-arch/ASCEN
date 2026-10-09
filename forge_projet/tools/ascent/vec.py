# Vues validées → tracés vectoriels par classe (plan × matière × lumière) + sentier projeté avec l'altitude réelle
import sys, math, copy, json, re, os
import numpy as np, vtracer
from render import render, classes, dest
from cfg import SCENES, FINE, CAM, EXP

ROOT = sys.argv[1]; OUT = sys.argv[2]
keys = sys.argv[3].split(",") if len(sys.argv) > 3 else list(CAM)
W, H = 780, 940
REGION = {"kilimanjaro": "afr", "aconcagua": "and", "k2": "hima", "everest": "hima"}

def code(i):
    return (20 + (i % 3)*90, 20 + ((i//3) % 3)*90, 20 + (i//9)*90)
CODES = np.array([code(i) for i in range(27)], np.int32)

def vectorize(idx):
    rgb = np.zeros((H, W, 3), np.uint8)
    for i in range(27): rgb[idx == i] = code(i)
    rgb[idx == 255] = (250, 10, 250)
    px = [tuple(int(v) for v in p) + (255,) for p in rgb.reshape(-1, 3)]
    svg = vtracer.convert_pixels_to_svg(px, (W, H), colormode="color", hierarchical="stacked", mode="spline",
        filter_speckle=10, color_precision=8, layer_difference=1, corner_threshold=70, length_threshold=5.0,
        max_iterations=10, splice_threshold=45, path_precision=1)
    out = []
    for m in re.finditer(r'<path d="([^"]+)" fill="#([0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"', svg):
        d, hexc, tx, ty = m.groups()
        c = np.array([int(hexc[i:i+2], 16) for i in (0, 2, 4)])
        if abs(c - np.array((250, 10, 250))).sum() < 30: continue      # ciel : transparent (dégradé CSS derrière)
        k = int(np.argmin(np.abs(CODES - c).sum(1)))
        out.append([k, d.strip(), round(float(tx), 1), round(float(ty), 1)])
    return out

def land_paths(idx):
    # la terre (tout sauf le ciel) en une forme : sert de découpe pour les aplats empilés
    px = [((0, 0, 0, 255) if v != 255 else (255, 255, 255, 255)) for v in idx.reshape(-1)]
    svg = vtracer.convert_pixels_to_svg(px, (W, H), colormode="binary", mode="spline", filter_speckle=10,
        corner_threshold=70, length_threshold=4.0, max_iterations=10, splice_threshold=45, path_precision=1)
    return [[d.strip(), round(float(tx), 1), round(float(ty), 1)] for d, tx, ty in
            re.findall(r'<path d="([^"]+)" fill="#000000" transform="translate\(([-\d.]+),([-\d.]+)\)"', svg)]

def route(r, idx, start_alt, top_alt):
    hz, hitd = r["hz"], r["hitd"]; sx, sy = r["s_px"]; D = r["dist_s"]
    main = np.isfinite(hitd) & (hitd > 0.55*D) & (hitd < 1.5*D)
    def on(p):
        x, y = int(round(p[0])), int(round(p[1]))
        return 4 <= x < W-4 and 4 <= y < H-4 and main[y, x]
    lo, hi = int(max(8, sx-0.42*W)), int(min(W-8, sx+0.04*W))
    band = main.copy(); band[:, :lo] = False; band[:, hi:] = False; band[H-8:, :] = False
    ys, xs = np.nonzero(band & (np.abs(hz - start_alt) < 45))
    if len(xs) < 12:   # départ caché derrière un relief : on part du plus bas visible sur la face
        ys, xs = np.nonzero(band)
        a = hz[ys, xs]; keep = a <= np.percentile(a, 4); ys, xs = ys[keep], xs[keep]
        start_alt = float(np.median(hz[ys, xs]))
    tgt = np.array([sx - 0.13*W, H*0.97])
    j = int(np.argmin((xs - tgt[0])**2 + (ys - tgt[1])**2)); p0 = np.array([xs[j], ys[j]], float)
    p1 = np.array([sx, sy + 2.0]); v = p1 - p0; L = float(np.hypot(*v)); u = v/L; n = np.array([-u[1], u[0]])
    legs = int(min(15, max(7, L/42))); verts = [p0]
    for k in range(1, legs):
        t = k/legs; c = p0 + v*(t**0.92); amp = 0.075*W*(1-t)**0.85*(1 if k % 2 else -1); p = c
        for s in np.linspace(1, 0, 9):
            q = c + n*amp*s
            if on(q): p = q; break
        verts.append(p)
    verts.append(p1)
    # lacets arrondis, échantillonnés finement
    pts = [verts[0]]
    for i in range(1, len(verts)-1):
        a, b, c = verts[i-1], verts[i], verts[i+1]
        l1, l2 = np.hypot(*(b-a)), np.hypot(*(c-b)); rr = min(16, l1/2, l2/2)
        q1 = b + (a-b)*rr/l1; q2 = b + (c-b)*rr/l2
        seg = np.linspace(pts[-1], q1, max(2, int(np.hypot(*(q1-pts[-1]))/4)))[1:]; pts.extend(seg)
        for t in np.linspace(0, 1, 6)[1:]: pts.append((1-t)**2*q1 + 2*(1-t)*t*b + t*t*q2)
    seg = np.linspace(pts[-1], verts[-1], max(2, int(np.hypot(*(verts[-1]-pts[-1]))/4)))[1:]; pts.extend(seg)
    pts = np.array(pts)
    alt = np.array([hz[int(min(H-1, max(0, round(y)))), int(min(W-1, max(0, round(x))))] if on((x, y)) else np.nan for x, y in pts])
    ok = ~np.isnan(alt)
    alt = np.interp(np.arange(len(alt)), np.nonzero(ok)[0], alt[ok]) if ok.any() else np.linspace(start_alt, top_alt, len(pts))
    alt = np.maximum.accumulate(alt)
    alt = start_alt + (alt - alt[0])/max(1.0, alt[-1]-alt[0])*(top_alt - start_alt)
    step = max(1, len(pts)//170)
    keep = list(range(0, len(pts)-1, step)) + [len(pts)-1]
    return [[round(float(pts[i][0]), 1), round(float(pts[i][1]), 1), round(float(alt[i]))] for i in keep], start_alt

def camps(start, top, known):
    named = [(a, n) for a, n in known if start + 1 < a < top - 1]
    dplus = top - start; n_target = 5 if dplus <= 700 else 7 if dplus <= 1600 else 9 if dplus <= 3200 else 10
    alts = sorted([a for a, _ in named])
    allc = list(named)
    for k in range(1, n_target + 1):
        a = start + dplus*k/(n_target + 1)
        if all(abs(a - b) > dplus*0.06 for b in alts + [x for x, _ in allc]): allc.append((a, None))
    allc.sort()
    out = []; g = 0
    has_numbered = any(n and n.startswith("Camp ") for _, n in named)
    for i, (a, n) in enumerate(allc):
        if n is None:
            g += 1; n = f"Bivouac {g}" if has_numbered else f"Camp {i+1}"
        out.append([round(a), n])
    return out

data = json.load(open(f"{OUT}/scenes.json")) if os.path.exists(f"{OUT}/scenes.json") else {}
for k in keys:
    brg, dkm, eye_alt, fov = CAM[k]
    sc = copy.deepcopy(SCENES[k]); s = sc["summit"]
    la, lo = dest(s[0], s[1], math.radians(brg), dkm*1000.0)
    sc.update(view=(float(la), float(lo)), fov=fov, dmin=400, eye_min=eye_alt, eye=0, R=max(sc.get("R", 40000), dkm*1000+25000))
    if k in FINE: sc.update(fine=[FINE[k]], fine_dir=f"{ROOT}/ch", sharpen=[])
    r = render(sc, W=W, H=H)
    idx = classes(sc, r)
    name, top, region, start, known = EXP[k]
    paths = vectorize(idx)
    land = land_paths(idx)
    np.savez_compressed(f"{OUT}/{k}.npz", idx=idx, hz=r["hz"].astype(np.float32))
    rt, start_eff = route(r, idx, start, top)
    start_name = next((n for a, n in known if abs(a - start) < 1), None)
    data[k] = dict(name=name, top=top, region=region, start=round(start_eff), startName=start_name if abs(start_eff - start) < 60 else None,
                   pal=REGION.get(k, "alps"), W=W, H=H, summit=[round(r["s_px"][0], 1), round(r["s_px"][1], 1)],
                   paths=paths, land=land, route=rt, camps=camps(start_eff, top, known))
    size = len(json.dumps(data[k]))
    print(k, "paths", len(paths), "land", len(land), "kB", size//1024, "départ", round(start_eff), flush=True)
    json.dump(data, open(f"{OUT}/scenes.json", "w"), separators=(",", ":"), ensure_ascii=False)
