/**
 * IGO virtual try-on — MediaPipe FaceLandmarker + three.js
 *
 * NOTE (internal): procedural glasses are PROVISIONAL stand-ins until final GLB assets
 * ship. Set MODELS[id].glb to a URL and the loader will prefer it; otherwise the
 * procedural builder runs. Do not surface this note in the UI.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  FaceLandmarker,
  FilesetResolver,
} from './vendor/mediapipe/vision_bundle.mjs';

/* -------------------------------------------------------------------------- */
/* i18n                                                                       */
/* -------------------------------------------------------------------------- */

const STRINGS = {
  es: {
    kicker: 'IGO',
    title: 'Pruébatelas virtualmente',
    lead: 'Elige un modelo y activa la cámara para ver cómo te quedan.',
    visionDesc: 'Cada día. En cualquier lugar.',
    shieldDesc: 'Rendimiento. Sin límites.',
    visionLine: 'Gafas inteligentes para llevar cada día.',
    shieldLine: 'El mismo sistema, con un frontal más cerrado.',
    feat1T: 'Cámara integrada',
    feat1: 'Fotos y vídeo desde tu punto de vista, sin sacar el móvil.',
    feat2T: 'Manos libres',
    feat2: 'Controla las gafas con la voz o con un toque en la patilla.',
    modelT: 'Modelo',
    colorT: 'Color y talla',
    note: 'Se publicarán con el producto.',
    availT: 'Disponibilidad',
    availSoon: 'Próximamente. Sin precio y sin compra por ahora.',
    availAmazon: 'Disponible en Amazon',
    ctaEarly: 'Solicitar acceso anticipado',
    ctaAmazon: 'Comprar en Amazon',
    placeholder: 'Activa la cámara para empezar',
    activateCam: 'Activar cámara',
    stopCam: 'Detener cámara',
    takePhoto: 'Hacer foto',
    uploadPhoto: 'Subir una foto',
    privacy: 'La imagen se procesa en tu dispositivo. No se envía ni se guarda.',
    loading: 'Cargando…',
    startingCam: 'Abriendo cámara…',
    noFace: 'No se detecta ninguna cara. Acércate y mírala de frente.',
    faceOk: 'Cara detectada',
    camDenied: 'No hay permiso de cámara. Puedes subir una foto.',
    camMissing: 'Este dispositivo no tiene cámara. Sube una foto para probarte las gafas.',
    camError: 'No se pudo abrir la cámara. Prueba a subir una foto.',
    processing: 'Procesando foto…',
    photoSaved: 'Foto descargada',
    switchModel: 'Modelo cambiado',
  },
  en: {
    kicker: 'IGO',
    title: 'Try them on virtually',
    lead: 'Pick a model and turn on your camera to see how they look on you.',
    visionDesc: 'Every day. Anywhere.',
    shieldDesc: 'Performance. No limits.',
    visionLine: 'Smart glasses for every day.',
    shieldLine: 'The same system, with a closer frame.',
    feat1T: 'Built-in camera',
    feat1: 'Photos and video from your point of view, phone in your pocket.',
    feat2T: 'Hands-free',
    feat2: 'Control the glasses by voice or with a tap on the temple.',
    modelT: 'Model',
    colorT: 'Colour and size',
    note: 'Will be published with the product.',
    availT: 'Availability',
    availSoon: 'Coming soon. No price and no orders yet.',
    availAmazon: 'Available on Amazon',
    ctaEarly: 'Request early access',
    ctaAmazon: 'Buy on Amazon',
    placeholder: 'Turn on the camera to start',
    activateCam: 'Turn on camera',
    stopCam: 'Stop camera',
    takePhoto: 'Take photo',
    uploadPhoto: 'Upload a photo',
    privacy: 'The image is processed on your device. Nothing is uploaded or stored.',
    loading: 'Loading…',
    startingCam: 'Opening camera…',
    noFace: 'No face detected. Move closer and look straight ahead.',
    faceOk: 'Face detected',
    camDenied: 'Camera permission denied. You can upload a photo instead.',
    camMissing: 'No camera on this device. Upload a photo to try the glasses on.',
    camError: 'Could not open the camera. Try uploading a photo.',
    processing: 'Processing photo…',
    photoSaved: 'Photo downloaded',
    switchModel: 'Model changed',
  },
  fr: {
    kicker: 'IGO',
    title: 'Essayez-les virtuellement',
    lead: 'Choisissez un modèle et activez la caméra pour voir le rendu.',
    visionDesc: 'Chaque jour. Partout.',
    shieldDesc: 'Performance. Sans limites.',
    visionLine: 'Des lunettes connectées pour tous les jours.',
    shieldLine: 'Le même système, avec une monture plus enveloppante.',
    feat1T: 'Caméra intégrée',
    feat1: 'Photos et vidéos de votre point de vue, sans sortir le téléphone.',
    feat2T: 'Mains libres',
    feat2: "Contrôlez les lunettes à la voix ou d'une touche sur la branche.",
    modelT: 'Modèle',
    colorT: 'Couleur et taille',
    note: 'Seront publiées avec le produit.',
    availT: 'Disponibilité',
    availSoon: "Bientôt disponible. Pas de prix ni de commande pour l'instant.",
    availAmazon: 'Disponible sur Amazon',
    ctaEarly: "Demander l'accès anticipé",
    ctaAmazon: 'Acheter sur Amazon',
    placeholder: 'Activez la caméra pour commencer',
    activateCam: 'Activer la caméra',
    stopCam: 'Arrêter la caméra',
    takePhoto: 'Prendre une photo',
    uploadPhoto: 'Importer une photo',
    privacy: "L'image est traitée sur votre appareil. Elle n'est ni envoyée ni enregistrée.",
    loading: 'Chargement…',
    startingCam: 'Ouverture de la caméra…',
    noFace: 'Aucun visage détecté. Approchez-vous et regardez face à la caméra.',
    faceOk: 'Visage détecté',
    camDenied: "Permission caméra refusée. Vous pouvez importer une photo.",
    camMissing: "Pas de caméra sur cet appareil. Importez une photo pour essayer les lunettes.",
    camError: "Impossible d'ouvrir la caméra. Essayez d'importer une photo.",
    processing: 'Traitement de la photo…',
    photoSaved: 'Photo téléchargée',
    switchModel: 'Modèle changé',
  },
};

function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && STRINGS[q]) return q;
  const html = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
  if (STRINGS[html]) return html;
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'es';
}

let lang = detectLang();
document.documentElement.lang = lang;

function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.es[key] || key;
}

function applyStrings() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.title = `${t('title')} — IGO`;
}

/* -------------------------------------------------------------------------- */
/* Models config — set `glb` to swap procedural mesh for a real asset         */
/* -------------------------------------------------------------------------- */

const MODELS = {
  vision: {
    id: 'vision',
    // glb: './models/igo-vision.glb', // ← uncomment / set when final asset is ready
    glb: './models/sport-casual.glb',
    build: buildVisionGlasses,
  },
  shield: {
    id: 'shield',
    // glb: './models/igo-shield.glb',
    glb: './models/sport-mask.glb',
    build: buildShieldGlasses,
  },
};

/* -------------------------------------------------------------------------- */
/* Procedural glasses (provisional)                                           */
/* Units ≈ centimetres, origin at nose bridge, +X right, +Y up, +Z toward cam */
/* Eye-span reference used by applyFaceMatrix: MODEL_EYE_WIDTH                 */
/* -------------------------------------------------------------------------- */

/** Outer-canthus reference (temple width / frame span helper). */
const MODEL_EYE_WIDTH = 8.2;
/** Local-X distance between lens optical centres (Vision half*2 = 6.45). Used to scale to iris span. */
const MODEL_LENS_SPAN = 6.45;
/** Local lens-centre offsets (wearer +X = right). */
const MODEL_LENS_LOCAL = { left: -MODEL_LENS_SPAN / 2, right: MODEL_LENS_SPAN / 2, bridgeY: 0 };
/** Outer-canthus span ≈ 1.43 × interpupillary distance → scale is driven by the rigid 3D canthus span (gaze-independent). */
const CANTHUS_TO_PD = 1.43;
const MODEL_CANTHUS_SPAN = MODEL_LENS_SPAN * CANTHUS_TO_PD;
/** Extra offset (model units ≈ cm) of the frame in front of the eye plane, along the face's own Z axis. Tune if frames look too close/far. */
const GLASSES_Z_OFFSET = 1.0;
/** Extra vertical offset (cm) along the face's own Y axis (+ = up). */
const GLASSES_Y_OFFSET = 0.0;
/** Size reference: the Sport Casual front (2 × 6.22 cm) should span ≈ 1.0 × the face width at landmarks 234↔454.
 *  Every model uses the same head scale, so wider fronts (Sport Mask 2 × 6.82) stay a touch wider. */
/** Emulated webcam perspective: horizontal field of view of the full video frame (typical laptop/phone
 *  front camera ≈ 60–70°). The camera sits on the video's optical axis at the focal distance, so the
 *  glasses' anchor plane maps 1:1 to stage px (frontal fit unchanged) while nearer parts (near lens)
 *  grow and farther parts (far lens, temples) shrink and converge — like the real image. 0 = orthographic. */
const WEBCAM_HFOV_DEG = 1; // > 0 → perspective camera; the actual angle comes from camFov below.
/* ---- Real camera field of view (auto) ----
 * The emulated perspective must match the real camera, otherwise a turned head looks under-rotated
 * (old fixed 40° was much narrower than real front cameras ≈ 65–80°).
 * Angle is defined on the LONG side of the video frame (orientation-proof: a portrait phone stream
 * has its long side vertical; same lens, same angle). Source priority:
 *   1. ?_fov=NN (URL override, long side, degrees)
 *   2. known camera model from the track label (table below)
 *   3. device class: desktop / laptop 70°, phone / tablet front camera 75°
 * Face-only estimation (iris, PnP on the mesh) was tested on synthetic cameras of known angle and
 * is too weak to beat the defaults (MediaPipe landmarks keep only ~60 % of the perspective cue and
 * face shape varies per person): it is NOT used. Clamped 45–95°, eased in tan space on change. */
const _qs = new URLSearchParams(location.search);
const FOV_OVERRIDE = (() => { const v = parseFloat(_qs.get('_fov')); return Number.isFinite(v) && v > 0 ? v : null; })();
const FOV_DEBUG = _qs.has('_debug');
const FOV_DESKTOP = 70;
const FOV_MOBILE = 75;
const FOV_PHOTO = 70; // uploaded photos: unknown camera; typical phone ≈ 65–75° on the long side
const FOV_MIN = 45;
const FOV_MAX = 95;
/** [label regex, long-side degrees] — published specs (diagonal converted to 16:9 long side). */
const CAM_FOV_TABLE = [
  [/C92[025]|C615|StreamCam/i, 70],   // Logitech C920/C922/C925e (78° diag), C615, StreamCam
  [/C930|BRIO|MX Brio/i, 82],          // Logitech C930e / Brio default (90° diag)
  [/C27[0-9]|C31[0-9]|C525|C505/i, 50],// Logitech C270/C310/C505 (55–60° diag)
  [/Kiyo/i, 72],                       // Razer Kiyo (81.6° diag)
];
const camFov = { target: FOV_DESKTOP, cur: null, src: 'fallback-desktop', label: '', tLast: 0 };
function isMobileDevice() {
  try {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean' && navigator.userAgentData.mobile) return true;
    const ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua)) return true;
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true; // iPadOS desktop UA
    return Boolean(window.matchMedia?.('(pointer: coarse)').matches && navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches);
  } catch { return false; }
}
function pickCameraFov(track) {
  const clamp = (v) => Math.max(FOV_MIN, Math.min(FOV_MAX, v));
  let label = '';
  let facing = '';
  try { label = track?.label || ''; facing = track?.getSettings?.().facingMode || ''; } catch {}
  camFov.label = label;
  if (FOV_OVERRIDE != null) { camFov.target = clamp(FOV_OVERRIDE); camFov.src = 'url ?_fov'; }
  else {
    const hit = CAM_FOV_TABLE.find(([re]) => re.test(label));
    if (hit) { camFov.target = hit[1]; camFov.src = 'model: ' + label.slice(0, 40); }
    else if (isMobileDevice() || facing === 'user' && /front|frontal|avant|vorder|anteriore|facing front/i.test(label)) {
      camFov.target = FOV_MOBILE; camFov.src = 'fallback-mobile';
    } else { camFov.target = FOV_DESKTOP; camFov.src = 'fallback-desktop'; }
  }
  if (camFov.cur == null) camFov.cur = camFov.target;
  return camFov.target;
}
pickCameraFov(null);
/** Current long-side FOV (deg); eases toward the target in tan(fov/2) (≈ focal) space, τ ≈ 0.35 s. */
function currentFovLong(tNow) {
  if (mode === 'image') return FOV_OVERRIDE != null ? Math.max(FOV_MIN, Math.min(FOV_MAX, FOV_OVERRIDE)) : FOV_PHOTO;
  if (camFov.cur == null) camFov.cur = camFov.target;
  const dt = camFov.tLast ? Math.min(0.5, Math.max(0, tNow - camFov.tLast)) : 0;
  camFov.tLast = tNow;
  if (camFov.cur !== camFov.target) {
    const a = 1 - Math.exp(-dt / 0.35);
    const t0 = Math.log(Math.tan(camFov.cur * Math.PI / 360));
    const t1 = Math.log(Math.tan(camFov.target * Math.PI / 360));
    const t = t0 + (t1 - t0) * a;
    camFov.cur = Math.abs(t1 - t) < 1e-4 ? camFov.target : Math.atan(Math.exp(t)) * 360 / Math.PI;
  }
  return camFov.cur;
}
/* ---- Blink freeze ----
 * Eyelids distort size, eye-plane depth and the eye-line angle (≈ 2°). While an eye is closing / closed
 * those inputs are held at the values from 2 frames before the closing was detected, then blended back
 * to live. The angle is held only inside BLINK_DEADBAND: a real turn beyond it is followed (the part
 * past the dead band), so the nose lock and the angle never describe two different instants. */
