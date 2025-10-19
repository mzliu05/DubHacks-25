// MicRecorder.tsx
import { useEffect, useRef } from "react";
import { MicRecorderUI } from "./MicRecorderUI";

type Props = {
  preferDemo?: boolean;
  onStop?: (blob: Blob, url: string, ext: string) => void;
};

export default function MicRecorder({ preferDemo, onStop }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const ui = new MicRecorderUI({
      mount: mountRef.current,
      preferDemo: !!preferDemo,
    });

    // OPTIONAL: hook into stop event (see tiny patch below)
    (ui as any).__onStop = onStop;

    ui.init();
    return () => ui.destroy();
  }, [preferDemo, onStop]);

  return <div ref={mountRef} />;
}
