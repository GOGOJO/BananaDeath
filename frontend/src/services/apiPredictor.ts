import type { Prediction, Predictor } from "../types/prediction";

interface ApiPrediction {
  days_left: number;
  days_left_rounded: number;
  range: { min: number; max: number };
  model_version: string;
}

/** Sends the photo to the FastAPI backend's `POST /api/v1/predictions`. */
export class ApiPredictor implements Predictor {
  readonly source = "api" as const;

  constructor(private readonly baseUrl: string) {}

  async predict(file: File): Promise<Prediction> {
    const body = new FormData();
    body.append("file", file);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/v1/predictions`, { method: "POST", body });
    } catch {
      throw new Error("Could not reach the prediction server. Is the backend running?");
    }
    if (!response.ok) {
      const detail = await response
        .json()
        .then((json: { detail?: unknown }) => (typeof json.detail === "string" ? json.detail : null))
        .catch(() => null);
      throw new Error(detail ?? `The server returned an error (HTTP ${response.status}).`);
    }
    const data = (await response.json()) as ApiPrediction;
    return {
      daysLeft: data.days_left,
      daysLeftRounded: data.days_left_rounded,
      range: data.range,
      modelVersion: data.model_version,
      source: this.source,
    };
  }
}