const BLINK_CLOSE_ABS = 0.26;  // lid gap / eye width
const BLINK_CLOSE_REL = 0.75;  // × open-eye baseline
const BLINK_OPEN_ABS = 0.29;
const BLINK_OPEN_REL = 0.85;
const BLINK_BS_CLOSE = 0.5;    // blendshape eyeBlinkLeft/Right
const BLINK_BS_OPEN = 0.35;
const BLINK_DROP = 0.12;       // per-frame lid-gap drop (× baseline) = eye starting to close
const BLINK_RELEASE_S = 0.1;
const BLINK_MAX_HOLD_S = 0.8;  // longer = squint / closed on purpose → track live again
/* How far (degrees) the head angle may differ from the pre-blink one before it is followed during a blink.
 * A blink moves the eye landmarks ≈ 2°, so 4° ignores it and still lets a real turn through. ?_bd= overrides. */
const BLINK_DEADBAND = (() => { const v = parseFloat(new URLSearchParams(location.search).get('_bd')); return (Number.isFinite(v) ? Math.max(0, Math.min(15, v)) : 4) * Math.PI / 180; })();
const blink = { base: null, prevR: null, closed: false, since: 0, relT: 0, ring: [], held: null };
const _bhQ = new THREE.Quaternion();
/** Held angle plus only the part of the change beyond the dead band; then eased to live as the blink ends (w: 0 held … 1 live). */
function blinkHoldQuat(held, live, w) {
  const ang = held.angleTo(live);
  _bhQ.copy(held);
  if (ang > BLINK_DEADBAND) _bhQ.slerp(live, (ang - BLINK_DEADBAND) / ang);
  return _bhQ.clone().slerp(live, w);
}
function blinkHoldNumber(held, live, w) {
  const d = live - held;
  const dead = BLINK_DEADBAND * 0.7;
  const out = Math.abs(d) > dead ? held + Math.sign(d) * (Math.abs(d) - dead) : held;
  return out + (live - out) * w;
}
let lastBlinkBS = { l: -1, r: -1 };
/* Nose-bridge anchor: the frame's front centre (model bridge) is placed on the nose bridge
 * (mean of landmarks 168 + 6) so it follows the nose when the head turns. Frame depth and the
 * temples / ear aim are unchanged. BRIDGE_ANCHOR_DY (model units, face frame) = measured frontal
 * offset of the eye-corner centre below that point, so the frontal fit stays where it was.
 * BRIDGE_ANCHOR_WEIGHT 0 = old eye-corner anchor. */
const BRIDGE_ANCHOR_WEIGHT = 1.0;
const BRIDGE_ANCHOR_DY = -0.19;
const MODEL_BRIDGE_FRONT_Z = 0.35; // model bridge front face (local z)
/* Nose-bridge LOCK (screen space, after rotation + perspective + smoothing): the model point
 * BRIDGE_LOCK_LOCAL (bridge front, frontal-calibrated height) is projected and the frame is translated
 * so it lands exactly on the (lightly filtered) top of the nose, landmark 168, at every pose and while moving. */
const BRIDGE_LOCK = true;
const BRIDGE_LOCK_LOCAL = [0, 0.435, MODEL_BRIDGE_FRONT_Z];
/* MediaPipe's mesh nose is shallower than a real nose: on a turned head the projected landmark 168 lands a few px
 * toward the near cheek, inside the face, instead of on the real nose-bridge silhouette (measured on yaw photos:
 * ~4–5 % of the 2D eye span at 33–35°). The lock target is pushed forward along the head's facing axis by
 * NOSE_FWD × head span, so it rides on the real nose ridge. Frontal: the facing axis points at the camera → 0 px shift.
 * ?_nf= overrides it. */
const NOSE_FWD = (() => { const v = parseFloat(new URLSearchParams(location.search).get('_nf')); return Number.isFinite(v) ? v : 0.06; })();
/* Fraction of the head turn the frame copies. 1 is the full turn. Lower stays closer to the
   frontal pose; the bridge lock still follows the nose. Try ?_yk=0.25 or ?_yk=0.6. */
const YAW_KEEP = (() => { const v = parseFloat(new URLSearchParams(location.search).get('_yk')); const g = Number.isFinite(v) ? v : 0.4; return Math.max(0, Math.min(1, g)); })();
/* The frame only keeps YAW_KEEP of the head turn, so a temple fixed to it points toward the camera
 * instead of toward the ear. Each temple is turned alone, around its own hinge, by the part of
 * the turn the frame did not take. 0 = off (arms follow the frame), 1 = arms follow the real head.
 * The frame, the bridge lock and the size are not touched. ?_tw= overrides. */
const TEMPLE_TURN = (() => { const v = parseFloat(new URLSearchParams(location.search).get('_tw')); const g = Number.isFinite(v) ? v : 1; return Math.max(0, Math.min(1.5, g)); })();
/* How much of the turn is added back into the size. 1 restores the full width and, because the
 * facing estimate falls faster than the on-screen face, the whole frame grows. 0 leaves the
 * foreshortened width. ?_sg= overrides it. */
const SCALE_TURN = (() => { const v = parseFloat(new URLSearchParams(location.search).get('_sg')); const g = Number.isFinite(v) ? v : 0.35; return Math.max(0, Math.min(1, g)); })();
/* Pupil height cue: lens line follows the pupils (468/473) relative to the nose bridge, smoothed
 * (One Euro), clamped (gaze), and HELD while an eye is closed (blink-safe). PUPIL_LENS_DY is the
 * frontal calibration so the frontal fit stays put; PUPIL_Y_WEIGHT 0 = fixed BRIDGE_ANCHOR_DY. */
const PUPIL_Y_WEIGHT = 0; // 0%: glasses must not move with blinks/eyelids
const PUPIL_LENS_DY = -0.03; // mean frontal pupil offset vs nose bridge (model units)
const PUPIL_DY_CLAMP = 0.3;
const EYE_OPEN_MIN = 0.2; // lid gap / eye width below this = closed (blink)
const MODEL_FACE_SPAN = 11.5; // was 12.45: glasses ~8% bigger (user request)
/** Typical 3D face width (234↔454) ÷ outer-canthus span (33↔263). Lets both baselines be blended into one size. */
const FACE_TO_CANTHUS = 1.53;
/** Weight of the face-edge width in the size estimate (rest = eye corners). Both are blink-independent. */
const FACE_SPAN_WEIGHT = 0.6;

function acetateMat(color = 0x0a0a0c) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    reflectivity: 0.6,
    envMapIntensity: 1.35,
  });
}

function smokeLensMat() {
  // Dark smoke — semi-transparent so eyes stay faintly visible
  return new THREE.MeshPhysicalMaterial({
    color: 0x22252c,
    metalness: 0.15,
    roughness: 0.08,
    transmission: 0.72,
    transparent: true,
    opacity: 0.42,
    ior: 1.52,
    thickness: 0.4,
    envMapIntensity: 1.8,
    specularIntensity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function blueMirrorMat(map = null) {
  // Blue mirrored shield — reflective, eyes faintly visible
  return new THREE.MeshPhysicalMaterial({
    color: 0x2a7ad4,
    map,
    metalness: 0.7,
    roughness: 0.08,
    transmission: 0.48,
    transparent: true,
    opacity: 0.55,
    ior: 1.5,
    thickness: 0.55,
    envMapIntensity: 2.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function cameraDot(x, y, z) {
  const g = new THREE.Group();
  const bezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.3, metalness: 0.6 }),
  );
  bezel.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 20),
    new THREE.MeshStandardMaterial({
      color: 0x101830,
      emissive: 0x4a78e0,
      emissiveIntensity: 0.85,
      metalness: 0.95,
      roughness: 0.1,
    }),
  );
  lens.position.z = 0.07;
  g.add(bezel, lens);
  g.position.set(x, y, z);
  return g;
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
}

/** Bend a geometry into a gentle cylindrical wrap (for shield). */
function bendGeometry(geo, radius = 9.5) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const theta = v.x / radius;
    const z0 = v.z;
    v.x = Math.sin(theta) * radius;
    v.z = radius - Math.cos(theta) * radius + z0;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildVisionGlasses() {
  // Provisional: IGO Vision — black square acetate, two lenses + bridge.
  const root = new THREE.Group();
  root.name = 'igo-vision';
  const mat = acetateMat(0x0c0c0e);
  const lensM = smokeLensMat();

  // ~5 mm rim (0.5 cm), rounded-square openings
  const lensW = 4.9;
  const lensH = 3.55;
  const rim = 0.5; // ~5 mm
  const gap = 1.55; // bridge clear span between openings
  const half = gap / 2 + lensW / 2; // lens-centre X

  function eyeRim(sign) {
    const g = new THREE.Group();
    const outer = roundedRectShape(lensW + rim * 2, lensH + rim * 2, 0.62);
    const inner = roundedRectShape(lensW, lensH, 0.38);
    outer.holes.push(inner);
    const geo = new THREE.ExtrudeGeometry(outer, {
      depth: 0.58,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.07,
      bevelSegments: 3,
      curveSegments: 12,
    });
    geo.translate(0, 0, -0.29);
    g.add(new THREE.Mesh(geo, mat));

    // Smoke lens inset in the opening
    const lens = new THREE.Mesh(
      new THREE.PlaneGeometry(lensW * 0.97, lensH * 0.97),
      lensM,
    );
    // Soft rounded feel via slightly inset Z
    lens.position.z = 0.02;
    g.add(lens);

    g.position.x = sign * half;
    return g;
  }

  root.add(eyeRim(-1), eyeRim(1));

  // Bridge (top of nose)
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(gap + 0.15, 0.42, 0.4), mat);
  bridge.position.set(0, lensH * 0.28, 0.02);
  root.add(bridge);

  // Nose pads
  [-1, 1].forEach((sign) => {
    const pad = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.65 }),
    );
    pad.rotation.z = sign * 0.35;
    pad.position.set(sign * 0.48, -0.35, 0.38);
    root.add(pad);
  });

  // Temples
  [-1, 1].forEach((sign) => {
    const temple = new THREE.Group();
    temple.userData.isTemple = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 12.5), mat);
    arm.position.set(0, 0, -6.0);
    arm.rotation.y = sign * 0.03;
    temple.add(arm);

    const hinge = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.6, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.85, roughness: 0.28 }),
    );
    hinge.position.set(sign * 0.12, 0, 0.05);
    temple.add(hinge);

    if (sign === 1) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 128, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 22px Jost, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IGO', 64, 16);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.38),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
      );
      label.position.set(0.22, 0, -3.0);
      label.rotation.y = Math.PI / 2;
      temple.add(label);
    }

    temple.position.set(
      sign * (half + lensW / 2 + rim + 0.05),
      lensH * 0.12,
      0,
    );
    root.add(temple);
  });

  // Camera at top outer corner of wearer's right frame (+X)
  root.add(cameraDot(half + lensW * 0.32, lensH * 0.42, 0.32));

  root.position.set(0, 0.0, 0.35);
  // Outer edge of rims incl. bevel + hinge (builder-local units), for frame-width checks
  root.userData.frontHalfWidth = half + lensW / 2 + rim + 0.07;
  return root;
}

function buildShieldGlasses() {
  // Provisional: Vision Shield — single wraparound shield, nose notch, blue mirror.
  // ShapeGeometry for clean UVs (gradient/reflections); mild cylindrical bend.
  const root = new THREE.Group();
  root.name = 'igo-shield';
  const mat = acetateMat(0x101218);

  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 200);
  grad.addColorStop(0.0, '#041428');
  grad.addColorStop(0.2, '#0e4f9a');
  grad.addColorStop(0.42, '#9fd0ff');
  grad.addColorStop(0.55, '#1f78d0');
  grad.addColorStop(0.78, '#0c3c78');
  grad.addColorStop(1.0, '#020c1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  const shine = ctx.createRadialGradient(320, 70, 8, 300, 90, 200);
  shine.addColorStop(0, 'rgba(255,255,255,0.7)');
  shine.addColorStop(0.3, 'rgba(180,220,255,0.25)');
  shine.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const lensM = blueMirrorMat(tex);

  const W = 13.4;
  const H = 4.7;
  const hw = W / 2;
  const hh = H / 2;
  const shape = new THREE.Shape();
  // Sport shield outline — arched top, wrap ends, CLEAR nose cutout
  shape.moveTo(-hw + 1.4, hh - 0.2);
  shape.quadraticCurveTo(0, hh + 0.35, hw - 1.4, hh - 0.2);
  shape.quadraticCurveTo(hw + 0.05, hh - 0.35, hw - 0.15, hh - 1.1);
  shape.lineTo(hw - 0.35, -hh + 1.35);
  shape.quadraticCurveTo(hw - 0.5, -hh + 0.25, hw - 1.7, -hh + 0.2);
  shape.lineTo(1.4, -hh + 0.2);
  // Deep-enough nose notch so it reads from the selfie view
  shape.lineTo(0.75, -hh + 0.25);
  shape.quadraticCurveTo(0.55, -hh + 0.35, 0.45, -hh + 1.25);
  shape.lineTo(0.3, -hh + 1.85);
  shape.quadraticCurveTo(0, -hh + 2.2, -0.3, -hh + 1.85);
  shape.lineTo(-0.45, -hh + 1.25);
  shape.quadraticCurveTo(-0.55, -hh + 0.35, -0.75, -hh + 0.25);
  shape.lineTo(-1.4, -hh + 0.2);
  shape.lineTo(-hw + 1.7, -hh + 0.2);
  shape.quadraticCurveTo(-hw + 0.5, -hh + 0.25, -hw + 0.35, -hh + 1.35);
  shape.lineTo(-hw + 0.15, hh - 1.1);
  shape.quadraticCurveTo(-hw - 0.05, hh - 0.35, -hw + 1.4, hh - 0.2);

  // Front lens (ShapeGeometry → correct UVs for gradient)
  let lensGeo = new THREE.ShapeGeometry(shape, 48);
  bendGeometry(lensGeo, 9.2);
  const lens = new THREE.Mesh(lensGeo, lensM);
  lens.position.z = 0.28;
  root.add(lens);

  // Thin dark rim around the same silhouette (reads as frame edge)
  const rimShape = shape.clone();
  // approximate outer rim by scaling points is hard; use Extrude of a stroked path via separate brow + sides
  const browShape = roundedRectShape(W - 1.2, 0.4, 0.12);
  let browGeo = new THREE.ExtrudeGeometry(browShape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 8,
  });
  browGeo.translate(0, 0, -0.16);
  bendGeometry(browGeo, 9.2);
  const brow = new THREE.Mesh(browGeo, mat);
  brow.position.set(0, hh - 0.08, 0.35);
  root.add(brow);

  const edgeX = hw * 0.9;
  [-1, 1].forEach((sign) => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.5, 0.6), mat);
    side.position.set(sign * edgeX, 0.2, 0.05);
    side.rotation.y = -sign * 0.55;
    root.add(side);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 11.0), mat);
    arm.position.set(sign * (edgeX + 0.2), 1.0, -4.5);
    arm.rotation.y = sign * 0.08;
    arm.userData.isTemple = true;
    root.add(arm);
  });

  // Nose pad block sitting in the notch
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 0.5), mat);
  bridge.position.set(0, -0.2, 1.05);
  root.add(bridge);
  [-1, 1].forEach((sign) => {
    const pad = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.7 }),
    );
    pad.position.set(sign * 0.4, -0.65, 1.15);
    pad.rotation.z = sign * 0.28;
    root.add(pad);
  });

  root.add(cameraDot(0, hh + 0.02, 0.5));
  root.position.set(0, 0.06, 0.22);
  root.scale.setScalar(1.06);
  // Bent shield outer edge (builder-local, before the 1.1 root scale)
  root.userData.frontHalfWidth = Math.sin(hw / 9.2) * 9.2 + 0.17;
  return root;
}

