export function HeroVideo() {
  return (
    <div className="relative flex items-center justify-center w-full max-w-lg lg:max-w-xl xl:max-w-2xl overflow-hidden rounded-2xl aspect-square">
      <video
        src="/herovid.mp4"
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
