"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCheck, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getAdminApi } from "@/api";
import type { AdminResource, ReviewDecision } from "@/api/admin-api";
import { getErrorMessage } from "@/utils/error-message";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import styles from "./page.module.css";

type ReviewResource = AdminResource & {
  tags?: string[];
  skillTags?: string[];
  regionTags?: string[];
  skills?: string[];
  locationTags?: string[];
  notes?: string;
  account?: string;
  priceMin?: number;
  priceMax?: number;
  priceRange?: {
    min?: number;
    max?: number;
  };
};

type ReviewMutationVars = {
  operationId: string;
  decision: ReviewDecision;
  resource: ReviewResource;
};

type UndoToastState = {
  operationId: string;
  resourceId: number;
  decision: ReviewDecision;
};

type MutationContext = {
  removedResource: ReviewResource;
  removedIndex: number;
};

const RESOURCE_REVIEW_QUERY_KEY = ["admin", "resource-review", "pending"] as const;
const UNDO_ABORT_ERROR = "UNDO_ABORTED";
const UNDO_WINDOW_MS = 4000;

function normalizeTagList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeTagList(item))
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function getReviewTags(resource: ReviewResource): string[] {
  return [
    ...normalizeTagList(resource.skillTags),
    ...normalizeTagList(resource.skills),
    ...normalizeTagList(resource.regionTags),
    ...normalizeTagList(resource.locationTags),
    ...normalizeTagList(resource.tags)
  ].filter((item, index, arr) => arr.indexOf(item) === index);
}

function hasContactRisk(resource: ReviewResource): boolean {
  const text = [resource.account, resource.notes, ...getReviewTags(resource)]
    .join(" ")
    .replace(/\s+/g, "");
  return /1\d{10}|wechat|vx|微信|qq|@/i.test(text);
}

function hasPriceRisk(resource: ReviewResource): boolean {
  const min = Number(resource.priceMin ?? resource.priceRange?.min);
  const max = Number(resource.priceMax ?? resource.priceRange?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }
  return min <= 0 || max < min || max > 100000;
}

function insertBack(
  list: ReviewResource[],
  removedResource: ReviewResource,
  removedIndex: number
): ReviewResource[] {
  if (list.some((item) => item.resourceId === removedResource.resourceId)) {
    return list;
  }
  const next = [...list];
  const index = Math.max(0, Math.min(removedIndex, next.length));
  next.splice(index, 0, removedResource);
  return next;
}

function waitForUndoWindow(signal: AbortSignal, delayMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      resolve();
    }, delayMs);

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new Error(UNDO_ABORT_ERROR));
      },
      { once: true }
    );
  });
}