/* -------------------------------------------------------------------------- */
/* Three.js scene                                                             */
/* -------------------------------------------------------------------------- */

const videoEl = document.getElementById('video');
/* The live video is a few frames newer than the one the face was measured on (the measurement takes time),
 * so glasses drawn on top of it trail the head. The analysed frame is copied to this canvas just before the
 * detection and the canvas covers the video: image and glasses are then from the same instant.
 * ?_sync=0 goes back to showing the live video, to compare. */
const SYNC_FRAME = new URLSearchParams(location.search).get('_sync') !== '0';
const frameEl = document.getElementById('frame');
const frameCtx = frameEl && SYNC_FRAME ? frameEl.getContext('2d') : null;
if (frameEl && !frameCtx) frameEl.style.display = 'none';
/** Copy the video's current frame to the canvas. Same task as the detection, so it is the same frame. */
function paintAnalysedFrame() {
  if (!frameCtx) return;
  const w = videoEl.videoWidth, h = videoEl.videoHeight;
  if (!w || !h) return;
  if (frameEl.width !== w || frameEl.height !== h) { frameEl.width = w; frameEl.height = h; }
  try {
    frameCtx.drawImage(videoEl, 0, 0, w, h);
  } catch (err) {
    frameEl.style.display = 'none'; // cannot read the video here: keep showing the live one
  }
}
const stillEl = document.getElementById('still');
const overlayEl = document.getElementById('overlay');
const stageEl = document.getElementById('stage');
const statusEl = document.getElementById('status');
const btnCamera = document.getElementById('btn-camera');
const btnPhoto = document.getElementById('btn-photo');
const btnUpload = document.getElementById('btn-upload');
const modelBtns = document.querySelectorAll('.model-btn');

let renderer, scene, camera, glassesRoot, occluder, currentGlasses;
let noseOcc = null; // depth-only nose rebuilt each frame from the face mesh

/* Nose occluder: depth-only surface from the MediaPipe nose landmarks (same 3D space / perspective
 * as the glasses). Frontal: pushed far back (no effect, frontal fit unchanged). Turning the head
 * (|yaw| NOSE_YAW_ON → NOSE_YAW_FULL) it comes forward to NOSE_PUSH_SIDE behind the real nose
 * surface, so the bridge / pads stay on the nose and the far rim / lens behind the nose is hidden. */
const NOSE_OCCLUDER = false; // off (user: Meta doesn't hide the frame behind the nose)
const NOSE_PUSH_FRONT = 4.0; // model units behind the nose surface when frontal (inactive)
const NOSE_PUSH_SIDE = 1.0;  // model units behind the nose surface when turned, at the bridge (stays on the nose)
const NOSE_PUSH_SIDE_LOW = 0.3; // lower nose (sides / tip) when turned: hides the far rim / lens behind it
const NOSE_PUSH_Y_TOP = -0.5;   // local y (model units) above which the bridge push applies
const NOSE_PUSH_Y_LOW = -1.6;   // local y below which the lower push applies
const NOSE_YAW_ON = 8;       // deg
const NOSE_YAW_FULL = 20;    // deg
const NOSE_LMS = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2,
  122, 351, 193, 417, 196, 419, 3, 248, 236, 456, 198, 420, 131, 360, 49, 279, 48, 278,
  115, 344, 220, 440, 45, 275, 44, 274, 125, 354, 141, 370, 241, 461, 242, 462, 129, 358,
  64, 294, 98, 327, 97, 326, 99, 328, 60, 290, 75, 305, 79, 309, 218, 438, 237, 457,
  238, 458, 239, 459, 20, 250, 51, 281, 174, 399, 134, 363, 209, 429, 217, 437, 102, 331, 240, 460, 219, 439];

function buildNoseOccluder() {
  const conns = FaceLandmarker.FACE_LANDMARKS_TESSELATION || [];
  const idx = new Map(NOSE_LMS.map((v, i) => [v, i]));
  const adj = new Map();
  for (const c of conns) {
    const a = c.start, b = c.end;
    if (!idx.has(a) || !idx.has(b)) continue;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b); adj.get(b).add(a);
  }
  const tris = [];
  for (const [a, na] of adj) for (const b of na) if (b > a) for (const c of na) if (c > b && adj.get(b).has(c)) {
    tris.push(idx.get(a), idx.get(b), idx.get(c));
  }
  if (!tris.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NOSE_LMS.length * 3), 3));
  geo.setIndex(tris);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.DoubleSide }));
  m.renderOrder = -1;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}
/** Temples are clipped just behind the ear top (a real ear hides the hook). World-space plane, updated per frame. */
const templeClip = { r: new THREE.Plane(new THREE.Vector3(0, 0, 1), 1e4), l: new THREE.Plane(new THREE.Vector3(0, 0, 1), 1e4) };
/** Per-side "ear found" state. Temples are only cut when that side's ear is confidently in view;
 *  otherwise the full temple shows. `c` is the 0..1 cut blend (slides the clip plane = short fade). */
const earState = { r: { found: false, since: 0, c: 0, jit: 1 }, l: { found: false, since: 0, c: 0, jit: 1 } };
/** Clip behind the ear when found. Off: the behind-the-ear tail is removed from the GLBs instead,
 *  so the whole (straight) temple is always shown. Kept for reference/debug. */
const TEMPLE_EAR_CLIP = false;
const EAR_YAW_ON = (15 * Math.PI) / 180;  // head turned toward that side by more than this → ear in view
const EAR_YAW_OFF = (10 * Math.PI) / 180; // hysteresis
const EAR_HOLD = 0.15;    // s a condition must persist before switching state
const EAR_FADE = 0.25;    // s for the cut ↔ full transition
const EAR_JIT_MAX = 0.08; // max smoothed jitter of the raw ear point (face-half-width units)
const EAR_EDGE = 0.04;    // stage-width margin: the ear point must be at least this far inside the visible stage
/** Ear-top (helix root) estimate from the tragus-region landmarks 234/454, in face-half-width units H:
 *  up and back along the head frame. MediaPipe has no ear landmarks; validated on fake cams with visible ears. */
const EAR_TOP_UP = 0.28; // was 0.45 (user: ear point should sit lower)
const EAR_TOP_BACK = 0.6; // was 0.4
/** Clip this far (model cm) behind the ear-top point, so the arm visibly reaches the ear before ending. */
const EAR_CUT_BEHIND = 0.4;
/** Visible temple length behind the hinge, in model units. The straight arm stays;
 *  the curved ear end (past ~9) is what gets cut. Fixed to the frame, so it cannot shake. */
const TEMPLE_STUB = 9.0;
let faceLandmarker = null;
let activeModelId = 'vision';
let stream = null;
let mode = 'idle'; // idle | video | image
let rafId = 0;
let lastVideoTime = -1;
let statusTimer = 0;

// Pose smoothing
const smoothPos = new THREE.Vector3();
const smoothQuat = new THREE.Quaternion();
const smoothScale = new THREE.Vector3(1, 1, 1);
const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _rollQ = new THREE.Quaternion();
const _rollV = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
let hasPose = false;
let lastPoseT = 0;
/** Extra turn (rad, about the frame's up axis) given to the temples only, smoothed with the same step as the frame. */
let templeTurn = 0;
/** One correspondence for both model mirror and eye-axis direction; fixed per source session. */
let handSign = 0;
let handCandidate = 0;
let handSamples = 0;
let lastEyeOrderT = 0;
function resetEyeReference() {
  handSign = 0; handCandidate = 0; handSamples = 0; lastEyeOrderT = 0;
}

/** One Euro filter (Casiez et al.): heavy smoothing at rest, low lag when moving. */
class OneEuro {
  constructor(minCutoff, beta, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.reset();
  }
  reset() { this.xPrev = null; this.dxPrev = 0; this.tPrev = 0; }
  static alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(x, tSec) {
    if (this.xPrev === null) { this.xPrev = x; this.dxPrev = 0; this.tPrev = tSec; return x; }
    const dt = Math.max(1e-3, tSec - this.tPrev);
    this.tPrev = tSec;
    const dx = (x - this.xPrev) / dt;
    const dxHat = this.dxPrev + OneEuro.alpha(this.dCutoff, dt) * (dx - this.dxPrev);
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const xHat = this.xPrev + OneEuro.alpha(cutoff, dt) * (x - this.xPrev);
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }
}
// Units: stage CSS px (position, span). Tuned for ~30-60 fps webcam detection.
const fPosX = new OneEuro(1.5, 0.02);
const fPosY = new OneEuro(1.5, 0.02);
const fPosZ = new OneEuro(1.5, 0.02);
const fSpan = new OneEuro(1.0, 0.01);
const fPupDy = new OneEuro(1.0, 0.02);
const fLockX = new OneEuro(2.5, 0.3); // responsive: low lag on fast moves, steady when still
const fLockY = new OneEuro(2.5, 0.3);
const fCanthRatio = new OneEuro(0.15, 0);
let pupDyHeld = null;
// Ear-top points in model units. Heavy filter: the ear is guessed, and a light filter makes the temple shake.
const fEar = { r: [new OneEuro(0.35, 0), new OneEuro(0.35, 0), new OneEuro(0.35, 0)],
               l: [new OneEuro(0.35, 0), new OneEuro(0.35, 0), new OneEuro(0.35, 0)] };
/* Auto-framing: the landscape webcam is cover-cropped into a portrait stage, so only ~40%
   of its width is visible. Pan the crop (CSS object-position, in UNMIRRORED media space)
   slowly so the face stays centred. 0..1 like object-position %, 0.5 = centred crop.
   The landmark→stage mapping and the photo use the same fractions, so glasses stay aligned. */
const AUTO_FRAME = false;   // disabled (user preferred a wider, static view); crop stays centred
const FRAME_DEAD_X = 0.07;   // stage-width fraction of off-centre tolerated before panning
const FRAME_DEAD_Y = 0.06;
const FRAME_TAU = 0.8;       // s, ease time constant
const FRAME_MAX_SPEED = 0.6; // max pan speed in stage widths / s
const FRAME_FACE_Y = 0.42;   // where the eyes should sit vertically (fraction of stage height)
const frame = { px: 0.5, py: 0.5, tx: 0.5, ty: 0.5, panning: false, t: 0 };
/** Match the stage aspect to the media (clamped 3:4 … 16:9) so a landscape webcam shows its full width
 *  and a portrait phone camera stays portrait. Renderer/overlay follow via ensureRendererSize(). */
function fitStageToMedia(w, h) {
  if (!stageEl) return;
  if (!w || !h) { stageEl.style.removeProperty('--stage-ar'); return; }
  const ar = Math.min(16 / 9, Math.max(3 / 4, w / h));
  stageEl.style.setProperty('--stage-ar', ar.toFixed(4));
}
function resetFrame() {
  resetEyeReference();
  frame.px = frame.py = frame.tx = frame.ty = 0.5; frame.panning = false; frame.t = 0;
  applyFrameStyle();
}
function applyFrameStyle() {
  const v = `${(frame.px * 100).toFixed(3)}% ${(frame.py * 100).toFixed(3)}%`;
  if (videoEl && videoEl.style.objectPosition !== v) videoEl.style.objectPosition = v;
  if (frameEl && frameEl.style.objectPosition !== v) frameEl.style.objectPosition = v;
}
/** Advance the pan toward the face. faceN = eye centre in normalised media coords (unmirrored).
 *  Returns the pan delta in stage px so pose filters can be shifted with the image. */
