type Props = {
  children: React.ReactNode;
};

export function HeaderInnerContainer({ children }: Props) {
  return (
    <div className="mx-auto hidden h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-6 md:grid lg:px-8">
      {children}
    </div>
  );
}
