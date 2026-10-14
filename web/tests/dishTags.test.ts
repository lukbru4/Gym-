import { describe, expect, test } from 'vitest';
import { DISHES, DISH_BY_ID } from '../src/lib/dishes';
import { DISH_GROUPS, GROUP_BY_ID, coverOf, dishInfo, dishesOf } from '../src/lib/dishTags';

const inGroup = (gid: string, dishId: string) => dishesOf(GROUP_BY_ID.get(gid)!).some((d) => d.id === dishId);

describe('Gerichte: Kategorien für „Entdecken“', () => {
  test('jedes Gericht passt zu mindestens einer Mahlzeit', () => {
    for (const d of DISHES) expect(d.meals.length, d.name).toBeGreaterThan(0);
  });
  test('vegan ist immer auch vegetarisch, vegetarisch nie mit Fleisch', () => {
    for (const d of DISHES) {
      const i = dishInfo(d);
      if (i.vegan) expect(i.vegetarian, d.name).toBe(true);
      if (i.vegetarian) expect(d.name, 'Fleisch im Namen').not.toMatch(/hähnchen|wurst|schinken|speck|hack(?!braten)|(?<!linsen-)bolognese|döner|steak|schnitzel|lachs|thunfisch/i);
    }
  });
  test('Stichproben', () => {
    expect(inGroup('vegetarisch', 'spaghetti-bolognese')).toBe(false);
    expect(inGroup('vegan', 'rote-linsen-dal')).toBe(true);
    expect(inGroup('vegan', 'mozzarella-tomate-baguette')).toBe(false);
    expect(inGroup('protein', 'quark-obst')).toBe(true);
    expect(inGroup('zuckerfrei', 'donut-teil')).toBe(false);
    expect(inGroup('fruehstueck', 'hafer-beeren')).toBe(true);
  });
  test('jede Gruppe hat Gerichte und ein Kachelbild', () => {
    for (const g of DISH_GROUPS) {
      expect(dishesOf(g).length, g.id).toBeGreaterThan(3);
      expect(coverOf(g), g.id).toBeTruthy();
      if (g.cover) expect(DISH_BY_ID.has(g.cover), `Kachelbild ${g.cover}`).toBe(true);
    }
  });
  test('Kalorienstufen überschneiden sich nicht und decken alles ab', () => {
    const k = DISH_GROUPS.filter((g) => g.section.includes('kcal'));
    for (const d of DISHES) expect(k.filter((g) => g.test(d, dishInfo(d))).length, d.name).toBe(1);
  });
});
