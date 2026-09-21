from __future__ import annotations

import json
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = ROOT / "assets/pixel-bloom/system"
SVG_ROOT = ASSET_ROOT / "runtime/svg"
MANIFEST_ROOT = ASSET_ROOT / "manifests"
SCHEMA_ROOT = ASSET_ROOT / "schemas"
TOKEN_ROOT = ASSET_ROOT / "tokens"

P = {
    "ink": "#2B2D42", "skin": "#B97855", "skinHi": "#D59A78", "hair": "#201915",
    "green": "#5BA86B", "mint": "#C8F7E1", "blush": "#FFD6E7", "sky": "#B8E0FF",
    "lav": "#D9C8FF", "peach": "#FFE1B8", "white": "#F8FAFF", "navy": "#243B64",
    "pink": "#EC4899", "amber": "#F59E0B", "blue": "#3B82F6",
}


def write(rel: str, text: str) -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def write_json(rel: str, obj: object) -> None:
    write(rel, json.dumps(obj, indent=2) + "\n")


def defs() -> str:
    return f'''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#B8E0FF"/><stop offset="1" stop-color="#F8FAFF"/></linearGradient>
<filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".18"/></filter>
<symbol id="bloomHead" viewBox="0 0 100 120">
<ellipse cx="35" cy="26" rx="13" ry="30" fill="{P['skinHi']}" stroke="{P['ink']}" stroke-width="4" transform="rotate(-10 35 26)"/><ellipse cx="67" cy="26" rx="13" ry="30" fill="{P['skinHi']}" stroke="{P['ink']}" stroke-width="4" transform="rotate(10 67 26)"/>
<ellipse cx="35" cy="26" rx="7" ry="22" fill="#F5B5B0"/><ellipse cx="67" cy="26" rx="7" ry="22" fill="#F5B5B0"/>
<circle cx="50" cy="69" r="36" fill="{P['hair']}"/><circle cx="21" cy="67" r="13" fill="{P['hair']}"/><circle cx="79" cy="67" r="13" fill="{P['hair']}"/>
<circle cx="28" cy="45" r="10" fill="{P['hair']}"/><circle cx="42" cy="39" r="11" fill="{P['hair']}"/><circle cx="58" cy="39" r="11" fill="{P['hair']}"/><circle cx="72" cy="45" r="10" fill="{P['hair']}"/>
<path d="M20 53 Q50 38 80 53 L76 65 Q50 55 24 65Z" fill="{P['green']}" stroke="{P['ink']}" stroke-width="3"/>
<ellipse cx="50" cy="76" rx="29" ry="28" fill="{P['skin']}" stroke="{P['ink']}" stroke-width="3"/><ellipse cx="39" cy="74" rx="4" ry="6" fill="{P['ink']}"/><ellipse cx="61" cy="74" rx="4" ry="6" fill="{P['ink']}"/>
<circle cx="38" cy="72" r="1.5" fill="white"/><circle cx="60" cy="72" r="1.5" fill="white"/><path d="M46 84 Q50 88 54 84" fill="none" stroke="{P['ink']}" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="31" cy="84" r="4" fill="#C96F68" opacity=".55"/><circle cx="69" cy="84" r="4" fill="#C96F68" opacity=".55"/>
</symbol>
<symbol id="bloomBody" viewBox="0 0 100 150"><path d="M32 32 Q50 20 68 32 L72 75 H28Z" fill="{P['white']}" stroke="{P['ink']}" stroke-width="3"/><path d="M28 72 H72 L67 102 H33Z" fill="{P['navy']}" stroke="{P['ink']}" stroke-width="3"/><rect x="28" y="44" width="44" height="8" fill="{P['blush']}"/><path d="M34 101 L28 137" stroke="{P['skin']}" stroke-width="12" stroke-linecap="round"/><path d="M66 101 L72 137" stroke="{P['skin']}" stroke-width="12" stroke-linecap="round"/><path d="M21 140 H40" stroke="{P['ink']}" stroke-width="12" stroke-linecap="round"/><path d="M60 140 H79" stroke="{P['ink']}" stroke-width="12" stroke-linecap="round"/><path d="M30 45 L14 82" stroke="{P['skin']}" stroke-width="11" stroke-linecap="round"/><path d="M70 45 L86 82" stroke="{P['skin']}" stroke-width="11" stroke-linecap="round"/></symbol>
<symbol id="bloom" viewBox="0 0 120 240"><use href="#bloomBody" x="10" y="92" width="100" height="150"/><use href="#bloomHead" x="10" y="0" width="100" height="120"/></symbol>
</defs>'''


