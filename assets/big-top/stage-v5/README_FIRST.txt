BIG TOP WILDS — LARGE CHARACTERS V5

PURPOSE
Fix the miniature-clown problem shown in the mobile screenshots. Stage artwork must be the full-height reel background, NOT a card centered within a curtain and NOT a contain image over a blurred backdrop.

ART
03_STAGE_DUO_FULL.png, 04_STAGE_BOMBO_FULL.png, 05_STAGE_SKINNY_FULL.png are the uncropped portrait scenes from the new visual board. Characters occupy most of their height.
03_STAGE_DUO_MOBILE_FULLHEIGHT.png, 04_STAGE_BOMBO_MOBILE_FULLHEIGHT.png, 05_STAGE_SKINNY_MOBILE_FULLHEIGHT.png are intentionally narrow cinematic crops (approximately 1:6) for phone reels. These crops preserve original aspect ratio: NO stretching or squeezing. Side elements/limbs may be cropped by design. Use the FULL variants for wider aspect ratios or where the whole body is required.
01_CURTAIN_CLOSED_FULL.png is a reference, not a persistent result. 02_STAGE_EMPTY_FULL.png and 06_STAGE_BACKGROUND_FULL.png are optional full-height stage backgrounds.
CURTAIN_LEFT_CLOSING_FULLHEIGHT.png and CURTAIN_RIGHT_CLOSING_FULLHEIGHT.png are closing-only panels inherited from V4; they do not define the open stage and should not be used as a full-reel background.
The 10–15 files are the existing V4 ticket and reward badges, unchanged.

CRITICAL IMPLEMENTATION
- One reel = one full-height stage. Stage art fills 100% of reel viewport height; width remains auto and aspect ratio remains intact. Center and clip overflow horizontally INSIDE this reel. Never create blurred background bars above/below the artwork.
- On mobile, prefer *_MOBILE_FULLHEIGHT.png for final Bombo/Skinny and duo. It has a narrow aspect ratio tailored to current screenshot geometry; check actual runtime reel aspect ratio before committing.
- Do not render the scene as an <img> inside a small symbol-sized element. The image belongs in the full-reel CurtainOverlay stage layer.
- The final state is an OPEN scene with one winner. The closing panels animate only during close/open transitions.
- The WILD/x2/x3/x5/x10 badge is a separate overlay, inside the reel near its lower edge. Avoid covering the clown's face. x1 displays WILD only.
- No alterations to math, ways, bet, reel geometry, bonus persistence, or other games.
- The new art is a visual proposal; compare Bombo and Skinny with the approved identity reference before considering final identity sign-off.

CHECKLIST
1. iPhone: clown fills most of reel HEIGHT; not a tiny centered picture.
2. No blurred bands above/below; no vertical texture stretch.
3. The narrow crop does not distort clown proportions.
4. No horizontal overflow into adjacent reels.
5. Closed curtain is never the final reel state.
6. Verify two adjacent independent CurtainOverlay reels.
