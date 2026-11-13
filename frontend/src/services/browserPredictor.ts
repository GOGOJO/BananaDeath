import type { InferenceSession } from "onnxruntime-web/wasm";

import type { ModelMetadata, Prediction, Predictor, ProgressCallback } from "../types/prediction";
import { fileToTensor } from "./preprocess";

const MODEL_DIR = `${import.meta.env.BASE_URL}model/`;

async function downloadWithProgress(url: string, onProgress?: ProgressCallback): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the model (HTTP ${response.status}).`);
  }
  const header = response.headers.get("Content-Length");
  const total = header ? Number(header) : null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/** Runs the ONNX export of the model locally with ONNX Runtime Web; the photo never leaves the device. */
export class BrowserPredictor implements Predictor {
  readonly source = "browser" as const;
  private loading: Promise<{ session: InferenceSession; meta: ModelMetadata }> | null = null;
  private listeners = new Set<ProgressCallback>();

  private load(onProgress?: ProgressCallback) {
    if (onProgress) this.listeners.add(onProgress);
    this.loading ??= (async () => {
      const ort = await import("onnxruntime-web/wasm");
      const metaResponse = await fetch(`${MODEL_DIR}metadata.json`);
      if (!metaResponse.ok) throw new Error("Could not load the model description.");
      const meta = (await metaResponse.json()) as ModelMetadata;
      const bytes = await downloadWithProgress(`${MODEL_DIR}bananadeath.onnx`, (loaded, total) => {
        for (const listener of this.listeners) listener(loaded, total);
      });
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
      return { session, meta };
    })();
    const loading = this.loading;
    const settle = () => {
      if (onProgress) this.listeners.delete(onProgress);
    };
    loading.then(settle, () => {
      settle();
      if (this.loading === loading) this.loading = null;
    });
    return loading;
  }

  async preload(onProgress?: ProgressCallback): Promise<void> {
    await this.load(onProgress);
  }

  async predict(file: File, onProgress?: ProgressCallback): Promise<Prediction> {
    const { session, meta } = await this.load(onProgress);
    const ort = await import("onnxruntime-web/wasm");
    const input = await fileToTensor(file, meta);
    const size = meta.image_size;
    const outputs = await session.run({ [meta.input_name]: new ort.Tensor("float32", input, [1, 3, size, size]) });
    const raw = (outputs[meta.output_name].data as Float32Array)[0];
    const daysLeft = Math.min(Math.max(raw, meta.range.min), meta.range.max);
    return {
      daysLeft,
      daysLeftRounded: Math.round(daysLeft),
      range: meta.range,
      modelVersion: meta.model_version,
      source: this.source,
    };
  }
}
