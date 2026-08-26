import { supabase } from "./supabase";

export const BUKTI_BUCKET = "bukti-transaksi";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, selaras dengan batas di bucket Supabase

export class FotoTerlaluBesarError extends Error {}
export class TipeFotoTidakDidukungError extends Error {}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic" || mime === "image/heif") return "heic";
  return "jpg";
}

/** Upload foto struk ke Storage, kembalikan public URL-nya. */
export async function uploadBuktiTransaksi(file: File, eventId: string): Promise<string> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new FotoTerlaluBesarError("Ukuran foto maksimal 5MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new TipeFotoTidakDidukungError("File harus berupa foto/gambar.");
  }
  const ext = extFromMime(file.type);
  const path = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUKTI_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUKTI_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort hapus foto struk dari Storage berdasarkan public URL-nya. */
export async function deleteBuktiByUrl(url: string): Promise<void> {
  try {
    const marker = `/object/public/${BUKTI_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length));
    await supabase.storage.from(BUKTI_BUCKET).remove([path]);
  } catch {
    // Best-effort — kalau gagal, foto lama cuma jadi sampah di storage, tidak fatal.
  }
}
