# Vues réelles des sommets d'ASCEN : lancer de rayons sur le relief Copernicus GLO-30 depuis un point de vue
# classique, rendu stylisé (aplats éclairés, neige, roche, végétation, brume) pour valider les formes.
import math, sys, json, numpy as np, tifffile
from PIL import Image, ImageDraw, ImageFont

TILE_DIR = sys.argv[1] if len(sys.argv) > 1 else "."
R_EARTH = 6371000.0

def tile_name(la, lo):
    return f"{TILE_DIR}/Copernicus_DSM_COG_10_{'N' if la>=0 else 'S'}{abs(la):02d}_00_{'E' if lo>=0 else 'W'}{abs(lo):03d}_00_DEM.tif"

def wgs_to_lv95(lat, lon):
    # formules approchées de swisstopo (précision ~1 m)
    p = (lat*3600.0 - 169028.66)/10000.0; l = (lon*3600.0 - 26782.5)/10000.0
    E = 2600072.37 + 211455.93*l - 10938.51*l*p - 0.36*l*p*p - 44.54*l**3
    N = 1200147.07 + 308807.95*p + 3745.25*l*l + 76.63*p*p - 194.56*l*l*p + 119.79*p**3
    return E, N

class Fine:
    def __init__(self, folder, lat, lon, rkm, k=4):
        E, N = wgs_to_lv95(lat, lon)
        self.E0 = math.floor((E - rkm*1000)/1000)*1000; self.E1 = math.ceil((E + rkm*1000)/1000)*1000
        self.N0 = math.floor((N - rkm*1000)/1000)*1000; self.N1 = math.ceil((N + rkm*1000)/1000)*1000
        nc = int((self.E1-self.E0)/2); nr = int((self.N1-self.N0)/2)
        z = np.full((nr, nc), np.nan, np.float32)
        for ek in range(int(self.E0/1000), int(self.E1/1000)):
            for nk in range(int(self.N0/1000), int(self.N1/1000)):
                try: a = tifffile.imread(f"{folder}/{ek}-{nk}.tif").astype(np.float32)
                except FileNotFoundError: continue
                a[a < -1000] = np.nan
                r = int((self.N1 - (nk+1)*1000)/2); c = int((ek*1000 - self.E0)/2)
                z[r:r+500, c:c+500] = a
        self.z = z
        # version lissée pour l'éclairage (aplats), trous comblés par la moyenne locale
        filled = np.where(np.isnan(z), np.nanmean(z), z)
        zs = filled
        for _ in range(2):
            for ax in (0, 1):
                pad = [(k, k), (0, 0)] if ax == 0 else [(0, 0), (k, k)]
                cs = np.cumsum(np.pad(zs, pad, mode="edge"), axis=ax, dtype=np.float64)
                if ax == 0: zs = ((cs[2*k:] - np.vstack([np.zeros((1, zs.shape[1])), cs[:-2*k-1]]))/(2*k+1)).astype(np.float32)
                else: zs = ((cs[:, 2*k:] - np.hstack([np.zeros((zs.shape[0], 1)), cs[:, :-2*k-1]]))/(2*k+1)).astype(np.float32)
        self.zs = np.where(np.isnan(z), np.nan, zs)
    def sample(self, lat, lon, smooth=False):
        a = self.zs if smooth else self.z
        E, N = wgs_to_lv95(lat, lon)
        c = (E - self.E0)/2.0 - 0.5; r = (self.N1 - N)/2.0 - 0.5
        inside = (c >= 0) & (r >= 0) & (c < a.shape[1]-1) & (r < a.shape[0]-1)
        cc = np.where(inside, c, 0); rr = np.where(inside, r, 0)
        r0 = np.floor(rr).astype(np.int32); c0 = np.floor(cc).astype(np.int32); fr = rr-r0; fc = cc-c0
        v = (a[r0, c0]*(1-fr)*(1-fc) + a[r0, c0+1]*(1-fr)*fc + a[r0+1, c0]*fr*(1-fc) + a[r0+1, c0+1]*fr*fc)
        edge = np.minimum(np.minimum(E-self.E0, self.E1-E), np.minimum(N-self.N0, self.N1-N))
        w = np.where(inside & ~np.isnan(v), np.clip(edge/400.0, 0, 1), 0.0)
        return np.where(np.isnan(v), 0, v), w

