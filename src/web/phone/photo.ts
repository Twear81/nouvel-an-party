// Photo de profil : recadrage carré centré en 512 px, encodage webp (jpeg si le navigateur ne sait pas, ex : iOS Safari).
const SIZE = 512;

export function cropToSquare(source: CanvasImageSource, w: number, h: number, mirror = false): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const side = Math.min(w, h);
  if (mirror) {
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

export async function encodeCanvas(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  let blob = await toBlob(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob) throw new Error("Impossible d'encoder la photo");
  return blob.arrayBuffer();
}

/** Fichier choisi dans la galerie / appareil photo natif → canvas carré. */
export async function fileToSquare(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return cropToSquare(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
