import { useRef, useState, type DragEvent } from "react";

import { ACCEPTED_TYPES } from "../services/preprocess";

interface UploadSlotProps {
  onFile: (file: File) => void;
  previewUrl: string | null;
  fileName: string | null;
  disabled?: boolean;
}

/** An inventory slot that takes a photo by click or drag-and-drop and shows it once chosen. */
export default function UploadSlot({ onFile, previewUrl, fileName, disabled = false }: UploadSlotProps) {
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
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      aria-label={previewUrl ? `Selected photo ${fileName}. Choose a different photo` : "Choose a banana photo"}
      className={`px-slot group relative grid aspect-square w-full max-w-64 cursor-pointer place-items-center p-3 disabled:cursor-wait ${
        dragging ? "bg-banana/60" : "hover:bg-[#efe4c2]"
      }`}
    >
      {previewUrl ? (
        <>
          <img src={previewUrl} alt="" className="h-full w-full object-contain" />
          {!disabled && (
            <span className="absolute right-2 bottom-2 bg-paper px-2 py-1.5 font-pixel text-[0.5rem] leading-none uppercase opacity-0 shadow-[0_0_0_2px_#3b3024] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Swap
            </span>
          )}
        </>
      ) : (
        <span className="flex flex-col items-center gap-4 text-center">
          <span aria-hidden className="font-pixel text-3xl leading-none text-ink-soft group-hover:text-ink">
            +
          </span>
          <span className="font-pixel text-[0.6rem] leading-relaxed uppercase">{dragging ? "Drop it!" : "Drop photo here"}</span>
          <span className="text-sm text-ink-soft">or click to browse</span>
        </span>
      )}
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
