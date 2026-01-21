import Link from "next/link";

type HubItem = {
  key: string;
  label: string;
  href: string;
  Icon: React.FC<React.pngProps<pngpngElement>>;
  angleDeg: number; // 원형 배치
};

function IconGame(props: React.pngProps<pngpngElement>) {
  return (
    <png viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7.5 10.5h9a3 3 0 0 1 2.9 2.2l1 4a3 3 0 0 1-2.9 3.7h-1.3a2 2 0 0 1-1.8-1.1l-.4-.8H10l-.4.8A2 2 0 0 1 7.8 20.4H6.5A3 3 0 0 1 3.6 16.7l1-4A3 3 0 0 1 7.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.5 14h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 12.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15.7 13.2h.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17.6 14.8h.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </png>
  );
}

function IconFinance(props: React.pngProps<pngpngElement>) {
  return (
    <png viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 15l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.9 7H20v3.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </png>
  );
}

function IconSports(props: React.pngProps<pngpngElement>) {
  return (
    <png viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 6l3 2-1 3h-4L9 8l3-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8 13l-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 13l2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 11l-2-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14 11l2-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </png>
  );
}

function IconRunning(props: React.pngProps<pngpngElement>) {
  return (
    <png viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M14 7a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M10.5 21l2.2-4.3 2.6-1.5 2.7 2.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13l3-2 2 1 1-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 21h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </png>
  );
}

function IconMusic(props: React.pngProps<pngpngElement>) {
  return (
    <png viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10 18a2 2 0 1 1-4 0c0-1.1.9-2 2-2h2v2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M18 16a2 2 0 1 1-4 0c0-1.1.9-2 2-2h2v2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 16V6l8-2v10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </png>
  );
}

function IconGrowth(props: React.pngProps<pngpngElement>) {
  return (
    <png viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 20V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 10c-2.5 0-4.5-2-4.5-4.5C9.5 5.5 12 7 12 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 10c2.5 0 4.5-2 4.5-4.5C14.5 5.5 12 7 12 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 20h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </png>
  );
}

const items: HubItem[] = [
  { key: "game", label: "GAME", href: "/game", Icon: IconGame, angleDeg: -90 },
  { key: "finance", label: "FINANCE", href: "/finance", Icon: IconFinance, angleDeg: -30 },
  { key: "sports", label: "SPORTS", href: "/sports", Icon: IconSports, angleDeg: 30 },
  { key: "running", label: "RUNNING", href: "/running", Icon: IconRunning, angleDeg: 90 },
  { key: "music", label: "MUSIC", href: "/music", Icon: IconMusic, angleDeg: 150 },
  { key: "growth", label: "GROWTH", href: "/growth", Icon: IconGrowth, angleDeg: 210 },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/bg-lifnux.png)" }}
      />
      {/* Dark overlay to improve text contrast */}
      <div className="absolute inset-0 bg-black/35" />

      {/* Subtle animated scanline/glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -inset-x-20 top-1/3 h-64 bg-white/10 blur-3xl animate-pulse" />
      </div>

      {/* Center content */}
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-4xl text-center">
          {/* Hub */}
          <div className="mx-auto mb-8 flex justify-center">
            <InteractiveHub />
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-[0.25em] drop-shadow">
            LIFNUX
          </h1>
          <p className="mt-3 text-base sm:text-lg tracking-wider text-white/70">
            Personal Life Operating System
          </p>
          <p className="mt-5 text-sm sm:text-base text-white/70">
            Gaming · Finance · Sport · Running · Career · Music · Personal Growth
          </p>

          {/* Hint */}
          <p className="mt-10 text-xs text-white/50 tracking-widest">
            CLICK A MODULE TO ENTER
          </p>
        </div>
      </section>

      {/* Small corner mark */}
      <div className="pointer-events-none absolute bottom-6 right-6 h-10 w-10 rounded-full border border-white/20 bg-white/5" />
    </main>
  );
}

function InteractiveHub() {
  const radius = 140;
  const dur = 32; // 회전 속도(클수록 느림)

  const ringItems = [
    { key: "game", label: "GAME", href: "/game", iconSrc: "/icons/game.png" },
    { key: "finance", label: "FINANCE", href: "/finance", iconSrc: "/icons/finance.png" },
    { key: "sports", label: "SPORTS", href: "/sports", iconSrc: "/icons/sports.png" },
    { key: "running", label: "RUNNING", href: "/running", iconSrc: "/icons/running.png" },
    { key: "career", label: "CAREER", href: "/growth", iconSrc: "/icons/career.png" },
    { key: "music", label: "MUSIC", href: "/music", iconSrc: "/icons/music.png" },
    { key: "growth", label: "GROWTH", href: "/growth", iconSrc: "/icons/growth.png" },
  ];

  return (
    <div className="relative h-[360px] w-[360px]">
      {/* glow */}
      <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl animate-pulse" />

      {/* rings */}
      <div className="absolute inset-8 rounded-full border border-white/25 bg-white/5 backdrop-blur-sm" />
      <div className="absolute inset-16 rounded-full border border-white/15 bg-black/10" />

      {/* ORBIT GROUP: only this rotates */}
      <div
        className="absolute left-1/2 top-1/2 spin-orbit"
        style={{
  width: 1,
  height: 1,
  // @ts-ignore
  "--dur": `${dur}s`,
}}

      >
        {ringItems.map((it, idx) => {
          const angle = (-90 + (360 / ringItems.length) * idx) * (Math.PI / 180);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={it.key}
              className="absolute"
              style={{
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
              }}
            >
              {/* COUNTER ROTATE so icon stays upright */}
              <div
                className="spin-counter"
                style={{
                  // @ts-ignore
                  "--dur": `${dur}s`,
                }}
              >
                <Link href={it.href} aria-label={it.label} className="group">
                  <div
                    className="relative grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-white/10
                               backdrop-blur-md transition hover:scale-110 hover:bg-white/15 hover:border-white/45"
                  >
                    <img
                      src={it.iconSrc}
                      alt={it.label}
                      className="h-10 w-10 opacity-90 drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]"
                      draggable={false}
                    />
                    <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-white/70 opacity-0 transition group-hover:opacity-100">
                      {it.label}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

{/* center calendar */}
<Link
  href="/calendar"
  aria-label="CALENDAR"
  className="group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
>
  <div
    className="relative grid h-24 w-24 place-items-center rounded-full
               border border-white/25 bg-white/10 backdrop-blur-md transition
               hover:scale-105 hover:bg-white/15 hover:border-white/45"
  >
    <img
      src="/icons/calendar.png"
      alt="CALENDAR"
      className="h-12 w-12 opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]"
      draggable={false}
    />
    <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-white/70 opacity-0 transition group-hover:opacity-100">
      CALENDAR
    </span>

    {/* subtle inner dot */}
    <div className="pointer-events-none absolute inset-3 rounded-full border border-white/10 bg-black/10" />
  </div>
</Link>
    </div>
  );
}

function Particle({ className }: { className: string }) {
  return (
    <div
      className={`absolute h-1.5 w-1.5 rounded-full bg-white/60 shadow-[0_0_16px_rgba(255,255,255,0.35)] animate-[pulse_2.8s_ease-in-out_infinite] ${className}`}
    />
  );
}
