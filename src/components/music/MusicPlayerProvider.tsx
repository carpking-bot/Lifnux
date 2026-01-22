"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Pause, Play, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from "lucide-react";

type ViewMode = "mini" | "expanded";
type RepeatMode = "off" | "one" | "all";
type QueueItem = {
  id: string;
  videoId: string;
  title?: string;
};
type Preset = {
  name: string;
  items: QueueItem[];
};

type MusicPlayerState = {
  ready: boolean;
  queue: QueueItem[];
  currentIndex: number;
  title: string;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  presets: Preset[];
  lastState: number | null;
  lastError: number | null;
  initError: string | null;
  debugMeta: {
    videoId: string | null;
    title: string | null;
    url: string | null;
    currentTime: number;
  };
  playerInstanceId: string;
  viewMode: ViewMode;
};

type MusicPlayerContextValue = MusicPlayerState & {
  addToQueue: (videoId: string) => void;
  playAtIndex: (index: number) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (activeId: string, overId: string) => void;
  savePreset: (name: string) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
  refreshDebugMeta: () => void;
  clearQueue: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setViewMode: (mode: ViewMode) => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);
const STORAGE_KEY = "lifnux-music-queue-v1";
const PRESET_STORAGE_KEY = "lifnux-music-presets-v1";
const TITLE_CACHE_KEY = "lifnux-music-title-cache-v1";

const createQueueId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isValidVideoId = (videoId: string) =>
  /^[A-Za-z0-9_-]{11}$/.test(videoId.trim());

const normalizeQueueItems = (items: QueueItem[]) =>
  items
    .filter((item) => item?.videoId && isValidVideoId(item.videoId))
    .map((item) => ({
      id: item.id ?? createQueueId(),
      videoId: item.videoId,
      title: item.title,
    }));

function useYouTubeLoader() {
  const loaderRef = useRef<Promise<void> | null>(null);

  const load = useCallback(() => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("YT not available on server"));
    }
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }
    if (loaderRef.current) {
      return loaderRef.current;
    }
    loaderRef.current = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-yt-iframe]"
      );
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("YT script failed"))
        );
        return;
      }
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.dataset.ytIframe = "true";
      tag.onerror = () => reject(new Error("YT script failed"));
      document.body.appendChild(tag);
      const existingReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (existingReady) {
          existingReady();
        }
        resolve();
      };
    });
    return loaderRef.current;
  }, []);

  return load;
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  }
  return context;
}

