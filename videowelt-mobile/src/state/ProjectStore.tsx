import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Clip,
  MediaItem,
  ProjectState,
  TextOverlay,
  defaultEffects,
  emptyProject,
  uid,
} from './types';

const AUTOSAVE_KEY = 'videowelt.autosave.v1';

type ProjectContextValue = {
  project: ProjectState;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  addMedia: (items: MediaItem[]) => void;
  addClipFromMedia: (mediaId: string) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, direction: -1 | 1) => void;
  updateClip: (clipId: string, patch: Partial<Clip>) => void;
  duplicateClip: (clipId: string) => void;
  addTextOverlay: () => void;
  updateTextOverlay: (id: string, patch: Partial<TextOverlay>) => void;
  removeTextOverlay: (id: string) => void;
  setProjectName: (name: string) => void;
  resetProject: () => void;
  loadProject: (data: ProjectState) => void;
  saveToDisk: (fileUri: string) => Promise<void>;
  loadFromDisk: (fileUri: string) => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<ProjectState>(emptyProject());
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const persist = useCallback((next: ProjectState) => {
    setProject(next);
    AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(next)).catch(() => {
      /* best-effort autosave */
    });
  }, []);

  const addMedia = useCallback(
    (items: MediaItem[]) => {
      persist({ ...project, mediaLibrary: [...project.mediaLibrary, ...items] });
    },
    [project, persist]
  );

  const addClipFromMedia = useCallback(
    (mediaId: string) => {
      const media = project.mediaLibrary.find((m) => m.id === mediaId);
      if (!media) return;
      const clip: Clip = {
        id: uid('clip'),
        mediaId,
        inPoint: 0,
        outPoint: media.duration || 5,
        speed: 1,
        effects: defaultEffects(),
      };
      persist({ ...project, clips: [...project.clips, clip] });
      setSelectedClipId(clip.id);
    },
    [project, persist]
  );

  const removeClip = useCallback(
    (clipId: string) => {
      persist({ ...project, clips: project.clips.filter((c) => c.id !== clipId) });
      setSelectedClipId((cur) => (cur === clipId ? null : cur));
    },
    [project, persist]
  );

  const moveClip = useCallback(
    (clipId: string, direction: -1 | 1) => {
      const idx = project.clips.findIndex((c) => c.id === clipId);
      if (idx < 0) return;
      const target = idx + direction;
      if (target < 0 || target >= project.clips.length) return;
      const clips = [...project.clips];
      [clips[idx], clips[target]] = [clips[target], clips[idx]];
      persist({ ...project, clips });
    },
    [project, persist]
  );

  const updateClip = useCallback(
    (clipId: string, patch: Partial<Clip>) => {
      persist({
        ...project,
        clips: project.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      });
    },
    [project, persist]
  );

  const duplicateClip = useCallback(
    (clipId: string) => {
      const idx = project.clips.findIndex((c) => c.id === clipId);
      if (idx < 0) return;
      const copy: Clip = { ...project.clips[idx], id: uid('clip') };
      const clips = [...project.clips];
      clips.splice(idx + 1, 0, copy);
      persist({ ...project, clips });
      setSelectedClipId(copy.id);
    },
    [project, persist]
  );

  const addTextOverlay = useCallback(() => {
    const overlay: TextOverlay = {
      id: uid('txt'),
      text: 'Dein Text',
      color: '#f5c451',
      fontSize: 32,
      x: 0.5,
      y: 0.85,
      startTime: 0,
      endTime: 3,
    };
    persist({ ...project, textOverlays: [...project.textOverlays, overlay] });
  }, [project, persist]);

  const updateTextOverlay = useCallback(
    (id: string, patch: Partial<TextOverlay>) => {
      persist({
        ...project,
        textOverlays: project.textOverlays.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      });
    },
    [project, persist]
  );

  const removeTextOverlay = useCallback(
    (id: string) => {
      persist({ ...project, textOverlays: project.textOverlays.filter((t) => t.id !== id) });
    },
    [project, persist]
  );

  const setProjectName = useCallback(
    (name: string) => {
      persist({ ...project, projectName: name });
    },
    [project, persist]
  );

  const resetProject = useCallback(() => {
    persist(emptyProject());
    setSelectedClipId(null);
  }, [persist]);

  const loadProject = useCallback(
    (data: ProjectState) => {
      persist(data);
      setSelectedClipId(null);
    },
    [persist]
  );

  const saveToDisk = useCallback(
    async (fileUri: string) => {
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(project, null, 2));
    },
    [project]
  );

  const loadFromDisk = useCallback(
    async (fileUri: string) => {
      const raw = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(raw) as ProjectState;
      persist(data);
      setSelectedClipId(null);
    },
    [persist]
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      selectedClipId,
      setSelectedClipId,
      addMedia,
      addClipFromMedia,
      removeClip,
      moveClip,
      updateClip,
      duplicateClip,
      addTextOverlay,
      updateTextOverlay,
      removeTextOverlay,
      setProjectName,
      resetProject,
      loadProject,
      saveToDisk,
      loadFromDisk,
    }),
    [
      project,
      selectedClipId,
      addMedia,
      addClipFromMedia,
      removeClip,
      moveClip,
      updateClip,
      duplicateClip,
      addTextOverlay,
      updateTextOverlay,
      removeTextOverlay,
      setProjectName,
      resetProject,
      loadProject,
      saveToDisk,
      loadFromDisk,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside a ProjectProvider');
  return ctx;
}

export async function loadAutosave(): Promise<ProjectState | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTOSAVE_KEY);
    return raw ? (JSON.parse(raw) as ProjectState) : null;
  } catch {
    return null;
  }
}
