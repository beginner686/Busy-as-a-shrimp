"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getAdminApi } from "@/api";
import type { DictData, DictType } from "@/api/admin-api";
import { getErrorMessage } from "@/utils/error-message";

import styles from "./page.module.css";

const DICT_TYPES_QUERY_KEY = ["admin", "dict", "types"] as const;
const DICT_DATA_QUERY_KEY = ["admin", "dict", "data"] as const;

function DictTypeSkeleton() {
  return (
    <div className={styles.skeletonWrap} aria-hidden>
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

function DictDataSkeleton() {
  return (
    <div className={styles.skeletonWrap} aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

export default function DictPage() {
  const [activeDictType, setActiveDictType] = useState<string | null>(null);

  const dictTypesQuery = useQuery({
    queryKey: DICT_TYPES_QUERY_KEY,
    queryFn: async (): Promise<DictType[]> => {
      // TODO: 如果后端路径不同，在这里替换为真实接口。
      return getAdminApi().dictTypes();
    }
  });

  const dictDataQuery = useQuery({
    queryKey: [...DICT_DATA_QUERY_KEY, activeDictType],
    queryFn: async (): Promise<DictData[]> => {
      // TODO: 如果后端路径不同，在这里替换为真实接口。
      return getAdminApi().dictData(activeDictType ?? "");
    },
    enabled: Boolean(activeDictType)
  });

  const activeTypeMeta = useMemo(
    () => dictTypesQuery.data?.find((item) => item.dictType === activeDictType),
    [activeDictType, dictTypesQuery.data]
  );

  return (
    <main className={styles.page}>
      <section className={`${styles.panel} ${styles.leftPanel}`}>
        <header className={styles.panelHeader}>
          <div>
            <h1 className={styles.panelTitle}>字典类型</h1>
            <p className={styles.panelSubtitle}>DICT TYPE INDEX</p>
          </div>
        </header>

        {dictTypesQuery.isLoading ? <DictTypeSkeleton /> : null}
        {!dictTypesQuery.isLoading && dictTypesQuery.isError ? (
          <p className={styles.errorText}>
            加载字典类型失败：{getErrorMessage(dictTypesQuery.error)}
          </p>
        ) : null}

        {!dictTypesQuery.isLoading &&
        !dictTypesQuery.isError &&
        (dictTypesQuery.data?.length ?? 0) === 0 ? (
          <p className={styles.emptyText}>暂无可用字典类型。</p>
        ) : null}

        {!dictTypesQuery.isLoading &&
        !dictTypesQuery.isError &&
        (dictTypesQuery.data?.length ?? 0) > 0 ? (
          <ul className={styles.typeList}>
            {dictTypesQuery.data?.map((item) => {
              const isActive = item.dictType === activeDictType;
              const statusText = item.status === "normal" ? "NORMAL" : "DISABLED";
              return (
                <li key={item.dictId}>
                  <button
                    type="button"
                    className={`${styles.typeItem} ${isActive ? styles.typeItemActive : ""}`}
                    onClick={() => setActiveDictType(item.dictType)}
                  >
                    <span>
                      <span className={styles.typeName}>{item.dictName}</span>
                      <span className={styles.typeCode}>{item.dictType}</span>
                    </span>
                    <span
                      className={`${styles.typeStatus} ${
                        item.status === "normal" ? styles.typeStatusEnabled : ""
                      }`}
                    >
                      {statusText}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className={styles.neonEdge} />
      </section>

      <section className={`${styles.panel} ${styles.rightPanel}`}>
        <header className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>数据矩阵</h2>
            <p className={styles.panelSubtitle}>
              {activeTypeMeta
                ? `${activeTypeMeta.dictName} / ${activeTypeMeta.dictType}`
                : "DICT DATA MATRIX"}
            </p>
          </div>

          <div className={styles.actionGroup}>
            <button type="button" className={styles.ghostBtn}>
              新增
            </button>
            <button type="button" className={styles.ghostBtn}>
              修改
            </button>
            <button type="button" className={styles.ghostBtn}>
              删除
            </button>
          </div>
        </header>

        <div className={styles.rightBody}>
          {!activeDictType ? (
            <p className={styles.awaiting}>SYSTEM AWAITING: 请在左侧节点选择字典类型</p>
          ) : null}

          {activeDictType && dictDataQuery.isLoading ? <DictDataSkeleton /> : null}
          {activeDictType && !dictDataQuery.isLoading && dictDataQuery.isError ? (
            <p className={styles.errorText}>
              加载字典数据失败：{getErrorMessage(dictDataQuery.error)}
            </p>
          ) : null}

          {activeDictType &&
          !dictDataQuery.isLoading &&
          !dictDataQuery.isError &&
          (dictDataQuery.data?.length ?? 0) === 0 ? (
            <p className={styles.emptyText}>当前字典类型暂无数据项。</p>
          ) : null}

          {activeDictType &&
          !dictDataQuery.isLoading &&
          !dictDataQuery.isError &&
          (dictDataQuery.data?.length ?? 0) > 0 ? (
            <div className={styles.dataList}>
              {dictDataQuery.data?.map((item) => {
                const isNormal = item.status === "normal";
                return (
                  <article key={`${item.dictCode}-${item.dictValue}`} className={styles.dataCard}>
                    <div className={styles.dataPrimary}>
                      <p className={styles.dataLabel}>{item.dictLabel}</p>
                      <p className={styles.dataCode}>{item.dictCode}</p>
                    </div>
                    <div>
                      <div className={styles.kvLabel}>DICT_VALUE</div>
                      <div className={styles.kvValue}>{item.dictValue}</div>
                    </div>
                    <div>
                      <div className={styles.kvLabel}>SORT</div>
                      <div className={styles.kvValue}>{item.dictSort}</div>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${
                        isNormal ? styles.statusNormal : styles.statusDisabled
                      }`}
                    >
                      {isNormal ? "NORMAL" : "DISABLED"}
                    </span>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className={styles.neonEdge} />
      </section>
    </main>
  );
}
