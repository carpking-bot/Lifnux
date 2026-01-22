export default function BackgroundFX() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-net" />
      <div className="absolute inset-0 bg-lines" />
      <div className="absolute inset-0 bg-particles" />
      <div className="absolute inset-0 bg-noise" />
      <div className="absolute inset-0 fx-vignette" />
      <div className="absolute left-1/2 top-[22%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-200/10 blur-[120px]" />
      <div className="absolute bottom-[-140px] right-[10%] h-[360px] w-[360px] rounded-full bg-sky-400/10 blur-[140px]" />
    </div>
  );
}
