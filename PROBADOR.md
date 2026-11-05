# Probador de gafas IGO: estado de la versión definitiva

Documento de referencia de `probador/tryon.js` (≈2.440 líneas), `probador/tryon.css` y `probador/index.html`.
Versión congelada el 29/10/2026 (copias `*.bak-DEFINITIVA-20261029` en `probador/`). Publicado en `/probador/`.

Sirve para tres cosas: saber **qué hace**, saber **qué se hizo bien y no se debe tocar**, y saber **qué se probó y falló**.

---

## 1. Características

### 1.1 Qué es
Probador virtual de gafas en el navegador, 100 % en el dispositivo del usuario: la cámara no se sube a ningún servidor.

- **Detección de cara:** MediaPipe FaceLandmarker (GPU, con respaldo a CPU), 1 cara, 478 puntos, blendshapes y matriz facial activos.
- **Dibujado:** Three.js r170 sobre un canvas transparente encima del vídeo.
- **Todo local:** MediaPipe (`wasm` y `face_landmarker.task`), Three.js y las tipografías están en `probador/vendor/`. No hay CDN, así que funciona sin depender de terceros.
- **Idiomas:** ES, EN y FR (`STRINGS`). Se elige con `?lang=` o por el idioma del navegador.

### 1.2 Modos de uso
| Modo | Qué hace |
|---|---|
| Activar cámara | Vídeo en directo con seguimiento continuo. |
| Hacer foto | Congela el fotograma con las gafas puestas. |
| Subir foto | Aplica las gafas a una imagen (modo `image`, calibra el lado con 1 muestra en vez de 5). |

### 1.3 Modelos
- **Sport Casual** (`vision`, línea Vision) y **Sport Mask** (`shield`). Se cargan desde `probador/models/sport-casual.glb` y `sport-mask.glb` (`loadGlasses`); las patillas son los nodos `temple_left` / `temple_right`. `buildVisionGlasses` y `buildShieldGlasses` son la construcción por código del mismo diseño.
- Medidas de referencia del modelo: `MODEL_LENS_SPAN = 6.45`, `MODEL_FACE_SPAN = 11.5`, `FACE_TO_CANTHUS = 1.53`.

### 1.4 Panel de producto (formato Meta)
A la derecha de la cámara en escritorio (columnas `1fr / 21.5rem`, sticky) y debajo en móvil:
logotipo IGO, nombre grande, línea fina, frase clave, selector de modelo (botones redondeados), datos (cámara integrada, manos libres, color y talla, disponibilidad) y un botón grande.

- **Botón:** regla fija en `updateInfo()` / `amazonUrl()`:
  - Si en `localStorage['igo-operaciones-v1'].productos` hay una entrada `gafas` (línea `vision`) con una URL **https** de Amazon → "Comprar en Amazon".
  - Si no → "Solicitar acceso anticipado", que lleva a `../<idioma>/#early-access`.
- La web está en prelanzamiento: **sin precio, sin colores y sin compra directa**.

### 1.5 Parámetros de URL (para afinar sin tocar código)
| Parámetro | Defecto | Efecto |
|---|---|---|
| `?_yk=` | 0.4 | Cuánta profundidad de giro (yaw) se conserva en el marco (0–1). |
| `?_sg=` | 0.35 | Corrección de tamaño al girar la cabeza. |
| `?_nf=` | 0.06 | Desplazamiento del puente hacia delante al girar. |
| `?_tw=` | 1 | Giro extra de las patillas (0 = apagado). |
| `?_bd=` | 4 | Banda muerta del parpadeo en grados (0–15). |
| `?_sync=0` | activo | Muestra el vídeo en vivo en vez del fotograma analizado. |
| `?_fov=` | auto | Fuerza el campo de visión de la cámara. |
| `?_debug` | – | Muestra un HUD con FOV, resolución y estado de parpadeo. |
| `?lang=` | auto | `es`, `en` o `fr`. |