export default function MusicPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const loadYouTube = useYouTubeLoader();
  const playerRef = useRef<YT.Player | null>(null);
  const metadataPlayerRef = useRef<YT.Player | null>(null);
  const timeRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const lastLoadedRef = useRef<string | null>(null);
  const repeatModeRef = useRef<RepeatMode>("off");
  const currentVideoIdRef = useRef<string | null>(null);
  const nextRef = useRef<(fromEnded?: boolean) => void>(() => {});
  const suppressAutoplayRef = useRef(false);
  const titleRetryRef = useRef<number | null>(null);
  const playerInstanceIdRef = useRef<string | null>(null);
  const metadataReadyRef = useRef(false);
  const metadataReadyPromiseRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(
    null
  );
  const metadataQueueRef = useRef<Promise<void>>(Promise.resolve());
  const titleCacheRef = useRef<Map<string, string>>(new Map());

  const logDev = useCallback((label: string, payload?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[MusicPlayer] ${label}`, payload);
    }
  }, []);

  const ensureMetadataReady = useCallback(() => {
    if (!metadataReadyPromiseRef.current) {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      metadataReadyPromiseRef.current = { promise, resolve };
      if (metadataReadyRef.current) {
        resolve();
      }
    }
    return metadataReadyPromiseRef.current.promise;
  }, []);

  const updateQueueTitleById = useCallback((itemId: string, title: string) => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.map((item) =>
        item.id === itemId ? { ...item, title } : item
      ),
    }));
  }, []);

  const cacheTitle = useCallback((videoId: string, title: string) => {
    titleCacheRef.current.set(videoId, title);
    if (typeof window === "undefined") {
      return;
    }
    const payload = Object.fromEntries(titleCacheRef.current.entries());
    window.localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(payload));
  }, []);

  const prefetchTitle = useCallback(
    (videoId: string, itemId: string) => {
      if (!isValidVideoId(videoId)) {
        updateQueueTitleById(itemId, "Unknown title");
        return;
      }
      const cached = titleCacheRef.current.get(videoId);
      if (cached) {
        updateQueueTitleById(itemId, cached);
        return;
      }
      metadataQueueRef.current = metadataQueueRef.current.then(async () => {
        await ensureMetadataReady();
        const player = metadataPlayerRef.current;
        if (!player || typeof player.cueVideoById !== "function") {
          updateQueueTitleById(itemId, "Unknown title");
          return;
        }
        player.cueVideoById(videoId);
        const delays = [200, 500, 1000];
        for (let i = 0; i < delays.length; i += 1) {
          await new Promise<void>((resolve) => {
            window.setTimeout(() => resolve(), delays[i]);
          });
          const data = player.getVideoData();
          const title = data?.title?.trim();
          if (title) {
            cacheTitle(videoId, title);
            updateQueueTitleById(itemId, title);
            return;
          }
        }
        updateQueueTitleById(itemId, "Unknown title");
      });
    },
    [cacheTitle, ensureMetadataReady, updateQueueTitleById]
  );

  const [state, setState] = useState<MusicPlayerState>({
    ready: false,
    queue: [],
    currentIndex: 0,
    title: "",
    isPlaying: false,
    isMuted: false,
    volume: 70,
    currentTime: 0,
    duration: 0,
    shuffle: false,
    repeatMode: "off",
    presets: [],
    lastState: null,
    lastError: null,
    initError: null,
    debugMeta: {
      videoId: null,
      title: null,
      url: null,
      currentTime: 0,
    },
    playerInstanceId: "",
    viewMode: "mini",
  });

  const currentVideoId = state.queue[state.currentIndex]?.videoId ?? null;
  currentVideoIdRef.current = currentVideoId;
  repeatModeRef.current = state.repeatMode;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!playerInstanceIdRef.current) {
      playerInstanceIdRef.current = createQueueId();
      setState((prev) => ({
        ...prev,
        playerInstanceId: playerInstanceIdRef.current ?? "",
      }));
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const stored = JSON.parse(raw) as {
        queue?: QueueItem[];
        currentIndex?: number;
        shuffle?: boolean;
        repeatMode?: RepeatMode;
      };
      const queue = Array.isArray(stored.queue) ? normalizeQueueItems(stored.queue) : [];
      const currentIndex =
        typeof stored.currentIndex === "number" && queue.length > 0
          ? Math.min(Math.max(stored.currentIndex, 0), queue.length - 1)
          : 0;
      setState((prev) => ({
        ...prev,
        queue,
        currentIndex,
        shuffle: Boolean(stored.shuffle),
        repeatMode: stored.repeatMode ?? "off",
      }));
    } catch {
      // ignore storage parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(TITLE_CACHE_KEY);
    if (!raw) {
      return;
    }
    try {
      const stored = JSON.parse(raw) as Record<string, string>;
      Object.entries(stored).forEach(([key, value]) => {
        if (isValidVideoId(key) && value) {
          titleCacheRef.current.set(key, value);
        }
      });
    } catch {
      // ignore cache parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload = {
      queue: state.queue,
      currentIndex: state.currentIndex,
      shuffle: state.shuffle,
      repeatMode: state.repeatMode,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [state.currentIndex, state.queue, state.repeatMode, state.shuffle]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const stored = JSON.parse(raw) as Preset[];
      const presets = Array.isArray(stored)
        ? stored
            .filter((preset) => preset?.name && Array.isArray(preset.items))
            .map((preset) => ({
              name: preset.name,
              items: normalizeQueueItems(preset.items),
            }))
        : [];
      setState((prev) => ({
        ...prev,
        presets,
      }));
    } catch {
      // ignore storage parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(state.presets));
  }, [state.presets]);

  const updateMeta = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    const data = player.getVideoData();
    const url = typeof player.getVideoUrl === "function" ? player.getVideoUrl() : null;
    setState((prev) => ({
      ...prev,
      title: data?.title ?? prev.title,
      duration: player.getDuration() || prev.duration,
      debugMeta: {
        videoId: data?.video_id ?? null,
        title: data?.title ?? null,
        url,
        currentTime: player.getCurrentTime() || 0,
      },
      queue:
        data?.title && prev.queue[prev.currentIndex] && !prev.queue[prev.currentIndex]?.title
          ? prev.queue.map((item, index) =>
              index === prev.currentIndex ? { ...item, title: data.title } : item
            )
          : prev.queue,
    }));
  }, []);

  const fillTitleFromPlayer = useCallback(
    (attempts: number[]) => {
      const player = playerRef.current;
      if (!player) {
        return;
      }
      const data = player.getVideoData();
      logDev("getVideoData", data);
      const title = data?.title?.trim();
      if (title) {
        setState((prev) => ({
          ...prev,
          title,
          debugMeta: {
            videoId: data?.video_id ?? prev.debugMeta.videoId,
            title,
            url:
              typeof player.getVideoUrl === "function"
                ? player.getVideoUrl()
                : prev.debugMeta.url,
            currentTime: player.getCurrentTime() || prev.debugMeta.currentTime,
          },
          queue:
            prev.queue[prev.currentIndex] && !prev.queue[prev.currentIndex]?.title
              ? prev.queue.map((item, index) =>
                  index === prev.currentIndex ? { ...item, title } : item
                )
              : prev.queue,
        }));
        return;
      }
      if (attempts.length === 0) {
        return;
      }
      const delay = attempts[0];
      if (titleRetryRef.current !== null) {
        window.clearTimeout(titleRetryRef.current);
      }
      titleRetryRef.current = window.setTimeout(() => {
        fillTitleFromPlayer(attempts.slice(1));
      }, delay);
    },
    [logDev]
  );

  const updateTime = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    setState((prev) => ({
      ...prev,
      currentTime: player.getCurrentTime() || 0,
      duration: player.getDuration() || prev.duration,
    }));
  }, []);

  const ensureTimer = useCallback((active: boolean) => {
    if (active) {
      if (timeRef.current !== null) {
        return;
      }
      timeRef.current = window.setInterval(() => {
        updateTime();
      }, 750);
    } else if (timeRef.current !== null) {
      window.clearInterval(timeRef.current);
      timeRef.current = null;
    }
  }, [updateTime]);

  useEffect(() => {
    let mounted = true;
    if (typeof window === "undefined") {
      return;
    }
    const createMainPlayer = (attempt = 0) => {
      if (!mounted || playerRef.current) {
        return;
      }
      const host = document.getElementById("lifnux-yt-player");
      if (!host) {
        if (attempt < 2) {
          window.requestAnimationFrame(() => createMainPlayer(attempt + 1));
          return;
        }
        setState((prev) => ({
          ...prev,
          initError: "Player host element not found.",
        }));
        return;
      }
      try {
        playerRef.current = new window.YT.Player("lifnux-yt-player", {
          height: "100%",
          width: "100%",
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              console.log("player ready");
              logDev("onReady fired");
              setState((prev) => ({ ...prev, ready: true }));
              playerRef.current?.setVolume(state.volume);
              const initialVideoId = currentVideoIdRef.current;
              if (initialVideoId && isValidVideoId(initialVideoId)) {
                playerRef.current?.loadVideoById(initialVideoId);
                lastLoadedRef.current = initialVideoId;
              }
            },
            onError: (event) => {
              console.log("onError", event?.data);
              logDev("onError", event?.data);
              setState((prev) => ({
                ...prev,
                lastError: typeof event?.data === "number" ? event.data : null,
              }));
            },
            onStateChange: (event) => {
              const isPlaying = event.data === window.YT.PlayerState.PLAYING;
              const isPaused = event.data === window.YT.PlayerState.PAUSED;
              const isCued = event.data === window.YT.PlayerState.CUED;
              const isEnded = event.data === window.YT.PlayerState.ENDED;
              console.log("onStateChange", event.data);
              logDev("onStateChange", event.data);
              setState((prev) => ({
                ...prev,
                lastState: event.data,
                isPlaying,
                currentTime: playerRef.current?.getCurrentTime() ?? prev.currentTime,
                duration: playerRef.current?.getDuration() ?? prev.duration,
              }));
              if (isPlaying || isCued) {
                updateMeta();
                fillTitleFromPlayer([200, 500, 1000]);
              }
              if (isPlaying) {
                ensureTimer(true);
              }
              if (isPaused) {
                ensureTimer(false);
              }
              if (isEnded) {
                if (repeatModeRef.current === "one") {
                  const videoId = currentVideoIdRef.current ?? "";
                  if (videoId) {
                    playerRef.current?.loadVideoById(videoId);
                  }
                } else {
                  nextRef.current(true);
                }
              }
            },
          },
        });
        console.log("player created");
        setState((prev) => ({
          ...prev,
          ready: true,
          initError: null,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Player init failed.";
        setState((prev) => ({
          ...prev,
          initError: message,
        }));
      }
    };

    const createMetadataPlayer = (attempt = 0) => {
      if (!mounted || metadataPlayerRef.current) {
        return;
      }
      const host = document.getElementById("lifnux-yt-meta");
      if (!host) {
        if (attempt < 2) {
          window.requestAnimationFrame(() => createMetadataPlayer(attempt + 1));
        }
        return;
      }
      try {
        metadataPlayerRef.current = new window.YT.Player("lifnux-yt-meta", {
          height: "100%",
          width: "100%",
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              metadataReadyRef.current = true;
              if (metadataReadyPromiseRef.current) {
                metadataReadyPromiseRef.current.resolve();
              }
            },
          },
        });
      } catch {
        // ignore metadata init failures
      }
    };

    if (window.YT && window.YT.Player) {
      createMainPlayer();
      createMetadataPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        createMainPlayer();
        createMetadataPlayer();
      };
    }

    loadYouTube().catch(() => {
      // ignore YT load failures
    });
    return () => {
      mounted = false;
    };
  }, [ensureTimer, fillTitleFromPlayer, loadYouTube, logDev, state.volume, updateMeta]);

  useEffect(() => {
    return () => {
      if (timeRef.current !== null) {
        window.clearInterval(timeRef.current);
      }
      if (titleRetryRef.current !== null) {
        window.clearTimeout(titleRetryRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !state.ready || !currentVideoId) {
      return;
    }
    if (!isValidVideoId(currentVideoId)) {
      return;
    }
    if (lastLoadedRef.current === currentVideoId) {
      return;
    }
    lastLoadedRef.current = currentVideoId;
    if (suppressAutoplayRef.current && typeof player.cueVideoById === "function") {
      player.cueVideoById(currentVideoId);
    } else {
      if (typeof player.loadVideoById === "function") {
        player.loadVideoById(currentVideoId);
      } else {
        setState((prev) => ({
          ...prev,
          initError: "loadVideoById is not available on the player instance.",
        }));
        return;
      }
      if (suppressAutoplayRef.current) {
        player.pauseVideo();
      }
    }
    suppressAutoplayRef.current = false;
  }, [currentVideoId, state.ready]);

  const playAtIndex = useCallback((index: number) => {
    setState((prev) => {
      if (index < 0 || index >= prev.queue.length) {
        return prev;
      }
      return {
        ...prev,
        currentIndex: index,
        isPlaying: true,
      };
    });
  }, []);

  const addToQueue = useCallback((videoId: string) => {
    setState((prev) => {
      const cachedTitle = titleCacheRef.current.get(videoId);
      const itemId = createQueueId();
      const title = cachedTitle ?? "Loading...";
      const queue = [...prev.queue, { id: itemId, videoId, title }];
      const nextIndex = prev.queue.length === 0 ? 0 : prev.currentIndex;
      if (!cachedTitle) {
        prefetchTitle(videoId, itemId);
      }
      return {
        ...prev,
        queue,
        currentIndex: nextIndex,
        isPlaying: prev.queue.length === 0 ? true : prev.isPlaying,
      };
    });
  }, [prefetchTitle]);

  const removeFromQueue = useCallback((index: number) => {
    setState((prev) => {
      if (index < 0 || index >= prev.queue.length) {
        return prev;
      }
      const nextQueue = prev.queue.filter((_, idx) => idx !== index);
      if (nextQueue.length === 0) {
        playerRef.current?.pauseVideo();
        lastLoadedRef.current = null;
        return {
          ...prev,
          queue: [],
          currentIndex: 0,
          isPlaying: false,
          title: "",
        };
      }
      let nextIndex = prev.currentIndex;
      if (index < prev.currentIndex) {
        nextIndex = prev.currentIndex - 1;
      } else if (index === prev.currentIndex) {
        nextIndex = Math.min(index, nextQueue.length - 1);
      }
      return {
        ...prev,
        queue: nextQueue,
        currentIndex: nextIndex,
        isPlaying: prev.isPlaying,
      };
    });
  }, []);

  const reorderQueue = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) {
      return;
    }
    setState((prev) => {
      const oldIndex = prev.queue.findIndex((item) => item.id === activeId);
      const newIndex = prev.queue.findIndex((item) => item.id === overId);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }
      const queue = [...prev.queue];
      const [moved] = queue.splice(oldIndex, 1);
      queue.splice(newIndex, 0, moved);
      let currentIndex = prev.currentIndex;
      if (prev.currentIndex === oldIndex) {
        currentIndex = newIndex;
      } else if (oldIndex < prev.currentIndex && newIndex >= prev.currentIndex) {
        currentIndex = prev.currentIndex - 1;
      } else if (oldIndex > prev.currentIndex && newIndex <= prev.currentIndex) {
        currentIndex = prev.currentIndex + 1;
      }
      return {
        ...prev,
        queue,
        currentIndex,
      };
    });
  }, []);

  const savePreset = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setState((prev) => {
      const items = normalizeQueueItems(prev.queue);
      const existingIndex = prev.presets.findIndex((preset) => preset.name === trimmed);
      const nextPresets = [...prev.presets];
      if (existingIndex >= 0) {
        nextPresets[existingIndex] = { name: trimmed, items };
      } else {
        nextPresets.push({ name: trimmed, items });
      }
      return {
        ...prev,
        presets: nextPresets,
      };
    });
  }, []);

  const loadPreset = useCallback((name: string) => {
    setState((prev) => {
      const preset = prev.presets.find((item) => item.name === name);
      if (!preset) {
        return prev;
      }
      suppressAutoplayRef.current = true;
      lastLoadedRef.current = null;
      return {
        ...prev,
        queue: normalizeQueueItems(preset.items),
        currentIndex: 0,
        isPlaying: false,
        title: "",
      };
    });
  }, []);

  const deletePreset = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      presets: prev.presets.filter((preset) => preset.name !== name),
    }));
  }, []);

  const clearQueue = useCallback(() => {
    playerRef.current?.pauseVideo();
    lastLoadedRef.current = null;
    setState((prev) => ({
      ...prev,
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      title: "",
    }));
  }, []);

  const refreshDebugMeta = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    const data = player.getVideoData();
    logDev("getVideoData", data);
    const url = typeof player.getVideoUrl === "function" ? player.getVideoUrl() : null;
    setState((prev) => ({
      ...prev,
      debugMeta: {
        videoId: data?.video_id ?? null,
        title: data?.title ?? null,
        url,
        currentTime: player.getCurrentTime() || 0,
      },
    }));
  }, [logDev]);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    if (typeof player.playVideo === "function") {
      player.playVideo();
    }
  }, []);

  const pause = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    if (typeof player.pauseVideo === "function") {
      player.pauseVideo();
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [pause, play, state.isPlaying]);

  const next = useCallback(
    (fromEnded?: boolean) => {
      setState((prev) => {
        const length = prev.queue.length;
        if (length === 0) {
          return prev;
        }
        if (fromEnded && prev.repeatMode === "one") {
          return { ...prev, isPlaying: true };
        }
        let nextIndex = prev.currentIndex;
        if (prev.shuffle) {
          if (length > 1) {
            let candidate = Math.floor(Math.random() * length);
            if (candidate === prev.currentIndex) {
              candidate = (candidate + 1) % length;
            }
            nextIndex = candidate;
          }
        } else {
          nextIndex = prev.currentIndex + 1;
          if (nextIndex >= length) {
            if (prev.repeatMode === "all") {
              nextIndex = 0;
            } else {
              return { ...prev, isPlaying: false };
            }
          }
        }
        if (nextIndex !== prev.currentIndex) {
          historyRef.current.push(prev.currentIndex);
        }
        return {
          ...prev,
          currentIndex: nextIndex,
          isPlaying: true,
        };
      });
    },
    []
  );
  nextRef.current = next;

  const prev = useCallback(() => {
    setState((prev) => {
      const length = prev.queue.length;
      if (length === 0) {
        return prev;
      }
      let nextIndex = prev.currentIndex - 1;
      if (prev.shuffle && historyRef.current.length > 0) {
        const last = historyRef.current.pop();
        if (typeof last === "number") {
          nextIndex = last;
        }
      }
      if (nextIndex < 0) {
        nextIndex = prev.repeatMode === "all" ? length - 1 : 0;
      }
      return {
        ...prev,
        currentIndex: nextIndex,
        isPlaying: true,
      };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      shuffle: !prev.shuffle,
    }));
  }, []);

  const cycleRepeatMode = useCallback(() => {
    setState((prev) => {
      const nextMode: RepeatMode =
        prev.repeatMode === "off"
          ? "one"
          : prev.repeatMode === "one"
            ? "all"
            : "off";
      return {
        ...prev,
        repeatMode: nextMode,
      };
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    playerRef.current?.setVolume(volume);
    setState((prev) => ({
      ...prev,
      volume,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    if (player.isMuted()) {
      player.unMute();
      setState((prev) => ({ ...prev, isMuted: false }));
    } else {
      player.mute();
      setState((prev) => ({ ...prev, isMuted: true }));
    }
  }, []);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setState((prev) => ({ ...prev, viewMode }));
  }, []);

  const contextValue = useMemo(
    () => ({
      ...state,
      addToQueue,
      playAtIndex,
      removeFromQueue,
      reorderQueue,
      savePreset,
      loadPreset,
      deletePreset,
      refreshDebugMeta,
      clearQueue,
      play,
      pause,
      togglePlay,
      next,
      prev,
      toggleShuffle,
      cycleRepeatMode,
      setVolume,
      toggleMute,
      setViewMode,
    }),
    [
      addToQueue,
      cycleRepeatMode,
      deletePreset,
      loadPreset,
      next,
      pause,
      play,
      playAtIndex,
      prev,
      clearQueue,
      refreshDebugMeta,
      removeFromQueue,
      reorderQueue,
      savePreset,
      setViewMode,
      setVolume,
      state,
      toggleMute,
      togglePlay,
      toggleShuffle,
    ]
  );

  return (
    <MusicPlayerContext.Provider value={contextValue}>
      {children}
      <div
        className={`overflow-hidden transition-all ${
          state.viewMode === "expanded"
            ? "fixed right-6 top-24 z-20 h-[220px] w-[360px] rounded-3xl border border-white/10 bg-black/40 shadow-[0_20px_50px_rgba(5,15,35,0.55)] pointer-events-auto md:h-[260px] md:w-[420px] xl:h-[360px] xl:w-[640px]"
            : "fixed left-[-9999px] top-[-9999px] z-0 h-[1px] w-[1px] pointer-events-none"
        }`}
      >
        <div id="lifnux-yt-player" className="h-full w-full" />
      </div>
      <div className="fixed left-[-9999px] top-[-9999px] z-0 h-[1px] w-[1px] overflow-hidden pointer-events-none">
        <div id="lifnux-yt-meta" className="h-full w-full" />
      </div>

      <AnimatePresence>
        {state.queue.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-40 w-[280px] rounded-3xl border border-white/10 bg-white/10 p-4 text-sky-100 shadow-[0_16px_40px_rgba(5,10,20,0.45)] backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-sky-100/60">
                Now Playing
              </p>
              <button
                type="button"
                onClick={() => router.push("/music")}
                className="text-[0.6rem] uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
              >
                Open Music
              </button>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold">
              {state.queue[state.currentIndex]?.title || state.title || "Unknown title"}
            </p>
            <p className="mt-1 text-[0.6rem] uppercase tracking-[0.3em] text-sky-100/50">
              {state.queue.length > 0
                ? `${state.currentIndex + 1} / ${state.queue.length}`
                : "Queue"}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleShuffle}
                className="rounded-full border border-white/10 p-2 text-sky-100/80 transition hover:text-white"
              >
                <Shuffle className={`h-4 w-4 ${state.shuffle ? "text-rose-400" : ""}`} />
              </button>
              <button
                type="button"
                onClick={prev}
                className="rounded-full border border-white/10 p-2 text-sky-100/80 transition hover:text-white"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-full border border-white/10 p-2 text-sky-100/80 transition hover:text-white"
              >
                {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-full border border-white/10 p-2 text-sky-100/80 transition hover:text-white"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={cycleRepeatMode}
                className="rounded-full border border-white/10 p-2 text-sky-100/80 transition hover:text-white"
              >
                {state.repeatMode === "one" ? (
                  <Repeat1 className="h-4 w-4 text-rose-400" />
                ) : (
                  <Repeat
                    className={`h-4 w-4 ${state.repeatMode !== "off" ? "text-rose-400" : ""}`}
                  />
                )}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MusicPlayerContext.Provider>
  );
}
