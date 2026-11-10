import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createPredictor } from "../services/predictor";
import { validateFile } from "../services/preprocess";
import type { Prediction } from "../types/prediction";

export type PredictionStatus = "idle" | "loading-model" | "predicting" | "done" | "error";

export interface PredictionState {
  status: PredictionStatus;
  file: File | null;
  previewUrl: string | null;
  prediction: Prediction | null;
  error: string | null;
  downloadProgress: { loaded: number; total: number | null } | null;
}

const initialState: PredictionState = {
  status: "idle",
  file: null,
  previewUrl: null,
  prediction: null,
  error: null,
  downloadProgress: null,
};

/** Owns the selected file, its preview URL, and the request lifecycle. */
export function usePrediction() {
  const predictor = useMemo(createPredictor, []);
  const [state, setState] = useState<PredictionState>(initialState);
  const requestId = useRef(0);

  useEffect(() => {
    const url = state.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.previewUrl]);

  const selectFile = useCallback(
    async (file: File) => {
      const problem = validateFile(file);
      if (problem) {
        setState({ ...initialState, status: "error", error: problem });
        return;
      }
      const id = ++requestId.current;
      setState({
        ...initialState,
        status: predictor.source === "browser" ? "loading-model" : "predicting",
        file,
        previewUrl: URL.createObjectURL(file),
      });
      try {
        const prediction = await predictor.predict(file, (loaded, total) => {
          if (id !== requestId.current) return;
          setState((s) => ({
            ...s,
            downloadProgress: { loaded, total },
            status: total !== null && loaded >= total ? "predicting" : "loading-model",
          }));
        });
        if (id !== requestId.current) return;
        setState((s) => ({ ...s, status: "done", prediction }));
      } catch (error) {
        if (id !== requestId.current) return;
        const message = error instanceof Error ? error.message : "Something went wrong.";
        setState((s) => ({ ...s, status: "error", error: message }));
      }
    },
    [predictor],
  );

  const reset = useCallback(() => {
    requestId.current++;
    setState(initialState);
  }, []);

  return { ...state, source: predictor.source, selectFile, reset };
}
