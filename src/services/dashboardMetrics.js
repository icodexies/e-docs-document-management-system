const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SENT_STATUSES = new Set([
  "pending",
  "in_progress",
  "completed",
  "declined",
]);

export function buildDashboardPeriod(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const months = [];

  for (let index = 0; index < 6; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[date.getMonth()],
    });
  }

  return { start, months };
}

export function buildDashboardMetrics(documents = [], now = new Date()) {
  const { start, months } = buildDashboardPeriod(now);
  const countsByMonth = new Map(months.map((month) => [month.key, 0]));
  const statusCounts = {};
  const completionDays = [];

  let sentCount = 0;
  let completedCount = 0;
  let signerTotal = 0;
  let signerViewed = 0;
  let signerSigned = 0;

  for (const document of documents) {
    const status = String(document?.status ?? "");
    const createdAt = new Date(document?.created_at ?? "");

    if (!Number.isNaN(createdAt.getTime()) && createdAt >= start) {
      const key = `${createdAt.getFullYear()}-${String(
        createdAt.getMonth() + 1,
      ).padStart(2, "0")}`;
      if (countsByMonth.has(key)) {
        countsByMonth.set(key, countsByMonth.get(key) + 1);
      }
    }

    if (status) {
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }
    if (SENT_STATUSES.has(status)) sentCount += 1;

    if (status === "completed") {
      completedCount += 1;
      const completedAt = new Date(document?.completed_at ?? "");
      if (
        !Number.isNaN(completedAt.getTime()) &&
        !Number.isNaN(createdAt.getTime()) &&
        completedAt >= createdAt
      ) {
        completionDays.push(
          (completedAt.getTime() - createdAt.getTime()) / 86_400_000,
        );
      }
    }

    for (const signer of document?.document_signatories ?? []) {
      signerTotal += 1;
      const signed = signer?.status === "signed" || Boolean(signer?.signed_at);
      if (signed) signerSigned += 1;
      if (signed || signer?.viewed_at) signerViewed += 1;
    }
  }

  const averageCompletionDays = completionDays.length
    ? Math.round(
        (completionDays.reduce((sum, days) => sum + days, 0) /
          completionDays.length) *
          10,
      ) / 10
    : null;

  return {
    periodStart: start.toISOString(),
    months: months.map((month) => ({
      ...month,
      count: countsByMonth.get(month.key) ?? 0,
    })),
    totalUploads: documents.length,
    statusCounts,
    sentCount,
    completedCount,
    completionRate: sentCount
      ? Math.round((completedCount / sentCount) * 100)
      : 0,
    averageCompletionDays,
    signers: {
      total: signerTotal,
      viewed: signerViewed,
      signed: signerSigned,
      remaining: Math.max(0, signerTotal - signerSigned),
      viewedRate: signerTotal
        ? Math.round((signerViewed / signerTotal) * 100)
        : 0,
      signedRate: signerTotal
        ? Math.round((signerSigned / signerTotal) * 100)
        : 0,
    },
  };
}
