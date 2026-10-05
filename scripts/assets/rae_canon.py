"""Rae's identity text for every ChatGPT prompt (rae-prompts.py, rae-redraw-prompts.py).

PREAMBLE is the canonical preamble from docs/RAE_AI_GENERATION_CONTRACT.md §2;
every Rae prompt must open with it. AVOID condenses the contract's §3
forbidden mutations that drawn strips have actually hit, plus (2026-10-01)
the plausible-for-a-strip failure modes named explicitly in
docs/RAE_CANON_SPEC_v1.md §§3.3-3.8/4 that hadn't shown up yet but are easy
for a model to drift into across repeated frames. Hair follows the
lock (identity.hair): black 4C, a voluminous natural updo/puff with tight
coils and selected tendrils. Nothing here may add a detail the lock or bible
doesn't state (the old prompts' "white socks" came from nowhere).
"""

PREAMBLE = (
    'Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. '
    'She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair '
    'in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan '
    'bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one '
    'small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus '
    'tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left '
    'top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty '
    'layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted '
    'leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in '
    'stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or '
    'alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. '
    'Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style.'
)

AVOID = (
    'Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, '
    'straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, '
    'face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, '
    'removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace '
    'letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves '
    'or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change '
    'between frames.'
)
