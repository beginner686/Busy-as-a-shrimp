import { Suspense } from "react";

import { MatchListFeature } from "@/features/match-list/match-list-feature";
import { MatchListSkeletonGrid } from "@/features/match-list/match-list-skeleton";

export default function MatchListPage() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_center,_#111827_0%,_#030712_100%)] p-6 text-zinc-50">
      {/* 极客氛围装饰层 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.05]" />
        <div className="absolute left-1/2 top-[-10%] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute -right-24 bottom-[-10%] h-[350px] w-[500px] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-6">
        <Suspense fallback={<MatchListSkeletonGrid count={4} />}>
          <MatchListFeature />
        </Suspense>
      </div>
    </section>
  );
}
