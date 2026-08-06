import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSocialPost,
  regenerateSocialPost,
} from "@/lib/social/generate-social-post";

const {
  mockVideoFindUnique,
  mockSocialPostCreate,
  mockSocialPostFindUnique,
  mockSocialPostUpdate,
  mockAiCreate,
} = vi.hoisted(() => ({
  mockVideoFindUnique: vi.fn(),
  mockSocialPostCreate: vi.fn(),
  mockSocialPostFindUnique: vi.fn(),
  mockSocialPostUpdate: vi.fn(),
  mockAiCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    video: { findUnique: mockVideoFindUnique },
    socialPost: {
      create: mockSocialPostCreate,
      findUnique: mockSocialPostFindUnique,
      update: mockSocialPostUpdate,
    },
  },
}));

vi.mock("@/lib/ai/client", () => ({
  aiClient: {
    defaultModel: "test-model",
    anthropic: { messages: { create: mockAiCreate } },
  },
}));

vi.mock("@/lib/social/platform-rules", () => ({
  FORBIDDEN_PATTERNS: [],
  HIGH_RISK_TOPIC_KEYWORDS: [],
}));

function aiJsonResponse(body: object) {
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

const PUBLISHED_VIDEO = {
  id: "video_1",
  status: "PUBLISHED",
  title: "Does Cold Plunging Raise Testosterone?",
  slug: "cold-plunging-testosterone",
  riskLevel: "LOW",
  evidenceScore: 0.6,
  summaries: [
    {
      shortSummary: "A look at cold exposure and T levels.",
      takeaways: ["Evidence is mixed"],
    },
  ],
  topics: [{ topic: { name: "Testosterone" } }],
  claims: [{ text: "Cold plunges raise testosterone" }],
};

// hashtags: [] keeps this fixture valid against every platform's
// maxHashtags (Reddit's is 0) so the same fixture works across tests.
const VALID_AI_OUTPUT = {
  hook: "Cold plunges and testosterone — what does the evidence say?",
  script: "",
  caption:
    "New research on cold exposure and testosterone. Evidence: Moderate. Risk: Low. Educational only. Not medical advice.",
  hashtags: [] as string[],
  requiresReview: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockVideoFindUnique.mockResolvedValue(PUBLISHED_VIDEO);
  mockAiCreate.mockResolvedValue(aiJsonResponse(VALID_AI_OUTPUT));
});

describe("generateSocialPost", () => {
  it("creates a DRAFT post from a valid AI response", async () => {
    mockSocialPostCreate.mockResolvedValue({ id: "post_1" });

    const result = await generateSocialPost({
      videoId: "video_1",
      platform: "REDDIT",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.postId).toBe("post_1");
    const createArgs = mockSocialPostCreate.mock.calls[0]![0] as {
      data: { status: string };
    };
    expect(createArgs.data.status).toBe("DRAFT");
  });

  it("creates a PENDING_REVIEW post when the AI flags requiresReview", async () => {
    mockAiCreate.mockResolvedValue(
      aiJsonResponse({ ...VALID_AI_OUTPUT, requiresReview: true }),
    );
    mockSocialPostCreate.mockResolvedValue({ id: "post_2" });

    const result = await generateSocialPost({
      videoId: "video_1",
      platform: "REDDIT",
    });

    expect(result.ok).toBe(true);
    const createArgs = mockSocialPostCreate.mock.calls[0]![0] as {
      data: { status: string };
    };
    expect(createArgs.data.status).toBe("PENDING_REVIEW");
  });

  it("fails when the video is not found", async () => {
    mockVideoFindUnique.mockResolvedValue(null);

    const result = await generateSocialPost({
      videoId: "missing",
      platform: "X",
    });

    expect(result.ok).toBe(false);
  });
});

describe("regenerateSocialPost", () => {
  const DRAFT_POST = {
    id: "post_1",
    status: "DRAFT",
    platform: "REDDIT",
    sourceId: "video_1",
  };

  it.each(["APPROVED", "SCHEDULED", "PUBLISHED", "REJECTED", "FAILED"])(
    "rejects regenerating a %s post",
    async (status) => {
      mockSocialPostFindUnique.mockResolvedValue({ ...DRAFT_POST, status });

      const result = await regenerateSocialPost("post_1");

      expect(result.ok).toBe(false);
      expect(mockSocialPostUpdate).not.toHaveBeenCalled();
    },
  );

  it.each(["DRAFT", "PENDING_REVIEW"])(
    "regenerates and overwrites a %s post",
    async (status) => {
      mockSocialPostFindUnique.mockResolvedValue({ ...DRAFT_POST, status });
      mockSocialPostUpdate.mockResolvedValue({ id: "post_1" });

      const result = await regenerateSocialPost("post_1");

      expect(result.ok).toBe(true);
      expect(mockSocialPostUpdate).toHaveBeenCalledOnce();
      const updateArgs = mockSocialPostUpdate.mock.calls[0]![0] as {
        where: { id: string };
        data: { status: string };
      };
      expect(updateArgs.where.id).toBe("post_1");
      expect(updateArgs.data.status).toBe("DRAFT");
    },
  );

  it("fails when the post does not exist", async () => {
    mockSocialPostFindUnique.mockResolvedValue(null);

    const result = await regenerateSocialPost("missing");

    expect(result.ok).toBe(false);
  });
});
