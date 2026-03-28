import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MatchSkeletonCard() {
  return (
    <Card className="relative overflow-hidden rounded-[2rem] border-white/[0.05] bg-white/[0.02] shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/[0.02] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300 before:to-transparent before:opacity-20">
      <CardHeader className="space-y-4 p-6 pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 bg-white/5" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
        </div>
        <Skeleton className="h-4 w-48 bg-white/5" />
      </CardHeader>
      <CardContent className="space-y-6 p-6 pt-0">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 bg-white/5" />
          <div className="h-2.5 w-full rounded-full bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-16 bg-white/5" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-14 rounded-lg bg-white/5" />
              <Skeleton className="h-6 w-14 rounded-lg bg-white/5" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-16 bg-white/5" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-14 rounded-lg bg-white/5" />
              <Skeleton className="h-6 w-14 rounded-lg bg-white/5" />
            </div>
          </div>
        </div>
        <div className="h-20 w-full rounded-2xl bg-black/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] border border-white/[0.02]" />
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Skeleton className="h-12 w-36 rounded-xl bg-white/5" />
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
