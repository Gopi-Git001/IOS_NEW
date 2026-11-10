# Crystal verdict verification

Art direction: on this page, Sugar Depth's one-word verdict becomes the glossy ink headline beside an un-faceted crystal label. Brand palette, type, approved reference geometry and all existing copy take precedence over generated directions.

## Marketing
- Open homepage at 390×844 and 1440×900: warm paper, glossy UGLY word with fading reflection, bead, tilted slab, rule and italic line.
- Choose CLEAN, BAD, UGLY preview radios: word, slab and checked state change together without layout shift.
- Read the three-verdict section: all original rules remain real text, with matching glass slabs.
- Open How verdicts work and an ingredient guide: links, facts panel, rule table, source citations remain intact.
- With reduced motion enabled: every verdict stays visible and no sheen animates.
- At 200% zoom and a narrow viewport: no page-level overflow or clipped body copy.

## Scanner
- Demo capture: reading state leads to CLEAN, BAD and UGLY in turn; Scan another returns to camera.
- Done state: glossy word, reflection, colored slab, headline, note and complete ingredient rows fit; long UGLY list scrolls inside the sheet.
- Tap an ingredient: glossary opens; Got it dismisses it.
- Pending lists: verdict remains readable alongside Listing the sugars.
- Error: No verdict and provided error remain readable; Try again returns to camera.
- Header/profile controls and disclaimer stay visible; scan history gets compact glass verdict badges.
- Reduced motion removes sheet spring, sheen loop and reading shimmer.

## Test method
- The unchanged production export is used for result, retake, header and ingredient-modal checks.
- A temporary browser script outside the checkout dispatches the existing React scan-state hook in the production export, using the existing placeholderResults data and an explicitly marked demo label. This renders the real ResultScreen deterministically without source edits or committed test hooks.

## Reference-first inspection exceptions
- The approved reference explicitly requires gradients, glossy text, shadows, glints, small slab labels, hairlines, paper warmth and glass. Those take precedence over generic taste-skill prohibitions.
- Existing page copy and step numbering are preserved, including the longer headline at narrow widths. The persistent navigation intentionally sits above scrolling content.
- Dark coloured text on warm paper measures CLEAN 5.82:1, BAD 5.87:1 and UGLY 5.68:1; secondary copy is 6.69:1 and ink 16.25:1.
- The site has no hero video or page JavaScript. Its native radio preview, primary links and all content work without JavaScript; motion is intentionally limited to light sweeps.
- Headless fake-camera capture did not produce a demo result, so physical capture is not claimed as verified here. Result rendering and retake callbacks are checked in the actual exported app; no camera or scan-pipeline source is changed.
