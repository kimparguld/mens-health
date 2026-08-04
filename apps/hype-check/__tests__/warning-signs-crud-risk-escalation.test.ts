import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the
// mock objects themselves must be created via vi.hoisted.
const mockDb = vi.hoisted(() => ({
  subject: { findUnique: vi.fn(), update: vi.fn() },
  warningSign: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
}));

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// process-video-pipeline.ts (imported by the routes under test, for
// RISK_RANK) transitively imports lib/ai/pipeline, which constructs an AI
// client at module scope — mocked here the same way
// process-video-pipeline-risk-escalation.test.ts does, so that import
// doesn't blow up under the test environment.
vi.mock("@/lib/ai/pipeline", () => ({
  summarizeVideo: vi.fn(),
  extractClaims: vi.fn(),
  factCheckClaim: vi.fn(),
  generateEditorialTitle: vi.fn(),
  generateTopicFaq: vi.fn(),
}));

vi.mock("@/lib/ai/extract-warnings-costs-disclosures", () => ({
  extractWarningsCostsDisclosures: vi.fn(),
}));

import { POST } from "@/app/api/admin/warning-signs/route";
import { PATCH } from "@/app/api/admin/warning-signs/[id]/route";
import type { NextRequest } from "next/server";

function jsonRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("manual warning-sign CRUD risk escalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { isAdmin: true } });
  });

  describe("POST /api/admin/warning-signs", () => {
    it("escalates subject.riskLevel when an admin manually creates a HIGH-severity warning sign", async () => {
      mockDb.subject.findUnique.mockResolvedValue({
        id: "subject-1",
        riskLevel: "LOW",
      });
      mockDb.warningSign.create.mockResolvedValue({
        id: "warning-1",
        subjectId: "subject-1",
        text: "Pushes unproven supplement",
        severity: "HIGH",
        source: null,
      });

      await POST(
        jsonRequest({
          subjectId: "subject-1",
          text: "Pushes unproven supplement",
          severity: "HIGH",
        }),
      );

      expect(mockDb.subject.update).toHaveBeenCalledWith({
        where: { id: "subject-1" },
        data: { riskLevel: "HIGH" },
      });
    });

    it("does not escalate when the manually created warning sign's severity is not higher than the subject's current risk level", async () => {
      mockDb.subject.findUnique.mockResolvedValue({
        id: "subject-1",
        riskLevel: "MEDIUM",
      });
      mockDb.warningSign.create.mockResolvedValue({
        id: "warning-1",
        subjectId: "subject-1",
        text: "Minor concern",
        severity: "LOW",
        source: null,
      });

      await POST(
        jsonRequest({
          subjectId: "subject-1",
          text: "Minor concern",
          severity: "LOW",
        }),
      );

      expect(mockDb.subject.update).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/admin/warning-signs/[id]", () => {
    it("escalates subject.riskLevel when an admin edits a warning sign's severity up to HIGH", async () => {
      mockDb.warningSign.findUnique.mockResolvedValue({
        id: "warning-1",
        subjectId: "subject-1",
        text: "Some claim",
        severity: "LOW",
        source: null,
      });
      mockDb.subject.findUnique.mockResolvedValue({
        id: "subject-1",
        riskLevel: "LOW",
      });
      mockDb.warningSign.update.mockResolvedValue({
        id: "warning-1",
        subjectId: "subject-1",
        text: "Some claim",
        severity: "HIGH",
        source: null,
      });

      await PATCH(
        jsonRequest({ text: "Some claim", severity: "HIGH" }),
        { params: Promise.resolve({ id: "warning-1" }) },
      );

      expect(mockDb.subject.update).toHaveBeenCalledWith({
        where: { id: "subject-1" },
        data: { riskLevel: "HIGH" },
      });
    });

    it("does not escalate when the edited severity is not higher than the subject's current risk level", async () => {
      mockDb.warningSign.findUnique.mockResolvedValue({
        id: "warning-1",
        subjectId: "subject-1",
        text: "Some claim",
        severity: "HIGH",
        source: null,
      });
      mockDb.subject.findUnique.mockResolvedValue({
        id: "subject-1",
        riskLevel: "HIGH",
      });
      mockDb.warningSign.update.mockResolvedValue({
        id: "warning-1",
        subjectId: "subject-1",
        text: "Some claim",
        severity: "LOW",
        source: null,
      });

      await PATCH(
        jsonRequest({ text: "Some claim", severity: "LOW" }),
        { params: Promise.resolve({ id: "warning-1" }) },
      );

      expect(mockDb.subject.update).not.toHaveBeenCalled();
    });
  });
});
