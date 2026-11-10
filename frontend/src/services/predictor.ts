import type { Predictor } from "../types/prediction";
import { ApiPredictor } from "./apiPredictor";
import { BrowserPredictor } from "./browserPredictor";

/** `VITE_INFERENCE_MODE=api` uses the FastAPI backend; anything else runs the model in the browser. */
export function createPredictor(): Predictor {
  if (import.meta.env.VITE_INFERENCE_MODE === "api") {
    return new ApiPredictor(import.meta.env.VITE_API_URL ?? "http://localhost:8000");
  }
  return new BrowserPredictor();
}
