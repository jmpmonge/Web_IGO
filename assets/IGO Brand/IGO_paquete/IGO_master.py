#!/usr/bin/env python3
"""
IGO — Plano vectorial paramétrico exacto.
Todas las dimensiones derivan del diámetro exterior D de la G y la O.
Los parámetros matemáticos se leen de IGO_parameters.json (independiente del código).

Uso:  python IGO_master.py [D] [carpeta_salida]
      (por defecto D = 1000 unidades; en el DXF 1 unidad = 1 mm)
Requisitos: cairosvg (SVG/PDF/PNG), ezdxf (DXF), numpy + pillow (verificación).
"""
import math, sys, os, io, json


# ---------------- PARÁMETROS (se leen de IGO_parameters.json) ----------------
def _cargar(ruta=None):
    ruta = ruta or os.path.join(os.path.dirname(os.path.abspath(__file__)), "IGO_parameters.json")
    data = json.load(open(ruta, encoding="utf-8"))
    entorno = {"sqrt": math.sqrt, "__builtins__": {}}
    for k, v in data["constantes"].items():
        entorno[k] = eval(v["expresion"], entorno)
    return {k: float(eval(v["expresion"], dict(entorno))) for k, v in data["parametros"].items()}, entorno["phi"]

_P, PHI = _cargar()
K_TRAZO, APERTURA, K_BARRA = _P["K_TRAZO"], _P["APERTURA"], _P["K_BARRA"]
K_IG, K_GO, K_OVER, K_MARGEN = _P["K_IG"], _P["K_GO"], _P["K_OVER"], _P["K_MARGEN"]

def geometria(D):
    sw = K_TRAZO * D; h = sw / 2
    R = (D - sw) / 2; Ro, Ri = R + h, R - h
    g = dict(D=D, sw=sw, h=h, R=R, Ro=Ro, Ri=Ri,
             ang=APERTURA, L=K_BARRA * D, sIG=K_IG * D, sGO=K_GO * D,
             ov=K_OVER * D, pad=K_MARGEN * D)
    g["xI"] = g["pad"] + h
    g["cG"] = g["xI"] + h + g["sIG"] + Ro
    g["cO"] = g["cG"] + Ro + g["sGO"] + Ro
    g["W"] = g["cO"] + Ro + g["pad"]
    g["H"] = D + 2 * g["pad"]
    g["cy"] = g["H"] / 2
    g["ancho_logo"] = g["cO"] + Ro - (g["xI"] - h)
    return g

f = lambda v: f"{v:.4f}"

# ---------------- SVG (contornos exactos, y hacia abajo) ----------------
def svg_paths(g):
    h, R, Ro, Ri, cy = g["h"], g["R"], g["Ro"], g["Ri"], g["cy"]
    xI, cG, cO, L, a = g["xI"], g["cG"], g["cO"], g["L"], g["ang"]
    pol = lambda c, r, d: (c + r * math.cos(math.radians(d)), cy + r * math.sin(math.radians(d)))
    yT = cy - Ro + g["ov"] + h; yB = cy + Ro - g["ov"] - h
    I = (f"M{f(xI-h)} {f(yT)} A{f(h)} {f(h)} 0 0 1 {f(xI+h)} {f(yT)} L{f(xI+h)} {f(yB)} "
         f"A{f(h)} {f(h)} 0 0 1 {f(xI-h)} {f(yB)} Z")
    po = pol(cG, Ro, -a); pi = pol(cG, Ri, -a)
    xi = cG + math.sqrt(Ri ** 2 - h ** 2); xb = cG + R - L
    G = (f"M{f(po[0])} {f(po[1])} A{f(Ro)} {f(Ro)} 0 1 0 {f(cG+Ro)} {f(cy)} "
         f"A{f(h)} {f(h)} 0 0 0 {f(cG+R)} {f(cy-h)} L{f(xb)} {f(cy-h)} "
         f"A{f(h)} {f(h)} 0 0 0 {f(xb)} {f(cy+h)} L{f(xi)} {f(cy+h)} "
         f"A{f(Ri)} {f(Ri)} 0 1 1 {f(pi[0])} {f(pi[1])} "
         f"A{f(h)} {f(h)} 0 0 0 {f(po[0])} {f(po[1])} Z")
    O = (f"M{f(cO+Ro)} {f(cy)} A{f(Ro)} {f(Ro)} 0 1 0 {f(cO-Ro)} {f(cy)} A{f(Ro)} {f(Ro)} 0 1 0 {f(cO+Ro)} {f(cy)} Z "
         f"M{f(cO+Ri)} {f(cy)} A{f(Ri)} {f(Ri)} 0 1 1 {f(cO-Ri)} {f(cy)} A{f(Ri)} {f(Ri)} 0 1 1 {f(cO+Ri)} {f(cy)} Z")
    return I, G, O

def svg(g, color="#141B24", fondo=None):
    I, G, O = svg_paths(g)
    bg = f'<rect width="{f(g["W"])}" height="{f(g["H"])}" fill="{fondo}"/>' if fondo else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(g["W"])}" height="{f(g["H"])}" '
            f'viewBox="0 0 {f(g["W"])} {f(g["H"])}">{bg}<g fill="{color}">'
            f'<path d="{I}"/><path d="{G}"/><path d="{O}" fill-rule="evenodd"/></g></svg>')

