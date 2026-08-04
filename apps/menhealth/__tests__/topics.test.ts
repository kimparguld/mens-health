import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  db: { topicSuggestion: { findMany: vi.fn() } },
}));

const { db } = await import("@/lib/db/prisma");
const { getAllTopicSeeds, TOPIC_SEEDS } = await import("@/lib/youtube/topics");

describe("getAllTopicSeeds", () => {
  it("merges approved suggestions after the static seeds", async () => {
    vi.mocked(db.topicSuggestion.findMany).mockResolvedValue([
      {
        id: "1",
        slug: "grip-strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
        suggestedIsHighRisk: false,
        popularityScore: 10_000,
        evidence: [],
        status: "APPROVED",
        createdAt: new Date(),
        reviewedAt: new Date(),
      } as never,
    ]);

    const result = await getAllTopicSeeds();
    expect(result).toHaveLength(TOPIC_SEEDS.length + 1);
    expect(result.at(-1)).toMatchObject({ slug: "grip-strength" });
    expect(db.topicSuggestion.findMany).toHaveBeenCalledWith({
      where: { status: "APPROVED" },
    });
  });
});
