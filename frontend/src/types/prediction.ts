export type InferenceSource = "browser" | "api";

export interface Prediction {
  daysLeft: number;
  daysLeftRounded: number;
  range: { min: number; max: number };
  modelVersion: string;
  source: InferenceSource;
}

export interface ModelMetadata {
  model_version: string;
  input_name: string;
  output_name: string;
  image_size: number;
  normalize_mean: [number, number, number];
  normalize_std: [number, number, number];
  pad_fill_rgb: [number, number, number];
  range: { min: number; max: number };
}

/** Called while the in-browser model downloads; `total` is null when the server omits Content-Length. */
export type ProgressCallback = (loaded: number, total: number | null) => void;

export interface Predictor {
  readonly source: InferenceSource;
  predict(file: File, onProgress?: ProgressCallback): Promise<Prediction>;
  /** Start fetching the model ahead of the first prediction, if this predictor needs one. */
  preload?(onProgress?: ProgressCallback): Promise<void>;
}