class Mosaic:
    def __init__(self, lat0, lat1, lon0, lon1):
        self.la0, self.la1, self.lo0, self.lo1 = math.floor(lat0), math.floor(lat1)+1, math.floor(lon0), math.floor(lon1)+1
        nr, nc = (self.la1-self.la0)*3600, (self.lo1-self.lo0)*3600
        self.z = np.zeros((nr, nc), np.float32)
        for la in range(self.la0, self.la1):
            for lo in range(self.lo0, self.lo1):
                try: a = tifffile.imread(tile_name(la, lo))
                except FileNotFoundError: continue
                r = (self.la1-(la+1))*3600; c = (lo-self.lo0)*3600
                self.z[r:r+3600, c:c+3600] = a[:3600, :3600]
    def smooth(self, k=4):
        z = self.z.copy()
        for _ in range(2):
            for ax in (0, 1):
                c = np.cumsum(np.pad(z, [(k, k), (0, 0)] if ax == 0 else [(0, 0), (k, k)], mode="edge"), axis=ax, dtype=np.float64)
                if ax == 0: z = ((c[2*k:] - np.vstack([np.zeros((1, z.shape[1])), c[:-2*k-1]]))/(2*k+1)).astype(np.float32)
                else: z = ((c[:, 2*k:] - np.hstack([np.zeros((z.shape[0], 1)), c[:, :-2*k-1]]))/(2*k+1)).astype(np.float32)
        self.zs = z
    def rc(self, lat, lon):
        return (self.la1-lat)*3600-0.5, (lon-self.lo0)*3600-0.5
    fines = []
    def sample(self, lat, lon, arr=None):
        v = self.sample_coarse(lat, lon, arr)
        for F in self.fines:
            f, w = F.sample(lat, lon, smooth=arr is not None)
            v = v*(1-w) + f*w
        return v
    def sample_coarse(self, lat, lon, arr=None):
        a = self.z if arr is None else arr
        r, c = self.rc(lat, lon)
        r = np.clip(r, 0, a.shape[0]-1.001); c = np.clip(c, 0, a.shape[1]-1.001)
        r0 = np.floor(r).astype(np.int32); c0 = np.floor(c).astype(np.int32); fr = r-r0; fc = c-c0
        return (a[r0, c0]*(1-fr)*(1-fc) + a[r0, c0+1]*(1-fr)*fc + a[r0+1, c0]*fr*(1-fc) + a[r0+1, c0+1]*fr*fc)
    def sharpen(self, lat, lon, real, radius):
        # sommet trop fin pour 30 m (Cervin…) : on étire verticalement les derniers ~450 m pour retrouver la
        # vraie altitude, en gardant la forme réelle (asymétrie, crochet) ; un cône l'aurait rendue symétrique
        r, c = self.rc(lat, lon); win = int(radius/30)+3
        r0, c0 = int(r), int(c)
        sub = self.z[r0-win:r0+win, c0-win:c0+win]
        i = np.unravel_index(sub.argmax(), sub.shape); pr, pc = r0-win+i[0], c0-win+i[1]
        top = float(self.z[pr, pc]); d = real - top
        if d <= 5: return 0
        zb = top - 450.0; k = (real - zb)/(top - zb); W2 = 60
        blk = self.z[pr-W2:pr+W2, pc-W2:pc+W2]
        rr, cc = np.mgrid[-W2:W2, -W2:W2]
        w = np.clip(1 - np.hypot(rr*30.9, cc*30.9*math.cos(math.radians(lat)))/1800.0, 0, 1)
        up = np.where(blk > zb, zb + (blk - zb)*(1 + (k-1)*w), blk)
        self.z[pr-W2:pr+W2, pc-W2:pc+W2] = up
        return d
    def gradients(self):
        lat_c = (self.la0+self.la1)/2
        dy = 30.87; dx = 30.87*math.cos(math.radians(lat_c))
        gy, gx = np.gradient(self.z)
        self.gx = (gx/dx).astype(np.float32); self.gy = (-gy/dy).astype(np.float32)   # dz/dest, dz/nord

def dest(lat, lon, az, d):
    return lat + d*np.cos(az)/110540.0, lon + d*np.sin(az)/(111320.0*math.cos(math.radians(lat)))