Variables de depuración en `window`: `__IGO_BLINK__`, `__IGO_BRIDGE__`, `__IGO_FOV__`, `__IGO_SCALE_INFO__`, `__IGO_NOSE__`, `__IGO_LAST_FACE__`.

---

## 2. Cómo funciona (tubería por fotograma)

Orden real en `detectOnVideoFrame` → `handleResult` → `applyFaceMatrix`:

1. **Fotograma sincronizado.** Solo cuando el vídeo trae un fotograma nuevo (`currentTime` cambia) se pinta ese fotograma en el `<canvas id="frame">` (`paintAnalysedFrame`) **justo antes** de analizarlo. Lo que ve el usuario es exactamente lo que se analizó.
2. **Lado izquierdo/derecho calibrado una vez** (`handSign`). Se calcula con 5 fotogramas claros seguidos y no se vuelve a decidir. Una lectura contradictoria no cambia nada: se mantiene la última pose como mucho 200 ms y, si no vuelve a ser coherente, se ocultan las gafas.
3. **Marco rígido de la cara desde landmarks** (no desde la matriz de MediaPipe):
   - Eje X = línea de ojos (33 ↔ 263).
   - Eje Y = frente–barbilla (10 ↔ 152).
   - Eje Z = producto vectorial de ambos. Su componente de profundidad se atenúa con `YAW_KEEP`.
   - Si la base sale volteada o colapsada (`basisOk`), se mantiene la última pose y no se planta el marco en la frente.
4. **Roll corregido sobre la línea de ojos en 2D**, con tope de 0,2 rad por fotograma (un pico de un solo fotograma no puede volcar toda la inclinación).
5. **Parpadeo** (ver 3.5): se detecta y se mantiene el ángulo dentro de una banda muerta.
6. **Tamaño:** mezcla del ancho de cara (234↔454) y de la distancia entre comisuras, medida en pantalla (XY) y dividida por lo que el giro oculta (`SCALE_TURN`). La parte de comisuras entra solo como **ratio muy lento** (`fCanthRatio`).
7. **Anclaje al puente de la nariz** (168 + 6, con `BRIDGE_ANCHOR_DY`): la posición X/Y sigue la nariz; la profundidad sigue el plano de los ojos para que las patillas lleguen a su sitio.
8. **Filtrado temporal:** OneEuro para posición (1.5 / 0.02), tamaño (1.0 / 0.01) y bloqueo del puente (2.5 / 0.3). La rotación usa slerp adaptativo a la velocidad: `OneEuro.alpha(2 + 4·velocidad)` con tope `max(0.6, 18·dt)`.
9. **Giro de patillas:** parte del giro real de la cabeza que el marco suavizado no tomó, aplicada solo a las patillas alrededor de la bisagra (`turnTemples`). Usa el mismo paso de suavizado que el marco para que patillas y frente nunca describan instantes distintos.
10. **Cámara en perspectiva** anclada en la cara (`setWebcamPerspective`, `anchorPerspectiveOnFace`); el campo de visión sale de una tabla por cámara (`CAM_FOV_TABLE`) o de valores por defecto: 70° escritorio, 75° móvil, 70° fotos. Límites 45–95°.
11. **Bloqueo del puente:** se proyecta el punto del puente del modelo y se desplaza el marco hasta que coincide con el landmark 168 (2 iteraciones, con presupuesto de píxeles y ganancia reducida si el giro aún no ha llegado).
12. **Oclusor de cabeza** (elipsoide detrás del marco) para que la patilla lejana quede tapada por la cabeza y la cercana se vea.

### Patillas
- Se recortan a `TEMPLE_STUB = 9.0` unidades más allá de la bisagra (`shortenTemples`) y se nivelan (`levelLowerTemple`) para que no queden "hacia dentro".
- `turnTemples` abre o cierra solo la patilla sin deformar el frente.

