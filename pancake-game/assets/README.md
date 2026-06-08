# Dropping in real illustrated art

The game looks for files in this folder (`assets/images/`) using the exact
names listed below. If a file is missing, the game automatically falls back
to a styled placeholder (a soft pastel shape + emoji) so nothing ever breaks.

Recommended format: PNG or WebP, transparent background, at least
512 px on the longest side (the art direction calls for "large glossy
food assets" so bigger source art will look crisper on iPad).

| Slot name        | Expected file               | Used for                                |
|------------------|-----------------------------|-----------------------------------------|
| ariaHappy        | aria_happy.png              | Start & recipe-select screens           |
| ariaExcited      | aria_excited.png            | Eggs step                               |
| ariaPouring      | aria_pouring.png            | Milk & batter pouring steps             |
| ariaStirring     | aria_stirring.png           | Stir step                               |
| ariaFlipping     | aria_flipping.png           | Flip step                               |
| ariaCelebrating  | aria_celebrate.png          | Celebration screen                      |
| eggWhole         | egg_whole.png               | Egg before cracking                     |
| eggCracked       | egg_cracked.png             | Egg mid-crack (first tap)               |
| bowlEmpty        | bowl_empty.png              | Mixing bowl, empty                      |
| bowlEggs         | bowl_eggs.png               | Bowl with cracked eggs inside           |
| bowlMilk         | bowl_milk.png               | Bowl after milk has been poured         |
| bowlStir1        | bowl_milk.png               | Bowl partway through stirring           |
| bowlStir2        | bowl_batter.png             | Bowl almost fully mixed into batter     |
| panEmpty         | pan_empty.png               | Empty pan, before batter is poured      |
| pancakeRaw       | pancake_raw.png             | Pan with raw pancake batter             |
| pancakeGolden    | pancake_golden.png          | Pan with golden flipped pancake         |
| pancakeStack     | pancake_stack_reward.png    | Finished stack on the celebration plate |

Several slots intentionally point at the same file (e.g. `bowlStir1` and
`bowlMilk` both use `bowl_milk.png`) where the asset pack doesn't include a
distinct in-between illustration — the meter/animation still progresses, the
art simply doesn't change again until the next visually distinct stage.

To use a slot, just save your art with the matching filename into
`assets/images/`. No code changes are required — `assets.js` builds an
`<img>` for each slot and only swaps in the placeholder if that image
fails to load (see `createAsset()`).