def bearing(lat0, lon0, lat1, lon1):
    y = (lat1-lat0)*110540.0; x = (lon1-lon0)*111320.0*math.cos(math.radians(lat0))
    return math.atan2(x, y), math.hypot(x, y)

def render(sc, W=780, H=940):
    v = sc["view"]; s = sc["summit"]
    az_s, dist_s = bearing(v[0], v[1], s[0], s[1])
    R = sc.get("R", 45000)
    fov = math.radians(sc["fov"]); half = fov/2+0.02
    # emprise des rayons
    lats, lons = [v[0]], [v[1]]
    for a in np.linspace(az_s+math.radians(sc.get("pan",0))-half, az_s+math.radians(sc.get("pan",0))+half, 9):
        la, lo = dest(v[0], v[1], a, R); lats.append(la); lons.append(lo)
    M = Mosaic(min(lats)-.02, max(lats)+.02, min(lons)-.02, max(lons)+.02)
    M.fines = [Fine(sc["fine_dir"], *f) for f in sc.get("fine", [])]
    for pk in sc.get("sharpen", []): M.sharpen(*pk)
    M.smooth(sc.get("smooth", 3))
    eye = float(M.sample(np.array([v[0]]), np.array([v[1]]))[0]) + sc.get("eye", 2)
    eye = max(eye + 25, sc.get("eye_min", 0))
    if "eye_abs" in sc: eye = sc["eye_abs"]
    az_c = az_s + math.radians(sc.get("pan", 0))
    d0 = sc.get("dmin", 25.0)
    q = 1.0012 if sc.get("fine") else 1.0035      # pas plus fin quand le relief suisse à 2 m est chargé
    d = d0*(q**np.arange(0, int(math.log(R/d0)/math.log(q))))
    n = len(d); dcurv = d*d/(2*R_EARTH)*(1-0.13)
    # angle du sommet : cadrage vertical (sommet au tiers haut)
    hs = float(M.sample(np.array([s[0]]), np.array([s[1]]))[0])
    elev_s = math.atan2(hs - dist_s**2/(2*R_EARTH)*.87 - eye, dist_s)
    dth = fov/W
    top = elev_s + dth*H*sc.get("headroom", .3)
    theta = top - dth*np.arange(H)                       # angle de chaque ligne
    cols_az = az_c + (np.arange(W)-W/2)*dth
    hitd = np.full((H, W), np.inf, np.float32); hlat = np.zeros((H, W), np.float32); hlon = np.zeros((H, W), np.float32); hz = np.zeros((H, W), np.float32)
    for ci, a in enumerate(cols_az):
        la, lo = dest(v[0], v[1], a, d)
        z = M.sample(la, lo)
        alpha = np.arctan2(z - dcurv - eye, d)
        cm = np.maximum.accumulate(alpha)
        idx = np.searchsorted(cm, theta[::-1], side="left")[::-1]   # cm croissant ; theta décroissant
        ok = idx < n; ii = np.where(ok, idx, 0)
        hitd[:, ci] = np.where(ok, d[ii], np.inf); hlat[:, ci] = la[ii]; hlon[:, ci] = lo[ii]; hz[:, ci] = z[ii]
    # pente au point touché : différences finies sur le relief (± 1 seconde d'arc)
    e = 2.5/3600.0; coslat = math.cos(math.radians(v[0]))
    gx = (M.sample(hlat, hlon+e, M.zs) - M.sample(hlat, hlon-e, M.zs))/(2*2.5*30.87*coslat)
    gy = (M.sample(hlat+e, hlon, M.zs) - M.sample(hlat-e, hlon, M.zs))/(2*2.5*30.87)
    curv = M.sample(hlat, hlon) - M.sample(hlat, hlon, M.zs)   # >0 : arête, <0 : creux
    # position du sommet à l'écran (projection du point réel)
    s_az = az_s - az_c; s_el = elev_s
    s_px = (W/2 + s_az/dth, (top - s_el)/dth)
    return dict(dist_s=dist_s, s_px=s_px, hs=hs, hitd=hitd, hlat=hlat, hlon=hlon, hz=hz, gx=gx, gy=gy, curv=curv, az_c=az_c, dth=dth, top=top, eye=eye, W=W, H=H, M=M)