# ---------------- DXF (arcos y rectas reales, y hacia arriba) ----------------
def dxf(g, ruta):
    import ezdxf
    doc = ezdxf.new("R2010"); doc.units = 4  # mm
    doc.layers.add("IGO_CONTORNO", color=5); doc.layers.add("IGO_CONSTRUCCION", color=8)
    m = doc.modelspace(); C = {"layer": "IGO_CONTORNO"}; K = {"layer": "IGO_CONSTRUCCION"}
    h, R, Ro, Ri, a, L = g["h"], g["R"], g["Ro"], g["Ri"], g["ang"], g["L"]
    x0 = g["xI"] - h
    xI, cG, cO = g["xI"] - x0, g["cG"] - x0, g["cO"] - x0   # origen: borde izquierdo de la I, eje = y 0
    yT = Ro - g["ov"] - h
    # I
    m.add_arc((xI, yT), h, 0, 180, dxfattribs=C); m.add_arc((xI, -yT), h, 180, 360, dxfattribs=C)
    m.add_line((xI - h, -yT), (xI - h, yT), dxfattribs=C); m.add_line((xI + h, -yT), (xI + h, yT), dxfattribs=C)
    # O
    m.add_circle((cO, 0), Ro, dxfattribs=C); m.add_circle((cO, 0), Ri, dxfattribs=C)
    # G
    phi_i = math.degrees(math.asin(h / Ri)); xb = cG + R - L; xi = cG + math.sqrt(Ri ** 2 - h ** 2)
    P = (cG + R * math.cos(math.radians(a)), R * math.sin(math.radians(a)))
    m.add_arc((cG, 0), Ro, a, 360, dxfattribs=C)                 # exterior
    m.add_arc((cG, 0), Ri, a, 360 - phi_i, dxfattribs=C)         # interior
    m.add_arc((cG + R, 0), h, 0, 90, dxfattribs=C)               # unión exterior arco-barra
    m.add_line((cG + R, h), (xb, h), dxfattribs=C)               # barra, borde superior
    m.add_line((xb, -h), (xi, -h), dxfattribs=C)                 # barra, borde inferior
    m.add_arc((xb, 0), h, 90, 270, dxfattribs=C)                 # remate de la barra
    m.add_arc(P, h, a - 180, a, dxfattribs=C)                    # remate superior de la G
    # construcción
    for c in (cG, cO): m.add_circle((c, 0), R, dxfattribs=K)
    m.add_line((-0.2 * g["D"], 0), (g["ancho_logo"] + 0.2 * g["D"], 0), dxfattribs=K)
    m.add_line((cG, 0), P, dxfattribs=K)
    doc.saveas(ruta)

# ---------------- Verificación (mide el SVG rasterizado) ----------------
def verificar(g, escala=None):
    import cairosvg, numpy as np
    from PIL import Image
    s = escala or 2000 / g["D"]
    png = cairosvg.svg2png(bytestring=svg(g, "#000").encode(), output_width=int(g["W"] * s),
                           output_height=int(g["H"] * s), background_color="white")
    m = np.array(Image.open(io.BytesIO(png)).convert("L")) < 128
    row = m[int(g["cy"] * s)]; runs = []; dentro = False
    for x, v in enumerate(row):
        if v and not dentro: ini = x; dentro = True
        if not v and dentro: runs.append((ini, x)); dentro = False
    huecos = [(runs[i + 1][0] - runs[i][1]) / s for i in range(len(runs) - 1)]
    col = m[:, int(g["cO"] * s)]; ys = np.where(col)[0]
    colI = m[:, int(g["xI"] * s)]; yi = np.where(colI)[0]
    barra = (g["cG"] + g["R"]) - (runs[2][0] / s + g["h"])
    return {
        "Diámetro D": (g["D"], (ys.max() - ys.min() + 1) / s),
        "Trazo": (g["sw"], None),
        "Hueco I–G = φ^-2,5·D": (g["sIG"], huecos[0]),
        "Hueco G–O = φ^-3,5·D": (g["sGO"], huecos[2]),
        "Relación I–G / G–O = φ": (PHI, huecos[0] / huecos[2]),
        "Barra G = φ^-2·D": (g["L"], barra),
        "Apertura G (°)": (g["ang"], None),
        "Altura I = D − 2·ajuste": (g["D"] - 2 * g["ov"], (yi.max() - yi.min() + 1) / s),
        "Tolerancia de medida": (1 / s, None),
    }

if __name__ == "__main__":
    D = float(sys.argv[1]) if len(sys.argv) > 1 else 1000.0
    out = sys.argv[2] if len(sys.argv) > 2 else "."
    os.makedirs(out, exist_ok=True)
    g = geometria(D)
    open(os.path.join(out, "IGO_master.svg"), "w").write(svg(g))
    dxf(g, os.path.join(out, "IGO_manufacturing.dxf"))
    try:
        import cairosvg
        cairosvg.svg2pdf(bytestring=svg(g).encode(), write_to=os.path.join(out, "IGO_master.pdf"))
        v = verificar(g)
        json.dump({k: {"formula": a, "medido": b} for k, (a, b) in v.items()},
                  open(os.path.join(out, "verificacion.json"), "w"), indent=1, ensure_ascii=False)
        for k, (a, b) in v.items():
            print(f"{k:28s} fórmula {a:10.4f}   medido {'' if b is None else f'{b:10.4f}'}")
    except ImportError:
        print("cairosvg no instalado: se generan solo SVG y DXF")
