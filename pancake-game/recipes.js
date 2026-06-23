// ===========================================================================
// recipes.js — Data-driven recipe definitions.
//
// Every recipe is just data: a list of steps, each naming a reusable
// "mechanic" (tapCounter, holdFill, dragCircle, swipeGesture, smearCoverage,
// colorMatch, celebrate) plus the parameters and scene art that mechanic
// needs. app.js never hardcodes a recipe's steps — it reads this file and
// renders whichever recipe the player picked using the same generic step
// renderer + mechanic handlers for all of them.
//
// HOW TO ADD A NEW RECIPE:
//   Copy one of the entries below, give it a new id/name/cardArt, and write
//   a `steps` array using the mechanics already implemented in app.js. If
//   you don't have illustrated art yet, just omit `file` from a scene/stage
//   entry (or leave it out entirely) — the engine shows a friendly tinted
//   placeholder with `glyph` until you drop in
//   assets/images/scene_<id>_<step>.png (see assets/README.md). The same
//   applies to the recipe-picker card: `cardArt.glyph`/`tint` is the
//   placeholder look, and once a finished-dish illustration exists, add
//   `cardArt.slot` naming an ASSET_FILES entry (see `pancakes` below,
//   which uses the real `pancakeStack` art) to show it instead.
//
// HOW HOTSPOT/LAYOUT POSITIONING WORKS:
//   Every mechanic has a sensible built-in default layout (centered hotspot,
//   bottom-row items, etc.) so a brand new recipe is playable with zero
//   layout tuning. Once real art exists for a step, add a `layout` block
//   with percentage offsets to line interactive elements up with the
//   artwork — see the `pancakes` recipe below for fully-tuned examples.
// ===========================================================================

