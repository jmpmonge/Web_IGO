import sys, math, cairosvg
sys.path.insert(0,'paquete')
import importlib.util
spec=importlib.util.spec_from_file_location("m","paquete/IGO_master.py"); M=importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
PHI=M.PHI; D=1000.0; NAVY="#141B24"; GRIS="#6B7280"
def font(w):
    f=TTFont('fonts/Jost.ttf'); return instancer.instantiateVariableFont(f,{"wght":w})
F500=font(500); F400=font(400)
def glyph_paths(f, text, cap_h, x0, base_y, total_w=None, tracking=0):
    gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    capH=f['OS/2'].sCapHeight or 700; s=cap_h/capH
    names=[cmap[ord(c)] for c in text]
    # anchos ópticos reales (contorno), no avance
    def bbox(n):
        bp=BoundsPen(gs); gs[n].draw(bp); return bp.bounds
    if total_w is not None:   # justificar: primer borde en x0, último borde en x0+total_w, espacios iguales entre contornos
        ws=[]; 
        for n in names:
            b=bbox(n); ws.append((b[2]-b[0])*s if b else 0)
        gap=(total_w-sum(ws))/(len(names)-1)
    out=""; x=x0
    for i,n in enumerate(names):
        b=bbox(n)
        pen=SVGPathPen(gs)
        if total_w is not None:
            ox=x-b[0]*s
            tp=TransformPen(pen,(s,0,0,-s,ox,base_y)); gs[n].draw(tp)
            x+= (b[2]-b[0])*s + gap
        else:
            tp=TransformPen(pen,(s,0,0,-s,x,base_y)); gs[n].draw(tp)
            x+= gs[n].width*s + tracking
        out+=f'<path d="{pen.getCommands()}"/>'
    return out, x
def text_width(f,text,cap_h):
    gs=f.getGlyphSet(); cmap=f.getBestCmap(); s=cap_h/(f['OS/2'].sCapHeight or 700)
    return sum(gs[cmap[ord(c)]].width for c in text)*s
g=M.geometria(D)
I,G,O=M.svg_paths(g)
x_left=g["xI"]-g["h"]; logo_w=g["ancho_logo"]; logo_bottom=g["cy"]+g["Ro"]
CAP=PHI**-4*D        # altura de mayúscula del descriptor
GAP=PHI**-3*D        # separación logo-descriptor
TAG=PHI**-5*D        # altura de mayúscula de la línea de presentación
def lockup(desc, tagline=None, color=NAVY, fondo=None, tagcolor=GRIS):
    base=logo_bottom+GAP+CAP
    paths,_=glyph_paths(F500, desc, CAP, x_left, base, total_w=logo_w)
    extra=""
    H=base+g["pad"]
    if tagline:
        tb=base+GAP*0.8+TAG
        tw=text_width(F400,tagline,TAG)
        tp,_=glyph_paths(F400, tagline, TAG, x_left+(logo_w-tw)/2, tb)
        extra=f'<g fill="{tagcolor}">{tp}</g>'; H=tb+g["pad"]
    W=g["W"]; bg=f'<rect width="{W:.2f}" height="{H:.2f}" fill="{fondo}"/>' if fondo else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.2f}" height="{H:.2f}" viewBox="0 0 {W:.2f} {H:.2f}">{bg}'
            f'<g fill="{color}"><path d="{I}"/><path d="{G}"/><path d="{O}" fill-rule="evenodd"/>{paths}</g>{extra}</svg>'), W, H
import os; os.makedirs("submarcas",exist_ok=True)
for name,desc,tag in (("WELLNESS","WELLNESS","Biometría y bienestar"),("VISION","VISION","Percepción e IA")):
    s,W,H=lockup(desc); open(f"submarcas/IGO_{name}.svg","w").write(s)
    cairosvg.svg2pdf(bytestring=s.encode(), write_to=f"submarcas/IGO_{name}.pdf")
    s2,W,H=lockup(desc,tag,fondo="#FFFFFF"); open(f"submarcas/IGO_{name}_presentacion.svg","w").write(s2)
    cairosvg.svg2png(bytestring=s2.encode(), write_to=f"submarcas/IGO_{name}_presentacion.png", output_width=1600)
    s3,W,H=lockup(desc,tag,color="#FFFFFF",fondo=NAVY,tagcolor="#9CA3AF")
    cairosvg.svg2png(bytestring=s3.encode(), write_to=f"submarcas/IGO_{name}_negativo.png", output_width=1600)
    open(f"submarcas/IGO_{name}_negativo.svg","w").write(s3)
print("CAP",CAP,"GAP",GAP,"TAG",TAG)
