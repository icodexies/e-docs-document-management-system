import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDashboardMetrics,
  buildDashboardPeriod,
} from "../src/services/dashboardMetrics.js";

test("dashboard period always contains six ordered months", () => {
  const period = buildDashboardPeriod(new Date(2026, 9, 27));

  assert.equal(period.months.length, 6);
  assert.deepEqual(
    period.months.map((month) => month.key),
    ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"],
  );
  assert.equal(period.months[0].label, "May");
});

test("dashboard metrics summarize uploads, completion and signer activity", () => {
  const completedAt = new Date(2026, 7, 15, 12);
  const createdAt = new Date(2026, 7, 10, 12);
  const metrics = buildDashboardMetrics(
    [
      {
        status: "completed",
        created_at: createdAt.toISOString(),
        completed_at: completedAt.toISOString(),
        document_signatories: [
          {
            status: "signed",
            viewed_at: createdAt.toISOString(),
            signed_at: completedAt.toISOString(),
          },
          {
            status: "viewed",
            viewed_at: createdAt.toISOString(),
          },
        ],
      },
      {
        status: "in_progress",
        created_at: new Date(2026, 8, 2, 12).toISOString(),
        completed_at: null,
        document_signatories: [
          {
            status: "signed",
            viewed_at: new Date(2026, 8, 2, 13).toISOString(),
            signed_at: new Date(2026, 8, 3, 12).toISOString(),
          },
          { status: "pending" },
        ],
      },
      {
        status: "draft",
        created_at: new Date(2026, 9, 1, 12).toISOString(),
        completed_at: null,
        document_signatories: [],
      },
    ],
    new Date(2026, 9, 27),
  );

  assert.equal(metrics.totalUploads, 3);
  assert.deepEqual(
    metrics.months.map((month) => month.count),
    [0, 0, 0, 1, 1, 1],
  );
  assert.equal(metrics.statusCounts.completed, 1);
  assert.equal(metrics.statusCounts.in_progress, 1);
  assert.equal(metrics.statusCounts.draft, 1);
  assert.equal(metrics.sentCount, 2);
  assert.equal(metrics.completedCount, 1);
  assert.equal(metrics.completionRate, 50);
  assert.equal(metrics.averageCompletionDays, 5);
  assert.deepEqual(metrics.signers, {
    total: 4,
    viewed: 3,
    signed: 2,
    remaining: 2,
    viewedRate: 75,
    signedRate: 50,
  });
});

test("empty metrics stay usable for the chart components", () => {
  const metrics = buildDashboardMetrics([], new Date(2026, 9, 27));

  assert.equal(metrics.totalUploads, 0);
  assert.equal(metrics.completionRate, 0);
  assert.equal(metrics.averageCompletionDays, null);
  assert.equal(metrics.signers.total, 0);
  assert.equal(metrics.months.length, 6);
  assert.ok(metrics.months.every((month) => month.count === 0));
});
