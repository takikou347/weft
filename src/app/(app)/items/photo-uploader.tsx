"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerPhotoItem } from "./photo-actions";

const MAX_EDGE = 1600; // 長辺の上限(§8.2: クライアント側で圧縮・リサイズ)
const JPEG_QUALITY = 0.82;
const MAX_FILE_MB = 10;

// 画像を canvas で縮小して JPEG 化する
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("compress failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export function PhotoUploader({
  userId,
  date,
  linkTo,
}: {
  userId: string;
  date: string;
  linkTo?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`写真は${MAX_FILE_MB}MBまでにしてください。`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const blob = await compressImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const result = await registerPhotoItem({
        path,
        date,
        title: file.name.replace(/\.[^.]+$/, ""),
        linkTo,
      });
      if (result?.error) throw new Error(result.error);
    } catch (err) {
      console.error(err);
      setError("アップロードできませんでした。時間をおいてお試しください。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="inline-block cursor-pointer rounded-md border border-keisen bg-paper px-3 py-2 text-sm hover:border-ai">
        {busy ? "アップロードしています…" : "写真を追加する"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={busy}
          className="sr-only"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-ai-deep">
          {error}
        </p>
      )}
    </div>
  );
}
