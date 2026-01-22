"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { X } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMusicPlayer } from "@/components/music/MusicPlayerProvider";

function parseVideoId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  let candidate: string | null = null;
  if (/youtu\.?be/.test(trimmed)) {
    const urlMatch = trimmed.match(
      /(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/
    );
    candidate = urlMatch ? urlMatch[1] : null;
  } else {
    candidate = trimmed.split(/[?#&]/)[0];
  }
  if (!candidate) {
    return null;
  }
  const sanitized = candidate.split(/[?#&]/)[0].replace(/[^A-Za-z0-9_-]/g, "");
  return sanitized.length === 11 ? sanitized : null;
}

export default function MusicPageView() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState("");
  const [isPresetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isClearOpen, setClearOpen] = useState(false);
  const player = useMusicPlayer();
  const { setViewMode } = player;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const presetOptions = useMemo(
    () => player.presets.map((preset) => preset.name),
    [player.presets]
  );

  useEffect(() => {
    setViewMode("expanded");
    return () => setViewMode("mini");
  }, [setViewMode]);

  const handleAdd = () => {
    const videoId = parseVideoId(input);
    if (!videoId) {
      setError("Invalid YouTube video id");
      return;
    }
    setError(null);
    player.addToQueue(videoId);
    setInput("");
  };

  const handleSavePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) {
      setPresetError("Preset name is required.");
      return;
    }
    setPresetError(null);
    player.savePreset(trimmed);
    setActivePreset(trimmed);
    setPresetName("");
    setPresetModalOpen(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-sky-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              Music
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[0.2em]">
              Lifnux Audio Hub
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white md:hidden"
          >
            Presets
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <div className="sticky top-6 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
                  Presets
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPresetError(null);
                    setPresetModalOpen(true);
                  }}
                  className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-3 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20"
                >
                  Save
                </button>
              </div>
              <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {presetOptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-[0.6rem] uppercase tracking-[0.3em] text-sky-100/40">
                    No presets yet
                  </div>
                ) : null}
                {player.presets.map((preset) => {
                  const isActive = preset.name === activePreset;
                  return (
                    <div
                      key={preset.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setPresetError(null);
                        setActivePreset(preset.name);
                        player.loadPreset(preset.name);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setPresetError(null);
                          setActivePreset(preset.name);
                          player.loadPreset(preset.name);
                        }
                      }}
                      className={`flex w-full items-start justify-between gap-2 rounded-2xl border border-white/10 px-4 py-3 text-left text-xs uppercase tracking-[0.3em] transition ${
                        isActive
                          ? "border-cyan-200/60 text-cyan-100"
                          : "text-sky-100/70 hover:text-white"
                      }`}
                    >
                      <span className="flex flex-col gap-1">
                        <span className="text-[0.7rem] tracking-[0.35em]">
                          {preset.name}
                        </span>
                        <span className="text-[0.55rem] text-sky-100/50">
                          {preset.items.length} tracks
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            player.deletePreset(preset.name);
                            if (activePreset === preset.name) {
                              setActivePreset("");
                            }
                          }}
                          className="rounded-full border border-white/10 px-2 py-1 text-[0.55rem] text-rose-100/80 transition hover:text-rose-100"
                        >
                          X
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
                Add To Queue
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="YouTube URL or videoId"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20"
                >
                  Add To Queue
                </button>
              </div>
              {error ? (
                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-rose-200/80">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              {player.queue.length > 0 ? (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
                    Now Playing
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {player.queue[player.currentIndex]?.title || "Unknown title"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.3em] text-sky-100/50">
                    {`${player.currentIndex + 1} / ${player.queue.length}`}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={player.prev}
                      className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/80 transition hover:text-white"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={player.togglePlay}
                      className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/80 transition hover:text-white"
                    >
                      {player.isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      type="button"
                      onClick={player.next}
                      className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/80 transition hover:text-white"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={player.toggleMute}
                      className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/80 transition hover:text-white"
                    >
                      {player.isMuted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      type="button"
                      onClick={player.toggleShuffle}
                      className={`rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] transition ${
                        player.shuffle
                          ? "text-cyan-100 border-cyan-200/60"
                          : "text-sky-100/80 hover:text-white"
                      }`}
                    >
                      Shuffle {player.shuffle ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={player.cycleRepeatMode}
                      className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/80 transition hover:text-white"
                    >
                      Repeat {player.repeatMode}
                    </button>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
                        Queue
                      </p>
                      <button
                        type="button"
                        onClick={() => setClearOpen(true)}
                        className="rounded-full border border-rose-200/40 px-3 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-rose-100/80 transition hover:text-rose-100"
                      >
                        Clear
                      </button>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => {
                        if (!event.over) {
                          return;
                        }
                        player.reorderQueue(String(event.active.id), String(event.over.id));
                      }}
                    >
                      <SortableContext
                        items={player.queue.map((item) => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="mt-3 grid gap-2">
                          {player.queue.map((item, index) => (
                            <QueueRow
                              key={item.id}
                              itemId={item.id}
                              isActive={index === player.currentIndex}
                              index={index}
                              label={item.title || "Unknown title"}
                              onPlay={() => player.playAtIndex(index)}
                              onRemove={(event) => {
                                event.stopPropagation();
                                player.removeFromQueue(index);
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </>
              ) : (
                <div className="text-sm uppercase tracking-[0.3em] text-sky-100/50">
                  No track.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isPresetModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-sky-100 shadow-[0_20px_50px_rgba(5,15,35,0.55)]">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              Save Preset
            </p>
            <h2 className="mt-2 text-lg font-semibold">Name your preset</h2>
            <input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Preset name"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100"
            />
            {presetError ? (
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-rose-200/80">
                {presetError}
              </p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPresetModalOpen(false);
                  setPresetName("");
                  setPresetError(null);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/80 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isClearOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-sky-100 shadow-[0_20px_50px_rgba(5,15,35,0.55)]">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              Clear Queue
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Clear the entire queue? This cannot be undone.
            </h2>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClearOpen(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/80 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  player.clearQueue();
                  setClearOpen(false);
                }}
                className="rounded-full border border-rose-200/60 bg-rose-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-rose-100 transition hover:bg-rose-200/20"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur md:hidden">
          <div className="absolute left-0 top-0 h-full w-[280px] border-r border-white/10 bg-slate-900/80 p-4 shadow-[0_20px_50px_rgba(5,15,35,0.55)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
                Presets
              </p>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
              >
                Close
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setPresetError(null);
                setPresetModalOpen(true);
              }}
              className="mt-3 w-full rounded-full border border-cyan-200/60 bg-cyan-300/10 px-3 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20"
            >
              Save As Preset
            </button>
            <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {presetOptions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-[0.6rem] uppercase tracking-[0.3em] text-sky-100/40">
                  No presets yet
                </div>
              ) : null}
              {player.presets.map((preset) => {
                const isActive = preset.name === activePreset;
                return (
                  <div
                    key={preset.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setPresetError(null);
                      setActivePreset(preset.name);
                      player.loadPreset(preset.name);
                      setSidebarOpen(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setPresetError(null);
                        setActivePreset(preset.name);
                        player.loadPreset(preset.name);
                        setSidebarOpen(false);
                      }
                    }}
                    className={`flex w-full items-start justify-between gap-2 rounded-2xl border border-white/10 px-4 py-3 text-left text-xs uppercase tracking-[0.3em] transition ${
                      isActive
                        ? "border-cyan-200/60 text-cyan-100"
                        : "text-sky-100/70 hover:text-white"
                    }`}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-[0.7rem] tracking-[0.35em]">
                        {preset.name}
                      </span>
                      <span className="text-[0.55rem] text-sky-100/50">
                        {preset.items.length} tracks
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          player.deletePreset(preset.name);
                          if (activePreset === preset.name) {
                            setActivePreset("");
                          }
                        }}
                        className="rounded-full border border-white/10 px-2 py-1 text-[0.55rem] text-rose-100/80 transition hover:text-rose-100"
                      >
                        X
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0"
            aria-label="Close presets"
          />
        </div>
      ) : null}
    </main>
  );
}

function QueueRow({
  itemId,
  isActive,
  index,
  label,
  onPlay,
  onRemove,
}: {
  itemId: string;
  isActive: boolean;
  index: number;
  label: string;
  onPlay: () => void;
  onRemove: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
  });
  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm transition ${
        isActive ? "border-cyan-200/60 text-cyan-100" : "text-sky-100/80 hover:text-white"
      } ${isDragging ? "bg-white/10" : ""}`}
      onClick={onPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onPlay();
        }
      }}
    >
      <span
        className="cursor-grab text-xs uppercase tracking-[0.3em] text-sky-100/40"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ::
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[0.6rem] uppercase tracking-[0.3em] text-sky-100/50">
        {index + 1}
      </span>
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(event) => event.stopPropagation()}
        className="rounded-full border border-white/10 p-1 text-sky-100/60 transition hover:text-rose-100"
        aria-label="Remove from queue"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
