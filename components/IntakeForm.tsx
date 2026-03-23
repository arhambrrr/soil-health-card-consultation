"use client";

import { useState, useRef, useCallback } from "react";
import type { Translations, LangKey, LangOption } from "@/lib/i18n";

const CROPS_BY_STATE: Record<string, string[]> = {
  Bihar:                ["Paddy", "Wheat", "Maize", "Mustard", "Pulses", "Potato"],
  "Uttar Pradesh":      ["Paddy", "Wheat", "Maize", "Mustard", "Pulses", "Potato"],
  Karnataka:            ["Paddy", "Ragi", "Jowar", "Cotton", "Groundnut", "Sunflower"],
  "Andhra Pradesh":     ["Paddy", "Cotton", "Maize", "Chilli", "Groundnut"],
  Telangana:            ["Paddy", "Cotton", "Maize", "Chilli", "Groundnut"],
  Maharashtra:          ["Cotton", "Soybean", "Jowar", "Tur", "Wheat"],
  "Tamil Nadu":         ["Paddy", "Sugarcane", "Groundnut", "Maize", "Banana"],
  Punjab:               ["Wheat", "Paddy", "Maize", "Cotton", "Mustard"],
  Haryana:              ["Wheat", "Paddy", "Maize", "Cotton", "Mustard"],
  "Himachal Pradesh":   ["Wheat", "Maize", "Paddy", "Barley", "Pulses", "Potato"],
};

const STATES = Object.keys(CROPS_BY_STATE);

interface Props {
  langKey: LangKey;
  langOption: LangOption;
  t: Translations;
  onSubmit: (data: FormData) => void;
  onChangeLanguage: () => void;
  loading: boolean;
}

export default function IntakeForm({ langKey: _langKey, langOption, t, onSubmit, onChangeLanguage, loading }: Props) {
  const [fertilizerType, setFertilizerType] = useState<"DAP" | "SSP">("DAP");
  const [state, setState]     = useState("");
  const [crop, setCrop]       = useState("");
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [preview, setPreview]           = useState<string>("");
  const [qualityWarning, setQualityWarning] = useState<string>("");
  const [loadingDemo, setLoadingDemo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const crops = state ? CROPS_BY_STATE[state] ?? [] : [];
  const formComplete = fertilizerType && state && crop && imageFile;

  const checkImageQuality = useCallback((file: File, tooDark: string, overexposed: string): Promise<string> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width  = Math.min(img.width,  200);
        canvas.height = Math.min(img.height, 200);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) total += (data[i] + data[i+1] + data[i+2]) / 3;
        const avg = total / (data.length / 4);
        URL.revokeObjectURL(url);
        if (avg < 40) resolve(tooDark);
        else if (avg > 230) resolve(overexposed);
        else resolve("");
      };
      img.src = url;
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    const warning = await checkImageQuality(file, t.imageTooDark, t.imageOverexposed);
    setQualityWarning(warning);
  }, [checkImageQuality, t]);

  // Compress image for faster upload: resize to max 1200px, convert to JPEG 85%
  const compressImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve) => {
      // Skip compression for small files (<200KB)
      if (file.size < 200 * 1024) { resolve(file); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const ratio = Math.min(MAX / w, MAX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
              console.log(`[compress] ${(file.size/1024).toFixed(0)}KB → ${(compressed.size/1024).toFixed(0)}KB`);
              resolve(compressed);
            } else {
              resolve(file); // Original was already smaller
            }
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }, [handleFile]);

  const loadDemoImage = useCallback(async () => {
    setLoadingDemo(true);
    try {
      // Auto-fill form fields to match the demo card (Kullu, Himachal Pradesh)
      setFertilizerType("DAP");
      setState("Himachal Pradesh");
      setCrop("Wheat");
      const res = await fetch("/demo-shc.png");
      const blob = await res.blob();
      const file = new File([blob], "demo-shc.png", { type: "image/png" });
      await handleFile(file);
    } catch {
      console.error("Failed to load demo image");
    } finally {
      setLoadingDemo(false);
    }
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplete || !imageFile) return;
    // Compress image before upload to speed up the extract pipeline
    const compressed = await compressImage(imageFile);
    const fd = new FormData();
    fd.append("image", compressed);
    fd.append("language_code", langOption.code);
    fd.append("dialect", langOption.dialect);
    fd.append("fertilizer_type", fertilizerType);
    fd.append("crop", crop);
    fd.append("state", state);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selected language chip with change button */}
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-50 border border-neutral-200">
        <span className="text-sm font-medium text-neutral-900">{langOption.native}</span>
        <button
          type="button"
          onClick={onChangeLanguage}
          className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-2"
        >
          Change
        </button>
      </div>

      {/* Fertilizer type */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {t.fertilizerTypeLabel}
        </label>
        <div className="flex gap-3">
          {(["DAP", "SSP"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFertilizerType(f)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                fertilizerType === f
                  ? "bg-green-800 border-green-800 text-white"
                  : "border-neutral-300 text-neutral-700 hover:border-neutral-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* State */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t.stateLabel}</label>
        <select
          value={state}
          onChange={(e) => { setState(e.target.value); setCrop(""); }}
          required
          className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
        >
          <option value="">{t.selectState}</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Crop */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t.cropLabel}</label>
        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          required
          disabled={!state}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-400"
        >
          <option value="">{state ? t.selectCrop : t.selectStateFirst}</option>
          {crops.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {t.photoLabel}
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !imageFile && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl transition-all ${
            imageFile ? "border-neutral-900" : "border-neutral-300 bg-white hover:border-neutral-900 cursor-pointer"
          }`}
        >
          {imageFile && preview ? (
            <div className="flex items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Card preview" className="h-24 w-24 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{imageFile.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{(imageFile.size / 1024).toFixed(0)} KB</p>
                {qualityWarning && (
                  <p className="text-xs text-amber-700 mt-1.5 font-medium">⚠️ {qualityWarning}</p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setImageFile(null); setPreview(""); setQualityWarning(""); }}
                className="text-neutral-400 hover:text-neutral-900 text-xl leading-none"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm text-neutral-600">{t.photoUploadHint}</p>
              <p className="text-xs text-neutral-400 mt-1">{t.photoFormats}</p>

              {/* Demo card — prominent button inside the upload zone */}
              <div className="mt-4 pt-4 border-t border-dashed border-neutral-300">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); loadDemoImage(); }}
                  disabled={loadingDemo}
                  className="w-full py-3 px-4 rounded-lg border-2 border-green-700 bg-green-50 text-green-800 font-semibold text-sm hover:bg-green-100 hover:border-green-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {loadingDemo ? "Loading demo..." : `🌾 ${t.tryDemoCard}`}
                </button>
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      <button
        type="submit"
        disabled={!formComplete || loading}
        className="w-full py-3.5 bg-green-800 text-white rounded-xl font-semibold text-base disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed hover:bg-green-900 transition-colors"
      >
        {t.startConsultation}
      </button>
    </form>
  );
}