function updateFrame(faceN, cssW, cssH, dispW, dispH, tSec) {
  const ex = cssW - dispW, ey = cssH - dispH; // ≤ 0 overflow (offset = e * p)
  const dt = frame.t ? Math.min(0.1, Math.max(1e-3, tSec - frame.t)) : 0;
  frame.t = tSec;
  if (faceN) {
    // Face position on the stage with the current crop
    const sx = (ex * frame.px + faceN.x * dispW) / cssW;
    const sy = (ey * frame.py + faceN.y * dispH) / cssH;
    const offx = Math.abs(sx - 0.5), offy = Math.abs(sy - FRAME_FACE_Y);
    // Hysteresis: start panning when outside the dead zone, keep going until ~centred.
    if (offx > FRAME_DEAD_X || offy > FRAME_DEAD_Y) frame.panning = true;
    if (frame.panning) {
      const want = (ex < -0.5) ? (cssW * 0.5 - faceN.x * dispW) / ex : 0.5;
      const wantY = (ey < -0.5) ? (cssH * FRAME_FACE_Y - faceN.y * dispH) / ey : 0.5;
      frame.tx = Math.min(1, Math.max(0, want));
      frame.ty = Math.min(1, Math.max(0, wantY));
      if (offx < 0.015 && offy < 0.015) frame.panning = false;
    }
  }
  if (!dt) { applyFrameStyle(); return { dx: 0, dy: 0 }; }
  const a = 1 - Math.exp(-dt / FRAME_TAU);
  const lim = (d, e) => { const m = e < -0.5 ? (FRAME_MAX_SPEED * cssW * dt) / -e : 0; return Math.max(-m, Math.min(m, d)); };
  const px0 = frame.px, py0 = frame.py;
  // Sub-pixel remainder: stop instead of creeping (keeps the image perfectly still at rest).
  if (Math.abs((frame.tx - frame.px) * ex) > 0.5) frame.px += lim((frame.tx - frame.px) * a, ex);
  if (Math.abs((frame.ty - frame.py) * ey) > 0.5) frame.py += lim((frame.ty - frame.py) * a, ey);
  frame.px = Math.min(1, Math.max(0, frame.px));
  frame.py = Math.min(1, Math.max(0, frame.py));
  applyFrameStyle();
  return { dx: ex * (frame.px - px0), dy: ey * (frame.py - py0) };
}
/** Shift a OneEuro's state by d (when the whole image pans) so it doesn't lag the pan. */
function shiftFilter(f, d) { if (f.xPrev !== null) f.xPrev += d; }

function resetPoseFilters() {
  fPosX.reset(); fPosY.reset(); fLockX.reset(); fLockY.reset(); fCanthRatio.reset(); fPosZ.reset(); fSpan.reset(); fPupDy.reset(); pupDyHeld = null;
  templeTurn = 0;
  [...fEar.r, ...fEar.l].forEach((f) => f.reset());
  for (const st of Object.values(earState)) { st.found = false; st.since = 0; st.c = 0; st.jit = 1; }
  lastPoseT = 0;
}

function initThree() {
  renderer = new THREE.WebGLRenderer({
    canvas: overlayEl,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.localClippingEnabled = true; // temple clip behind the ear
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  // Orthographic overlay in normalized face-space; landmarks drive XY/scale, matrix drives rotation.
  camera = WEBCAM_HFOV_DEG > 0
    ? new THREE.PerspectiveCamera(40, 1, 0.01, 100)
    : new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  camera.position.set(0, 0, 10);

  // PMREM room env → glossy acetate + mirror lens highlights
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a4050, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(2.2, 4.5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.45);
  fill.position.set(-3, 1.2, 2.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(0, 2, -4);
  scene.add(rim);

  // Depth-only head occluder so temples hide behind the head
  const occGeo = new THREE.SphereGeometry(1, 32, 24);
  const occMat = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
  });
  occluder = new THREE.Mesh(occGeo, occMat);
  occluder.scale.set(0.55, 0.72, 0.6);
  occluder.position.set(0, -0.05, -0.15);
  occluder.renderOrder = -1;
  scene.add(occluder);
  if (NOSE_OCCLUDER) { noseOcc = buildNoseOccluder(); if (noseOcc) scene.add(noseOcc); }

  glassesRoot = new THREE.Group();
  glassesRoot.visible = false;
  scene.add(glassesRoot);

  resizeRenderer();
}

/** Current stage box in CSS px (layout size, unaffected by the scaleX(-1) on children). */
function stageCssSize() {
  // offsetWidth/Height ignore ancestor transforms; rect keeps sub-pixel precision.
  const r = stageEl.getBoundingClientRect();
  const w = r.width || stageEl.offsetWidth;
  const h = r.height || stageEl.offsetHeight;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

function currentDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * Size the drawing buffer to stage CSS px × DPR and fit the ortho frustum to the stage.
 * NOTE: three.js setSize()/setViewport() take CSS px and apply the pixel ratio internally.
 * (The old code passed cssW*pixelRatio to setViewport, so on Retina/DPR 2 the scene was
 * drawn 2× too big and anchored at the bottom-left of the GL buffer → huge frame on the forehead.)
 */
function resizeRenderer() {
  if (!renderer) return;
  const { w: cssW, h: cssH } = stageCssSize();
  const dpr = currentDpr();
  if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
  renderer.setSize(cssW, cssH, false); // also sets the full-canvas viewport (CSS px)
  renderer.setScissorTest(false);

  const aspect = cssW / cssH;
  if (camera.isPerspectiveCamera) {
    camera.aspect = aspect; // fov / position are set per pose in setWebcamPerspective()
  } else {
    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
  }
  camera.updateProjectionMatrix();
  window.__VIEWPORT__ = { cssW, cssH, aspect, dpr };
}

/** Re-fit the renderer if the stage box or DPR changed since the last resize (cheap, per frame). */
function ensureRendererSize() {
  const vp = window.__VIEWPORT__;
  const { w, h } = stageCssSize();
  if (!vp || Math.abs(vp.cssW - w) > 0.5 || Math.abs(vp.cssH - h) > 0.5 || vp.dpr !== currentDpr()) {
    resizeRenderer();
  }
}

/** Slice a mesh with a plane and close the hole. Kept vertices stay put, so the arm
 *  keeps its own angle. The cap is one flat face in the same material: no piled triangles. */
function clipTempleArm(mesh, planePoint, planeNormal) {
  const src = mesh.geometry;
  const pos = src.getAttribute('position');
  const nrm = src.getAttribute('normal');
  const index = src.getIndex();
  if (!pos) return;
  const inv = mesh.matrixWorld.clone().invert();
  const localPoint = planePoint.clone().applyMatrix4(inv);
  const localNormal = planeNormal.clone().transformDirection(inv);
  if (localNormal.lengthSq() < 1e-10) return;
  localNormal.normalize();
  const planeD = localPoint.dot(localNormal);
  const distOf = (v) => v.dot(localNormal) - planeD;
  const triCount = index ? index.count / 3 : pos.count / 3;
  const at = (i) => {
    const vi = index ? index.getX(i) : i;
    return {
      p: new THREE.Vector3().fromBufferAttribute(pos, vi),
      n: nrm ? new THREE.Vector3().fromBufferAttribute(nrm, vi) : localNormal.clone(),
    };
  };
  const outP = [];
  const outN = [];
  const segments = [];
  const EPS = 1e-5;
  const emit = (a, b, c) => {
    for (const v of [a, b, c]) {
      outP.push(v.p.x, v.p.y, v.p.z);
      outN.push(v.n.x, v.n.y, v.n.z);
    }
  };
  let crosses = false;
  for (let t = 0; t < triCount; t++) {
    const v = [at(t * 3), at(t * 3 + 1), at(t * 3 + 2)];
    const d = v.map((o) => distOf(o.p));
    const inside = d.map((x) => x <= EPS);
    const nIn = inside[0] + inside[1] + inside[2];
    if (nIn === 0) { crosses = true; continue; }
    if (nIn === 3) { emit(v[0], v[1], v[2]); continue; }
    crosses = true;
    const poly = [];
    const cuts = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (inside[i]) poly.push(v[i]);
      if (inside[i] !== inside[j]) {
        const denom = d[i] - d[j];
        const tt = Math.abs(denom) < 1e-12 ? 0 : d[i] / denom;
        const tc = Math.min(1, Math.max(0, tt));
        const p = v[i].p.clone().lerp(v[j].p, tc);
        const n = v[i].n.clone().lerp(v[j].n, tc);
        if (n.lengthSq() > 1e-10) n.normalize();
        poly.push({ p, n });
        cuts.push(p);
      }
    }
    if (poly.length >= 3) emit(poly[0], poly[1], poly[2]);
    if (poly.length === 4) emit(poly[0], poly[2], poly[3]);
    if (cuts.length === 2) segments.push(cuts);
  }
  if (!crosses) return; // the whole mesh is on the kept side of the cut
  if (outP.length < 9) { mesh.visible = false; return; } // entirely past the cut: the end piece

  const Q = 1e4;
  const keyOf = (p) => `${Math.round(p.x * Q)},${Math.round(p.y * Q)},${Math.round(p.z * Q)}`;
  const verts = new Map();
  const adj = new Map();
  const link = (a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (ka === kb) return;
    if (!verts.has(ka)) verts.set(ka, a);
    if (!verts.has(kb)) verts.set(kb, b);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    const na = adj.get(ka);
    const nb = adj.get(kb);
    if (!na.includes(kb)) na.push(kb);
    if (!nb.includes(ka)) nb.push(ka);
  };
  segments.forEach(([a, b]) => link(a, b));
  const used = new Set();
  const ek = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const capN = localNormal.clone();
  for (const start of adj.keys()) {
    const open = (adj.get(start) || []).filter((nb) => !used.has(ek(start, nb)));
    if (!open.length) continue;
    let prev = start;
    let cur = open[0];
    used.add(ek(start, cur));
    const loop = [start, cur];
    let closed = false;
    for (let guard = 0; guard < verts.size + 2; guard++) {
      let next = null;
      for (const nb of adj.get(cur) || []) {
        if (nb === prev || used.has(ek(cur, nb))) continue;
        next = nb;
        break;
      }
      if (next == null) break;
      used.add(ek(cur, next));
      if (next === start) { closed = true; break; }
      loop.push(next);
      prev = cur;
      cur = next;
    }
    if (!closed || loop.length < 3) continue;
    const pts = loop.map((k) => verts.get(k));
    const nn = new THREE.Vector3();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      nn.x += (a.y - b.y) * (a.z + b.z);
      nn.y += (a.z - b.z) * (a.x + b.x);
      nn.z += (a.x - b.x) * (a.y + b.y);
    }
    if (nn.dot(capN) < 0) pts.reverse();
    const c = new THREE.Vector3();
    pts.forEach((p) => c.add(p));
    c.multiplyScalar(1 / pts.length);
    const cv = { p: c, n: capN };
    for (let i = 0; i < pts.length; i++) {
      emit(cv, { p: pts[i], n: capN }, { p: pts[(i + 1) % pts.length], n: capN });
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  const prev = mesh.geometry;
  mesh.geometry = geo;
  prev.dispose();
}

function levelLowerTemple(root) {
  root.updateMatrixWorld(true);
  const found = [];
  const w = new THREE.Vector3();
  root.traverse((t) => {
    if (!t.userData?.isTemple) return;
    const tip = new THREE.Vector3(0, 0, -1).transformDirection(t.matrixWorld);
    if (tip.lengthSq() < 1e-8) return;
    tip.normalize();
    let arm = null;
    let span = 0;
    t.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const pa = o.geometry.attributes.position;
      let minA = Infinity;
      let maxA = -Infinity;
      for (let i = 0; i < pa.count; i++) {
        const a = w.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).dot(tip);
        if (a < minA) minA = a;
        if (a > maxA) maxA = a;
      }
      if (maxA - minA > span) { span = maxA - minA; arm = o; }
    });
    if (!arm) return;
    const pa = arm.geometry.attributes.position;
    let minA = Infinity;
    const pts = [];
    for (let i = 0; i < pa.count; i += 2) {
      w.fromBufferAttribute(pa, i).applyMatrix4(arm.matrixWorld);
      const a = w.dot(tip);
      if (a < minA) minA = a;
      pts.push({ a, y: w.y });
    }
    let n = 0, sa = 0, sy = 0, saa = 0, say = 0;
    pts.forEach((s) => {
      if (s.a > minA + TEMPLE_STUB) return;
      n++; sa += s.a; sy += s.y; saa += s.a * s.a; say += s.a * s.y;
    });
    const den = n * saa - sa * sa;
    if (n < 8 || Math.abs(den) < 1e-4) return;
    const hinge = new THREE.Vector3();
    let nh = 0;
    for (let i = 0; i < pa.count; i++) {
      w.fromBufferAttribute(pa, i).applyMatrix4(arm.matrixWorld);
      if (w.dot(tip) > minA + 0.45) continue;
      hinge.add(w);
      nh++;
    }
    if (!nh) return;
    hinge.multiplyScalar(1 / nh);
    found.push({ arm, tip, slope: (n * say - sa * sy) / den, hinge });
  });
  if (found.length < 2) return;
  found.sort((a, b) => a.slope - b.slope);
  const low = found[0];
  const high = found[found.length - 1];
  const delta = Math.atan(high.slope) - Math.atan(low.slope);
  if (delta < 0.03) return;
  const axis = new THREE.Vector3().crossVectors(low.tip, new THREE.Vector3(0, 1, 0));
  if (axis.lengthSq() < 1e-6) return;
  axis.normalize();
  const q = new THREE.Quaternion();
  let ang = delta;
  q.setFromAxisAngle(axis, ang);
  if (low.tip.clone().applyQuaternion(q).y < low.tip.y) ang = -delta;
  q.setFromAxisAngle(axis, ang);
  const inv = low.arm.matrixWorld.clone().invert();
  const pos = low.arm.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    w.fromBufferAttribute(pos, i).applyMatrix4(low.arm.matrixWorld);
    w.sub(low.hinge).applyQuaternion(q).add(low.hinge).applyMatrix4(inv);
    pos.setXYZ(i, w.x, w.y, w.z);
  }
  pos.needsUpdate = true;
  low.arm.geometry.computeVertexNormals();
}

