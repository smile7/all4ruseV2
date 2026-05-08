import type { ReactNode } from "react";

type LegalLayoutProps = {
  children: ReactNode;
};

export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="bg-background pb-24 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-14 md:px-6 md:pt-14 md:pb-20">
        {children}
      </div>
    </div>
  );
}
