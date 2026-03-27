import { Suspense } from "react";

import { MatchListFeature } from "@/features/match-list/match-list-feature";
import { MatchListSkeletonGrid } from "@/features/match-list/match-list-skeleton";

export default function MatchListPage() {
  return (
    <section className="space-y-4">
      <Suspense fallback={<MatchListSkeletonGrid count={4} />}>
        <MatchListFeature />
      </Suspense>
    </section>
  );
}