export default function ResourceReviewPage() {
  const queryClient = useQueryClient();
  const undoControllersRef = useRef(new Map<string, AbortController>());
  const undoToastTimerRef = useRef<number | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [notice, setNotice] = useState("");

  const resourcesQuery = useQuery({
    queryKey: RESOURCE_REVIEW_QUERY_KEY,
    queryFn: async (): Promise<ReviewResource[]> => {
      const list = await getAdminApi().resources();
      return (list as ReviewResource[]).filter((item) => item.reviewStatus === "pending");
    },
    staleTime: 30_000
  });

  const resources = resourcesQuery.data ?? [];

  function clearUndoToastTimer() {
    if (undoToastTimerRef.current) {
      window.clearTimeout(undoToastTimerRef.current);
      undoToastTimerRef.current = null;
    }
  }

  function showUndoToast(payload: UndoToastState) {
    clearUndoToastTimer();
    setUndoToast(payload);
    undoToastTimerRef.current = window.setTimeout(() => {
      setUndoToast((current) => (current?.operationId === payload.operationId ? null : current));
      undoToastTimerRef.current = null;
    }, UNDO_WINDOW_MS);
  }

  const reviewMutation = useMutation({
    mutationFn: async (variables: ReviewMutationVars) => {
      const controller = new AbortController();
      undoControllersRef.current.set(variables.operationId, controller);
      try {
        await waitForUndoWindow(controller.signal, UNDO_WINDOW_MS);
        return await getAdminApi().reviewResource(
          variables.resource.resourceId,
          variables.decision
        );
      } finally {
        undoControllersRef.current.delete(variables.operationId);
      }
    },
    onMutate: async (variables): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: RESOURCE_REVIEW_QUERY_KEY });
      const previous = queryClient.getQueryData<ReviewResource[]>(RESOURCE_REVIEW_QUERY_KEY) ?? [];
      const removedIndex = previous.findIndex(
        (item) => item.resourceId === variables.resource.resourceId
      );

      queryClient.setQueryData<ReviewResource[]>(RESOURCE_REVIEW_QUERY_KEY, (current) =>
        (current ?? []).filter((item) => item.resourceId !== variables.resource.resourceId)
      );

      showUndoToast({
        operationId: variables.operationId,
        resourceId: variables.resource.resourceId,
        decision: variables.decision
      });

      return {
        removedResource: variables.resource,
        removedIndex: removedIndex >= 0 ? removedIndex : previous.length
      };
    },
    onError: (error, _variables, context) => {
      if (context) {
        queryClient.setQueryData<ReviewResource[]>(RESOURCE_REVIEW_QUERY_KEY, (current) =>
          insertBack(current ?? [], context.removedResource, context.removedIndex)
        );
      }

      if (error instanceof Error && error.message === UNDO_ABORT_ERROR) {
        return;
      }

      setNotice(`审核失败：${getErrorMessage(error)}`);
    },
    onSuccess: (result) => {
      setNotice(`资源 #${result.resourceId} 已更新为 ${result.status}`);
    },
    onSettled: (_data, error, variables) => {
      if (!(error instanceof Error && error.message === UNDO_ABORT_ERROR)) {
        void queryClient.invalidateQueries({ queryKey: RESOURCE_REVIEW_QUERY_KEY });
      }

      setUndoToast((current) => (current?.operationId === variables.operationId ? null : current));
    }
  });

  useEffect(() => {
    return () => {
      clearUndoToastTimer();
      for (const controller of undoControllersRef.current.values()) {
        controller.abort();
      }
      undoControllersRef.current.clear();
    };
  }, []);

  function handleReview(resource: ReviewResource, decision: ReviewDecision) {
    const operationId = `${resource.resourceId}-${decision}-${Date.now()}`;
    reviewMutation.mutate({
      operationId,
      resource,
      decision
    });
  }

  function handleUndo() {
    if (!undoToast) {
      return;
    }

    }
    const controller = undoControllersRef.current.get(undoToast.operationId);
    if (controller) {
      controller.abort();
    }
    setUndoToast(null);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>资源审核</h1>
          <p className={styles.subtitle}>仅展示 pending 状态资源，支持极速审批与撤销。</p>
        </div>
        <span className={styles.pendingBadge}>待审核 {resources.length}</span>
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
                <TableHead className={styles.headCell}>资源ID</TableHead>
                <TableHead className={styles.headCell}>标签概览</TableHead>
                <TableHead className={styles.headCell}>合规检查</TableHead>
                <TableHead className={styles.headCell}>状态</TableHead>
                <TableHead className={`${styles.headCell} ${styles.actionHead}`}>操作</TableHead>
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
                        <div className={styles.skeletonTags}>
                          <span className={styles.skeletonTag} />
                          <span className={styles.skeletonTag} />
                          <span className={styles.skeletonTag} />
                        </div>
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonBlock} />
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div className={styles.skeletonBlockSmall} />
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
                  <TableCell colSpan={5} className={styles.emptyCell}>
                    加载失败：{getErrorMessage(resourcesQuery.error)}
                  </TableCell>
                </TableRow>
              ) : null}

              {!resourcesQuery.isLoading && !resourcesQuery.isError && resources.length === 0 ? (
                <TableRow className={styles.row}>
                  <TableCell colSpan={5} className={styles.emptyCell}>
                    暂无待审核资源。
                  </TableCell>
                </TableRow>
              ) : null}

              {!resourcesQuery.isLoading && !resourcesQuery.isError ? (
                <AnimatePresence initial={false}>
                  {resources.map((resource) => {
                    const tags = getReviewTags(resource);
                    const visibleTags = tags.slice(0, 3);
                    const hiddenCount = Math.max(0, tags.length - visibleTags.length);
                    const contactRisk = hasContactRisk(resource);
                    const priceRisk = hasPriceRisk(resource);

                    return (
                      <motion.tr
                        key={resource.resourceId}
                        className={styles.row}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <TableCell className={styles.cell}>#{resource.resourceId}</TableCell>
                        <TableCell className={styles.cell}>
                          {visibleTags.length === 0 ? (
                            <span className={styles.muted}>暂无标签</span>
                          ) : (
                            <div className={styles.tagStack}>
                              {visibleTags.map((tag) => (
                                <span
                                  key={`${resource.resourceId}-${tag}`}
                                  className={styles.miniTag}
                                >
                                  {tag}
                                </span>
                              ))}
                              {hiddenCount > 0 ? (
                                <span className={styles.miniTag}>+{hiddenCount}</span>
                              ) : null}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          {contactRisk || priceRisk ? (
                            <div className={styles.riskList}>
                              {contactRisk ? (
                                <span className={styles.riskItem}>
                                  <AlertTriangle className={styles.riskIcon} />
                                  私联嫌疑
                                </span>
                              ) : null}
                              {priceRisk ? (
                                <span className={styles.riskItem}>
                                  <AlertTriangle className={styles.riskIcon} />
                                  价格异常
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className={styles.safeText}>未发现异常</span>
                          )}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          <span className={styles.statusBadge}>{resource.reviewStatus}</span>
                        </TableCell>
                        <TableCell className={`${styles.cell} ${styles.actionCell}`}>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.approveButton}
                              onClick={() => handleReview(resource, "approve")}
                            >
                              通过
                            </button>
                            <button
                              type="button"
                              className={styles.rejectButton}
                              onClick={() => handleReview(resource, "reject")}
                            >
                              驳回
                            </button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>

      <AnimatePresence>
        {undoToast ? (
          <motion.aside
            key={undoToast.operationId}
            className={styles.undoToast}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className={styles.undoToastText}>
              {undoToast.decision === "approve" ? (
                <CheckCheck className={styles.toastIcon} />
              ) : (
                <XCircle className={styles.toastIcon} />
              )}
              <span>
                资源 #{undoToast.resourceId} 已{undoToast.decision === "approve" ? "通过" : "驳回"}
                ，4 秒内可撤销
              </span>
            </div>
            <button type="button" className={styles.undoButton} onClick={handleUndo}>
              <RotateCcw className={styles.undoIcon} />
              撤销
            </button>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