---

## 3. Lo que se hizo bien (no tocar sin motivo)

### 3.1 Un único criterio de izquierda/derecha
`handSign` se calibra una vez y todo lo demás lo usa. Antes cada parte decidía por su cuenta qué ojo era cuál y el modelo se **volteaba en pleno giro**.

### 3.2 Rotación desde landmarks, no desde la matriz de MediaPipe
Un único marco rígido (ojos, frente, barbilla) da posición, rotación y escala en el mismo espacio. Las mejoras de estabilidad vinieron de usar **siempre los mismos puntos coherentes**.

### 3.3 Sincronizar lo que se ve con lo que se analiza
El `<video>` va unos milisegundos por delante del fotograma analizado, y eso era **la causa principal del retardo**. Se midió por simulación: los filtros añaden como mucho 1 fotograma; el resto era desfase del vídeo. Dibujar el fotograma analizado en un canvas lo elimina.

### 3.4 Pocos filtros, bien elegidos
Un filtro de posición, uno de tamaño, uno de bloqueo y el slerp de rotación. Cada capa añadida extra introducía retardo o saltos.

### 3.5 Parpadeo sin movimiento
Detección por tres señales (apertura del párpado relativa a la línea base, blendshapes `eyeBlinkLeft/Right` y caída brusca por fotograma). Durante el parpadeo:
- Tamaño, ratio y profundidad se **mantienen**.
- El ángulo se queda dentro de una **banda muerta de 4°** y solo se sigue el exceso. Así un giro real no se frena y un parpadeo por sí solo no mueve nada.
- Se libera en 0,1 s al reabrir, o a los 0,8 s si es un guiño largo (se re-calibra para no volver a dispararse).
- El tamaño no depende de las comisuras de forma directa.

### 3.6 Corrección de escala al girar
El ancho 3D de la cara crece con la profundidad entre mejillas y hacía "inflar" las gafas al girar. Se mide el ancho **en pantalla** y se compensa con `1 / cos(yaw)` a un 35 % (`SCALE_TURN`), con `cos` acotado a ≥ 0,55.

### 3.7 Pérdida de cara sin parpadeos visuales
Si no hay pose coherente, se oculta (`hideGlasses`) y se reinician los filtros al volver, para no arrastrar basura.

### 3.8 Proceso de trabajo
Cambios de uno en uno y **copia de seguridad antes de cada uno**. Cada versión estable se guardó con nombre. Esto salvó el proyecto cuando varias mejoras seguidas empeoraron el resultado.

---

## 4. Lo que hay que evitar (probado y falló)

| Qué | Por qué falló | Qué se hizo |
|---|---|---|
| Decidir izquierda/derecha en cada fotograma | El modelo se volteaba al girar. | Calibración única (`handSign`). |
| Un 4.º filtro de rotación ("acepta el candidato en la cuarta lectura") | Provocaba un salto retardado aunque la persistencia no demostrara que fuera correcto. | Eliminado. Solo queda la comprobación de base válida + slerp. |
| Usar las mejillas (234/454) para el eje X | Hacía rodar el marco. | Los dos marcos usan la línea de ojos. |
| Usar el iris/pupila para la altura | El párpado mueve la pupila: las gafas subían y bajaban al parpadear. | `PUPIL_Y_WEIGHT = 0`. |
| Meter la anchura de comisuras directamente en el tamaño | El parpadeo arrastra esos puntos ±5 % y las gafas cambiaban de tamaño. | Solo entra un ratio filtrado muy lento. |
| Congelar todo durante el parpadeo | También congelaba un giro real. | Banda muerta de 4° en el ángulo. |
| Usar el ancho 3D de la cara sin corregir | Inflaba las gafas al girar. | Medida XY + corrección con `cos(yaw)`. |
| Mostrar el `<video>` en vivo bajo un overlay de otro fotograma | Retardo visible de las gafas. | Canvas con el fotograma analizado. |
| Más suavizado para ganar estabilidad | Cada filtro extra añadía retardo. | Parámetros ajustados con simulación a 30 fps. |
| Oclusor de nariz (`NOSE_OCCLUDER`) | Meta no oculta la montura tras la nariz. | Desactivado (`false`). |
| Recorte de patilla por la oreja (`TEMPLE_EAR_CLIP`) | Patillas cortadas o parpadeantes. | Desactivado (`false`); se usa el recorte fijo `TEMPLE_STUB`. |
| Encuadre automático (`AUTO_FRAME`) | Se prefirió una vista más amplia y fija. | Desactivado. |
| Restaurar "la versión buena" copiando backups o reaplicando ediciones | Las copias no contenían la buena y los reintentos empeoraron el resultado. | Guardar con nombre **cada** versión estable desde el momento en que se acepta. |

