import { Platform } from "react-native";

export interface ExtractedPalette {
  dominant: string;
  vibrant?: string;
  muted?: string;
  lightVibrant?: string;
  darkMuted?: string;
}

/**
 * Extrai uma paleta básica a partir de uma imagem.
 * Implementação simples para web; em nativo retorna null sem quebrar a UI.
 */
export async function extractPaletteFromImage(url: string): Promise<ExtractedPalette | null> {
  if (Platform.OS !== "web") {
    console.warn("[ImagePalette] Extração automática disponível apenas no Web por enquanto.");
    return null;
  }

  try {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.src = url;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
    });

    const canvas = document.createElement("canvas");
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;

    let r = 0;
    let g = 0;
    let b = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    const avg = (r: number, g: number, b: number) =>
      `#${[r, g, b]
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("")}`;

    const dominant = avg(r / total, g / total, b / total);

    return {
      dominant,
      vibrant: dominant,
      muted: dominant,
      lightVibrant: dominant,
      darkMuted: dominant,
    };
  } catch (err) {
    console.warn("[ImagePalette] Falha ao extrair paleta", err);
    return null;
  }
}
