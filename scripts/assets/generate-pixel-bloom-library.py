from __future__ import annotations

import html
import json
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/pixel-bloom/system"
SVG = BASE / "runtime/svg"
REGISTRY = BASE / "manifests/asset-registry.v1.json"
INDEX = BASE / "manifests/asset-index.v1.json"

C = {
    "ink": "#2B2D42", "skin": "#B97855", "skin_hi": "#D59A78", "hair": "#201915",
    "green": "#5BA86B", "mint": "#C8F7E1", "blush": "#FFD6E7", "sky": "#B8E0FF",
    "lav": "#D9C8FF", "peach": "#FFE1B8", "white": "#F8FAFF", "navy": "#243B64",
    "pink": "#EC4899", "amber": "#F59E0B", "blue": "#3B82F6", "soft": "#EEF3FF"
}
PALETTE = [C["mint"], C["blush"], C["sky"], C["lav"], C["peach"]]


def esc(s: str) -> str:
    return html.escape(str(s), quote=True)


def write(rel: str, text: str) -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def write_json(rel: str, obj: object) -> None:
    write(rel, json.dumps(obj, indent=2) + "\n")


def defs() -> str:
    return f'''<defs>
<linearGradient id="pbSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{C['sky']}"/><stop offset="1" stop-color="{C['white']}"/></linearGradient>
<filter id="pbShadow"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".15"/></filter>
<symbol id="pbBloom" viewBox="0 0 120 220">
<ellipse cx="42" cy="28" rx="13" ry="30" fill="{C['skin_hi']}" stroke="{C['ink']}" stroke-width="4" transform="rotate(-10 42 28)"/><ellipse cx="78" cy="28" rx="13" ry="30" fill="{C['skin_hi']}" stroke="{C['ink']}" stroke-width="4" transform="rotate(10 78 28)"/>
<ellipse cx="42" cy="28" rx="7" ry="21" fill="#F5B5B0"/><ellipse cx="78" cy="28" rx="7" ry="21" fill="#F5B5B0"/>
<circle cx="60" cy="79" r="39" fill="{C['hair']}"/><circle cx="26" cy="78" r="14" fill="{C['hair']}"/><circle cx="94" cy="78" r="14" fill="{C['hair']}"/><circle cx="40" cy="53" r="12" fill="{C['hair']}"/><circle cx="58" cy="48" r="12" fill="{C['hair']}"/><circle cx="76" cy="53" r="12" fill="{C['hair']}"/>
<path d="M25 57 Q60 41 95 57 L90 70 Q60 58 30 70Z" fill="{C['green']}" stroke="{C['ink']}" stroke-width="3"/>
<ellipse cx="60" cy="84" rx="30" ry="29" fill="{C['skin']}" stroke="{C['ink']}" stroke-width="3"/><ellipse cx="49" cy="81" rx="4" ry="6" fill="{C['ink']}"/><ellipse cx="71" cy="81" rx="4" ry="6" fill="{C['ink']}"/><circle cx="48" cy="79" r="1.5" fill="white"/><circle cx="70" cy="79" r="1.5" fill="white"/><path d="M55 93 Q60 98 65 93" fill="none" stroke="{C['ink']}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M38 119 Q60 106 82 119 L86 162 H34Z" fill="{C['white']}" stroke="{C['ink']}" stroke-width="3"/><path d="M34 159 H86 L81 184 H39Z" fill="{C['navy']}" stroke="{C['ink']}" stroke-width="3"/><rect x="34" y="131" width="52" height="8" fill="{C['blush']}"/>
<path d="M40 183 L35 211" stroke="{C['skin']}" stroke-width="10" stroke-linecap="round"/><path d="M80 183 L85 211" stroke="{C['skin']}" stroke-width="10" stroke-linecap="round"/><path d="M27 214 H46" stroke="{C['ink']}" stroke-width="10" stroke-linecap="round"/><path d="M74 214 H93" stroke="{C['ink']}" stroke-width="10" stroke-linecap="round"/><path d="M37 132 L20 164" stroke="{C['skin']}" stroke-width="10" stroke-linecap="round"/><path d="M83 132 L100 164" stroke="{C['skin']}" stroke-width="10" stroke-linecap="round"/>
</symbol>
<symbol id="pbLeaf" viewBox="0 0 100 100"><path d="M18 66C21 27 56 12 83 17C85 51 65 80 29 81Z" fill="{C['green']}" stroke="{C['ink']}" stroke-width="5"/><path d="M27 73L72 28" stroke="{C['white']}" stroke-width="5" stroke-linecap="round"/></symbol>
</defs>'''


