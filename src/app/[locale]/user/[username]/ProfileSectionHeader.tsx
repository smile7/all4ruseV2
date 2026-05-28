type Props = {
  title: string;
  color: string;
  align?: "center" | "start";
  muted?: boolean;
};

export function ProfileSectionHeader({
  title,
  color,
  align = "center",
  muted = false,
}: Props) {
  const alignClass =
    align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={`mb-10 flex flex-col gap-4 sm:mb-12 ${alignClass}`}>
      <div className="relative">
        <h2
          className={`text-4xl font-black tracking-tight sm:text-5xl ${
            muted ? "text-muted-foreground/50" : ""
          }`}
        >
          {title}
        </h2>
        <div
          className="absolute -inset-x-4 -inset-y-2 -z-10 rounded-3xl opacity-0 blur-2xl transition-opacity duration-500 group-hover/section:opacity-100"
          style={{ backgroundColor: `${color}22` }}
          aria-hidden
        />
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 group-hover/section:w-36 ${
            muted ? "w-32 bg-border" : "w-24"
          }`}
          style={muted ? undefined : { backgroundColor: color }}
        />
        {!muted && (
          <div
            className="size-2 rounded-full opacity-70"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
