import { cn } from "~/lib/utils";

export function H1(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      {...props}
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight",
        props.className,
      )}
    />
  );
}

export function H2(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      {...props}
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        props.className,
      )}
    />
  );
}

export function H3(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      {...props}
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        props.className,
      )}
    />
  );
}

export function P(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn("leading-7", props.className)} />;
}

export function Lead(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("text-lg font-semibold", props.className)} />
  );
}

export function Small(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <small
      {...props}
      className={cn(
        "text-muted-foreground text-sm leading-none font-medium",
        props.className,
      )}
    />
  );
}

export function List(props: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      {...props}
      className={cn("my-6 ml-6 list-disc [&>li]:mt-2", props.className)}
    />
  );
}

export const Typography = {
  H1,
  H2,
  H3,
  P,
  Lead,
  Small,
  List,
};