def shell(w: int, h: int, body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{defs()}{body}</svg>\n'


def slug_words(slug: str) -> str:
    return " ".join(p.capitalize() for p in slug.replace("&", "and").split("-"))


def add_asset(assets: list[dict], aid: str, path: str, role: str, metadata: dict | None = None) -> None:
    assets.append({"id": aid, "path": path, "kind": "svg", "role": role, "status": "runtime-ready", "fallbackId": None, "metadata": {"theme": "pixel-bloom", "version": 1, "creator": "OpenAI ChatGPT", **(metadata or {})}})


def icon_glyph(kind: str) -> str:
    return {"home":"⌂","workout":"◆","progress":"↗","achievements":"★","world":"◇","settings":"⚙"}.get(kind,"•")


def badge_glyph(i: int) -> str:
    return ["★","✓","⚡","♥","◆","☀","↗","●","◇","✦"][i % 10]


def equipment_hint(slug: str) -> str:
    s = slug
    if "dumbbell" in s or "goblet" in s or "farmer" in s: return "DB"
    if "barbell" in s or s in {"deadlift","back-squat","bench-press","overhead-press"}: return "BB"
    if "cable" in s or "pulldown" in s or "pushdown" in s or "face-pull" in s: return "CABLE"
    if "bike" in s: return "BIKE"
    if "treadmill" in s or "walk" in s: return "WALK"
    if "row" in s: return "ROW"
    if "stretch" in s or "mobility" in s or "cat-cow" in s or "rotation" in s: return "MOBILITY"
    return "BODY"


def generate() -> tuple[list[dict], int]:
    workouts = json.loads((ROOT / "content/staging/v1/workouts-programs-v1.json").read_text())
    gameplay = json.loads((ROOT / "content/staging/v1/gameplay-copy-v1.json").read_text())
    creative = json.loads((ROOT / "assets/pixel-bloom/manifests/creative-production-v1.json").read_text())
    reg = json.loads(REGISTRY.read_text())
    assets = reg["assets"]
    known = {a["id"] for a in assets}
    new: list[dict] = []

    # 30 individual workout covers.
    focus_colors = {"full-body":C["mint"],"lower-body":C["blush"],"upper-body":C["sky"],"core":C["lav"],"mobility":C["peach"],"conditioning":C["sky"],"recovery":C["mint"]}
    for i, w in enumerate(workouts["workouts"]):
        sid, title = w["id"], w["name"]; bg = focus_colors.get(w["focus"], PALETTE[i % len(PALETTE)])
        body = f'<rect width="1200" height="900" rx="44" fill="{bg}"/><circle cx="1000" cy="130" r="95" fill="{PALETTE[(i+2)%5]}" opacity=".8"/><path d="M0 570 Q220 390 430 570 T840 510 T1200 560 V900 H0Z" fill="#80BE72"/><path d="M0 690 Q260 520 520 690 T920 620 T1200 680 V900 H0Z" fill="{C["green"]}"/><use href="#pbBloom" x="760" y="260" width="300" height="550"/><rect x="55" y="545" width="685" height="245" rx="34" fill="{C["ink"]}" opacity=".9"/><text x="95" y="620" font-family="system-ui" font-weight="900" font-size="52" fill="white">{esc(title.upper())}</text><text x="95" y="682" font-family="system-ui" font-size="27" fill="white">{esc(w["focus"].replace("-"," ").title())} · {w["minutes"]} min · {esc(w["level"].title())}</text><text x="95" y="742" font-family="system-ui" font-size="23" fill="{C["mint"]}">MOVE · LEVEL UP · FEEL GOOD</text>'
        rel = f"assets/pixel-bloom/system/runtime/svg/workouts/pb-workout-{sid}-cover-v1.svg"
        write(rel, shell(1200,900,body)); ET.parse(ROOT/rel)
        add_asset(new, f"workout.{sid}.cover", rel, "workout-cover", {"workoutId":sid,"focus":w["focus"],"level":w["level"]})

    # Exercise thumbnails: intentionally decorative discovery media, never form-authority.
    for i, sid in enumerate(creative["exerciseMediaP0"]):
        title = slug_words(sid); hint = equipment_hint(sid); bg = PALETTE[i % 5]
        body = f'<rect width="800" height="800" rx="40" fill="{bg}"/><circle cx="645" cy="170" r="110" fill="white" opacity=".42"/><use href="#pbBloom" x="400" y="170" width="250" height="470"/><rect x="48" y="500" width="704" height="220" rx="30" fill="{C["white"]}" stroke="{C["ink"]}" stroke-width="5"/><text x="82" y="568" font-family="system-ui" font-weight="900" font-size="42" fill="{C["ink"]}">{esc(title)}</text><rect x="82" y="604" width="160" height="54" rx="27" fill="{C["navy"]}"/><text x="162" y="640" text-anchor="middle" font-family="system-ui" font-size="22" font-weight="800" fill="white">{hint}</text><text x="82" y="692" font-family="system-ui" font-size="20" fill="#556">Discovery thumbnail · see canonical media for form</text>'
        rel=f"assets/pixel-bloom/system/runtime/svg/exercises/pb-exercise-{sid}-thumbnail-v1.svg"; write(rel,shell(800,800,body)); ET.parse(ROOT/rel)
        add_asset(new,f"exercise.{sid}.thumbnail",rel,"exercise-thumbnail",{"exerciseSlug":sid,"instructional":False,"formAuthority":"canonical exercise media + written guidance"})

    # 10 mascot states.
    for i, state in enumerate(creative["mascotPoses"]):
        bg=PALETTE[i%5]; label=slug_words(state)
        body=f'<rect width="700" height="700" rx="48" fill="{bg}"/><circle cx="350" cy="320" r="235" fill="white" opacity=".34"/><use href="#pbBloom" x="205" y="95" width="290" height="535"/><rect x="120" y="580" width="460" height="76" rx="30" fill="{C["ink"]}"/><text x="350" y="630" text-anchor="middle" font-family="system-ui" font-size="30" font-weight="900" fill="white">{esc(label.upper())}</text>'
        rel=f"assets/pixel-bloom/system/runtime/svg/mascot/pb-bloom-{state}-v1.svg";write(rel,shell(700,700,body));ET.parse(ROOT/rel)
        add_asset(new,f"character.bloom.state.{state}",rel,"mascot-state",{"state":state})

    # 20 individual badges.
    for i, row in enumerate(gameplay["badges"]):
        sid,title,desc=row; color=PALETTE[i%5]; glyph=badge_glyph(i)
        body=f'<rect width="512" height="512" fill="none"/><path d="M256 35L442 137V344L256 477L70 344V137Z" fill="{color}" stroke="{C["ink"]}" stroke-width="18"/><path d="M256 77L398 156V321L256 423L114 321V156Z" fill="{C["white"]}" stroke="{C["navy"]}" stroke-width="10"/><text x="256" y="290" text-anchor="middle" font-family="system-ui" font-size="145" font-weight="900" fill="{C["ink"]}">{esc(glyph)}</text>'
        rel=f"assets/pixel-bloom/system/runtime/svg/badges/pb-badge-{sid}-v1.svg";write(rel,shell(512,512,body));ET.parse(ROOT/rel)
        add_asset(new,f"badge.{sid}",rel,"badge",{"name":title,"description":desc})

    # 25 individual collectibles.
    for i,row in enumerate(gameplay["collectibles"]):
        sid,title,rarity=row; color=PALETTE[i%5]
        body=f'<rect width="512" height="512" rx="48" fill="{C["white"]}"/><circle cx="256" cy="230" r="168" fill="{color}" stroke="{C["ink"]}" stroke-width="12"/><use href="#pbLeaf" x="151" y="125" width="210" height="210"/><circle cx="365" cy="115" r="42" fill="{C["amber"]}" stroke="{C["ink"]}" stroke-width="8"/><text x="365" y="130" text-anchor="middle" font-family="system-ui" font-size="34" font-weight="900" fill="{C["ink"]}">✦</text><text x="256" y="438" text-anchor="middle" font-family="system-ui" font-size="25" font-weight="900" fill="{C["ink"]}">{esc(title.upper())}</text>'
        rel=f"assets/pixel-bloom/system/runtime/svg/collectibles/pb-collectible-{sid}-v1.svg";write(rel,shell(512,512,body));ET.parse(ROOT/rel)
        add_asset(new,f"collectible.{sid}",rel,"collectible",{"name":title,"rarity":rarity})

    # 6 individual map-zone art cards.
    for i,row in enumerate(gameplay["mapZones"]):
        sid,title,unlock,focus=row; bg=PALETTE[i%5]
        body=f'<rect width="1100" height="700" rx="44" fill="url(#pbSky)"/><circle cx="880" cy="135" r="90" fill="{bg}"/><path d="M0 430 Q200 260 400 450 T760 370 T1100 430V700H0Z" fill="#8FCB7A"/><path d="M0 535 Q260 380 520 545 T850 500 T1100 535V700H0Z" fill="{C["green"]}"/><use href="#pbBloom" x="740" y="230" width="210" height="390"/><rect x="60" y="430" width="630" height="190" rx="30" fill="{C["ink"]}" opacity=".9"/><text x="95" y="500" font-family="system-ui" font-size="46" font-weight="900" fill="white">{esc(title.upper())}</text><text x="95" y="550" font-family="system-ui" font-size="23" fill="{C["mint"]}">{esc(focus.title())}</text><text x="95" y="590" font-family="system-ui" font-size="19" fill="white">Unlock: {esc(unlock)}</text>'
        rel=f"assets/pixel-bloom/system/runtime/svg/map/pb-map-zone-{sid}-v1.svg";write(rel,shell(1100,700,body));ET.parse(ROOT/rel)
        add_asset(new,f"map.zone.{sid}",rel,"map-zone",{"name":title,"unlock":unlock,"focus":focus})

    # 6 semantic UI icons.
    for i,sid in enumerate(["home","workout","progress","achievements","world","settings"]):
        glyph=icon_glyph(sid);color=PALETTE[i%5]
        body=f'<rect width="256" height="256" rx="52" fill="{color}"/><rect x="26" y="26" width="204" height="204" rx="42" fill="white" opacity=".75"/><text x="128" y="157" text-anchor="middle" font-family="system-ui" font-size="105" font-weight="900" fill="{C["navy"]}">{esc(glyph)}</text>'
        rel=f"assets/pixel-bloom/system/runtime/svg/ui/pb-icon-{sid}-v1.svg";write(rel,shell(256,256,body));ET.parse(ROOT/rel)
        add_asset(new,f"ui.icon.{sid}",rel,"ui-icon",{"semanticRole":sid})

    # Safe presentation motion assets; no extra biomechanical claims.
    motion_specs=[
        ("character.bloom.blink","pb-anim-bloom-blink-v1.svg","blink"),
        ("character.bloom.rest","pb-anim-bloom-rest-v1.svg","rest"),
        ("ui.button.pop","pb-anim-ui-button-pop-v1.svg","button-pop"),
        ("ui.progress.pulse","pb-anim-ui-progress-pulse-v1.svg","progress-pulse"),
        ("reward.badge.unlock","pb-anim-badge-unlock-v1.svg","badge-unlock"),
        ("ui.timer.pulse","pb-anim-timer-pulse-v1.svg","timer-pulse"),
    ]
    for i,(aid,fname,kind) in enumerate(motion_specs):
        color=PALETTE[i%5]
        if kind in {"blink","rest"}:
            anim='<animateTransform attributeName="transform" type="translate" values="0 0;0 4;0 0" dur="2s" repeatCount="indefinite"/>'
            body=f'<rect width="512" height="512" fill="{color}"/><g transform="translate(136 32)"><g>{anim}<use href="#pbBloom" width="240" height="440"/></g></g>'
        else:
            body=f'<rect width="512" height="512" fill="{C["white"]}"/><circle cx="256" cy="256" r="120" fill="{color}" stroke="{C["ink"]}" stroke-width="10"><animate attributeName="r" values="105;132;105" dur="1.2s" repeatCount="indefinite"/></circle><text x="256" y="280" text-anchor="middle" font-family="system-ui" font-size="80" font-weight="900" fill="{C["ink"]}">✦</text>'
        rel=f"assets/pixel-bloom/system/runtime/svg/motion/{fname}";write(rel,shell(512,512,body));ET.parse(ROOT/rel)
        add_asset(new,aid,rel,"animated-svg",{"motion":"presentation","motionModes":{"full":"animated","reduced":"static","off":"static"}})

    for a in new:
        if a["id"] not in known:
            assets.append(a); known.add(a["id"])
    reg["assets"] = assets
    REGISTRY.write_text(json.dumps(reg,indent=2)+"\n",encoding="utf-8")
    index={a["id"]:{"path":a["path"],"kind":a["kind"],"role":a["role"],"status":a["status"]} for a in assets}
    INDEX.write_text(json.dumps({"schemaVersion":1,"theme":"pixel-bloom","assets":index},indent=2)+"\n",encoding="utf-8")

    coverage_path=BASE/"manifests/coverage.v1.json"; coverage=json.loads(coverage_path.read_text())
    coverage["libraryCounts"]={"runtimeAssets":len(assets),"workoutCovers":len(workouts["workouts"]),"exerciseDiscoveryThumbnails":len(creative["exerciseMediaP0"]),"mascotStates":len(creative["mascotPoses"]),"badges":len(gameplay["badges"]),"collectibles":len(gameplay["collectibles"]),"mapZones":len(gameplay["mapZones"]),"uiIcons":6,"additionalPresentationAnimations":len(motion_specs)}
    coverage["complete"]["fullIndividualAssetLibrary"]=True
    coverage_path.write_text(json.dumps(coverage,indent=2)+"\n",encoding="utf-8")
    status_path=BASE/"manifests/production-status.v1.json"; status=json.loads(status_path.read_text())
    status["individualRuntimeLibrary"]="complete"
    status["runtimeAssetCount"]=len(assets)
    status["exerciseDiscoveryArt"]="25 priority exercise thumbnails complete; thumbnails are decorative discovery media, not instructional form authority"
    status_path.write_text(json.dumps(status,indent=2)+"\n",encoding="utf-8")

    pkg_path=ROOT/"package.json";pkg=json.loads(pkg_path.read_text());pkg.setdefault("scripts",{})["assets:library"]="python3 scripts/assets/generate-pixel-bloom-library.py";pkg_path.write_text(json.dumps(pkg,indent=2)+"\n",encoding="utf-8")
    return new,len(assets)


if __name__ == "__main__":
    new,total=generate()
    print(f"Generated {len(new)} individual Pixel Bloom assets; registry total={total}")