function shortenTemples(root) {
  root.updateMatrixWorld(true);
  const tip = new THREE.Vector3();
  const world = new THREE.Vector3();
  root.traverse((t) => {
    if (!t.userData?.isTemple) return;
    // Square to the hinge, same 11° on both sides. Not toward the ear hook, which hangs down.
    tip.set(0, 0, -1).transformDirection(t.matrixWorld);
    if (tip.lengthSq() < 1e-8) return;
    tip.normalize();
    let arm = null;
    let armSpan = 0;
    t.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const pa = o.geometry.attributes.position;
      let minA = Infinity;
      let maxA = -Infinity;
      for (let i = 0; i < pa.count; i++) {
        const a = world.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).dot(tip);
        if (a < minA) minA = a;
        if (a > maxA) maxA = a;
      }
      const span = maxA - minA;
      if (span > armSpan) { armSpan = span; arm = o; }
    });
    if (!arm || armSpan < TEMPLE_STUB + 1) return;
    const pa = arm.geometry.attributes.position;
    let minA = Infinity;
    const along = new Float64Array(pa.count);
    for (let i = 0; i < pa.count; i++) {
      along[i] = world.fromBufferAttribute(pa, i).applyMatrix4(arm.matrixWorld).dot(tip);
      if (along[i] < minA) minA = along[i];
    }
    const hinge = new THREE.Vector3();
    let nH = 0;
    for (let i = 0; i < pa.count; i++) {
      if (along[i] > minA + 0.45) continue;
      hinge.add(world.fromBufferAttribute(pa, i).applyMatrix4(arm.matrixWorld));
      nH++;
    }
    if (!nH) return;
    hinge.multiplyScalar(1 / nH);
    // Same plane for every piece. The logo sits just past the arm cut and was left whole,
    // so it showed as a little end hook.
    const planePoint = hinge.clone().addScaledVector(tip, TEMPLE_STUB);
    t.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      clipTempleArm(o, planePoint, tip);
    });
  });
  levelLowerTemple(root);
}

/** Remember each temple's hinge (in its parent's space) so it can be turned alone later. */
function prepareTempleTurn(root) {
  root.updateMatrixWorld(true);
  const w = new THREE.Vector3();
  root.traverse((t) => {
    if (!t.userData?.isTemple || !t.parent) return;
    const tip = new THREE.Vector3(0, 0, -1).transformDirection(t.matrixWorld);
    if (tip.lengthSq() < 1e-8) return;
    tip.normalize();
    let arm = null;
    let span = 0;
    t.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const pa = o.geometry.attributes.position;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < pa.count; i++) {
        const a = w.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).dot(tip);
        if (a < lo) lo = a;
        if (a > hi) hi = a;
      }
      if (hi - lo > span) { span = hi - lo; arm = o; }
    });
    if (!arm) return;
    const pa = arm.geometry.attributes.position;
    let minA = Infinity;
    for (let i = 0; i < pa.count; i++) {
      const a = w.fromBufferAttribute(pa, i).applyMatrix4(arm.matrixWorld).dot(tip);
      if (a < minA) minA = a;
    }
    const hinge = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < pa.count; i++) {
      w.fromBufferAttribute(pa, i).applyMatrix4(arm.matrixWorld);
      if (w.dot(tip) > minA + 0.45) continue;
      hinge.add(w);
      n++;
    }
    if (!n) return;
    hinge.multiplyScalar(1 / n);
    const parentInv = t.parent.matrixWorld.clone().invert();
    const parentQ = new THREE.Quaternion();
    t.parent.matrixWorld.decompose(new THREE.Vector3(), parentQ, new THREE.Vector3());
    t.userData.turn = {
      pos: t.position.clone(),
      quat: t.quaternion.clone(),
      hinge: hinge.applyMatrix4(parentInv),
      axis: new THREE.Vector3(0, 1, 0).applyQuaternion(parentQ.invert()).normalize(),
    };
  });
}

const _turnQ = new THREE.Quaternion();
/** Turn every temple about its own hinge by `angle` (rad, around the glasses' own up axis). 0 = rest pose. */
function turnTemples(root, angle) {
  if (!root) return;
  root.traverse((t) => {
    const s = t.userData?.turn;
    if (!s) return;
    _turnQ.setFromAxisAngle(s.axis, angle);
    t.quaternion.copy(s.quat).premultiply(_turnQ);
    t.position.copy(s.pos).sub(s.hinge).applyQuaternion(_turnQ).add(s.hinge);
    t.updateMatrix();
  });
}

async function loadGlasses(id) {
  const cfg = MODELS[id];
  if (!cfg) return;

  // Clear previous
  while (glassesRoot.children.length) {
    const c = glassesRoot.children.pop();
    c.traverse?.((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    });
  }
  currentGlasses = null;

  if (cfg.glb) {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(cfg.glb);
      currentGlasses = gltf.scene;
      currentGlasses.name = `glb-${id}`;
    } catch (err) {
      console.warn('GLB load failed, falling back to procedural', err);
      currentGlasses = cfg.build();
    }
  } else {
    currentGlasses = cfg.build();
  }

  // Short rigid stub, same angle both sides. The ear hook is removed, not crushed onto the end.
  shortenTemples(currentGlasses);
  prepareTempleTurn(currentGlasses);
  glassesRoot.add(currentGlasses);
  activeModelId = id;
}

/* -------------------------------------------------------------------------- */
/* MediaPipe                                                                  */
/* -------------------------------------------------------------------------- */

async function initFaceLandmarker() {
  const wasmBase = new URL('./vendor/mediapipe/wasm', import.meta.url).href;
  const modelPath = new URL('./vendor/mediapipe/models/face_landmarker.task', import.meta.url).href;

  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(wasmBase);
  } catch (e) {
    console.warn('GPU wasm resolve issue, retry', e);
    fileset = await FilesetResolver.forVisionTasks(wasmBase);
  }

  const options = {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
    refineLandmarks: true,
  };

  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(fileset, options);
  } catch (e) {
    console.warn('GPU delegate failed, falling back to CPU', e);
    options.baseOptions.delegate = 'CPU';
    faceLandmarker = await FaceLandmarker.createFromOptions(fileset, options);
  }
}

async function setRunningMode(next) {
  if (!faceLandmarker) return;
  // VIDEO | IMAGE
  await faceLandmarker.setOptions({ runningMode: next });
}

/* -------------------------------------------------------------------------- */
/* Pose from facial transformation matrix                                     */
/* -------------------------------------------------------------------------- */

/** Perspective camera on the video's optical axis at focal distance f (stage px), placed so the plane
 *  z = zRef (world) maps exactly like the old orthographic overlay. Returns D = f in world units. */
function setWebcamPerspective(cssW, cssH, dispW, offX, offY, dispH, zRef, pxToWorld) {
  if (!camera.isPerspectiveCamera) return 0;
  // Focal length from the real camera's long-side angle; dispW/dispH already include the cover crop
  // (f_video · coverScale), so cropping does not change the perspective.
  const fovLong = currentFovLong(performance.now() / 1000);
  const fPx = (Math.max(dispW, dispH) / 2) / Math.tan((fovLong * Math.PI) / 360);
  const D = fPx * pxToWorld;
  // Principal point = video centre in centred stage px (0,0 when the video is centred).
  const ppx = (offX + dispW / 2 - cssW / 2) * pxToWorld;
  const ppy = (cssH / 2 - (offY + dispH / 2)) * pxToWorld;
  camera.aspect = cssW / cssH;
  camera.fov = (2 * Math.atan((cssH / 2) / fPx) * 180) / Math.PI;
  camera.near = D * 0.05;
  camera.far = D * 20;
  camera.position.set(ppx, ppy, zRef + D);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  // Off-axis shift so the principal point (not the stage centre) is on the optical axis.
  if (ppx || ppy) camera.setViewOffset(cssW, cssH, -ppx / pxToWorld, ppy / pxToWorld, cssW, cssH);
  else if (camera.view) camera.clearViewOffset();
  return D;
}

/** Drop the keystone that appears when the face is off the optical axis.
 *  The anchor plane (z = face.z) keeps its screen position. Depth still scales
 *  temples and the near lens, but that scale is around the face, so a frontal
 *  face sitting on the left of the frame no longer tucks its left side inward. */
