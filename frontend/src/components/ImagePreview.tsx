interface ImagePreviewProps {
  url: string;
  name: string;
}

export default function ImagePreview({ url, name }: ImagePreviewProps) {
  return (
    <figure className="self-start overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <img src={url} alt={`Uploaded photo: ${name}`} className="mx-auto max-h-80 w-full object-contain" />
      <figcaption className="truncate border-t border-stone-100 px-4 py-2 text-xs text-stone-500">{name}</figcaption>
    </figure>
  );
}
