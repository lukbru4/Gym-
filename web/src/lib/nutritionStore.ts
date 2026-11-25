// Gerätelokale Ablage für den Ernährungsplan und das Wasser pro Tag (kein Server nötig).
import type { PlanInput, PlanResult } from './nutritionPlan';

export interface StoredPlan { version: 1; createdAt: string; input: PlanInput; result: PlanResult }

const planKey = (uid: string) => `gym-tracker-nutrition-plan-${uid}`;
const waterKey = (uid: string, date: string) => `gym-tracker-water-${uid}-${date}`;

export function loadPlan(uid: string): StoredPlan | null {
  try {
    const v = JSON.parse(localStorage.getItem(planKey(uid)) ?? 'null');
    return v && v.version === 1 && v.input && v.result ? (v as StoredPlan) : null;
  } catch {
    return null;
  }
}
export function savePlan(uid: string, input: PlanInput, result: PlanResult): StoredPlan {
  const plan: StoredPlan = { version: 1, createdAt: new Date().toISOString(), input, result };
  try {
    localStorage.setItem(planKey(uid), JSON.stringify(plan));
  } catch {
    /* Speicher blockiert: Plan gilt nur für diese Sitzung */
  }
  return plan;
}
export function loadWater(uid: string, date: string): number {
  try {
    const n = Number(localStorage.getItem(waterKey(uid, date)));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
export function saveWater(uid: string, date: string, ml: number) {
  try {
    localStorage.setItem(waterKey(uid, date), String(Math.max(0, Math.round(ml))));
  } catch {
    /* ignorieren */
  }
}

/** Wasser: Menge pro Tippen (100, 250 oder 500 ml), gemerkt pro Gerät */
export const WATER_STEPS = [100, 250, 500] as const;
const STEP_KEY = 'gym-tracker-water-step';
export function getWaterStep(): number {
  try {
    const n = Number(localStorage.getItem(STEP_KEY));
    return (WATER_STEPS as readonly number[]).includes(n) ? n : 250;
  } catch {
    return 250;
  }
}
export function setWaterStep(ml: number) {
  try {
    localStorage.setItem(STEP_KEY, String(ml));
  } catch {
    /* nur Komfort */
  }
}
