import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MatchSkeletonCard() {
  return (
    <Card className="border-white/10 bg-zinc-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-28" />
      </CardFooter>
    </Card>
  );
}

export function MatchListSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <MatchSkeletonCard key={`match-list-skeleton-${index}`} />
      ))}
    </div>
  );
}