function anchorPerspectiveOnFace(faceWorld) {
  if (!camera.isPerspectiveCamera) return;
  const te = camera.projectionMatrix.elements;
  const zf = faceWorld.z - camera.position.z;
  if (!(zf < -1e-4)) return;
  const fx = faceWorld.x - camera.position.x;
  const fy = faceWorld.y - camera.position.y;
  const m0 = te[0], m5 = te[5], m8 = te[8], m9 = te[9], m12 = te[12], m13 = te[13];
  te[8] = m0 * fx / zf + m8 + m12 / zf;
  te[12] = -m0 * fx;
  te[9] = m5 * fy / zf + m9 + m13 / zf;
  te[13] = -m5 * fy;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

/** World point from an image landmark at depth z: push it along its camera ray so the perspective camera
 *  projects it back onto its image position (orthographic stage px → perspective world). */
function unprojectToDepth(w, zRef, D) {
  if (!D) return w;
  const k = (D - (w.z - zRef)) / D;
  w.x = camera.position.x + (w.x - camera.position.x) * k;
  w.y = camera.position.y + (w.y - camera.position.y) * k;
  return w;
}

/** Place glasses from a rigid 3D face frame built from landmarks (pos / yaw / pitch / roll / scale in one space). */
function applyFaceMatrix(matrixData, landmarks) {
  window.__LAST_RAW_MAT = Array.from(matrixData);

  // MediaPipe: 33 = subject left outer canthus, 263 = subject right.
  // In an unmirrored facing-camera image, subject-left is image-right (higher x).
  const canthusL = landmarks[33];
  const canthusR = landmarks[263];
  const irisL = landmarks[468] || null; // subject left iris centre (refineLandmarks)
  const irisR = landmarks[473] || null; // subject right iris centre
  const bridge168 = landmarks[168];
  const bridge6 = landmarks[6];
  const bridge = (bridge168 && bridge6)
    ? { x: (bridge168.x + bridge6.x) * 0.5, y: (bridge168.y + bridge6.y) * 0.5 }
    : (bridge168 || bridge6 || canthusL);

  // Prefer iris centres for optical alignment; fall back to canthi.
  const eyeL = irisL || canthusL;
  const eyeR = irisR || canthusR;

  // --- Rotation: landmark roll (image space) + muted matrix yaw/pitch ---
  // Rotation no longer comes from the facial transformation matrix (it was muted and mixed with 2D
  // anchoring). A rigid face frame is built below from landmarks, so pos / rot / scale share one space.

  // Calibrate once from clearly separated eye corners. Never mirror the model during a turn.
  const eyeDx = canthusR.x - canthusL.x;
  const eyeDy = canthusR.y - canthusL.y;
  const clearOrder = Math.abs(eyeDx) > 0.03 && Math.abs(eyeDx) > Math.hypot(eyeDx, eyeDy) * 0.5;
  const rawHand = eyeDx >= 0 ? 1 : -1;
  const orderT = performance.now();
  if (!handSign) {
    if (!clearOrder) { handCandidate = 0; handSamples = 0; return false; }
    if (rawHand !== handCandidate) { handCandidate = rawHand; handSamples = 0; }
    if (++handSamples < (mode === 'image' ? 1 : 5)) return false;
    handSign = handCandidate;
  }
  if (!clearOrder || rawHand !== handSign) {
    // Briefly retain the last complete pose, then hide until a coherent reading returns.
    return hasPose && orderT - lastEyeOrderT <= 200;
  }
  lastEyeOrderT = orderT;
  const handX = handSign;

  // --- Cover-crop mapping (needed before roll: aspect stretch changes angles) ---
  const eyeMidX = (eyeL.x + eyeR.x) * 0.5;
  const eyeMidY = (eyeL.y + eyeR.y) * 0.5;
  // Pull slightly toward nose bridge so the model bridge sits near landmark 168/6
  // X locked to iris mid (optical). Landmark 168/6 is often off-centre vs PD;
  // measuring the model bridge against the iris mid keeps the rigid pair consistent.
  const midX = eyeMidX;
  const midY = eyeMidY * 0.92 + bridge.y * 0.08;
  const irisDist = (irisL && irisR)
    ? Math.hypot(irisL.x - irisR.x, irisL.y - irisR.y)
    : null;
  const canthusDist = Math.hypot(canthusL.x - canthusR.x, canthusL.y - canthusR.y);
  const eyeDist = irisDist != null ? irisDist : canthusDist;
  const spanRef = irisDist != null ? MODEL_LENS_SPAN : MODEL_EYE_WIDTH;

  const src = mode === 'image' && !stillEl.hidden ? stillEl : videoEl;
  const mw = src.videoWidth || src.naturalWidth || 0;
  const mh = src.videoHeight || src.naturalHeight || 0;
  if (!mw || !mh) return false; // metadata not ready (Safari) — don't place with a guessed aspect
  ensureRendererSize();
  const { cssW, cssH, aspect } = window.__VIEWPORT__;

  // object-fit: cover — media scaled by max(W/mw, H/mh) and centred; overflow cropped.
  // Works for any source aspect (landscape webcam into portrait stage or vice versa).
  const coverScale = Math.max(cssW / mw, cssH / mh);
  const dispW = mw * coverScale;
  const dispH = mh * coverScale;
  // Auto-framing pan (video only; uploaded stills stay centred).
  const isLiveVideo = src === videoEl;
  let panD = { dx: 0, dy: 0 };
  if (isLiveVideo && AUTO_FRAME) {
    const ec = [33, 133, 263, 362].reduce((acc, i) => ({ x: acc.x + landmarks[i].x / 4, y: acc.y + landmarks[i].y / 4 }), { x: 0, y: 0 });
    panD = updateFrame(ec, cssW, cssH, dispW, dispH, performance.now() / 1000);
  }
  const fpx = isLiveVideo && AUTO_FRAME ? frame.px : 0.5;
  const fpy = isLiveVideo && AUTO_FRAME ? frame.py : 0.5;
  const offX = (cssW - dispW) * fpx; // ≤ 0 (object-position fraction; 0.5 = centred)
  const offY = (cssH - dispH) * fpy; // ≤ 0
  // Legacy normalised crop params (kept for debug output)
  const cropScaleX = dispW / cssW;
  const cropScaleY = dispH / cssH;
  const cropOffX = -offX / dispW;
  const cropOffY = -offY / dispH;

  // Normalised landmark → UNMIRRORED stage CSS px. The overlay canvas carries the same
  // CSS scaleX(-1) as the video, so unmirrored px stay aligned with what the user sees.
  const toStage = (nx, ny) => {
    const x = offX + nx * dispW;
    const y = offY + ny * dispH;
    return { x, y, nx: x / cssW, ny: y / cssH };
  };

  // Roll in STAGE pixels (y down).
  const stEyeL = toStage(eyeL.x, eyeL.y);
  const stEyeR = toStage(eyeR.x, eyeR.y);
  const iL = stEyeL.x <= stEyeR.x ? stEyeL : stEyeR;
  const iR = stEyeL.x <= stEyeR.x ? stEyeR : stEyeL;
  const MAX_ROLL = (60 * Math.PI) / 180;
  const roll = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, Math.atan2(iR.y - iL.y, iR.x - iL.x)));

  // ---- Rigid 3D face frame from landmarks (gaze-independent, full yaw/pitch/roll) ----
  // Space: stage px centred on the stage, UNMIRRORED, +X right, +Y up, +Z toward camera.
  // MediaPipe z is relative depth in (roughly) the same scale as x → multiply by dispW; smaller z = closer.
  const pxToWorld = 2 / cssH; // ortho camera: 1 world unit = cssH/2 px
  const P = (i) => {
    const l = landmarks[i];
    return new THREE.Vector3(
      offX + l.x * dispW - cssW * 0.5,
      cssH * 0.5 - (offY + l.y * dispH),
      -(l.z || 0) * dispW,
    );
  };
  const rightward = (a, b) => (b.x >= a.x ? b.clone().sub(a) : a.clone().sub(b));
  const p33 = P(33);
  const p263 = P(263);
  // Use the same fixed correspondence as the model mirror.
  const eyeFull = handSign > 0 ? p263.clone().sub(p33) : p33.clone().sub(p263);
  const cheekFull = rightward(P(234), P(454));
  const upFull = P(10).sub(P(152));
  const soften = (v) => v.clone().setZ(v.z * YAW_KEEP);
  const eyeVec = soften(eyeFull);
  const cheekVec = soften(cheekFull);
  const upVec = soften(upFull);

  const tNow = performance.now() / 1000;
  const axisOf = (eye, cheek, up, cheekW) => {
    const x = eye.clone().normalize();
    if (cheekW) x.add(cheek.clone().normalize().multiplyScalar(cheekW)).normalize();
    const z = new THREE.Vector3().crossVectors(x, up).normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    return { x, y, z };
  };
  // Both bases are the eye line. The cheek (234/454) was rolling the frame and is not used.
  const head = axisOf(eyeFull, cheekFull, upFull, 0);
  const headFwdX = head.z.x;
  const frame = axisOf(eyeVec, cheekVec, upVec, 0);
  const xAxis = frame.x;
  const yAxis = frame.y;
  const zAxis = frame.z;
  if (![xAxis, yAxis, zAxis, head.x, head.y, head.z].every((v) => Number.isFinite(v.x + v.y + v.z))) return false;
  // A flipped or collapsed face basis (bad frame from the mesh) points down. Hold the last pose
  // instead of planting the frame on the forehead.
  const basisOk = yAxis.y > 0.45 && zAxis.lengthSq() > 0.5;
  let templeRaw = null; // temple-only turn for this frame; null = keep the last one
  if (!basisOk) {
    if (!hasPose) return false;
    _quat.copy(smoothQuat);
  } else {
    _quat.setFromRotationMatrix(_mat.makeBasis(xAxis, yAxis, zAxis));
    // Part of the real head turn (head.z) the softened frame (zAxis) did not take, about the frame's up axis.
    // The model is mirrored when handX < 0, which flips the sense of a rotation about its own Y.
    const gapSin = new THREE.Vector3().crossVectors(zAxis, head.z).dot(yAxis);
    const gapCos = zAxis.dot(head.z);
    templeRaw = Math.max(-0.7, Math.min(0.7, handX * Math.atan2(gapSin, gapCos) * TEMPLE_TURN));
    // Put the image tilt back on the eye line.
    _rollV.set(handX, 0, 0).applyQuaternion(_quat);
    if (_rollV.x < 0) _rollV.negate();
    const rollSpan = Math.hypot(_rollV.x, _rollV.y);
    if (rollSpan > 1e-4 && Math.abs(_rollV.x) > rollSpan * 0.45) {
      const haveRoll = Math.atan2(-_rollV.y, _rollV.x);
      const rollFix = Math.atan2(Math.sin(roll - haveRoll), Math.cos(roll - haveRoll));
      // A real tilt keeps arriving. A one-frame spike in the eye line cannot dump the whole roll.
      const rollStep = Math.max(-0.2, Math.min(0.2, rollFix));
      if (Math.abs(rollStep) > 0.0008) {
        _rollQ.setFromAxisAngle(_rollV.set(0, 0, 1), -rollStep);
        _quat.premultiply(_rollQ);
      }
    }
  }

  // Eye-plane anchor: mean of the four eye corners (rigid, doesn't move with gaze like the irises).
  const eyeCtr = P(33).add(P(133)).add(P(263)).add(P(362)).multiplyScalar(0.25);

  // ---- Blink freeze (see BLINK_*): hold pose inputs while an eye closes ----
  // Width on the screen, divided by how much the turn hides it. The raw 3D width
  // grows with the depth between the cheeks, so the frame inflated in place as the head turned.
  const spanXY = (a, b) => {
    const xy = Math.hypot(a.x - b.x, a.y - b.y);
    const cosYaw = Math.max(0.55, Math.min(1, Math.abs(head.z.z) || 1));
    const boost = 1 + (1 / cosYaw - 1) * SCALE_TURN;
    return xy * boost;
  };
  const canthusStable = spanXY(p33, p263);
  const faceStable = canthusStable * FACE_TO_CANTHUS;
  const live = { q: _quat.clone(), tt: templeRaw, face: faceStable, ratio: canthusStable / Math.max(1e-6, faceStable),
    dz: landmarks[168] ? eyeCtr.z - P(168).z : 0, ears: null };
  const lidR = (a, b, c, d) => P(a).distanceTo(P(b)) / Math.max(1e-6, P(c).distanceTo(P(d)));
  const rOpen = Math.min(lidR(159, 145, 33, 133), lidR(386, 374, 263, 362));
  const bsMax = Math.max(lastBlinkBS.l, lastBlinkBS.r);
  if (blink.base == null || !hasPose) { blink.base = rOpen; blink.prevR = null; blink.closed = false; blink.relT = 0; blink.ring = []; }
  const thrClose = Math.min(BLINK_CLOSE_ABS, BLINK_CLOSE_REL * blink.base);
  const thrOpen = Math.min(BLINK_OPEN_ABS, BLINK_OPEN_REL * blink.base);
  const dropping = blink.prevR != null && blink.prevR - rOpen > BLINK_DROP * blink.base && rOpen < 0.92 * blink.base;
  const wantClose = rOpen < thrClose || bsMax > BLINK_BS_CLOSE || dropping;
  if (!blink.closed && wantClose) {
    blink.closed = true; blink.since = tNow; blink.relT = 0;
    blink.held = blink.ring.length ? blink.ring[0] : live;
  } else if (blink.closed) {
    const reopened = rOpen > thrOpen && !(bsMax > BLINK_BS_OPEN) && !dropping;
    if (reopened || tNow - blink.since > BLINK_MAX_HOLD_S) {
      blink.closed = false; blink.relT = tNow;
      if (!reopened) blink.base = rOpen; // long squint: re-baseline so it doesn't re-trigger
    }
  }
  if (!blink.closed && rOpen > blink.base * 0.9) blink.base += (rOpen - blink.base) * (rOpen > blink.base ? 0.15 : 0.02);
  blink.prevR = rOpen;
  // 1 = live, 0 = held.
  const blinkW = blink.closed ? 0 : (blink.relT ? Math.min(1, (tNow - blink.relT) / BLINK_RELEASE_S) : 1);
  if (blinkW >= 1) { blink.relT = 0; blink.held = null; }
  const BH = blink.held;
  const mix = (a, b) => a + (b - a) * blinkW;
  // A blink moves the eye landmarks by a couple of degrees. While it lasts, the angle stays where it was
  // unless the head really moves past BLINK_DEADBAND; then only the part beyond it is followed, so a real
  // turn is not held back and the blink alone moves nothing.
  const eff = BH && blinkW < 1
    ? {
      q: blinkHoldQuat(BH.q, live.q, blinkW),
      tt: BH.tt == null || live.tt == null ? live.tt : blinkHoldNumber(BH.tt, live.tt, blinkW),
      face: mix(BH.face, live.face), ratio: mix(BH.ratio, live.ratio), dz: mix(BH.dz, live.dz),
    }
    : live;
  if (eff !== live) {
    _quat.copy(eff.q);
    templeRaw = eff.tt;
    if (landmarks[168]) eyeCtr.z = P(168).z + eff.dz;
  }
  window.__IGO_BLINK__ = { closed: blink.closed, w: +blinkW.toFixed(2), r: +rOpen.toFixed(3), base: +blink.base.toFixed(3), bs: +bsMax.toFixed(2) };

  // Scale from the on-screen face width. Only part of the turn is added back, so the frame grows a little.
  // Size = blend of face width (234↔454, temple to temple) and eye-corner span, both in 3D.
  const eyeSpanPxRaw = p33.distanceTo(p263);
  const faceSpanPxRaw = eff.face;
  // Blink-proof: eyelid closure drags the canthus landmarks (±5 %), so the canthus term enters only as a very slowly
  // filtered canthus/face RATIO (distance-independent): same static size as before, 0 % reaction to blinks.
  const canthRatio = fCanthRatio.filter(eff.ratio, tNow);
  const headSpanPxRaw = faceSpanPxRaw * (FACE_SPAN_WEIGHT + (1 - FACE_SPAN_WEIGHT) * FACE_TO_CANTHUS * canthRatio);
  const minDim = Math.min(cssW, cssH);
  const eyeSpanClamped = Math.max(0.045 * minDim, Math.min(0.9 * Math.max(cssW, cssH), headSpanPxRaw));

  // Nose-bridge anchor (screen x/y only; depth stays the eye-plane one so the temples keep their reach).
  if (BRIDGE_ANCHOR_WEIGHT > 0 && landmarks[168] && landmarks[6]) {
    const uPx = eyeSpanClamped / MODEL_FACE_SPAN; // px per model unit (raw)
    const nb0 = P(168).add(P(6)).multiplyScalar(0.5);
    let pupTerm = 0;
    if (PUPIL_Y_WEIGHT > 0 && landmarks[468] && landmarks[473]) {
      const open = (a, b, c, d) => P(a).distanceTo(P(b)) / Math.max(1e-6, P(c).distanceTo(P(d)));
      const eyesOpen = Math.min(open(159, 145, 33, 133), open(386, 374, 263, 362)) >= EYE_OPEN_MIN;
      if (eyesOpen || pupDyHeld == null) {
        const pm = P(468).add(P(473)).multiplyScalar(0.5);
        const raw = pm.sub(nb0).dot(yAxis) / uPx - PUPIL_LENS_DY;
        const t = performance.now() / 1000;
        pupDyHeld = fPupDy.filter(Math.max(-PUPIL_DY_CLAMP, Math.min(PUPIL_DY_CLAMP, raw)), t);
      }
      pupTerm = PUPIL_Y_WEIGHT * pupDyHeld;
    }
    const nb = nb0
      .add(yAxis.clone().multiplyScalar((BRIDGE_ANCHOR_DY + pupTerm + GLASSES_Y_OFFSET) * uPx));
    const front = eyeCtr.clone()
      .add(zAxis.clone().multiplyScalar((GLASSES_Z_OFFSET + MODEL_BRIDGE_FRONT_Z) * uPx)) // model bridge front
      .add(yAxis.clone().multiplyScalar(GLASSES_Y_OFFSET * uPx));
    eyeCtr.x += (nb.x - front.x) * BRIDGE_ANCHOR_WEIGHT;
    eyeCtr.y += (nb.y - front.y) * BRIDGE_ANCHOR_WEIGHT;
  }

  // ---- Temporal filtering (One Euro for pos/scale, speed-adaptive slerp for rotation) ----
  const tSec = performance.now() / 1000;
  if (!hasPose) resetPoseFilters();
  if (panD.dx || panD.dy) { shiftFilter(fPosX, panD.dx); shiftFilter(fPosY, -panD.dy); shiftFilter(fLockX, panD.dx); shiftFilter(fLockY, -panD.dy); }
  const dtPose = lastPoseT ? Math.max(1e-3, tSec - lastPoseT) : 0;
  lastPoseT = tSec;
  const fx = fPosX.filter(eyeCtr.x, tSec);
  const fy = fPosY.filter(eyeCtr.y, tSec);
  const fz = fPosZ.filter(eyeCtr.z, tSec);
  const eyeSpanPx = fSpan.filter(eyeSpanClamped, tSec);
  const uniform = Math.max(1e-4, (eyeSpanPx * pxToWorld) / MODEL_FACE_SPAN);

  smoothPos.set(fx * pxToWorld, fy * pxToWorld, fz * pxToWorld);
  // Eye correspondence and basis validity are checked before this point. Do not add a
  // second yaw decision here: retaining three candidates and accepting the fourth caused
  // a delayed jump even though persistence did not prove that the candidate was correct.
  let rotBehind = 0;
  let rotStep = 0;
  let rotTake = 1;
  if (!hasPose || !dtPose) {
    smoothQuat.copy(_quat);
  } else {
    const ang = smoothQuat.angleTo(_quat);
    const speed = ang / dtPose;
    const follow = OneEuro.alpha(2.0 + 4.0 * speed, dtPose);
    // Continuous turns are followed in the same frame as the nose. The leap check above
    // already dropped a one-frame tumble, so this cap does not have to freeze the turn.
    const maxStep = Math.max(0.6, 18 * dtPose);
    const cap = ang > 1e-4 ? Math.min(1, maxStep / ang) : 1;
    const take = Math.min(follow, cap);
    smoothQuat.slerp(_quat, take);
    rotStep = ang * take;
    rotBehind = smoothQuat.angleTo(_quat);
    rotTake = take;
  }
  // Same step as the frame, so the arms and the frame never describe two different instants.
  if (templeRaw != null) templeTurn = hasPose && dtPose ? templeTurn + (templeRaw - templeTurn) * rotTake : templeRaw;
  turnTemples(currentGlasses, templeTurn);
  smoothScale.set(handX * uniform, uniform, uniform);
  hasPose = true;

  // Frame sits in FRONT of the eye plane along the face's own axes (so it follows yaw/pitch correctly).
  const glassesPos = smoothPos.clone()
    .add(new THREE.Vector3(0, 0, 1).applyQuaternion(smoothQuat).multiplyScalar(GLASSES_Z_OFFSET * uniform))
    .add(new THREE.Vector3(0, 1, 0).applyQuaternion(smoothQuat).multiplyScalar(GLASSES_Y_OFFSET * uniform));

  glassesRoot.position.copy(glassesPos);
  // Perspective anchored at the frame's front plane: frontal fit unchanged, side views foreshorten.
  const zRef = glassesPos.z;
  const camD = setWebcamPerspective(cssW, cssH, dispW, offX, offY, dispH, zRef, pxToWorld);
  anchorPerspectiveOnFace(glassesRoot.position);
  glassesRoot.quaternion.copy(smoothQuat);
  glassesRoot.scale.copy(smoothScale);
  glassesRoot.visible = true;
  // ---- Nose-bridge lock: project the model bridge point, shift the frame so it sits on landmark 168 ----
  if (BRIDGE_LOCK && currentGlasses && landmarks[168]) {
    const p168 = P(168);
    // Horizontal only: height/pitch fit stays exactly as before (frontal and vertical untouched).
    // Nose shift uses the real head turn, not the softened frame, so the bridge stays on the ridge.
    p168.x += headFwdX * NOSE_FWD * eyeSpanPx;
    const tx = fLockX.filter(p168.x, tSec), ty = fLockY.filter(p168.y, tSec); // centred stage px, +Y up
    let errPx = 0;
    let budget = Math.max(12, eyeSpanPx * 0.16);
    for (let it = 0; it < 2 && budget > 0.5; it++) {
      glassesRoot.updateMatrixWorld(true);
      const Lw = new THREE.Vector3(...BRIDGE_LOCK_LOCAL).applyMatrix4(currentGlasses.matrixWorld);
      const q = Lw.clone().project(camera);
      const dx = tx - q.x * cssW * 0.5, dy = ty - q.y * cssH * 0.5;
      errPx = Math.hypot(dx, dy);
      const allow = Math.min(1, budget / Math.max(errPx, 1e-6));
      budget -= errPx * allow;
      const k = camD ? (zRef + camD - Lw.z) / camD : 1; // px → world at the lock point's depth
      // If the angle has not arrived yet, don't drag the lenses across the face to keep the bridge.
      const swing = Math.max(rotBehind, rotStep);
      const lockGain = swing < 0.2 ? 1 : Math.max(0.2, 1 - (swing - 0.2) * 1.6);
      glassesRoot.position.x += dx * allow * pxToWorld * k * lockGain;
      glassesRoot.position.y += dy * allow * pxToWorld * k * lockGain;
    }
    glassesRoot.updateMatrixWorld(true);
    window.__IGO_BRIDGE__ = { local: BRIDGE_LOCK_LOCAL, preErrPx: +errPx.toFixed(2), pxPerUnit: +(uniform / pxToWorld).toFixed(2) };
  }
  // ---- Nose occluder (after the ears so it shares zRef / camD / pose) ----
  if (noseOcc) {
    const camL = currentGlasses
      ? new THREE.Vector3(0, 0, 1).transformDirection(currentGlasses.matrixWorld.clone().invert())
      : new THREE.Vector3(0, 0, 1);
    const yawAbs = Math.asin(Math.min(1, Math.abs(camL.x))) * 180 / Math.PI;
    const s0 = Math.max(0, Math.min(1, (yawAbs - NOSE_YAW_ON) / (NOSE_YAW_FULL - NOSE_YAW_ON)));
    const sN = s0 * s0 * (3 - 2 * s0);
    const uN = Math.abs(smoothScale.y);
    const fwdN = new THREE.Vector3(0, 0, 1).applyQuaternion(smoothQuat);
    const upN = new THREE.Vector3(0, 1, 0).applyQuaternion(smoothQuat);
    const tmpN = new THREE.Vector3();
    const arr = noseOcc.geometry.attributes.position.array;
    let ok = true;
    NOSE_LMS.forEach((li, k) => {
      if (!landmarks[li]) { ok = false; return; }
      const w = unprojectToDepth(P(li).multiplyScalar(pxToWorld), zRef, camD);
      const yL = tmpN.copy(w).sub(glassesRoot.position).dot(upN) / uN;
      const t = Math.max(0, Math.min(1, (yL - NOSE_PUSH_Y_LOW) / (NOSE_PUSH_Y_TOP - NOSE_PUSH_Y_LOW)));
      const side = NOSE_PUSH_SIDE_LOW + (NOSE_PUSH_SIDE - NOSE_PUSH_SIDE_LOW) * t;
      const push = NOSE_PUSH_FRONT + (side - NOSE_PUSH_FRONT) * sN;
      w.addScaledVector(fwdN, -push * uN);
      arr[k * 3] = w.x; arr[k * 3 + 1] = w.y; arr[k * 3 + 2] = w.z;
    });
    noseOcc.geometry.attributes.position.needsUpdate = true;
    noseOcc.visible = ok;
    window.__IGO_NOSE__ = { yawDeg: +yawAbs.toFixed(1), active: +sN.toFixed(2), tris: noseOcc.geometry.index.count / 3 };
  }
  // Ring of the last live pose inputs (pre-blink values to hold).
  if (!blink.closed && blinkW >= 1) { blink.ring.push(live); if (blink.ring.length > 2) blink.ring.shift(); }
  window.__IGO_FOV__ = { fovLong: +(mode === 'image' ? currentFovLong(tNow) : (camFov.cur ?? 0)).toFixed(1), src: mode === 'image' ? 'photo' : camFov.src, label: camFov.label, mw, mh };
  if (FOV_DEBUG) updateFovDebug();
  window.__IGO_SCALE_INFO__ = { eyeSpanPxRaw, faceSpanPxRaw, headSpanPx: eyeSpanPx, eyeSpanPx, uniform, coverScale, mw, mh };

  const us = Math.abs(smoothScale.x);
  occluder.quaternion.copy(smoothQuat);
  // Head occluder sized from the face half-width (H ≈ 6.2 model cm at this scale): slightly narrower
  // than the temples at the ear so the near arm stays visible and the far arm hides behind the head.
  const H = us * (MODEL_FACE_SPAN / 2);
  occluder.scale.set(0.95 * H, 1.3 * H, 1.2 * H);
  const back = new THREE.Vector3(0, -0.1 * H, -1.1 * H).applyQuaternion(smoothQuat);
  occluder.position.copy(smoothPos).add(back);

  // Stash last landmarks + mapping for measurable placement tests (unmirrored stage px)
  const stL = toStage(eyeL.x, eyeL.y);
  const stR = toStage(eyeR.x, eyeR.y);
  const stCL = toStage(canthusL.x, canthusL.y);
  const stCR = toStage(canthusR.x, canthusR.y);
  const stB = toStage(bridge.x, bridge.y);
  window.__IGO_LAST_FACE__ = {
    eyeL: { x: eyeL.x, y: eyeL.y },
    eyeR: { x: eyeR.x, y: eyeR.y },
    canthusL: { x: canthusL.x, y: canthusL.y },
    canthusR: { x: canthusR.x, y: canthusR.y },
    bridge: { x: bridge.x, y: bridge.y },
    irisAvailable: !!(irisL && irisR),
    handX,
    rollRad: roll,
    rollDeg: roll * (180 / Math.PI),
    eyeDist,
    canthusDist,
    media: { w: mw, h: mh },
    stage: { cssW, cssH, aspect, dpr: window.__VIEWPORT__.dpr, offX, offY, dispW, dispH, cropOffX, cropOffY, cropScaleX, cropScaleY },
    stagePx: {
      eyeL: stL, eyeR: stR, canthusL: stCL, canthusR: stCR, bridge: stB,
      // Mirrored display pixels (what the user sees after CSS scaleX(-1))
      eyeLDisp: { x: cssW - stL.x, y: stL.y },
      eyeRDisp: { x: cssW - stR.x, y: stR.y },
      bridgeDisp: { x: cssW - stB.x, y: stB.y },
    },
  };
  return true;
}

