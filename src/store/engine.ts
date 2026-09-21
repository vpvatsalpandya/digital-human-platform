'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BodyId, Bookmark, ClipState, CompareState, SavedView, SystemId, ViewState } from '@/engine/types';
import { SYSTEM_IDS } from '@/engine/types';

/**
 * Engine state (ADR-008). Per-frame values (camera during drag) are written with
 * `setTransient` to avoid React re-renders; everything else is ordinary Zustand state.
 */
export interface EngineState extends ViewState {
  hoverId: string | null;
  /**
   * Whether to draw structures that have no real mesh yet. Off by default: a generated
   * sphere standing in for the rib cage does not merely look wrong, it encloses the heart
   * and hides it. Students can switch them on to see the full structure list in space.
   */
  showStandIns: boolean;
  lowBandwidth: boolean;
  qualityTier: 'auto' | 'high' | 'low';
  savedViews: SavedView[];
  bookmarks: Bookmark[];
  /** monotonically increasing; bump to ask the viewer to re-apply camera from state */
  cameraEpoch: number;

  setBody: (b: BodyId) => void;
  toggleSystem: (s: SystemId) => void;
  setVisibleSystems: (s: SystemId[]) => void;
  showAllSystems: () => void;
  select: (id: string | null, additive?: boolean) => void;
  setHover: (id: string | null) => void;
  isolateSelected: (withIds?: string[]) => void;
  hideSelected: () => void;
  fadeSelected: () => void;
  unhide: (id: string) => void;
  resetVisibility: () => void;
  setExplode: (v: number) => void;
  setTransparency: (v: number) => void;
  setClip: (c: ClipState | null) => void;
  setCompare: (c: CompareState | null) => void;
  setCamera: (position: [number, number, number], target: [number, number, number]) => void;
  setShowStandIns: (v: boolean) => void;
  setLowBandwidth: (v: boolean) => void;
  setQualityTier: (t: EngineState['qualityTier']) => void;
  saveView: (name: string) => SavedView;
  loadView: (id: string) => void;
  deleteView: (id: string) => void;
  applyViewState: (s: ViewState) => void;
  toggleBookmark: (structureId: string, note?: string) => void;
  snapshot: () => ViewState;
}

export const DEFAULT_CAMERA: ViewState['camera'] = { position: [0, 0.02, 2.6], target: [0, 0.02, 0] };