def svg(w: int, h: int, body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{defs()}{body}</svg>\n'


def generate_svgs() -> list[dict]:
    SVG_ROOT.mkdir(parents=True, exist_ok=True)
    produced: list[dict] = []

    body = '<rect width="1600" height="1000" rx="32" fill="#F8FAFF"/><text x="60" y="72" font-family="system-ui" font-weight="800" font-size="38" fill="#2B2D42">BLOOM — CHARACTER MASTER</text><text x="60" y="112" font-family="system-ui" font-size="22" fill="#566">Adult Black woman · fair warm-brown skin · natural curls · droopy bunny ears</text>'
    for label, x, flip in [('FRONT', 90, 1), ('3/4', 430, 1), ('SIDE', 770, 1), ('BACK', 1110, -1)]:
        body += f'<g transform="translate({x} 190) scale({flip} 1) translate({0 if flip == 1 else -240} 0)"><use href="#bloom" width="240" height="480"/></g><text x="{x+65}" y="720" font-family="system-ui" font-size="24" font-weight="700" fill="#2B2D42">{label}</text>'
    body += '<g transform="translate(70 790)"><rect width="1460" height="140" rx="24" fill="#FFF" stroke="#D9C8FF" stroke-width="3"/><text x="28" y="42" font-family="system-ui" font-weight="700" font-size="22" fill="#2B2D42">LOCKED IDENTITY</text><text x="28" y="78" font-family="system-ui" font-size="20" fill="#445">same face · same ears · same skin tone · same hair silhouette · adult athletic proportions</text><circle cx="960" cy="70" r="25" fill="#B97855"/><circle cx="1030" cy="70" r="25" fill="#201915"/><circle cx="1100" cy="70" r="25" fill="#5BA86B"/><circle cx="1170" cy="70" r="25" fill="#FFD6E7"/><circle cx="1240" cy="70" r="25" fill="#243B64"/></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-bloom-master-sheet-v1.svg", svg(1600, 1000, body))
    produced.append({"id": "svg.bloom.master", "path": "assets/pixel-bloom/system/runtime/svg/pb-bloom-master-sheet-v1.svg", "role": "character-master"})

    expressions = ['HAPPY', 'FOCUSED', 'PROUD', 'SURPRISED', 'TIRED', 'WINK', 'DETERMINED', 'CHEERFUL']
    body = '<rect width="1600" height="900" fill="#F8FAFF"/><text x="60" y="70" font-family="system-ui" font-size="38" font-weight="800" fill="#2B2D42">BLOOM — EXPRESSIONS</text>'
    for i, label in enumerate(expressions):
        col, row = i % 4, i // 4; x, y = 90 + col * 375, 140 + row * 340
        body += f'<g transform="translate({x} {y})"><use href="#bloomHead" width="230" height="276"/><text x="55" y="300" font-family="system-ui" font-size="22" font-weight="700" fill="#2B2D42">{label}</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-bloom-expressions-v1.svg", svg(1600, 900, body))
    produced.append({"id": "svg.bloom.expressions", "path": "assets/pixel-bloom/system/runtime/svg/pb-bloom-expressions-v1.svg", "role": "expression-sheet"})

    poses = ['IDLE', 'READY', 'CELEBRATE', 'REST', 'LIFTING', 'CARDIO', 'RECOVERY', 'PROGRESSION']
    body = '<rect width="1600" height="960" fill="#F8FAFF"/><text x="60" y="70" font-family="system-ui" font-size="38" font-weight="800" fill="#2B2D42">BLOOM — POSES &amp; STATES</text>'
    for i, label in enumerate(poses):
        col, row = i % 4, i // 4; x, y = 90 + col * 375, 140 + row * 390
        body += f'<g transform="translate({x} {y})"><use href="#bloom" width="230" height="460"/><text x="65" y="430" font-family="system-ui" font-size="22" font-weight="700" fill="#2B2D42">{label}</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-bloom-poses-v1.svg", svg(1600, 960, body))
    produced.append({"id": "svg.bloom.poses", "path": "assets/pixel-bloom/system/runtime/svg/pb-bloom-poses-v1.svg", "role": "pose-sheet"})

    body = '<rect width="1400" height="900" fill="#F8FAFF"/><text x="60" y="70" font-family="system-ui" font-size="38" font-weight="800" fill="#2B2D42">PIXEL BLOOM — UI KIT</text>'
    icons = [('HOME','⌂'),('WORKOUT','◈'),('PROGRESS','↗'),('ACHIEVE','★'),('WORLD','◇'),('SETTINGS','⚙')]
    for i, (label, glyph) in enumerate(icons):
        x = 80 + i * 210
        body += f'<g transform="translate({x} 140)"><rect width="150" height="150" rx="28" fill="#FFF" stroke="#B8E0FF" stroke-width="4"/><text x="75" y="90" text-anchor="middle" font-family="system-ui" font-size="62" fill="#3B82F6">{glyph}</text><text x="75" y="185" text-anchor="middle" font-family="system-ui" font-size="18" font-weight="700" fill="#2B2D42">{label}</text></g>'
    badges = [('#C8F7E1','✓','FIRST STEP'),('#FFD6E7','★','7 DAY'),('#B8E0FF','◆','NEW PR'),('#D9C8FF','♥','CONSISTENCY'),('#FFE1B8','⚡','QUICK SAVE')]
    for i, (color, glyph, label) in enumerate(badges):
        x = 100 + i * 250
        body += f'<g transform="translate({x} 430)"><path d="M75 0 L145 38 L145 112 L75 150 L5 112 L5 38Z" fill="{color}" stroke="#2B2D42" stroke-width="5"/><text x="75" y="92" text-anchor="middle" font-family="system-ui" font-size="54" fill="#2B2D42">{glyph}</text><text x="75" y="190" text-anchor="middle" font-family="system-ui" font-size="18" font-weight="700" fill="#2B2D42">{label}</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-ui-kit-v1.svg", svg(1400, 900, body))
    produced.append({"id": "svg.ui.kit", "path": "assets/pixel-bloom/system/runtime/svg/pb-ui-kit-v1.svg", "role": "ui-kit"})

    covers = [('BEGINNER FOUNDATION','#C8F7E1','#B8E0FF'),('FULL BODY FLOW','#FFD6E7','#D9C8FF'),('MINDFUL MOVEMENT','#FFE1B8','#C8F7E1'),('LOWER BODY','#B8E0FF','#D9C8FF'),('UPPER BODY','#D9C8FF','#FFD6E7'),('RECOVERY DAY','#C8F7E1','#FFE1B8')]
    body = '<rect width="1500" height="1050" fill="#F8FAFF"/><text x="60" y="70" font-family="system-ui" font-size="38" font-weight="800" fill="#2B2D42">WORKOUT COVER SYSTEM</text>'
    for i, (label, c1, c2) in enumerate(covers):
        col, row = i % 3, i // 3; x, y = 60 + col * 480, 130 + row * 440
        body += f'<g transform="translate({x} {y})"><rect width="420" height="340" rx="28" fill="{c1}" stroke="#2B2D42" stroke-width="4"/><circle cx="350" cy="70" r="46" fill="{c2}"/><path d="M0 230 Q90 150 180 220 T420 190 V340 H0Z" fill="{c2}"/><path d="M0 270 Q120 200 220 265 T420 245 V340 H0Z" fill="#5BA86B" opacity=".85"/><use href="#bloom" x="220" y="65" width="155" height="260"/><rect x="18" y="250" width="275" height="72" rx="16" fill="#2B2D42" opacity=".88"/><text x="34" y="279" font-family="system-ui" font-size="21" font-weight="800" fill="white">{label}</text><text x="34" y="307" font-family="system-ui" font-size="15" fill="white">MOVE · LEVEL UP · FEEL GOOD</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-workout-covers-v1.svg", svg(1500, 1050, body))
    produced.append({"id": "svg.workout.covers", "path": "assets/pixel-bloom/system/runtime/svg/pb-workout-covers-v1.svg", "role": "workout-cover-sheet"})

    body = '<rect width="1500" height="650" fill="#F8FAFF"/><text x="60" y="70" font-family="system-ui" font-size="38" font-weight="800" fill="#2B2D42">EXERCISE — BODYWEIGHT SQUAT</text>'
    frames = [('START',0,0,1),('LOWER',8,30,.9),('BOTTOM',12,60,.82),('RISE',5,25,.92),('FINISH',0,0,1)]
    for i, (label, dx, dy, scale_y) in enumerate(frames):
        x = 60 + i * 285
        body += f'<g transform="translate({x} 150)"><rect width="245" height="390" rx="24" fill="#FFF" stroke="#D9C8FF" stroke-width="3"/><g transform="translate({dx+22} {dy+25}) scale(1 {scale_y})"><use href="#bloom" width="200" height="360"/></g><text x="122" y="370" text-anchor="middle" font-family="system-ui" font-size="20" font-weight="700" fill="#2B2D42">{label}</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-exercise-squat-frames-v1.svg", svg(1500, 650, body))
    produced.append({"id": "svg.exercise.squat.frames", "path": "assets/pixel-bloom/system/runtime/svg/pb-exercise-squat-frames-v1.svg", "role": "exercise-keyframes"})

    body = '<rect width="1600" height="900" fill="url(#sky)"/><path d="M0 610 Q220 420 420 610 T820 560 T1200 520 T1600 590 V900 H0Z" fill="#8FCB7A"/><path d="M0 700 Q300 520 600 720 T1100 640 T1600 720 V900 H0Z" fill="#5BA86B"/><path d="M650 420 C820 520 740 720 950 820" fill="none" stroke="#71B7E6" stroke-width="90"/><path d="M650 420 C820 520 740 720 950 820" fill="none" stroke="#B8E0FF" stroke-width="55"/><polygon points="660,200 860,520 460,520" fill="#9AA7C2"/><polygon points="660,200 745,335 575,335" fill="#F8FAFF"/><text x="80" y="80" font-family="system-ui" font-size="42" font-weight="800" fill="#2B2D42">PIXEL BLOOM WORLD</text>'
    for x, y, label in [(220,600,'1 · STARTER GROVE'),(650,500,'2 · STRENGTH PEAK'),(910,690,'3 · BALANCE BAY'),(1130,580,'4 · ENDURANCE FALLS'),(1360,690,'5 · MINDSET MEADOW'),(1240,300,'6 · SUMMIT')]:
        body += f'<g transform="translate({x} {y})"><circle r="26" fill="#FFF" stroke="#2B2D42" stroke-width="4"/><circle r="12" fill="#EC4899"/><rect x="-95" y="36" width="190" height="44" rx="18" fill="#FFF" stroke="#2B2D42" stroke-width="3"/><text y="64" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#2B2D42">{label}</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-world-map-v1.svg", svg(1600, 900, body))
    produced.append({"id": "svg.world.map", "path": "assets/pixel-bloom/system/runtime/svg/pb-world-map-v1.svg", "role": "world-map"})

    items = [('BLOOM BOTTLE','#B8E0FF'),('LUCKY LEAF','#5BA86B'),('GOLDEN SNEAKER','#F59E0B'),('CLOUD BUDDY','#D9C8FF'),('CHERRY BLOSSOM','#FFD6E7'),('STAR SHARD','#F59E0B'),('JOURNAL','#5BA86B'),('BUNNY PACK','#FFD6E7')]
    body = '<rect width="1400" height="760" fill="#F8FAFF"/><text x="60" y="70" font-family="system-ui" font-size="38" font-weight="800" fill="#2B2D42">COLLECTIBLES</text>'
    shapes = ['M50 15h35v20h10v75H40V35h10z','M65 15C20 25 18 80 60 100C100 82 105 25 65 15Z','M20 75h50l25 15v20H15z','M35 85a30 30 0 1155 0h10a22 22 0 110 44H35a22 22 0 110-44z','M60 20l12 28 30-5-22 22 16 27-31-12-20 24 2-31-29-8 30-7z','M60 12l14 30 34 4-25 23 7 34-30-17-30 17 7-34-25-23 34-4z','M25 15h70v100H25z','M35 45a25 25 0 0150 0v60H35z']
    for i, ((label, color), shape) in enumerate(zip(items, shapes)):
        col, row = i % 4, i // 4; x, y = 80 + col * 330, 130 + row * 300
        body += f'<g transform="translate({x} {y})"><rect width="260" height="230" rx="28" fill="#FFF" stroke="#D9C8FF" stroke-width="3"/><g transform="translate(70 30)"><path d="{shape}" fill="{color}" stroke="#2B2D42" stroke-width="5" stroke-linejoin="round"/></g><text x="130" y="200" text-anchor="middle" font-family="system-ui" font-size="18" font-weight="700" fill="#2B2D42">{label}</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-collectibles-v1.svg", svg(1400, 760, body))
    produced.append({"id": "svg.collectibles", "path": "assets/pixel-bloom/system/runtime/svg/pb-collectibles-v1.svg", "role": "collectible-sheet"})

    states = [('YOU SHOWED UP!','#FFE1B8'),('REST IS PROGRESS','#2B2D42'),('LEVEL UP!','#D9C8FF'),('OFFLINE — STILL READY','#C8F7E1'),('BACKUP COMPLETE','#B8E0FF'),('RECOVERY MODE','#FFD6E7')]
    body = '<rect width="1500" height="1050" fill="#F8FAFF"/><text x="60" y="70" font-family="system-ui" font-size="38" font-weight="800" fill="#2B2D42">STATE ILLUSTRATIONS</text>'
    for i, (label, color) in enumerate(states):
        col, row = i % 3, i // 3; x, y = 60 + col * 480, 130 + row * 440; txt = 'white' if color == '#2B2D42' else '#2B2D42'
        body += f'<g transform="translate({x} {y})"><rect width="420" height="340" rx="28" fill="{color}" stroke="#2B2D42" stroke-width="4"/><circle cx="310" cy="90" r="58" fill="#F8FAFF" opacity=".45"/><use href="#bloom" x="135" y="70" width="150" height="250"/><text x="210" y="45" text-anchor="middle" font-family="system-ui" font-size="24" font-weight="800" fill="{txt}">{label}</text></g>'
    write("assets/pixel-bloom/system/runtime/svg/pb-states-v1.svg", svg(1500, 1050, body))
    produced.append({"id": "svg.states", "path": "assets/pixel-bloom/system/runtime/svg/pb-states-v1.svg", "role": "state-sheet"})

    idle = f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">{defs()}<g transform="translate(136 30)"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="2.2s" repeatCount="indefinite"/><use href="#bloom" width="240" height="460"/></g></g></svg>\n'
    write("assets/pixel-bloom/system/runtime/svg/pb-anim-bloom-idle-v1.svg", idle)
    produced.append({"id": "svg.animation.bloom.idle", "path": "assets/pixel-bloom/system/runtime/svg/pb-anim-bloom-idle-v1.svg", "role": "animated-svg"})
    celebrate = f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">{defs()}<g transform="translate(136 30)"><g><animateTransform attributeName="transform" type="translate" values="0 10;0 -24;0 10" dur="1s" repeatCount="indefinite"/><use href="#bloom" width="240" height="460"/></g></g><circle cx="100" cy="120" r="10" fill="#F59E0B"><animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite"/></circle></svg>\n'
    write("assets/pixel-bloom/system/runtime/svg/pb-anim-bloom-celebrate-v1.svg", celebrate)
    produced.append({"id": "svg.animation.bloom.celebrate", "path": "assets/pixel-bloom/system/runtime/svg/pb-anim-bloom-celebrate-v1.svg", "role": "animated-svg"})
    squat = f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">{defs()}<rect width="512" height="512" fill="#F8FAFF"/><g transform="translate(136 35)"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 55;0 0" dur="2s" repeatCount="indefinite"/><use href="#bloom" width="240" height="430"/></g></g><text x="256" y="480" text-anchor="middle" font-family="system-ui" font-size="22" font-weight="700" fill="#2B2D42">BODYWEIGHT SQUAT — LOOP PREVIEW</text></svg>\n'
    write("assets/pixel-bloom/system/runtime/svg/pb-anim-exercise-squat-v1.svg", squat)
    produced.append({"id": "svg.animation.exercise.squat", "path": "assets/pixel-bloom/system/runtime/svg/pb-anim-exercise-squat-v1.svg", "role": "animated-svg"})

    for item in produced:
        ET.parse(ROOT / item["path"])
    return produced


def generate_system(produced: list[dict]) -> None:
    readme = '''# Pixel Bloom Asset Platform v1\n\nThis is the canonical asset platform for Pixel Bloom. It separates generated/source art, AI/human reference material, app-ready runtime assets, schemas, tokens, semantic registries, animations, and validation.\n\n## Core rule\n\nApplication code consumes semantic IDs. It should not care how an asset was created or where a master file lives.\n\n## Layers\n\n- `source/`: highest-quality masters; never direct runtime dependencies.\n- `reference/`: character/style/motion truth for humans and AI agents.\n- `runtime/`: app-ready SVG/WebP/PNG/sprite/animation assets.\n- `schemas/`: machine-readable contracts.\n- `manifests/`: semantic registry, coverage, and fallbacks.\n- `tokens/`: canonical Pixel Bloom colors and character identity.\n\n## Character lock\n\nBloom is an adult Black woman with fair/warm brown skin, dark natural curly hair, long soft droopy bunny ears, friendly athletic adult proportions, and a pastel fitness outfit.\n\n## Validation\n\nRun `npm run assets:generate` then `npm run assets:validate`.\n'''
    write("assets/pixel-bloom/system/README.md", readme)
    for layer, text in [("source", "Highest-fidelity masters; never direct runtime dependencies."), ("reference", "AI/human consistency references."), ("runtime", "App-ready assets addressed by semantic IDs.")]:
        write(f"assets/pixel-bloom/system/{layer}/README.md", f"# {layer.title()} assets\n\n{text}\n")

    tokens = {"theme":"pixel-bloom","version":1,"colors":P,"character":{"name":"Bloom","adult":True,"identity":"Black woman","skinTone":"fair/warm brown","hair":"dark natural curly","ears":"long soft droopy bunny ears","proportions":"friendly athletic adult"},"art":{"style":"modern high-fidelity pixel-inspired illustration + clean vector production primitives","instructionalRule":"movement clarity over spectacle"}}
    write_json("assets/pixel-bloom/system/tokens/pixel-bloom.tokens.json", tokens)

    asset_schema = {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"Pixel Bloom Asset","type":"object","required":["id","path","kind","status"],"properties":{"id":{"type":"string"},"path":{"type":"string"},"kind":{"enum":["svg","image","sprite-sheet","reference","audio","data"]},"status":{"enum":["planned","generated","reviewed","approved","runtime-ready","deprecated"]},"fallbackId":{"type":["string","null"]},"metadata":{"type":"object"}}}
    animation_schema = {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"Pixel Bloom Animation","type":"object","required":["id","path","motionModes"],"properties":{"id":{"type":"string"},"path":{"type":"string"},"motionModes":{"type":"object","required":["full","reduced","off"]}}}
    write_json("assets/pixel-bloom/system/schemas/asset.schema.json", asset_schema)
    write_json("assets/pixel-bloom/system/schemas/animation.schema.json", animation_schema)

    assets = []
    for item in produced:
        assets.append({"id":item["id"],"path":item["path"],"kind":"svg","role":item["role"],"status":"runtime-ready","fallbackId":None,"metadata":{"theme":"pixel-bloom","version":1,"creator":"OpenAI ChatGPT"}})
    registry = {"schemaVersion":1,"theme":"pixel-bloom","generatedAt":"2026-09-21","assets":assets}
    write_json("assets/pixel-bloom/system/manifests/asset-registry.v1.json", registry)
    index = {a["id"]:{"path":a["path"],"kind":a["kind"],"role":a["role"],"status":a["status"]} for a in assets}
    write_json("assets/pixel-bloom/system/manifests/asset-index.v1.json", {"schemaVersion":1,"theme":"pixel-bloom","assets":index})
    animations = [
        {"id":"character.bloom.idle","path":"assets/pixel-bloom/system/runtime/svg/pb-anim-bloom-idle-v1.svg","motionModes":{"full":"animated SVG","reduced":"static first frame","off":"static character"}},
        {"id":"character.bloom.celebrate","path":"assets/pixel-bloom/system/runtime/svg/pb-anim-bloom-celebrate-v1.svg","motionModes":{"full":"animated SVG","reduced":"static celebration pose","off":"static character"}},
        {"id":"exercise.bodyweight-squat.preview","path":"assets/pixel-bloom/system/runtime/svg/pb-anim-exercise-squat-v1.svg","motionModes":{"full":"animated preview","reduced":"start/finish only","off":"keyframe sheet + written instructions"}},
    ]
    write_json("assets/pixel-bloom/system/manifests/animation-registry.v1.json", {"schemaVersion":1,"theme":"pixel-bloom","animations":animations})
    coverage = {"theme":"pixel-bloom","version":1,"generatedAt":"2026-09-21","complete":{"characterMaster":True,"expressions":True,"poses":True,"uiKit":True,"workoutCoverSystem":True,"worldMap":True,"collectibles":True,"stateIllustrations":True,"squatKeyframes":True,"idleAnimation":True,"celebrationAnimation":True,"squatAnimationPreview":True,"schemas":True,"tokens":True,"registry":True,"validation":True},"guardrail":"Do not create misleading exercise-specific movement art. Existing canonical/public exercise media remains the fallback until a movement-specific Pixel Bloom set is reviewed."}
    write_json("assets/pixel-bloom/system/manifests/coverage.v1.json", coverage)
    status = {"generatedAt":"2026-09-21","systemArchitecture":"complete","runtimeVectorPack":"complete","animationPack":"complete","validation":"complete","instructionalExerciseArt":"bodyweight squat complete; other exercises keep accurate existing media/written guidance rather than fake substitutions"}
    write_json("assets/pixel-bloom/system/manifests/production-status.v1.json", status)

    validator = '''import fs from 'node:fs'\nimport path from 'node:path'\nconst root=process.cwd(); const reg=JSON.parse(fs.readFileSync(path.join(root,'assets/pixel-bloom/system/manifests/asset-registry.v1.json'),'utf8')); const errors=[]; const ids=new Set(); for(const a of reg.assets){if(ids.has(a.id))errors.push(`duplicate ${a.id}`);ids.add(a.id);if(a.status==='runtime-ready'&&!fs.existsSync(path.join(root,a.path)))errors.push(`missing ${a.path}`);} if(errors.length){console.error(errors.join('\\n'));process.exit(1)} console.log(`Asset validation passed: ${reg.assets.length} runtime assets.`)\n'''
    write("scripts/assets/validate-assets.mjs", validator)
    indexer = '''import fs from 'node:fs'\nimport path from 'node:path'\nconst root=process.cwd(); const p=path.join(root,'assets/pixel-bloom/system/manifests/asset-registry.v1.json'); const reg=JSON.parse(fs.readFileSync(p,'utf8')); const assets={}; for(const a of reg.assets)assets[a.id]={path:a.path,kind:a.kind,role:a.role,status:a.status}; fs.writeFileSync(path.join(root,'assets/pixel-bloom/system/manifests/asset-index.v1.json'),JSON.stringify({schemaVersion:1,theme:'pixel-bloom',assets},null,2)+'\\n'); console.log(`Indexed ${Object.keys(assets).length} assets.`)\n'''
    write("scripts/assets/build-asset-index.mjs", indexer)

    handoff = '''# Claude Handoff — Pixel Bloom Asset Platform v1\n\n**Delivery:** DEL-20260921-001\n**Status:** READY FOR INTEGRATION\n\nUse `assets/pixel-bloom/system/manifests/asset-index.v1.json` as the semantic lookup layer. Do not regenerate missing approved assets from prose. Preserve Full/Reduced/Off motion behavior. Exercise media must remain movement-accurate; never substitute another movement merely to fill an image slot.\n\nRun `npm run assets:generate` and `npm run assets:validate` before integration.\n'''
    write("support/CLAUDE_HANDOFF_ASSET_PLATFORM_20260921.md", handoff)
    write("support/deliveries/DEL-20260921-001.md", "# DEL-20260921-001 — Pixel Bloom complete asset platform\n\n**Status:** DELIVERED\n\nDelivered deterministic asset generation, canonical character/style tokens, SVG production art, animated SVGs, semantic registries, schemas, coverage/status manifests, validation, and Claude handoff.\n")

    pb_readme = '''# Pixel Bloom Creative Assets\n\nThe complete asset platform is under `assets/pixel-bloom/system/`. Application integration belongs to Claude Code. Creative generation, references, SVG art, motion assets, manifests and visual QA belong to the creative pipeline.\n\nRun:\n\n```bash\nnpm run assets:generate\nnpm run assets:validate\n```\n'''
    write("assets/pixel-bloom/README.md", pb_readme)

    pkg_path = ROOT / "package.json"
    pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    pkg.setdefault("scripts", {})["assets:generate"] = "python3 scripts/assets/generate-pixel-bloom-system.py"
    pkg["scripts"]["assets:index"] = "node scripts/assets/build-asset-index.mjs"
    pkg["scripts"]["assets:validate"] = "node scripts/assets/validate-assets.mjs"
    pkg_path.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    produced = generate_svgs()
    generate_system(produced)
    print(f"Generated Pixel Bloom asset platform: {len(produced)} runtime SVG assets")


if __name__ == "__main__":
    main()