function hideGlasses() {
  glassesRoot.visible = false;
  if (noseOcc) noseOcc.visible = false;
  hasPose = false;
}

/** Project model lens centres + bridge to stage pixels and compare to landmarks. */
function measurePlacement() {
  const face = window.__IGO_LAST_FACE__;
  if (!face || !hasPose || !camera || !glassesRoot) return null;
  const { cssW, cssH, aspect } = window.__VIEWPORT__ || face.stage || {};
  if (!cssW || !cssH) return null;

  // Use the renderer's REAL GL viewport (drawing-buffer px) and the canvas' real CSS box,
  // so a viewport/DPR mismatch shows up as a placement error instead of hiding behind
  // the same assumption the placement code makes.
  const vpBuf = renderer.getCurrentViewport(new THREE.Vector4());
  const bufW = renderer.domElement.width || 1;
  const bufH = renderer.domElement.height || 1;
  const canvasRect = renderer.domElement.getBoundingClientRect();
  const kx = (canvasRect.width || cssW) / bufW; // CSS px per buffer px
  const ky = (canvasRect.height || cssH) / bufH;
  const projectObj = (obj, lx, ly, lz = 0) => {
    const v = new THREE.Vector3(lx, ly, lz);
    obj.localToWorld(v);
    v.project(camera);
    // NDC → buffer px (GL origin bottom-left) → unmirrored stage CSS px (y down)
    const bx = vpBuf.x + (v.x * 0.5 + 0.5) * vpBuf.z;
    const byUp = vpBuf.y + (v.y * 0.5 + 0.5) * vpBuf.w;
    return { x: bx * kx, y: (bufH - byUp) * ky, ndcX: v.x, ndcY: v.y };
  };
  const projectLocal = (lx, ly, lz = 0) => projectObj(glassesRoot, lx, ly, lz);

  // Model: +X = wearer right = MediaPipe 263 / iris 473 side (image-left unmirrored)
  const lensR = projectLocal(MODEL_LENS_LOCAL.right, MODEL_LENS_LOCAL.bridgeY, 0); // wearer right
  const lensL = projectLocal(MODEL_LENS_LOCAL.left, MODEL_LENS_LOCAL.bridgeY, 0);  // wearer left
  const bridgeM = projectLocal(0, MODEL_LENS_LOCAL.bridgeY, 0);

  const eyeSpanPx = Math.hypot(
    face.stagePx.eyeL.x - face.stagePx.eyeR.x,
    face.stagePx.eyeL.y - face.stagePx.eyeR.y,
  ) || 1;

  // Roll from image-left → image-right so both stay near 0 when upright
  const order = (a, b) => (a.x <= b.x ? [a, b] : [b, a]);
  const [mL, mR] = order(lensL, lensR);
  const [fL, fR] = order(face.stagePx.eyeL, face.stagePx.eyeR);
  const modelRoll = Math.atan2(mR.y - mL.y, mR.x - mL.x);
  const faceRoll = Math.atan2(fR.y - fL.y, fR.x - fL.x);
  let rollDiffDeg = (modelRoll - faceRoll) * (180 / Math.PI);
  // wrap to [-180,180]
  while (rollDiffDeg > 180) rollDiffDeg -= 360;
  while (rollDiffDeg < -180) rollDiffDeg += 360;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Match wearer-left lens → subject-left eye (33/468), wearer-right → 263/473
  const errLensL = dist(lensL, face.stagePx.eyeL);
  const errLensR = dist(lensR, face.stagePx.eyeR);
  // Optical bridge = midpoint of the two eye landmarks (stable vs off-centre 168/6)
  const opticalBridge = {
    x: (face.stagePx.eyeL.x + face.stagePx.eyeR.x) * 0.5,
    y: (face.stagePx.eyeL.y + face.stagePx.eyeR.y) * 0.5,
  };
  const errBridge = dist(bridgeM, opticalBridge);
  const errBridgeLandmark = dist(bridgeM, face.stagePx.bridge);

  const pct = (d) => (d / eyeSpanPx) * 100;

  // Front-frame width (outer edge to outer edge) projected to stage px
  const fhw = currentGlasses?.userData?.frontHalfWidth || 6.2;
  const frL = projectObj(currentGlasses || glassesRoot, -fhw, 0, 0);
  const frR = projectObj(currentGlasses || glassesRoot, fhw, 0, 0);
  const frameWidthPx = dist(frL, frR);
  const canthusSpanPx = Math.hypot(
    face.stagePx.canthusL.x - face.stagePx.canthusR.x,
    face.stagePx.canthusL.y - face.stagePx.canthusR.y,
  ) || 1;
  const frameToCanthus = frameWidthPx / canthusSpanPx;

  const out = {
    irisAvailable: face.irisAvailable,
    eyeSpanPx,
    faceRollDeg: faceRoll * (180 / Math.PI),
    modelRollDeg: modelRoll * (180 / Math.PI),
    rollDiffDeg,
    errLensLPx: errLensL,
    errLensRPx: errLensR,
    errBridgePx: errBridge,
    errBridgeLandmarkPx: errBridgeLandmark,
    errLensLPct: pct(errLensL),
    errLensRPct: pct(errLensR),
    errBridgePct: pct(errBridge),
    errBridgeLandmarkPct: pct(errBridgeLandmark),
    frameWidthPx,
    canthusSpanPx,
    frameToCanthus,
    viewport: { buf: vpBuf.toArray(), bufW, bufH, cssW, cssH, dpr: renderer.getPixelRatio() },
    // Absolute thresholds used by the test
    passRoll: Math.abs(rollDiffDeg) < 3,
    passLensL: pct(errLensL) <= 6,
    passLensR: pct(errLensR) <= 6,
    passBridge: pct(errBridge) <= 6,
    passFrameWidth: frameToCanthus >= 1.3 && frameToCanthus <= 1.6,
    landmarks: {
      eyeL: face.stagePx.eyeL,
      eyeR: face.stagePx.eyeR,
      bridge: face.stagePx.bridge,
    },
    projected: { lensL, lensR, bridge: bridgeM },
    // Mirrored display coords for screenshot overlays
    display: {
      eyeL: face.stagePx.eyeLDisp,
      eyeR: face.stagePx.eyeRDisp,
      bridge: face.stagePx.bridgeDisp,
      lensL: { x: cssW - lensL.x, y: lensL.y },
      lensR: { x: cssW - lensR.x, y: lensR.y },
      frameL: { x: cssW - frL.x, y: frL.y },
      frameR: { x: cssW - frR.x, y: frR.y },
      bridgeM: { x: cssW - bridgeM.x, y: bridgeM.y },
    },
  };
  out.pass = out.passRoll && out.passLensL && out.passLensR && out.passBridge && out.passFrameWidth;
  window.__IGO_MEASURE__ = out;
  return out;
}


