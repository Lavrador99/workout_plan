/** Longest side kept for a logo: plenty for a printed header. */
export const LOGO_MAX = 400;

const load = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não deu para ler a imagem."));
    };
    img.src = url;
  });

/** The image reduced to fit `max`, as a data URL: PNG when it has transparency, JPEG otherwise. */
export async function reduceImage(file: File, max = LOGO_MAX): Promise<string> {
  const img = await load(file);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não deu para ler a imagem.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let transparent = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      transparent = true;
      break;
    }
  }
  return transparent ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
}
