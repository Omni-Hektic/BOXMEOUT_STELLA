"use client";

export type MarketStatus = "Open" | "Locked" | "Resolved" | "Disputed" | "Cancelled";
export type CancelReason = "Draw" | "NoContest" | "AdminCancelled";

interface MarketStatusBadgeProps {
  status: MarketStatus;
  winningOutcome?: string;
  cancelReason?: CancelReason;
  size?: "sm" | "md";
}

const STATUS_STYLES: Record<MarketStatus, { pill: string; dot: string; label: string }> = {
  Open: {
    pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400 animate-pulse",
    label: "Open",
  },
  Locked: {
    pill: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    label: "Locked",
  },
  Resolved: {
    pill: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    dot: "bg-blue-400",
    label: "Resolved",
  },
  Disputed: {
    pill: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    dot: "bg-orange-400 animate-pulse",
    label: "Under Dispute",
  },
  Cancelled: {
    pill: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    dot: "bg-zinc-400",
    label: "Cancelled",
  },
};

const CANCEL_REASON_LABELS: Record<CancelReason, { title: string; subtitle?: string }> = {
  Draw: { title: "Draw", subtitle: "Full refund available" },
  NoContest: { title: "No Contest", subtitle: "Full refund available" },
  AdminCancelled: { title: "Admin cancelled", subtitle: "Full refund available" },
};

export function MarketStatusBadge({
  status,
  winningOutcome,
  cancelReason,
  size = "md",
}: MarketStatusBadgeProps) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Open;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  const cancelInfo = status === "Cancelled" && cancelReason ? CANCEL_REASON_LABELS[cancelReason] : null;
  const displayLabel = cancelInfo ? cancelInfo.title : s.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide ${sizeClass} ${s.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      <span>{displayLabel}</span>
      {status === "Resolved" && winningOutcome && (
        <span className="font-bold text-white/90 normal-case">· {winningOutcome}</span>
      )}
      {cancelInfo?.subtitle && (
        <span className="font-normal text-zinc-300 normal-case">· {cancelInfo.subtitle}</span>
      )}
    </span>
  );
}