/* -------------------------------------------------------------------------- */
/* Detection loops                                                            */
/* -------------------------------------------------------------------------- */

function detectOnVideoFrame() {
  if (mode !== 'video' || !faceLandmarker || videoEl.readyState < 2) {
    rafId = requestAnimationFrame(detectOnVideoFrame);
    return;
  }

  ensureRendererSize();
  const now = performance.now();
  if (videoEl.currentTime !== lastVideoTime) {
    lastVideoTime = videoEl.currentTime;
    paintAnalysedFrame();
    const result = faceLandmarker.detectForVideo(videoEl, now);
    handleResult(result);
  }

  renderer.render(scene, camera);
  rafId = requestAnimationFrame(detectOnVideoFrame);
}


let fovDbgEl = null;
let fovDbgT = 0;
function updateFovDebug() {
  const now = performance.now();
  if (now - fovDbgT < 250) return;
  fovDbgT = now;
  if (!fovDbgEl) {
    fovDbgEl = document.createElement('div');
    fovDbgEl.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;font:12px/1.35 monospace;color:#0f0;background:rgba(0,0,0,.65);padding:4px 7px;border-radius:4px;pointer-events:none;white-space:pre';
    document.body.appendChild(fovDbgEl);
  }
  const f = window.__IGO_FOV__ || {};
  const b = window.__IGO_BLINK__ || {};
  const lng = Math.max(f.mw || 0, f.mh || 0), sht = Math.min(f.mw || 0, f.mh || 0);
  const short = lng ? 2 * Math.atan(Math.tan((f.fovLong || 0) * Math.PI / 360) * sht / lng) * 180 / Math.PI : 0;
  fovDbgEl.textContent = `FOV ${f.fovLong}° long side (${short.toFixed(1)}° short) — ${f.src}\nvideo ${f.mw}×${f.mh}${f.label ? ' · ' + f.label : ''}\nblink ${b.closed ? 'HOLD' : 'live'} w=${b.w} lid=${b.r}/${b.base} bs=${b.bs}`;
}

function handleResult(result) {
  const cats = result.faceBlendshapes?.[0]?.categories;
  if (cats) {
    const g = (n) => { const c = cats.find((k) => k.categoryName === n); return c ? c.score : -1; };
    lastBlinkBS = { l: g('eyeBlinkLeft'), r: g('eyeBlinkRight') };
  } else lastBlinkBS = { l: -1, r: -1 };
  const mats = result.facialTransformationMatrixes;
  const lms = result.faceLandmarks;
  if (mats && mats.length > 0 && lms && lms.length > 0) {
    const data = mats[0].data || mats[0];
    if (!applyFaceMatrix(data, lms[0])) {
      hideGlasses();
      return;
    }
    setStatus(t('faceOk'), 'ok', 1200);
  } else {
    hideGlasses();
    if (mode === 'video' || mode === 'image') {
      setStatus(t('noFace'), '', 0);
    }
  }
}

async function detectOnImage(img) {
  await setRunningMode('IMAGE');
  const result = faceLandmarker.detect(img);
  handleResult(result);
  renderer.render(scene, camera);
}

function imageRenderLoop() {
  if (mode !== 'image') return;
  renderer.render(scene, camera);
  rafId = requestAnimationFrame(imageRenderLoop);
}

/* -------------------------------------------------------------------------- */
/* Camera / upload / photo                                                    */
/* -------------------------------------------------------------------------- */

function setStatus(msg, kind = '', autoHideMs = 0) {
  statusEl.textContent = msg || '';
  statusEl.classList.toggle('is-visible', Boolean(msg));
  statusEl.classList.toggle('is-error', kind === 'error');
  statusEl.classList.toggle('is-ok', kind === 'ok');
  clearTimeout(statusTimer);
  if (autoHideMs > 0) {
    statusTimer = setTimeout(() => {
      statusEl.classList.remove('is-visible');
    }, autoHideMs);
  }
}

async function startCamera() {
  setStatus(t('startingCam'));
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(t('camMissing'), 'error');
      return;
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    videoEl.srcObject = stream;
    resetFrame();
    await videoEl.play();
    pickCameraFov(stream.getVideoTracks?.()[0]);
    fitStageToMedia(videoEl.videoWidth, videoEl.videoHeight);
    videoEl.onresize = () => { if (mode === 'video') fitStageToMedia(videoEl.videoWidth, videoEl.videoHeight); };
    stillEl.hidden = true;
    stageEl.classList.add('is-live');
    stageEl.classList.remove('is-still');
    mode = 'video';
    resizeRenderer();
    await setRunningMode('VIDEO');
    lastVideoTime = -1;
    hasPose = false;
    btnPhoto.disabled = false;
    btnCamera.textContent = t('stopCam');
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(detectOnVideoFrame);
    setStatus(t('faceOk'), 'ok', 1500);
  } catch (err) {
    console.error(err);
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      setStatus(t('camDenied'), 'error');
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      setStatus(t('camMissing'), 'error');
    } else {
      setStatus(t('camError'), 'error');
    }
  }
}

function stopCamera() {
  cancelAnimationFrame(rafId);
  rafId = 0;
  if (stream) {
    stream.getTracks().forEach((tr) => tr.stop());
    stream = null;
  }
  videoEl.srcObject = null;
  if (frameCtx) frameCtx.clearRect(0, 0, frameEl.width, frameEl.height);
  resetFrame();
  if (!stageEl.classList.contains('is-still')) fitStageToMedia(0, 0);
  mode = 'idle';
  stageEl.classList.remove('is-live');
  hideGlasses();
  btnCamera.textContent = t('activateCam');
  if (!stageEl.classList.contains('is-still')) {
    btnPhoto.disabled = true;
  }
  setStatus('');
}

async function toggleCamera() {
  if (stream) stopCamera();
  else await startCamera();
}

async function onUpload(file) {
  if (!file) return;
  setStatus(t('processing'));
  stopCamera();

  const url = URL.createObjectURL(file);
  stillEl.onload = async () => {
    stageEl.classList.add('is-still');
    stillEl.hidden = false;
    fitStageToMedia(stillEl.naturalWidth, stillEl.naturalHeight);
    mode = 'image';
    hasPose = false;
    btnPhoto.disabled = false;
    resizeRenderer();
    // Fit camera aspect to image
    try {
      cancelAnimationFrame(rafId);
      await detectOnImage(stillEl);
      rafId = requestAnimationFrame(imageRenderLoop);
      setStatus(t('faceOk'), 'ok', 2000);
    } catch (e) {
      console.error(e);
      setStatus(t('noFace'), 'error');
    }
    URL.revokeObjectURL(url);
  };
  stillEl.onerror = () => {
    setStatus(t('camError'), 'error');
    URL.revokeObjectURL(url);
  };
  stillEl.src = url;
}

function takePhoto() {
  const w = overlayEl.width;
  const h = overlayEl.height;
  if (!w || !h) return;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');

  // Mirror composite to match on-screen selfie view
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  const src = mode === 'image' && !stillEl.hidden ? stillEl : videoEl;
  // Cover-fit draw
  const sw = src.videoWidth || src.naturalWidth || w;
  const sh = src.videoHeight || src.naturalHeight || h;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const live = src === videoEl;
  const dx = (w - dw) * (live && AUTO_FRAME ? frame.px : 0.5); // same crop as on screen
  const dy = (h - dh) * (live && AUTO_FRAME ? frame.py : 0.5);
  ctx.drawImage(src, dx, dy, dw, dh);

  // Overlay is already in unmirrored MediaPipe space; after our mirror flip it matches
  ctx.drawImage(overlayEl, 0, 0, w, h);

  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `igo-tryon-${activeModelId}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus(t('photoSaved'), 'ok', 2000);
  }, 'image/png');
}

/* -------------------------------------------------------------------------- */
/* UI wiring                                                                  */
/* -------------------------------------------------------------------------- */

/** Amazon link for the glasses, only if the operations panel stored an https URL (same rule as the site's product page). */
function amazonUrl() {
  try {
    const panel = JSON.parse(localStorage.getItem('igo-operaciones-v1') || 'null');
    const items = panel && Array.isArray(panel.productos) ? panel.productos : [];
    const p = items.find((x) => x.id === 'gafas' || String(x.linea || '').toLowerCase() === 'vision');
    const url = p ? String(p.amazon || '').trim() : '';
    return /^https:\/\//.test(url) ? url : '';
  } catch (err) {
    return '';
  }
}

/** Side panel: name and copy of the active model, and the buy / early-access link. No colours: there is one finish. */
function updateInfo(id) {
  const shield = id === 'shield';
  const set = (sel, text) => { const el = document.querySelector(sel); if (el) el.textContent = text; };
  set('#info-name', shield ? 'Sport Mask' : 'Sport Casual');
  set('#info-tag', t(shield ? 'shieldDesc' : 'visionDesc'));
  set('#info-line', t(shield ? 'shieldLine' : 'visionLine'));
  const cta = document.getElementById('info-cta');
  const avail = document.getElementById('info-avail');
  if (!cta) return;
  const url = amazonUrl();
  if (url) {
    cta.href = url;
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    cta.textContent = t('ctaAmazon');
    if (avail) avail.textContent = t('availAmazon');
  } else {
    cta.href = `../${lang}/#early-access`;
    cta.removeAttribute('target');
    cta.removeAttribute('rel');
    cta.textContent = t('ctaEarly');
    if (avail) avail.textContent = t('availSoon');
  }
}

function selectModel(id) {
  modelBtns.forEach((b) => {
    const on = b.dataset.model === id;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  updateInfo(id);
  loadGlasses(id).then(() => {
    if (mode === 'image' && !stillEl.hidden) {
      hasPose = false; // snap to new mesh size
      detectOnImage(stillEl);
    }
    setStatus(t('switchModel'), 'ok', 1000);
  });
}

btnCamera.addEventListener('click', () => toggleCamera());
btnPhoto.addEventListener('click', () => takePhoto());
btnUpload.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  onUpload(f);
  e.target.value = '';
});
modelBtns.forEach((b) => {
  b.addEventListener('click', () => selectModel(b.dataset.model));
});

function onLayoutChange() {
  if (!renderer) return;
  resizeRenderer();
  hasPose = false; // snap to the new mapping instead of lerping from stale coords
  if (mode === 'image' && !stillEl.hidden && faceLandmarker) {
    detectOnImage(stillEl).catch(() => {});
  } else if (glassesRoot?.visible) {
    renderer.render(scene, camera);
  }
}

window.addEventListener('resize', onLayoutChange);
window.addEventListener('orientationchange', onLayoutChange);
videoEl.addEventListener('loadedmetadata', onLayoutChange);
videoEl.addEventListener('resize', onLayoutChange); // fires when the stream's frame size changes
if ('ResizeObserver' in window) {
  new ResizeObserver(() => onLayoutChange()).observe(stageEl);
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

async function boot() {
  applyStrings();
  updateInfo(activeModelId);
  setStatus(t('loading'));
  initThree();
  await loadGlasses('vision');
  try {
    await initFaceLandmarker();
    setStatus('');
  } catch (e) {
    console.error(e);
    setStatus(t('camError'), 'error');
  }
  // Expose tiny debug hook for Playwright tests
  window.__IGO_TRYON__ = {
    get mode() { return mode; },
    get model() { return activeModelId; },
    get hasPose() { return hasPose && glassesRoot.visible; },
    get landmarker() { return Boolean(faceLandmarker); },
    selectModel,
    takePhoto,
    measurePlacement,
    /** Disable smoothing for one frame so measurements aren't lagged. */
    snapPose() { hasPose = false; },
    /** Test hook: hide/show temple arms so the front frame can be measured from pixels. */
    setTemplesVisible(v) {
      currentGlasses?.traverse((o) => { if (o.userData.isTemple) o.visible = !!v; });
      renderer.render(scene, camera);
    },
    get lastFace() { return window.__IGO_LAST_FACE__ || null; },
    get lastMeasure() { return window.__IGO_MEASURE__ || null; },
    debugDump() {
      const g = glassesRoot;
      const box = currentGlasses ? new THREE.Box3().setFromObject(currentGlasses) : null;
      return {
        rootPos: g.position.toArray(),
        rootQuat: g.quaternion.toArray(),
        rootScale: g.scale.toArray(),
        rootVisible: g.visible,
        camPos: camera.position.toArray(),
        camFov: camera.fov,
        camAspect: camera.aspect,
        camNear: camera.near,
        camFar: camera.far,
        canvas: { w: overlayEl.width, h: overlayEl.height },
        glassesBox: box ? { min: box.min.toArray(), max: box.max.toArray() } : null,
        childCount: g.children.length,
        lastRaw: window.__LAST_RAW_MAT || null,
      };
    },
  };
}

boot();
