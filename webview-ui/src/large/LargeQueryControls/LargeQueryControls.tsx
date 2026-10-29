import type { JobKind, QueryJob } from "../LargeApp/LargeQueryController";
import styles from "./LargeQueryControls.module.scss";

const JOB_LABELS: Record<JobKind, string> = {
  sort: "ソート中",
  filter: "絞り込み中",
  search: "検索中",
};

export interface LargeQueryActionsProps {
  /** false ならフィルタ・検索を使えない（インデックス作成中） */
  enabled: boolean;
  filterRowVisible: boolean;
  onToggleFilterRow: () => void;
  onOpenSearch: () => void;
  /** 実行中のソート・フィルタ・検索 */
  job: QueryJob | null;
  onCancel: () => void;
}

/**
 * 大容量モードのバナーに置く、フィルタ行の表示切替・検索の操作と、実行中のジョブの進捗・キャンセル。
 * ソートの操作は列ヘッダーのボタン、検索語の入力は検索欄（Search）で行う
 */
export function LargeQueryActions({
  enabled,
  filterRowVisible,
  onToggleFilterRow,
  onOpenSearch,
  job,
  onCancel,
}: LargeQueryActionsProps) {
  const percent = job === null ? null : Math.round(job.ratio * 100);
  const label = job === null ? "" : JOB_LABELS[job.kind];

  return (
    <>
      {job !== null && percent !== null && (
        <span className={styles.job}>
          <progress className={styles.progressBar} aria-label={label} max={100} value={percent} />
          <span>
            {label} {percent}%
          </span>
          <button type="button" className={styles.button} onClick={onCancel}>
            キャンセル
          </button>
        </span>
      )}
      <button
        type="button"
        className={styles.button}
        aria-pressed={filterRowVisible}
        disabled={!enabled}
        onClick={onToggleFilterRow}
      >
        フィルタ
      </button>
      <button type="button" className={styles.button} disabled={!enabled} onClick={onOpenSearch}>
        検索
      </button>
    </>
  );
}

export interface LargeSnapshotNoticeProps {
  /** 再適用を押せない（実行中のジョブがある・インデックス作成中） */
  disabled: boolean;
  onReapply: () => void;
}

/**
 * ソート・フィルタは適用した時点の並びのスナップショットで、編集しても並べ直さないことの注記。
 * 通常モードは編集のたびに並べ直す点が異なるため、再適用で更新できるようにする
 */
export function LargeSnapshotNotice({ disabled, onReapply }: LargeSnapshotNoticeProps) {
  return (
    <>
      <span>
        ソート・フィルタを適用中です。編集しても並び替え・絞り込みは再実行されません（再適用で更新）。
      </span>
      <button type="button" className={styles.button} disabled={disabled} onClick={onReapply}>
        再適用
      </button>
    </>
  );
}
