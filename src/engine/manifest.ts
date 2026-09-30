import { z } from 'zod';
import { SYSTEM_IDS } from './types';
import type { BodyId, BodyManifest } from './types';

/**
 * Manifest schema (Phase G §2). The asset pipeline validates against this before writing and
 * the client validates after fetching, so a malformed or mislicensed pack fails loudly at
 * build time rather than silently rendering nothing on a student's phone.
 */
const vec3 = z.tuple([z.number(), z.number(), z.number()]);

/** Licences the platform may ship. NonCommercial and NoDerivatives packs are rejected here
 *  as well as in scripts/validate-manifests.ts (A-05). */
export const ALLOWED_PACK_LICENCES = [
  'MIT', 'Apache-2.0', 'BSD-3-Clause', 'CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0',
  'CC-BY-SA-2.1-JP', 'CC-BY-SA-4.0', 'Slicer', 'NLM-Terms', 'proprietary-licensed',
] as const;

export const manifestLod = z.object({
  url: z.string().min(1),
  bytes: z.number().int().positive(),
  triangles: z.number().int().nonnegative(),
  hash: z.string().min(6).optional(),
});

export const manifestStructure = z.object({
  id: z.string().min(1),
  fmaId: z.string().optional(),
  name: z.string().min(1),
  latinName: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  systems: z.array(z.enum(SYSTEM_IDS)).min(1),
  region: z.string().optional(),
  laterality: z.enum(['none', 'left', 'right']).optional(),
  centroid: vec3,
  bounds: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  lods: z.array(manifestLod).min(1).optional(),
  procedural: z.unknown().optional(),
  provenance: z.enum(['hra', 'bp3d', 'zanatomy', 'generated', 'procedural']).optional(),
  group: z.string().optional(),
  packed: z.object({ o: z.number().int().nonnegative(), vb: z.number().int().positive(), ib: z.number().int().positive(), nv: z.number().int().positive(), ni: z.number().int().positive() }).optional(),
  category: z.string().optional(),
  layer: z.number().int().min(0).max(6).optional(),
  source: z.object({ name: z.string().min(1), licence: z.enum(ALLOWED_PACK_LICENCES) }).optional(),
});


export const bodyManifest = z.object({
  body: z.enum(['male', 'female']),
  version: z.string().min(1),
  pack: z.string().min(1),
  licence: z.enum(ALLOWED_PACK_LICENCES),
  attribution: z.string().min(10),
  /** LOD2 bundles, one per system, to keep the first paint under ~20 requests. */
  packs: z.array(z.object({ system: z.enum(SYSTEM_IDS), url: z.string(), bytes: z.number().int().positive(), structureIds: z.array(z.string()) })).optional(),
  groups: z.array(z.object({
    id: z.string().min(1), title: z.string().min(1), description: z.string().optional(), url: z.string().min(1),
    bytes: z.number().int().positive(), count: z.number().int().positive(),
    replaces: z.array(z.string()).optional(), auto: z.boolean().optional(),
  })).optional(),
  structures: z.array(manifestStructure).min(1),
});

export type ValidatedManifest = z.infer<typeof bodyManifest>;

export function parseManifest(input: unknown): BodyManifest {
  return bodyManifest.parse(input) as BodyManifest;
}

export function assetBase(): string {
  return process.env.NEXT_PUBLIC_ASSET_BASE || '';
}

/**
 * Fetch a built pack's manifest. Returns null when no pack is deployed, so the atlas falls
 * back to procedural stand-ins instead of showing an empty scene.
 */
export async function fetchManifest(body: BodyId, pack = 'hra-v1'): Promise<BodyManifest | null> {
  try {
    const res = await fetch(`${assetBase()}/assets/${pack}/${body}.manifest.json`, { cache: 'force-cache' });
    if (!res.ok) return null;
    return parseManifest(await res.json());
  } catch {
    return null;
  }
}