### Trampas de publicación
- `scripts/build.js` copia `probador/` tal cual a `dist/probador/`, **incluidos los `.bak*`**. No los subas a GitHub (peso y ruido). En el commit del 29/10 se excluyeron.
- `*.mp4` y `assets/videos/` estaban en `.gitignore`. La Home los usa, así que el despliegue en GitHub falló hasta que se dejaron de ignorar (PR #3). Si aparece un recurso que existe en local pero no en el repo, revisa `.gitignore` primero.
- Tras cualquier cambio en `probador/`, **reconstruir** con `node scripts/build.js`. `dist/probador/tryon.js` es la copia que se sirve.
- Cuando pruebes en local, recarga con **Cmd+Shift+R** (caché).
- La cámara solo funciona en HTTPS o `localhost`.

---

## 5. Cómo tocarlo con seguridad

1. Copia la versión actual: `cp probador/tryon.js probador/tryon.js.bak-antes-<cambio>`.
2. Cambia **una sola cosa**.
3. `node scripts/build.js` y recarga con Cmd+Shift+R.
4. Prueba con tu cara: de frente, giros a los dos lados, inclinación, parpadeo quieto, parpadeo girando, moverse rápido y con poca luz.
5. Si empeora, vuelve a la copia. No encadenes el siguiente cambio sin aceptar el anterior.
6. Si es mejor, guárdalo con nombre (`...-ESTABLE-<fecha>`).

Para afinar un comportamiento, **primero con el parámetro de URL** (`_yk`, `_sg`, `_nf`, `_tw`, `_bd`) y, solo si hace falta, cambiar el valor por defecto en el código.

### Copias de seguridad relevantes (en `probador/`)
- `*.bak-DEFINITIVA-20261029` (JS, CSS, HTML): **versión definitiva**.
- `tryon.js.bak-ESTABLE-parpadeo-panel-20261029`: igual que la definitiva en JS.
- `tryon.js.bak-ESTABLE-sync-fotograma-20261029`: antes de la banda muerta del parpadeo.
- `tryon.js.bak-MEJOR-patillas-alineadas-20261029`: seguimiento y patillas alineadas, antes del panel y la sincronización.
- `tryon.js.bak-estable-seguimiento-perfecto-20261029`: seguimiento estable antes de las patillas.
- Anteriores: `...antes-parpadeo-quieto`, `...antes-sync-fotograma`, `...antes-panel`, `...antes-giro-patillas`, `...antes-giro-vivo-parpadeo`, `...antes-filtro-cuarta-rotacion`.

---

## 6. Pendiente

- Botón "Comprar en Amazon": solo aparece al guardar una URL https para las gafas en `localStorage`. Mientras no exista, el panel pide acceso anticipado.
- Solo se ha probado con una persona y una cámara. Si otro usuario nota movimiento al parpadear, el primer ajuste es subir `?_bd=` a 5–6.
- El enlace del puntero del submódulo `igo/operaciones/web` en el repo `Creador_web` sigue apuntando a un commit anterior.
