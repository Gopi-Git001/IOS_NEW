# Reallabel design system

Direction B from the 2026-11 brand rounds, chosen by the user on 2026-11-06. The verdict is set like
a US Nutrition Facts panel, because the product's job is to read the fine print. Tagline: "Read the fine print."

## Principles
- Paper for content, glass for controls. Result sheet, glossary card, menu, profile and sign-in are
  bone paper. Liquid Glass is only on floating controls (profile capsule, shutter, hint, reading pill, back button).
- One colored word. Ink and paper carry everything; color appears only on the verdict word, the
  ingredient names and the stats bar.
- Rules, not boxes. Structure comes from black rules: 10 pt under titles, 5 pt between blocks,
  1 pt between rows, 4 pt to close the list.
- The cube stays. The glossy sugar cube sits on the top edge of the result sheet for every verdict.

## Color (src/theme.ts)
| Token | Hex | Use |
|---|---|---|
| paper | #F3F1EC | Sheets and list screens |
| paperRaised | #FBFAF6 | Groups and inputs on paper |
| ink / rule | #0E0E0C | Text, rules, primary buttons |
| inkMuted | #5F5B53 | Secondary text |
| inkFaint | #736E65 | Footers, version line |
| ugly | #C8321C | UGLY verdict, added sugar names, danger |
| bad | #9A5B00 | BAD verdict, sweetener names |
| clean | #1E7A46 | CLEAN verdict, natural sugar names |

All verdict inks are at least 4.5:1 on paper.

## Type
- Libre Franklin 900 for the wordmark, titles, the verdict word (72 pt) and grams (32 pt).
- Libre Franklin 400 to 800 for rows, labels and buttons.
- Newsreader italic for the voice: tagline, the "why" line, glossary explanations, empty states.

## Components
- Wordmark: "Reallabel" in Libre Franklin 900 over a rule as wide as the word.
- Camera frame: hairline box with a heavy top bar, a 5 pt base and the label "Ingredients".
- Verdict Facts panel: title, rule, "Your label / per serving", verdict word plus added grams
  and teaspoons, italic reason, then indented, tappable rows with outlined tags (SUGAR, SWEETENER, NATURAL).
- Primary button: an ink pill with paper text. Toggles: an ink track with a white thumb.
- App icon: a heavy "R" between panel rules, with a red sugar cube on the baseline.
