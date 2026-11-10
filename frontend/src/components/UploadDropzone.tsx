import { useRef, useState, type DragEvent } from "react";

import { ACCEPTED_TYPES } from "../services/preprocess";

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function UploadDropzone({ onFile, disabled = false }: UploadDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => input.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-60 ${
        dragging ? "border-yellow-500 bg-yellow-50" : "border-stone-300 bg-white hover:border-yellow-400 hover:bg-yellow-50/50"
      }`}
    >
      <span className="text-5xl" aria-hidden>
        🍌
      </span>
      <span className="text-lg font-semibold text-stone-800">Drop a banana photo here</span>
      <span className="text-sm text-stone-500">or click to choose a file. JPEG, PNG, or WebP, up to 10 MB.</span>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </button>
  );
}