def classes(sc, r):
    """Image de classes : plan (0 devant, 1 la montagne, 2 derrière) × matière (neige, roche, végétation) × lumière (3)."""
    hitd, hz, gx, gy = r["hitd"], r["hz"], r["gx"], r["gy"]
    sky = hitd == np.inf
    nx, ny, nz = -gx, -gy, np.ones_like(gx); nl = np.sqrt(nx*nx+ny*ny+1); nx/=nl; ny/=nl; nz/=nl
    sa = r["az_c"] + math.radians(sc.get("sun_rel", -55)); se = math.radians(sc.get("sun_el", 32))
    sx, sy, sz = math.sin(sa)*math.cos(se), math.cos(sa)*math.cos(se), math.sin(se)
    lam = np.clip(nx*sx+ny*sy+nz*sz, 0, 1)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    north = -gy/np.maximum(np.hypot(gx, gy), 1e-3)
    line = sc["snow"] + np.clip(r["curv"]*6, -350, 350) - 220*north*np.clip(slope/30, 0, 1)
    snow = (hz > line) & (slope < np.where(hz > line+800, 54, 42))
    veg = ~snow & (hz < sc.get("tree", 1900)) & (slope < 38)
    m = np.where(snow, 0, np.where(veg, 2, 1))
    q = np.digitize(lam, [0.28, 0.62])
    D = r["dist_s"]
    b = np.where(hitd < 0.72*D, 0, np.where(hitd < 1.6*D, 1, 2))
    idx = (b*9 + m*3 + q).astype(np.uint8)
    idx[sky] = 255
    return idx

def shade(sc, r):
    hitd, hz, gx, gy = r["hitd"], r["hz"], r["gx"], r["gy"]
    sky = hitd == np.inf
    nx, ny, nz = -gx, -gy, np.ones_like(gx); nl = np.sqrt(nx*nx+ny*ny+1); nx/=nl; ny/=nl; nz/=nl
    sa = r["az_c"] + math.radians(sc.get("sun_rel", -55)); se = math.radians(sc.get("sun_el", 32))
    sx, sy, sz = math.sin(sa)*math.cos(se), math.cos(sa)*math.cos(se), math.sin(se)
    lam = np.clip(nx*sx+ny*sy+nz*sz, 0, 1)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    P = sc["pal"]
    base = np.zeros(hz.shape+(3,), np.float32)
    north = -gy/np.maximum(np.hypot(gx, gy), 1e-3)                  # 1 : pente tournée vers le nord
    line = sc["snow"] + np.clip(r["curv"]*6, -350, 350) - 220*north*np.clip(slope/30, 0, 1)
    snow = (hz > line) & (slope < np.where(hz > line+800, 54, 42))
    veg = ~snow & (hz < sc.get("tree", 1900)) & (slope < 38)
    rock = ~snow & ~veg
    base[:] = P["rock"]; base[veg] = P["veg"]; base[snow] = P["snow"]
    # aplats : 3 niveaux de lumière
    q = np.digitize(lam, [0.28, 0.62])
    k = np.choose(q, [0.58, 0.82, 1.0])[..., None]
    col = base*k
    shadow_tint = np.array(P.get("shadow_tint", (0.86, 0.9, 1.08)), np.float32)
    col = np.where((q == 0)[..., None], col*shadow_tint, col)
    # brume avec la distance
    fogc = np.array(P["haze"], np.float32); lam_f = sc.get("haze_km", 30)*1000.0
    f = 1-np.exp(-np.where(sky, 0, hitd)/lam_f)
    col = col*(1-f[..., None]) + fogc*f[..., None]
    # contours : bord haut de chaque relief plus proche que celui de derrière
    up = np.vstack([np.full((1, hitd.shape[1]), np.inf, np.float32), hitd[:-1]])
    with np.errstate(invalid="ignore"): edge = (~sky) & ((up == np.inf) | (up/np.maximum(hitd, 1) > 1.35))
    col = np.where(edge[..., None], col*0.72, col)
    # ciel
    H, W = hitd.shape
    t = np.linspace(0, 1, H)[:, None, None]
    skyc = np.array(P["sky0"], np.float32)*(1-t) + np.array(P["sky1"], np.float32)*t
    skyc = np.broadcast_to(skyc, col.shape)
    col = np.where(sky[..., None], skyc, col)
    return np.clip(col, 0, 255).astype(np.uint8)

