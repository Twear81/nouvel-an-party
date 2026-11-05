// Création / modification du profil : pseudo, avatar (préréglage ou photo), cadre, couleur, avec aperçu en direct.
import { useRef, useState } from "react";
import { NAME_MAX } from "../../shared/schemas";
import type { Profile } from "../../shared/types";
import type { GameActions } from "../net/useGame";
import { AVATARS, COLORS, FRAMES, randomDefaults } from "../theme/profile-options";
import { Button, PlayerAvatar } from "../ui";
import { CameraCapture } from "./CameraCapture";

interface Props {
  initial: Profile | null;
  actions: GameActions;
  onDone: () => void;
  onCancel?: () => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-4 text-sm font-bold uppercase tracking-widest text-ink-muted">{children}</h3>
);

export function ProfileEditor({ initial, actions, onDone, onCancel }: Props) {
  const defaults = useRef(randomDefaults()).current;
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState<Profile["avatar"]>(initial?.avatar ?? { kind: "preset", id: defaults.avatarId });
  const [frame, setFrame] = useState(initial?.frame ?? defaults.frame);
  const [color, setColor] = useState(initial?.color ?? defaults.color);
  const [camera, setCamera] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const profile: Profile = { name: name.trim(), avatar, frame, color };
  // Pendant l'envoi, la photo a juste une URL locale d'aperçu.
  const previewProfile: Profile = photoPreview && avatar.kind === "photo" ? { ...profile, avatar: { kind: "photo", url: photoPreview } } : profile;

  const onPhoto = async (data: ArrayBuffer, preview: string) => {
    setBusy(true);
    try {
      const url = await actions.uploadPhoto(data);
      setAvatar({ kind: "photo", url });
      setPhotoPreview(preview);
      setCamera(false);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setCamera(false);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!profile.name) return setError("Choisis un pseudo");
    setBusy(true);
    try {
      await actions.setProfile(profile);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (camera) return <CameraCapture onPhoto={onPhoto} onClose={() => setCamera(false)} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-4 pb-2">
        <PlayerAvatar profile={previewProfile} size="lg" />
        <div className="min-w-0 flex-1">
          <label htmlFor="pseudo" className="text-sm font-bold uppercase tracking-widest text-ink-muted">
            {initial ? "Ton profil" : "Crée ton profil"}
          </label>
          <input
            id="pseudo"
            data-testid="profile-name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton pseudo"
            autoComplete="off"
            className="mt-1 w-full rounded-btn border border-line bg-surface-strong px-4 py-3 text-xl font-bold text-ink outline-none placeholder:text-ink-muted/60 focus:border-accent"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
        <SectionTitle>Avatar</SectionTitle>
        <div className="grid grid-cols-5 gap-2">
          <button
            data-testid="take-photo"
            onClick={() => setCamera(true)}
            className={`flex aspect-square flex-col items-center justify-center rounded-full border-2 border-dashed text-2xl ${avatar.kind === "photo" ? "border-accent bg-accent/20" : "border-line bg-surface"}`}
            aria-label="Prendre une photo"
          >
            📸
            <span className="text-[0.6rem] font-bold leading-none text-ink-muted">PHOTO</span>
          </button>
          {AVATARS.map((a) => {
            const selected = avatar.kind === "preset" && avatar.id === a.id;
            return (
              <button
                key={a.id}
                data-testid="avatar-option"
                aria-label={a.label}
                aria-pressed={selected}
                onClick={() => setAvatar({ kind: "preset", id: a.id })}
                className={`flex aspect-square items-center justify-center rounded-full border-2 text-3xl transition-transform ${selected ? "scale-110 border-accent bg-accent/25" : "border-transparent bg-surface"}`}
              >
                {a.emoji}
              </button>
            );
          })}
        </div>

        <SectionTitle>Cadre</SectionTitle>
        <div className="grid grid-cols-6 gap-2">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              data-testid="frame-option"
              aria-label={f.label}
              aria-pressed={frame === f.id}
              onClick={() => setFrame(f.id)}
              className={`flex flex-col items-center gap-1 rounded-btn p-1 ${frame === f.id ? "bg-accent/25 ring-2 ring-accent" : "bg-surface"}`}
            >
              <PlayerAvatar profile={{ ...profile, avatar: { kind: "preset", id: "fete" }, frame: f.id }} size="sm" />
              <span className="text-[0.6rem] font-bold text-ink-muted">{f.label}</span>
            </button>
          ))}
        </div>

        <SectionTitle>Couleur</SectionTitle>
        <div className="grid grid-cols-6 gap-3 px-1">
          {COLORS.map((c) => (
            <button
              key={c}
              data-testid="color-option"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`aspect-square rounded-full border-4 ${color === c ? "scale-110 border-ink" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 space-y-2 pt-2">
        {error && <p className="text-center text-sm font-semibold text-bad">{error}</p>}
        <Button data-testid="profile-submit" size="md" block disabled={busy || !name.trim()} onClick={submit}>
          {initial ? "Enregistrer" : "C'est parti !"}
        </Button>
        {onCancel && (
          <Button variant="ghost" size="sm" block className="!py-1" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
