BIG TOP WILDS — TWO FULL-HEIGHT CLOSING CURTAIN PANELS

CURTAIN_LEFT_CLOSING_FULLHEIGHT.png
CURTAIN_RIGHT_CLOSING_FULLHEIGHT.png

Both files are independent, opaque RGBA PNG panels, 128 x 1536 px.
Derived from the V2 approved CLOSED curtain, with all captions removed.
Only the undecorated central velvet fabric is vertically extended; gold ornamentation at top and bottom retains its proportions.

Use these TWO images only during the CLOSE/CLOSED transition.
Each panel covers 50% of the reel viewport. The left and right panels meet exactly at the reel center.
Their container is position:absolute; inset:0; overflow:hidden.
Move the panels horizontally via transform:translateX(...).
Do NOT leave them visible in OPEN DUO / OPEN WINNER / PERSISTENT FINAL states.
Do NOT use V2 07/08 as closing panels: they are decorative details only.
No captions, no characters, no WILD labels are included in these panels.

IMPORTANT: These are texture-derived assets. Test in the actual mobile reel viewport.
If the source geometry requires cropping, use object-fit:cover and center the fabric; never stretch decorations non-uniformly.
