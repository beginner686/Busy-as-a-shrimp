"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getAdminApi } from "@/api";
import type { AdminResource, ReviewDecision } from "@/api/admin-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getErrorMessage } from "@/utils/error-message";
import styles from "./page.module.css";

const RESOURCE_REVIEW_QUERY_KEY = ["admin", "resource-review", "pending"] as const;

function formatTags(resource: AdminResource): string {
  return resource.tags.length > 0 ? resource.tags.join(", ") : "-";
}

function describePrice(resource: AdminResource): string {
  const min = resource.priceRange?.min;
  const max = resource.priceRange?.max;

  if (!Number.isFinite(min) && !Number.isFinite(max)) {
    return "-";
  }

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `${min} - ${max}`;
  }

  if (Number.isFinite(min)) {
    return `>= ${min}`;
  }

  return `<= ${max}`;
}

function getRiskSummary(resource: AdminResource): string {
  const price = resource.priceRange;
  const hasBadPrice =
    price &&
    Number.isFinite(price.min) &&
    Number.isFinite(price.max) &&
    ((price.min ?? 0) <= 0 || (price.max ?? 0) < (price.min ?? 0));

  if (hasBadPrice) {
    return "Check price range";
  }

  if (resource.tags.some((tag) => /wechat|vx|qq|@|1\d{10}/i.test(tag))) {
    return "Check contact info";
  }

  return "No obvious risk";
}

export default function ResourceReviewPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: RESOURCE_REVIEW_QUERY_KEY,
    queryFn: async (): Promise<AdminResource[]> => {
      const items = await getAdminApi().resources();
      return items.filter((item) => item.status === "pending");
    },
    staleTime: 30_000
  });

  const reviewMutation = useMutation({
    mutationFn: ({ resourceId, decision }: { resourceId: number; decision: ReviewDecision }) =>
      getAdminApi().reviewResource(resourceId, decision),
    onSuccess: (result) => {
      setNotice(`资源 #${result.resourceId} 已更新为 ${result.status}`);
      void queryClient.invalidateQueries({ queryKey: RESOURCE_REVIEW_QUERY_KEY });
    }
  });

  const resources = resourcesQuery.data || [];

  function handleReview(resourceId: number, decision: ReviewDecision) {
    reviewMutation.mutate({
      resourceId,
      decision
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Resource Review</h1>
          <p className={styles.subtitle}>Review pending submissions from the admin queue.</p>
        </div>
        <span className={styles.pendingBadge}>Pending: {resources.length}</span>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <section className={styles.tableShell}>
        <div className={styles.tableScroll}>
          <Table className={styles.table}>
            <TableHeader className={styles.tableHeader}>
              <TableRow>
                <TableHead className={styles.headCell}>Resource</TableHead>
                <TableHead className={styles.headCell}>Owner</TableHead>
                <TableHead className={styles.headCell}>Type</TableHead>
                <TableHead className={styles.headCell}>Tags</TableHead>
                <TableHead className={styles.headCell}>Price</TableHead>
                <TableHead className={styles.headCell}>Risk</TableHead>
                <TableHead className={`${styles.headCell} ${styles.actionHead}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resourcesQuery.isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`} className={styles.row}>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonBlock} />
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonBlockSmall} />
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonBlockSmall} />
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonTags}>
                          <span className={styles.skeletonTag} />
                          <span className={styles.skeletonTag} />
                        </div>
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonBlockSmall} />
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonBlock} />
                      </TableCell>
                      <TableCell className={`${styles.cell} ${styles.actionCell}`}>
                        <div className={styles.skeletonActions}>
                          <span className={styles.skeletonAction} />
                          <span className={styles.skeletonAction} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!resourcesQuery.isLoading && resourcesQuery.isError ? (
                <TableRow className={styles.row}>
                  <TableCell colSpan={7} className={styles.emptyCell}>
                    Failed to load resources: {getErrorMessage(resourcesQuery.error)}
                  </TableCell>
                </TableRow>
              ) : null}

              {!resourcesQuery.isLoading && !resourcesQuery.isError && resources.length === 0 ? (
                <TableRow className={styles.row}>
                  <TableCell colSpan={7} className={styles.emptyCell}>
                    No pending resources to review.
                  </TableCell>
                </TableRow>
              ) : null}

              {!resourcesQuery.isLoading && !resourcesQuery.isError
                ? resources.map((resource) => (
                    <TableRow key={resource.resourceId} className={styles.row}>
                      <TableCell className={styles.cell}>#{resource.resourceId}</TableCell>
                      <TableCell className={styles.cell}>#{resource.userId}</TableCell>
                      <TableCell className={styles.cell}>{resource.resourceType}</TableCell>
                      <TableCell className={styles.cell}>{formatTags(resource)}</TableCell>
                      <TableCell className={styles.cell}>{describePrice(resource)}</TableCell>
                      <TableCell className={styles.cell}>{getRiskSummary(resource)}</TableCell>
                      <TableCell className={`${styles.cell} ${styles.actionCell}`}>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.approveButton}
                            disabled={reviewMutation.isPending}
                            onClick={() => handleReview(resource.resourceId, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className={styles.rejectButton}
                            disabled={reviewMutation.isPending}
                            onClick={() => handleReview(resource.resourceId, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
