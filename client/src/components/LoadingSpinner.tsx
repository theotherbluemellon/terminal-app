import { useEffect, useState } from "react";

export function LoadingSpinner() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 mb-4 font-mono text-primary/70">
      <div className="shrink-0 font-bold min-w-[100px]">
        llama_v2 &gt;&gt;
      </div>
      <div className="flex items-center gap-2">
        <span className="text-glow">{frames[frame]}</span>
        <span className="opacity-50 text-sm">Processing...</span>
      </div>
    </div>
  );
}