const RECIPES = {
  pancakes: {
    id: 'pancakes',
    name: 'Pancakes',
    cardArt: { glyph: '🥞', tint: 'golden', slot: 'pancakeStack' },
    steps: [
      {
        id: 'EGGS',
        eyebrow: 'Tap twice',
        title: 'Crack 2 eggs',
        hint: 'Tap each egg twice',
        mechanic: 'tapCounter',
        params: {
          items: 2,
          tapsPerItem: 2,
          layout: 'row',
          stages: [{ slot: 'eggWhole' }, { slot: 'eggCracked' }],
          sfx: { tap: 'playCrack', lastTap: 'playPlop' },
        },
        scene: { idle: { file: 'scene_eggs_plate.png', glyph: '🍳', tint: 'butter' } },
        layout: { items: { left: 62, bottom: 18, gap: 2.2 } },
      },
      {
        id: 'MILK',
        eyebrow: 'Hold',
        title: 'Pour milk',
        hint: 'Hold to pour',
        mechanic: 'holdFill',
        params: { holdSeconds: 2.0, sfx: { loop: 'playPourLoop' }, meterTint: 'lime' },
        scene: {
          idle: { file: 'scene_milk_idle_plate.png', glyph: '🥛', tint: 'cream' },
          active: { file: 'scene_milk_active_plate.png', glyph: '🥛', tint: 'cream' },
        },
        layout: {
          hotspot: { left: 20, top: 31, width: 24, height: 32 },
          meter: { right: 4, top: 26, width: 'clamp(22px, 3vw, 36px)', height: 42 },
        },
      },
      {
        id: 'STIR',
        eyebrow: 'Swirl',
        title: 'Stir batter',
        hint: 'Swirl three times',
        mechanic: 'dragCircle',
        params: { turns: 3, sfx: { turn: 'playSwirl' }, spoon: { slot: 'spoonWooden' } },
        scene: {
          idle: { file: 'scene_stir_plate.png', glyph: '🥣', tint: 'butter' },
          active: { file: 'scene_stir_active_plate.png', glyph: '🥣', tint: 'butter' },
        },
        layout: {
          trail: { inset: '18% 31% 17% 40%' },
          motion: { left: 42, top: 39, width: 27 },
        },
      },
      {
        id: 'BATTER',
        eyebrow: 'Hold',
        title: 'Pour batter',
        hint: 'Hold to fill the pan',
        mechanic: 'holdFill',
        params: { holdSeconds: 1.8, sfx: { loop: 'playSizzleLoop' }, meterTint: 'butter' },
        scene: {
          idle: { file: 'scene_batter_idle_plate.png', glyph: '🥣', tint: 'butter' },
          active: { file: 'scene_batter_active_plate.png', glyph: '🥣', tint: 'butter' },
        },
        layout: {
          hotspot: { left: 21, top: 26, width: 30, height: 42 },
          meter: { right: 4, top: 26, width: 'clamp(22px, 3vw, 36px)', height: 42 },
        },
      },
      {
        id: 'FLIP',
        eyebrow: 'Swipe up',
        title: 'Flip pancake',
        hint: 'Swipe up to flip',
        mechanic: 'swipeGesture',
        params: { direction: 'up', threshold: 56, label: 'Up', sfx: { gesture: 'playFlipWhoosh' } },
        scene: {
          idle: { file: 'scene_flip_idle_plate.png', glyph: '🥞', tint: 'golden' },
          active: { file: 'scene_flip_plate.png', glyph: '🥞', tint: 'golden' },
        },
        layout: { hint: { right: 7, top: 34, width: 'clamp(72px, 9vw, 118px)' } },
      },
      {
        id: 'CELEBRATE',
        eyebrow: 'Yummy pancake',
        title: 'You did it!',
        mechanic: 'celebrate',
        params: { rewardGlyph: '🥞', rewardTint: 'golden', rewardLabel: 'Pancakes!', rewardSlot: 'pancakeStack' },
        scene: { idle: { file: 'scene_celebrate_plate.png', glyph: '🎉', tint: 'pink' } },
      },
    ],
  },

  icecream: {
    id: 'icecream',
    name: 'Ice Cream',
    cardArt: { glyph: '🍨', tint: 'sky' },
    steps: [
      {
        id: 'SCOOP',
        eyebrow: 'Tap 3 times',
        title: 'Scoop 3 scoops',
        hint: 'Tap the tub to scoop',
        mechanic: 'tapCounter',
        params: { items: 3, tapsPerItem: 1, layout: 'row', itemGlyph: '🍦', itemTint: 'sky', sfx: { tap: 'playPlop' } },
        scene: { idle: { glyph: '🍨', tint: 'sky' } },
      },
      {
        id: 'SAUCE',
        eyebrow: 'Spread it on',
        title: 'Drizzle chocolate sauce',
        hint: 'Drag to spread the sauce',
        mechanic: 'smearCoverage',
        params: { threshold: 0.75, color: '#7a4a2b', sfx: { stroke: 'playSwirl' } },
        scene: { idle: { glyph: '🍫', tint: 'choco' } },
      },
      {
        id: 'WHIP',
        eyebrow: 'Swirl',
        title: 'Swirl whipped cream',
        hint: 'Swirl twice on top',
        mechanic: 'dragCircle',
        params: { turns: 2, sfx: { turn: 'playSwirl' }, glyph: '🥄' },
        scene: { idle: { glyph: '🍦', tint: 'cream' } },
      },
      {
        id: 'SPRINKLES',
        eyebrow: 'Match the color',
        title: 'Add matching sprinkles',
        hint: 'Tap the sprinkle that matches',
        mechanic: 'colorMatch',
        params: {
          rounds: [
            { color: '#e6483f', label: 'red' },
            { color: '#f4c430', label: 'yellow' },
            { color: '#3f7fe0', label: 'blue' },
          ],
          optionsPerRound: 3,
          sfx: { correct: 'playPlop', wrong: 'playBoop' },
        },
        scene: { idle: { glyph: '🌈', tint: 'sky' } },
      },
      {
        id: 'CELEBRATE',
        eyebrow: 'Yummy ice cream',
        title: 'You did it!',
        mechanic: 'celebrate',
        params: { rewardGlyph: '🍨', rewardTint: 'sky', rewardLabel: 'Ice Cream!' },
        scene: { idle: { glyph: '🎉', tint: 'pink' } },
      },
    ],
  },

  pizza: {
    id: 'pizza',
    name: 'Pizza',
    cardArt: { glyph: '🍕', tint: 'tomato' },
    steps: [
      {
        id: 'DOUGH',
        eyebrow: 'Swirl',
        title: 'Knead the dough',
        hint: 'Swirl to knead the dough',
        mechanic: 'dragCircle',
        params: { turns: 2, sfx: { turn: 'playSwirl' }, glyph: '🤲' },
        scene: { idle: { glyph: '🥟', tint: 'cream' } },
      },
      {
        id: 'SAUCE',
        eyebrow: 'Spread it on',
        title: 'Spread the tomato sauce',
        hint: 'Drag to spread the sauce',
        mechanic: 'smearCoverage',
        params: { threshold: 0.78, color: '#d6402c', sfx: { stroke: 'playSwirl' } },
        scene: { idle: { glyph: '🍅', tint: 'tomato' } },
      },
      {
        id: 'CHEESE',
        eyebrow: 'Tap to sprinkle',
        title: 'Sprinkle the cheese',
        hint: 'Tap to sprinkle cheese all over',
        mechanic: 'tapCounter',
        params: { items: 6, tapsPerItem: 1, layout: 'scatter', itemGlyph: '🧀', itemTint: 'butter', sfx: { tap: 'playPlop' } },
        scene: { idle: { glyph: '🧀', tint: 'butter' } },
      },
      {
        id: 'TOPPINGS',
        eyebrow: 'Match the color',
        title: 'Add matching toppings',
        hint: 'Tap the topping that matches',
        mechanic: 'colorMatch',
        params: {
          rounds: [
            { color: '#d6402c', label: 'pepperoni' },
            { color: '#5fa83d', label: 'pepper' },
            { color: '#f4c430', label: 'corn' },
          ],
          optionsPerRound: 3,
          sfx: { correct: 'playPlop', wrong: 'playBoop' },
        },
        scene: { idle: { glyph: '🍕', tint: 'tomato' } },
      },
      {
        id: 'BAKE',
        eyebrow: 'Hold',
        title: 'Bake in the oven',
        hint: 'Hold to bake',
        mechanic: 'holdFill',
        params: { holdSeconds: 2.0, sfx: { loop: 'playSizzleLoop' }, meterTint: 'butter' },
        scene: { idle: { glyph: '🔥', tint: 'tomato' } },
      },
      {
        id: 'CELEBRATE',
        eyebrow: 'Hot and fresh',
        title: 'You did it!',
        mechanic: 'celebrate',
        params: { rewardGlyph: '🍕', rewardTint: 'tomato', rewardLabel: 'Pizza!' },
        scene: { idle: { glyph: '🎉', tint: 'pink' } },
      },
    ],
  },

  cupcakes: {
    id: 'cupcakes',
    name: 'Cupcakes',
    cardArt: { glyph: '🧁', tint: 'peach' },
    steps: [
      {
        id: 'MIX',
        eyebrow: 'Swirl',
        title: 'Mix the batter',
        hint: 'Swirl three times',
        mechanic: 'dragCircle',
        params: { turns: 3, sfx: { turn: 'playSwirl' }, glyph: '🥄' },
        scene: { idle: { glyph: '🥣', tint: 'peach' } },
      },
      {
        id: 'POUR',
        eyebrow: 'Hold',
        title: 'Pour batter in liners',
        hint: 'Hold to pour',
        mechanic: 'holdFill',
        params: { holdSeconds: 1.8, sfx: { loop: 'playPourLoop' }, meterTint: 'butter' },
        scene: { idle: { glyph: '🧁', tint: 'peach' } },
      },
      {
        id: 'BAKE',
        eyebrow: 'Tap 3 times',
        title: 'Peek at the oven',
        hint: 'Tap 3 times to check',
        mechanic: 'tapCounter',
        params: { items: 1, tapsPerItem: 3, layout: 'row', itemGlyph: '🔥', itemTint: 'peach', sfx: { tap: 'playBoop', lastTap: 'playPlop' } },
        scene: { idle: { glyph: '🔥', tint: 'peach' } },
      },
      {
        id: 'FROST',
        eyebrow: 'Spread it on',
        title: 'Frost the cupcake',
        hint: 'Drag to spread frosting',
        mechanic: 'smearCoverage',
        params: { threshold: 0.75, color: '#ff9fc2', sfx: { stroke: 'playSwirl' } },
        scene: { idle: { glyph: '🧁', tint: 'peach' } },
      },
      {
        id: 'SPRINKLES',
        eyebrow: 'Match the color',
        title: 'Add sprinkles on top',
        hint: 'Tap the matching sprinkle',
        mechanic: 'colorMatch',
        params: {
          rounds: [
            { color: '#ff6fa5', label: 'pink' },
            { color: '#9b6fd6', label: 'purple' },
            { color: '#ffffff', label: 'white' },
          ],
          optionsPerRound: 3,
          sfx: { correct: 'playPlop', wrong: 'playBoop' },
        },
        scene: { idle: { glyph: '🧁', tint: 'peach' } },
      },
      {
        id: 'CELEBRATE',
        eyebrow: 'Sweet treat',
        title: 'You did it!',
        mechanic: 'celebrate',
        params: { rewardGlyph: '🧁', rewardTint: 'peach', rewardLabel: 'Cupcakes!' },
        scene: { idle: { glyph: '🎉', tint: 'pink' } },
      },
    ],
  },

  udon: {
    id: 'udon',
    name: 'Udon Noodles',
    cardArt: { glyph: '🍜', tint: 'butter' },
    steps: [
      {
        id: 'BROTH',
        eyebrow: 'Hold',
        title: 'Pour the warm broth',
        hint: 'Hold to pour',
        mechanic: 'holdFill',
        params: { holdSeconds: 2.0, sfx: { loop: 'playPourLoop' }, meterTint: 'butter' },
        scene: { idle: { glyph: '🍲', tint: 'butter' } },
      },
      {
        id: 'NOODLES',
        eyebrow: 'Tap 3 times',
        title: 'Add the noodles',
        hint: 'Tap 3 times to add noodles',
        mechanic: 'tapCounter',
        params: { items: 3, tapsPerItem: 1, layout: 'row', itemGlyph: '🍜', itemTint: 'butter', sfx: { tap: 'playPlop' } },
        scene: { idle: { glyph: '🍜', tint: 'butter' } },
      },
      {
        id: 'STIR',
        eyebrow: 'Swirl',
        title: 'Stir the soup',
        hint: 'Swirl three times',
        mechanic: 'dragCircle',
        params: { turns: 3, sfx: { turn: 'playSwirl' }, glyph: '🥢' },
        scene: { idle: { glyph: '🍲', tint: 'butter' } },
      },
      {
        id: 'TOPPINGS',
        eyebrow: 'Match the color',
        title: 'Add matching toppings',
        hint: 'Tap the matching topping',
        mechanic: 'colorMatch',
        params: {
          rounds: [
            { color: '#5fa83d', label: 'scallion' },
            { color: '#f4c430', label: 'egg' },
            { color: '#d6402c', label: 'chili' },
          ],
          optionsPerRound: 3,
          sfx: { correct: 'playPlop', wrong: 'playBoop' },
        },
        scene: { idle: { glyph: '🍜', tint: 'butter' } },
      },
      {
        id: 'LIFT',
        eyebrow: 'Swipe up',
        title: 'Lift the noodles',
        hint: 'Swipe up with chopsticks',
        mechanic: 'swipeGesture',
        params: { direction: 'up', threshold: 56, label: 'Up', sfx: { gesture: 'playFlipWhoosh' } },
        scene: { idle: { glyph: '🍜', tint: 'butter' } },
      },
      {
        id: 'CELEBRATE',
        eyebrow: 'Slurp-tastic',
        title: 'You did it!',
        mechanic: 'celebrate',
        params: { rewardGlyph: '🍜', rewardTint: 'butter', rewardLabel: 'Udon!' },
        scene: { idle: { glyph: '🎉', tint: 'pink' } },
      },
    ],
  },

  pho: {
    id: 'pho',
    name: 'Pho Noodles',
    cardArt: { glyph: '🍲', tint: 'mint' },
    steps: [
      {
        id: 'SIMMER',
        eyebrow: 'Hold',
        title: 'Simmer the broth',
        hint: 'Hold to pour broth',
        mechanic: 'holdFill',
        params: { holdSeconds: 2.0, sfx: { loop: 'playPourLoop' }, meterTint: 'butter' },
        scene: { idle: { glyph: '🍲', tint: 'mint' } },
      },
      {
        id: 'NOODLES',
        eyebrow: 'Tap 3 times',
        title: 'Add rice noodles',
        hint: 'Tap 3 times to add noodles',
        mechanic: 'tapCounter',
        params: { items: 3, tapsPerItem: 1, layout: 'row', itemGlyph: '🍜', itemTint: 'mint', sfx: { tap: 'playPlop' } },
        scene: { idle: { glyph: '🍜', tint: 'mint' } },
      },
      {
        id: 'STIR',
        eyebrow: 'Swirl',
        title: 'Stir the pho',
        hint: 'Swirl three times',
        mechanic: 'dragCircle',
        params: { turns: 3, sfx: { turn: 'playSwirl' }, glyph: '🥢' },
        scene: { idle: { glyph: '🍲', tint: 'mint' } },
      },
      {
        id: 'HERBS',
        eyebrow: 'Tap to sprinkle',
        title: 'Scatter fresh herbs',
        hint: 'Tap to sprinkle basil & sprouts',
        mechanic: 'tapCounter',
        params: { items: 6, tapsPerItem: 1, layout: 'scatter', itemGlyph: '🌿', itemTint: 'mint', sfx: { tap: 'playPlop' } },
        scene: { idle: { glyph: '🌿', tint: 'mint' } },
      },
      {
        id: 'LIME',
        eyebrow: 'Hold',
        title: 'Squeeze fresh lime',
        hint: 'Hold to squeeze',
        mechanic: 'holdFill',
        params: { holdSeconds: 1.2, sfx: { loop: 'playPourLoop' }, meterTint: 'lime' },
        scene: { idle: { glyph: '🍋', tint: 'mint' } },
      },
      {
        id: 'CELEBRATE',
        eyebrow: 'Fresh and fragrant',
        title: 'You did it!',
        mechanic: 'celebrate',
        params: { rewardGlyph: '🍲', rewardTint: 'mint', rewardLabel: 'Pho!' },
        scene: { idle: { glyph: '🎉', tint: 'pink' } },
      },
    ],
  },

  candy: {
    id: 'candy',
    name: 'Jelly Candy',
    cardArt: { glyph: '🍬', tint: 'lavender' },
    steps: [
      {
        id: 'SYRUP',
        eyebrow: 'Swirl',
        title: 'Stir the jelly syrup',
        hint: 'Swirl twice',
        mechanic: 'dragCircle',
        params: { turns: 2, sfx: { turn: 'playSwirl' }, glyph: '🥄' },
        scene: { idle: { glyph: '🍯', tint: 'lavender' } },
      },
      {
        id: 'COLOR',
        eyebrow: 'Match the color',
        title: 'Add matching food coloring',
        hint: 'Tap the matching color',
        mechanic: 'colorMatch',
        params: {
          rounds: [
            { color: '#e6483f', label: 'red' },
            { color: '#5fa83d', label: 'green' },
            { color: '#f4c430', label: 'yellow' },
            { color: '#3f7fe0', label: 'blue' },
          ],
          optionsPerRound: 4,
          sfx: { correct: 'playPlop', wrong: 'playBoop' },
        },
        scene: { idle: { glyph: '🌈', tint: 'lavender' } },
      },
      {
        id: 'POUR',
        eyebrow: 'Hold',
        title: 'Pour into candy molds',
        hint: 'Hold to pour',
        mechanic: 'holdFill',
        params: { holdSeconds: 1.8, sfx: { loop: 'playPourLoop' }, meterTint: 'lime' },
        scene: { idle: { glyph: '🍬', tint: 'lavender' } },
      },
      {
        id: 'CHILL',
        eyebrow: 'Tap 3 times',
        title: 'Chill in the fridge',
        hint: 'Tap 3 times while it chills',
        mechanic: 'tapCounter',
        params: { items: 1, tapsPerItem: 3, layout: 'row', itemGlyph: '❄️', itemTint: 'lavender', sfx: { tap: 'playBoop', lastTap: 'playPlop' } },
        scene: { idle: { glyph: '❄️', tint: 'lavender' } },
      },
      {
        id: 'POP',
        eyebrow: 'Swipe up',
        title: 'Pop out the candies',
        hint: 'Swipe up to pop them out',
        mechanic: 'swipeGesture',
        params: { direction: 'up', threshold: 56, label: 'Up', sfx: { gesture: 'playFlipWhoosh' } },
        scene: { idle: { glyph: '🍬', tint: 'lavender' } },
      },
      {
        id: 'CELEBRATE',
        eyebrow: 'Jiggly and sweet',
        title: 'You did it!',
        mechanic: 'celebrate',
        params: { rewardGlyph: '🍬', rewardTint: 'lavender', rewardLabel: 'Jelly Candy!' },
        scene: { idle: { glyph: '🎉', tint: 'pink' } },
      },
    ],
  },
};

const RECIPE_ORDER = ['pancakes', 'icecream', 'pizza', 'cupcakes', 'udon', 'pho', 'candy'];
