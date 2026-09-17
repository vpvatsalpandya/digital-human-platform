'use client';
import { useEffect } from 'react';
import { useEngineStore } from '@/store/engine';

/**
 * The engine store persists saved views, bookmarks and preferences to localStorage. Reading
 * them during the first client render would produce markup that differs from the server's
 * (hydration mismatch), so persistence is created with `skipHydration` and replayed here,
 * after the first paint.
 */
export function StoreHydration() {
  useEffect(() => { void useEngineStore.persist.rehydrate(); }, []);
  return null;
}
