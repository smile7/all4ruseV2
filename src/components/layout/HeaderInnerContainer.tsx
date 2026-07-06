type Props = {
  children: React.ReactNode;
};

export function HeaderInnerContainer({ children }: Props) {
  return (
    <div className="mx-auto hidden h-16 max-w-7xl grid-cols-3 items-center px-6 md:grid lg:px-8">
      {children}
    </div>
  );
}
