import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createPredictor } from "../services/predictor";
import { validateFile } from "../services/preprocess";
import type { Prediction } from "../types/prediction";

export type CheckupStatus = "empty" | "selected" | "analyzing" | "done" | "error";
export type ModelStatus = "loading" | "ready" | "error";

export interface ModelState {
  status: ModelStatus;
  progress: { loaded: number; total: number | null } | null;
}

interface CheckupState {
  status: CheckupStatus;
  file: File | null;
  previewUrl: string | null;
  prediction: Prediction | null;
  error: string | null;
}

const emptyCheckup: CheckupState = { status: "empty", file: null, previewUrl: null, prediction: null, error: null };

/**
 * Owns the selected photo, the analysis request, and the model download.
 * The in-browser model starts downloading on mount so it is usually ready by the time a photo is chosen.
 */
export function usePrediction() {
  const predictor = useMemo(createPredictor, []);
  const [checkup, setCheckup] = useState<CheckupState>(emptyCheckup);
  const [model, setModel] = useState<ModelState>({ status: predictor.preload ? "loading" : "ready", progress: null });
  const requestId = useRef(0);

  const onProgress = useCallback((loaded: number, total: number | null) => {
    setModel((m) => (m.status === "ready" ? m : { status: "loading", progress: { loaded, total } }));
  }, []);

  useEffect(() => {
    if (!predictor.preload) return;
    let active = true;
    predictor.preload(onProgress).then(
      () => active && setModel({ status: "ready", progress: null }),
      () => active && setModel((m) => ({ ...m, status: "error" })),
    );
    return () => {
      active = false;
    };
  }, [predictor, onProgress]);

  useEffect(() => {
    const url = checkup.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [checkup.previewUrl]);

  const selectFile = useCallback((file: File) => {
    requestId.current++;
    const problem = validateFile(file);
    if (problem) {
      setCheckup({ ...emptyCheckup, status: "error", error: problem });
      return;
    }
    setCheckup({ ...emptyCheckup, status: "selected", file, previewUrl: URL.createObjectURL(file) });
  }, []);

  const analyze = useCallback(async () => {
    const file = checkup.file;
    if (!file) return;
    const id = ++requestId.current;
    setCheckup((c) => ({ ...c, status: "analyzing", error: null }));
    if (predictor.preload) setModel((m) => (m.status === "error" ? { status: "loading", progress: null } : m));
    try {
      const prediction = await predictor.predict(file, onProgress);
      setModel({ status: "ready", progress: null });
      if (id !== requestId.current) return;
      setCheckup((c) => ({ ...c, status: "done", prediction }));
    } catch (error) {
      if (predictor.preload) setModel((m) => (m.status === "ready" ? m : { ...m, status: "error" }));
      if (id !== requestId.current) return;
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setCheckup((c) => ({ ...c, status: "error", error: message }));
    }
  }, [checkup.file, predictor, onProgress]);

  const reset = useCallback(() => {
    requestId.current++;
    setCheckup(emptyCheckup);
  }, []);

  return { ...checkup, model, source: predictor.source, selectFile, analyze, reset };
}
