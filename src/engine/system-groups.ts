import type { SystemId } from './types';

/**
 * Which detail packs a system chip needs. Switching a chip on must show that system's named
 * structures, not just the coarse core aggregates, so the viewer loads these packs the first
 * time the chip is on (each is cached afterwards). The skeleton is also loaded at start: with
 * only the core pack the hands and feet were single blocks, which read as missing finger bones.
 */
export const SYSTEM_GROUPS: Record<SystemId, string[]> = {
  skeletal: ['skeleton'],
  muscular: ['muscles'],
  cardiovascular: ['arteries', 'veins'],
  nervous: ['nerves', 'brain-regions', 'inner-ear'],
  lymphatic: ['lymphatic'],
  digestive: ['organ-parts'],
  urinary: ['organ-parts'],
  reproductive: ['organ-parts'],
  respiratory: ['organ-parts'],
  endocrine: ['organ-parts'],
  fascial: ['fascia-bursae'],
  connective: ['joints', 'fascia-bursae'],
  integumentary: [],
  surface: [],
} as Record<SystemId, string[]>;

/** Packs loaded as soon as the detail catalogue is known (on top of the `auto` ones). */
export const DEFAULT_GROUPS = ['skeleton'];

/** Packs to add when `now` contains systems that were not on in `before`. */
export function groupsForNewSystems(before: SystemId[], now: SystemId[], available: string[]): string[] {
  const added = now.filter((s) => !before.includes(s));
  const want = new Set<string>();
  for (const s of added) for (const g of SYSTEM_GROUPS[s] ?? []) if (available.includes(g)) want.add(g);
  return [...want];
}
