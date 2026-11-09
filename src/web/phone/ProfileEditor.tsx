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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && profile.name) void submit();
      }}
      // Tout défile (même l'en-tête) pour que le bouton, collé en bas, reste visible sur les très petits écrans.
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
    >
      <div data-testid="profile-preview" className="flex shrink-0 items-center gap-4 pb-2 pt-1">
        <PlayerAvatar profile={previewProfile} size="md" />
        <div className="min-w-0 flex-1">
          <label htmlFor="pseudo" className="text-sm font-bold uppercase tracking-widest text-ink-muted">
            {initial ? "Ton profil" : "Crée ton profil"}
          </label>
          <input
            data-ui="text-field"
            id="pseudo"
            data-testid="profile-name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton pseudo"
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="mt-1 w-full rounded-btn border-2 border-line bg-surface-strong px-4 py-2.5 text-xl font-bold text-ink outline-none placeholder:text-ink-muted/60 focus:border-accent"
          />
        </div>
      </div>

      <div className="px-1.5 pb-6">
        <SectionTitle>Avatar</SectionTitle>
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            data-testid="take-photo"
            data-ui="avatar-option"
            data-selected={avatar.kind === "photo"}
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
                type="button"
                key={a.id}
                data-testid="avatar-option"
                data-ui="avatar-option"
                data-selected={selected}
                aria-label={a.label}
                aria-pressed={selected}
                onClick={() => setAvatar({ kind: "preset", id: a.id })}
                className={`flex aspect-square items-center justify-center rounded-full border-2 text-3xl transition-transform ${selected ? "scale-110 border-accent bg-accent/25" : "border-transparent bg-surface"}`}
              >
                <PlayerAvatar profile={{ ...profile, avatar: { kind: "preset", id: a.id }, frame: "none" }} size="sm" />
              </button>
            );
          })}
        </div>

        <SectionTitle>Cadre</SectionTitle>
        <div data-testid="profile-frames" className="grid grid-cols-3 gap-3">
          {FRAMES.map((f) => (
            <button
              type="button"
              key={f.id}
              data-testid="frame-option"
              data-ui="frame-option"
              data-selected={frame === f.id}
              aria-label={f.label}
              aria-pressed={frame === f.id}
              onClick={() => setFrame(f.id)}
              className={`flex flex-col items-center gap-1 rounded-btn p-1 ${frame === f.id ? "bg-accent/25 ring-2 ring-accent" : "bg-surface"}`}
            >
              <PlayerAvatar profile={{ ...previewProfile, frame: f.id }} size="sm" />
              <span className="text-xs font-bold text-ink-muted">{f.label}</span>
            </button>
          ))}
        </div>

        <SectionTitle>Couleur</SectionTitle>
        <div className="grid grid-cols-6 gap-3 px-1">
          {COLORS.map((c) => (
            <button
              type="button"
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

      {/* Toujours visible : collé en bas de la zone qui défile. */}
      <div className="sticky bottom-0 -mx-1 mt-auto space-y-1 bg-gradient-to-t from-bg from-70% to-transparent px-1 pb-2 pt-5">
        {error && <p className="text-center text-sm font-semibold text-bad">{error}</p>}
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" className="min-w-0 flex-1 !px-2 !text-base" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" data-testid="profile-submit" size="md" className="min-w-0 flex-1 !px-2 !text-base" disabled={busy || !name.trim()}>
            {!name.trim() ? "Choisis un pseudo" : initial ? "Enregistrer" : "C'est parti !"}
          </Button>
        </div>
      </div>
    </form>
  );
}
