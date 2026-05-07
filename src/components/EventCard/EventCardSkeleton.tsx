import { Skeleton } from "~/components/ui/skeleton";

export function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border">
      {/* Image placeholder */}
      <Skeleton className="aspect-4/3 w-full rounded-none" />

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        {/* Date badge row */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />

        {/* Tags */}
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Location */}
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function EventsGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
