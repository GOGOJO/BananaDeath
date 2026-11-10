interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div role="alert" className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
      <p className="text-sm">{message}</p>
      <button type="button" onClick={onRetry} className="shrink-0 text-sm font-semibold underline underline-offset-2">
        Try another photo
      </button>
    </div>
  );
}
