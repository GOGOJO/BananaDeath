import type { ReactNode } from "react";

interface ErrorBoxProps {
  message: string;
  children?: ReactNode;
}

export default function ErrorBox({ message, children }: ErrorBoxProps) {
  return (
    <div role="alert" className="bg-[#fde3d3] p-4 shadow-[0_-4px_0_0_#d9622b,0_4px_0_0_#d9622b,-4px_0_0_0_#d9622b,4px_0_0_0_#d9622b]">
      <p className="font-pixel text-[0.65rem] leading-none text-orange-dark uppercase">Oh no!</p>
      <p className="mt-3 text-ink">{message}</p>
      {children && <div className="mt-4 flex flex-wrap gap-4">{children}</div>}
    </div>
  );
}