const initialView: ViewState = {
  body: 'male',
  camera: DEFAULT_CAMERA,
  visibleSystems: ['skeletal', 'cardiovascular', 'digestive', 'urinary', 'lymphatic', 'endocrine', 'nervous', 'respiratory', 'reproductive'],
  hidden: [],
  faded: [],
  isolated: null,
  selected: [],
  explode: 0,
  transparency: 0,
  clip: null,
  compare: null,
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set, get) => ({
      ...initialView,
      hoverId: null,
      showStandIns: false,
      lowBandwidth: false,
      qualityTier: 'auto',
      savedViews: [],
      bookmarks: [],
      cameraEpoch: 0,

      setBody: (body) => set({ body }),
      toggleSystem: (s) =>
        set((st) => ({
          visibleSystems: st.visibleSystems.includes(s) ? st.visibleSystems.filter((x) => x !== s) : [...st.visibleSystems, s],
        })),
      setVisibleSystems: (visibleSystems) => set({ visibleSystems }),
      showAllSystems: () => set({ visibleSystems: [...SYSTEM_IDS] }),
      select: (id, additive = false) =>
        set((st) => {
          if (id === null) return { selected: [] };
          if (!additive) return { selected: [id] };
          return { selected: st.selected.includes(id) ? st.selected.filter((x) => x !== id) : [...st.selected, id] };
        }),
      setHover: (hoverId) => set({ hoverId }),
      isolateSelected: (withIds = []) =>
        set((st) => (st.selected.length ? { isolated: [...new Set([...st.selected, ...withIds])] } : {})),
      hideSelected: () =>
        set((st) => ({ hidden: [...new Set([...st.hidden, ...st.selected])], selected: [] })),
      fadeSelected: () =>
        set((st) => ({ faded: [...new Set([...st.faded, ...st.selected])] })),
      unhide: (id) => set((st) => ({ hidden: st.hidden.filter((x) => x !== id), faded: st.faded.filter((x) => x !== id) })),
      resetVisibility: () => set({ hidden: [], faded: [], isolated: null, selected: [], explode: 0, transparency: 0, clip: null }),
      setExplode: (explode) => set({ explode: clamp01(explode) }),
      setTransparency: (transparency) => set({ transparency: clamp01(transparency) }),
      setClip: (clip) => set({ clip }),
      setCompare: (compare) => set({ compare }),
      setCamera: (position, target) => set({ camera: { position, target } }),
      setShowStandIns: (showStandIns) => set({ showStandIns }),
      setLowBandwidth: (lowBandwidth) => set({ lowBandwidth }),
      setQualityTier: (qualityTier) => set({ qualityTier }),
      snapshot: () => {
        const s = get();
        return {
          body: s.body, camera: s.camera, visibleSystems: s.visibleSystems, hidden: s.hidden, faded: s.faded,
          isolated: s.isolated, selected: s.selected, explode: s.explode, transparency: s.transparency, clip: s.clip, compare: s.compare,
        };
      },
      saveView: (name) => {
        const view: SavedView = { id: uid(), name, createdAt: new Date().toISOString(), state: get().snapshot() };
        set((st) => ({ savedViews: [view, ...st.savedViews].slice(0, 200) }));
        return view;
      },
      loadView: (id) => {
        const v = get().savedViews.find((x) => x.id === id);
        if (v) get().applyViewState(v.state);
      },
      deleteView: (id) => set((st) => ({ savedViews: st.savedViews.filter((v) => v.id !== id) })),
      applyViewState: (s) => set((st) => ({ ...s, cameraEpoch: st.cameraEpoch + 1 })),
      toggleBookmark: (structureId, note) =>
        set((st) => ({
          bookmarks: st.bookmarks.some((b) => b.structureId === structureId)
            ? st.bookmarks.filter((b) => b.structureId !== structureId)
            : [{ structureId, note, createdAt: new Date().toISOString() }, ...st.bookmarks],
        })),
    }),
    {
      name: 'vesalia.engine',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : window.localStorage)),
      // Persist only user data; view state is restored from URL/saved views, not silently.
      partialize: (s) => ({ savedViews: s.savedViews, bookmarks: s.bookmarks, lowBandwidth: s.lowBandwidth, qualityTier: s.qualityTier, body: s.body, showStandIns: s.showStandIns }),
      // The server renders initial state; rehydrating during the first client render would
      // change the markup underneath React (hydration mismatch). StoreHydration triggers it
      // in an effect instead, after the first paint.
      skipHydration: true,
    },
  ),
);

const noopStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }

/** Visibility resolution used by the renderer and by the accessible structure list. */
export function structureVisibility(
  st: Pick<EngineState, 'hidden' | 'faded' | 'isolated' | 'visibleSystems' | 'transparency' | 'showStandIns'>,
  id: string,
  systems: SystemId[],
  provenance?: 'hra' | 'bp3d' | 'procedural',
): { visible: boolean; opacity: number } {
  // An explicit selection always wins: a student who searched for a structure should see it
  // even if it is a stand-in.
  const selected = st.isolated?.includes(id) ?? false;
  if (provenance === 'procedural' && !st.showStandIns && !selected) return { visible: false, opacity: 0 };
  if (!systems.some((s) => st.visibleSystems.includes(s))) return { visible: false, opacity: 0 };
  if (st.hidden.includes(id)) return { visible: false, opacity: 0 };
  if (st.isolated && !st.isolated.includes(id)) return { visible: true, opacity: 0.08 };
  const faded = st.faded.includes(id) ? 0.15 : 1;
  return { visible: true, opacity: faded * (1 - st.transparency * 0.85) };
}
