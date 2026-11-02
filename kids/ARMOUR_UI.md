# Armour: Market shelf and My Hero inventory (task for Cursor)

Everything except these two screens is already built:

- **Gear catalogue, art and specials:** `kids/gear.js`
- **Database:** `migrations/20261102_armour_gear.sql`, also appended to `schema.sql`. Run it in Supabase first.
- **Loading:** `app.js` loads `db.gear = { head, body, owned: [], prices: {} }` via `kid_gear`.
- **Drawing:** the stage hero (`heroGear()` adds `head`/`body`) and the arena hero (`arenaContext().gear`) already draw the equipped gear.
- **Arena:** shows a "Use Special ___" button per equipped piece, one use each per run, and calls `kid_arena_lucky` for Lucky Coin.

## Catalogue (`GEAR` in gear.js; prices are household defaults)
| key | slot | name | price | special (once per arena run) |
|---|---|---|---|---|
| cap | head | Explorer Cap | 60 | Pet Sniff: removes one wrong answer |
| flowercrown | head | Flower Crown | 100 | Heal: get back one lost heart |
| knighthelm | head | Knight Helmet | 120 | Shield: next wrong answer costs no heart |
| wizardhat | head | Wizard Hat | 150 | 50/50: removes wrong answers until two are left |
| vikinghelm | head | Viking Helmet | 180 | Power Strike: next right answer hits twice |
| goldcrown | head | Golden Crown | 250 | Lucky Coin: next monster beaten drops +1 coin |
| vest | body | Padded Vest | 60 | Lucky Coin |
| cape | body | Hero Cape | 120 | Heal |
| chainmail | body | Chainmail | 150 | Shield |
| starrobe | body | Star Robe | 180 | Swap: trade the question for a new one |
| plate | body | Knight Plate | 250 | Power Strike |

`ABILITIES[GEAR[key].ability]` gives `{ name, desc }` for labels.

## 1. Market: new "Helmets & Armour" shelf (kid-shop route)
- Two groups, **Helmets** and **Armour**, listing every `GEAR` key.
- **Each row:** an icon (`<canvas>` + `drawGearIcon(canvas, key, 3)` from gear.js), the name, the special
  (`Special: ${ABILITIES[ability].name} – ${desc}`) and the price `db.gear.prices[key] ?? GEAR[key].price`.
- **Not owned:** a Buy button calling `rpc("kid_buy_gear", { p_token, p_gear: key })`. The server takes the coins and equips it.
  Errors to map in `nice()`: `already owned`, `not enough points`, `unknown gear`.
  After buying, play the shopkeeper throw: `marketThrow({ type: "gift", text: "<name>! Try it on!" })`.
- **Owned:** show "Owned", or "Wearing" when it's the equipped piece for its slot.

## 2. My Hero: equipment slots (hero route)
- Two slots under the weapon picker: **Helmet** and **Armour**. Each shows the equipped piece's icon, name and special, or "Empty".
- Tapping a slot lists the owned pieces for that slot plus "None".
  Picking one calls `rpc("kid_set_gear", { p_token, p_slot: "head" | "body", p_gear: key | null })`, then `run(...)` reloads.
- The hero badge accepts gear: `paintHeroBadge(canvas, hero, weapon, color, pet, head, body)`.
  Pass `db.gear.head` and `db.gear.body` for the kid's own badge.

## 3. Parent prices (optional)
- `rpc("save_gear_price", { p_gear, p_cost })`, the same pattern as pet prices.

## Notes
- Two pieces with the same special give one use (for example, Golden Crown + Padded Vest = one Lucky Coin).
- Specials are once per arena run, and the buttons disappear after use. A monster beaten after a wrong answer is
  not "perfect" for the level-up streak, even if Shield or Heal was used.
- Keep the SQL catalogue in `private.gear_catalog()` in sync with `GEAR` in gear.js.