ALPS = dict(sky0=(120, 168, 214), sky1=(214, 228, 238), snow=(246, 248, 251), rock=(126, 120, 116), alp=(150, 162, 112), veg=(78, 112, 70), haze=(196, 212, 226))
HIMA = dict(sky0=(52, 98, 170), sky1=(196, 216, 236), snow=(247, 249, 252), rock=(118, 108, 102), alp=(146, 132, 112), veg=(140, 128, 104), haze=(186, 204, 226))
AFR = dict(sky0=(110, 160, 210), sky1=(226, 222, 206), snow=(246, 248, 251), rock=(112, 104, 98), alp=(132, 120, 96), veg=(152, 140, 92), haze=(212, 214, 208))
AND = dict(sky0=(88, 140, 205), sky1=(214, 222, 230), snow=(246, 248, 251), rock=(140, 112, 92), alp=(170, 140, 108), veg=(162, 136, 100), haze=(206, 210, 214))

SCENES = {
 "moleson":    dict(name="Moléson", summit=(46.5486, 7.0172), view=(46.6195, 7.0570), fov=16, snow=9999, tree=1700, pal=ALPS, eye=40, R=40000),
 "pilatus":    dict(name="Pilatus", summit=(46.9787, 8.2550), view=(47.0502, 8.3093), fov=20, snow=9999, tree=1700, pal=ALPS, eye=30, R=40000),
 "titlis":     dict(name="Titlis", summit=(46.7720, 8.4373), view=(46.8197, 8.4036), fov=34, snow=2750, tree=1800, pal=ALPS, eye=30, R=30000, sharpen=[(46.7728, 8.4361, 3238, 160)]),
 "trio":       dict(name="Eiger · Mönch · Jungfrau", summit=(46.5586, 7.9975), view=(46.6517, 7.9117), fov=34, snow=2900, tree=1900, pal=ALPS, eye=10, R=45000, sharpen=[(46.5369, 7.9622, 4158, 180)]),
 "dentblanche":dict(name="Dent Blanche", summit=(46.0342, 7.6119), view=(46.0610, 7.5480), fov=40, snow=2950, tree=1900, pal=ALPS, eye=10, R=30000, sharpen=[(46.0339, 7.6117, 4357, 170)]),
 "cervin":     dict(name="Cervin", summit=(45.9763, 7.6586), view=(46.0207, 7.7491), fov=26, snow=3000, tree=2100, pal=ALPS, eye=40, R=35000, sharpen=[(45.9767, 7.6567, 4478, 220)]),
 "montblanc":  dict(name="Mont Blanc", summit=(45.8326, 6.8652), view=(45.8967, 6.6417), fov=36, snow=2800, tree=1900, pal=ALPS, eye=40, R=45000),
 "kilimanjaro":dict(name="Kilimandjaro", summit=(-3.0758, 37.3533), view=(-2.6500, 37.2600), fov=30, snow=5600, tree=2600, pal=AFR, eye=20, R=90000, haze_km=70),
 "aconcagua":  dict(name="Aconcagua", summit=(-32.6532, -70.0109), view=(-32.8125, -69.9431), fov=26, snow=5200, tree=0, pal=AND, eye=10, R=45000, haze_km=60, sharpen=[(-32.6533, -70.0117, 6961, 200)]),
 "k2":         dict(name="K2", summit=(35.8825, 76.5133), view=(35.7439, 76.5142), fov=30, snow=5400, tree=0, pal=HIMA, eye=10, R=40000, haze_km=70, sharpen=[(35.8808, 76.5125, 8611, 200)]),
 "everest":    dict(name="Everest", summit=(27.9881, 86.9250), view=(28.1965, 86.8275), fov=30, snow=5800, tree=0, pal=HIMA, eye=10, R=45000, haze_km=70, sharpen=[(27.9892, 86.9256, 8849, 220)]),
}

if __name__ == "__main__":
    keys = sys.argv[3].split(",") if len(sys.argv) > 3 else list(SCENES)
    out = sys.argv[2] if len(sys.argv) > 2 else "."
    for k in keys:
        sc = SCENES[k]
        r = render(sc)
        img = shade(sc, r)
        Image.fromarray(img).save(f"{out}/{k}.png")
        print(k, "ok", f"eye {r['eye']:.0f} m")
