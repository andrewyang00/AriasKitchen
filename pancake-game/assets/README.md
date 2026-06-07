# Dropping in real illustrated art

The game looks for files in this folder (`assets/images/`) using the exact
names listed below. If a file is missing, the game automatically falls back
to a styled placeholder (a soft pastel shape + emoji) so nothing ever breaks.

Recommended format: PNG or WebP, transparent background, at least
512 px on the longest side (the art direction calls for "large glossy
food assets" so bigger source art will look crisper on iPad).

| Slot name        | Expected file               | Used for                                |
|------------------|-----------------------------|-----------------------------------------|
| ariaHappy        | aria_happy.png              | Start screen / general greeting         |
| ariaExcited      | aria_excited.png            | Eggs & batter steps                     |
| ariaFocused      | aria_focused.png            | Stir & flip steps (concentrating)       |
| ariaCelebrating  | aria_celebrating.png        | Celebration screen                      |
| eggWhole         | egg_whole.png               | Egg before cracking                     |
| eggCracked       | egg_cracked.png             | Egg mid-crack (first tap)               |
| bowlEmpty        | bowl_empty.png              | Mixing bowl, empty                      |
| bowlEggs         | bowl_eggs.png               | Bowl with cracked eggs inside           |
| bowlMilk         | bowl_milk.png               | Bowl after milk has been poured         |
| bowlStir1        | bowl_stir_1.png             | Bowl partway through stirring           |
| bowlStir2        | bowl_stir_2.png             | Bowl almost fully mixed                 |
| panRaw           | pan_raw.png                 | Pan with raw pancake batter             |
| panGolden        | pan_golden.png              | Pan with golden flipped pancake         |
| pancakeStack     | pancake_stack.png           | Finished stack on the celebration plate |

To use a slot, just save your art with the matching filename into
`assets/images/`. No code changes are required — `assets.js` builds an
`<img>` for each slot and only swaps in the placeholder if that image
fails to load (see `createAsset()`).
