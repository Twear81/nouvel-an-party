// Aperçu caméra frontale en cercle + bouton de capture. Se replie sur un <input capture> si la caméra est indisponible.
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import { cropToSquare, encodeCanvas, fileToSquare } from "./photo";

interface Props {
  onPhoto: (data: ArrayBuffer, previewUrl: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onPhoto, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return fallback();
      try {
        // Contraintes "idéales" (jamais "exact") : Firefox Android et Safari refusent sinon quand la caméra n'a pas de facingMode.
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
        } catch (e) {
          if ((e as Error).name === "NotAllowedError" || (e as Error).name === "SecurityError") throw e;
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        // iOS exige muted + playsinline posés avant play() (React ne rend pas toujours l'attribut muted).
        v.muted = true;
        v.setAttribute("playsinline", "");
        v.srcObject = stream;
        await v.play().catch(() => {});
        setReady(true);
      } catch {
        fallback();
      }
    })();
    // Pas de caméra (ou refusée) : on ouvre l'appareil photo natif via un champ fichier.
    function fallback() {
      if (cancelled) return;
      setError("Caméra indisponible : utilise l'appareil photo de ton téléphone.");
      fileRef.current?.click();
    }
    const stop = () => stream?.getTracks().forEach((t) => t.stop());
    window.addEventListener("pagehide", stop);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", stop);
      stop();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const finish = async (canvas: HTMLCanvasElement) => {
    setBusy(true);
    try {
      onPhoto(await encodeCanvas(canvas), canvas.toDataURL("image/jpeg", 0.6));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    void finish(cropToSquare(v, v.videoWidth, v.videoHeight, true)); // miroir, comme l'aperçu
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await finish(await fileToSquare(file));
    } catch {
      setError("Impossible de lire cette image");
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5">
      <div className="relative aspect-square w-[min(72vw,18rem)] overflow-hidden rounded-full border-4 border-accent bg-bg-2 shadow-glow">
        <video ref={videoRef} playsInline muted autoPlay className="h-full w-full -scale-x-100 object-cover" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-ink-muted">{error ?? "Ouverture de la caméra…"}</div>}
      </div>
      {error && ready && <p className="text-sm text-warn">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={onFile} data-testid="photo-file" />
      <div className="flex w-full flex-col gap-3">
        {ready ? (
          <Button data-testid="capture-photo" size="lg" block disabled={busy} onClick={capture}>
            📸 Capturer
          </Button>
        ) : (
          error && (
            <Button size="md" block variant="secondary" onClick={() => fileRef.current?.click()}>
              Choisir / prendre une photo
            </Button>
          )
        )}
        <Button variant="ghost" size="md" block onClick={onClose}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
