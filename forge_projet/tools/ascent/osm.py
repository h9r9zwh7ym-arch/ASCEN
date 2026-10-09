# Lecture d'extraits OSM (API 0.6) : nœuds, chemins, relations ; graphe des sentiers
import xml.etree.ElementTree as ET, math, heapq, glob
def load(files):
    N, Wy, R = {}, {}, {}
    for f in files:
        for ev, el in ET.iterparse(f, events=("end",)):
            if el.tag == "node":
                t = {c.get("k"): c.get("v") for c in el if c.tag == "tag"}
                N[int(el.get("id"))] = (float(el.get("lat")), float(el.get("lon")), t); el.clear()
            elif el.tag == "way":
                nd = [int(c.get("ref")) for c in el if c.tag == "nd"]; t = {c.get("k"): c.get("v") for c in el if c.tag == "tag"}
                Wy[int(el.get("id"))] = (nd, t); el.clear()
            elif el.tag == "relation":
                m = [(c.get("type"), int(c.get("ref")), c.get("role")) for c in el if c.tag == "member"]; t = {c.get("k"): c.get("v") for c in el if c.tag == "tag"}
                R[int(el.get("id"))] = (m, t); el.clear()
    return N, Wy, R
def dist(a, b):
    dy = (a[0]-b[0])*110540.0; dx = (a[1]-b[1])*111320.0*math.cos(math.radians(a[0])); return math.hypot(dx, dy)
WALK = ("path", "footway", "track", "steps", "bridleway", "unclassified", "service", "residential")
def graph(N, Wy, kinds=WALK, extra=None, gap=70.0):
    G = {}; owner = {}; ends = []
    for wid, (nd, t) in Wy.items():
        hw = t.get("highway"); ok = hw in kinds or (extra and extra(t))
        if not ok: continue
        pen = 1.0 if hw in ("path", "footway", "steps", "track", "bridleway") else 1.6
        nd = [n for n in nd if n in N]
        for a, b in zip(nd, nd[1:]):
            d = dist(N[a], N[b])*pen; G.setdefault(a, []).append((b, d)); G.setdefault(b, []).append((a, d))
        for n in nd: owner.setdefault(n, set()).add(wid)
        if len(nd) > 1: ends += [nd[0], nd[-1]]
    # sentiers d'alpinisme souvent tracés en tronçons disjoints : on relie une extrémité au nœud le plus proche d'un autre tronçon
    cell = {}
    for n in G: cell.setdefault((round(N[n][0]*900), round(N[n][1]*900)), []).append(n)
    for e in ends:
        if len(G.get(e, [])) > 1: continue
        ky = (round(N[e][0]*900), round(N[e][1]*900)); best = None
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for n in cell.get((ky[0]+dy, ky[1]+dx), []):
                    if owner[n] & owner[e]: continue
                    dd = dist(N[n], N[e])
                    if dd < gap and (best is None or dd < best[0]): best = (dd, n)
        if best: d = best[0]*2 + 5; G[e].append((best[1], d)); G[best[1]].append((e, d))
    return G
def nearest(N, G, p):
    return min(G, key=lambda n: dist(N[n], p))
def shortest(G, a, b):
    D = {a: 0}; P = {}; h = [(0, a)]
    while h:
        d, u = heapq.heappop(h)
        if u == b: break
        if d > D[u]: continue
        for v, w in G[u]:
            if d + w < D.get(v, 1e18): D[v] = d + w; P[v] = u; heapq.heappush(h, (d + w, v))
    if b not in D: return None
    out = [b]
    while out[-1] != a: out.append(P[out[-1]])
    return out[::-1]
