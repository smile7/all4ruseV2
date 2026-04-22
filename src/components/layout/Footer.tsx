export function Footer() {
  return (
    <footer className="border-border bg-background border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-muted-foreground text-center text-sm">
          © {new Date().getFullYear()} All4Ruse
        </p>
      </div>
    </footer>
  );
}
