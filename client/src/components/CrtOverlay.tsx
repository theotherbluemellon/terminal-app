export function CrtOverlay() {
  return (
    <>
      {/* Scanlines */}
      <div className="fixed inset-0 z-50 pointer-events-none crt-overlay opacity-30 h-full w-full" />
      
      {/* Vignette */}
      <div className="fixed inset-0 z-50 pointer-events-none bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.4)_100%)]" />
      
      {/* Subtle Screen Glow/Bleed */}
      <div className="fixed inset-0 z-40 pointer-events-none mix-blend-screen opacity-[0.03] bg-primary animate-pulse" />
    </>
  );
}
