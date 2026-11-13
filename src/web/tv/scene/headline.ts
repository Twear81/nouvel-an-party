// « La Une du 1er janvier » : le titre du journal est écrit par le code à partir du souvenir de Culture gênante.
import type { Keepsake } from "../../../shared/ceremony";

export interface Headline {
  /** Gros titre, en capitales à l'impression. */
  title: string;
  /** Chapeau : le mauvais avis le plus partagé. */
  sub: string;
  /** La question posée, en légende de la photo. */
  caption: string;
}

type PostIt = Extract<Keepsake, { kind: "post-it" }>;

/** `detail` a la forme « réponse — 5/7 réponses » (voir le jeu) ; sinon on garde le texte tel quel. */
export function journalHeadline(keepsake: PostIt): Headline {
  const match = /^(.*?)\s+[—-]\s+(\d+)\s*\/\s*(\d+)\s+réponses?$/u.exec(keepsake.detail ?? "");
  if (!match) return { title: keepsake.detail ? `INCROYABLE : ${keepsake.detail}` : "INCROYABLE : personne n'a vu venir la bonne réponse", sub: "", caption: keepsake.text };
  const [, choice, wrong, total] = match;
  return {
    title: `INCROYABLE : ${wrong} invité${Number(wrong) > 1 ? "s" : ""} sur ${total} pensaient que…`,
    sub: `« ${choice} »`,
    caption: keepsake.text,
  };
}
