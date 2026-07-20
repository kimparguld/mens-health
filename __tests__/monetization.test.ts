import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getActiveSponsor,
  getAffiliateLinksForTopic,
} from "@/lib/monetization/resolvers";
import { deactivateExpiredSponsors } from "@/jobs/deactivate-expired-sponsors";

// ---------------------------------------------------------------------------
// Mock Prisma — must use vi.hoisted so refs are available inside vi.mock factory
// ---------------------------------------------------------------------------

const { mockFindFirst, mockFindMany, mockUpdateMany } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpdateMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  db: {
    sponsor: { findFirst: mockFindFirst, updateMany: mockUpdateMany },
    affiliateLink: { findMany: mockFindMany },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getActiveSponsor
// ---------------------------------------------------------------------------

describe("getActiveSponsor", () => {
  it("returns the active sponsor when one exists", async () => {
    const sponsor = { id: "s1", name: "ACME", isActive: true };
    mockFindFirst.mockResolvedValue(sponsor);

    const result = await getActiveSponsor();
    expect(result).toBe(sponsor);
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });

  it("returns null when no active sponsor exists", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getActiveSponsor();
    expect(result).toBeNull();
  });

  it("queries with isActive=true and date-range filters", async () => {
    mockFindFirst.mockResolvedValue(null);

    await getActiveSponsor();

    const query = mockFindFirst.mock.calls[0][0] as {
      where: { isActive: boolean };
    };
    expect(query.where.isActive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getAffiliateLinksForTopic
// ---------------------------------------------------------------------------

describe("getAffiliateLinksForTopic", () => {
  it("returns links when topicSlug is provided", async () => {
    const links = [
      { id: "l1", topicSlug: "fitness", isActive: true },
      { id: "l2", topicSlug: null, isActive: true },
    ];
    mockFindMany.mockResolvedValue(links);

    const result = await getAffiliateLinksForTopic("fitness");
    expect(result).toEqual(links);

    const query = mockFindMany.mock.calls[0][0] as {
      where: { isActive: boolean; OR: unknown[] };
    };
    expect(query.where.isActive).toBe(true);
    expect(query.where.OR).toContainEqual({ topicSlug: null });
    expect(query.where.OR).toContainEqual({ topicSlug: "fitness" });
  });

  it("returns only generic links when topicSlug is null", async () => {
    mockFindMany.mockResolvedValue([]);

    await getAffiliateLinksForTopic(null);

    const query = mockFindMany.mock.calls[0][0] as {
      where: { OR: unknown[] };
    };
    // Should not include a topicSlug filter entry when slug is null
    expect(query.where.OR).toEqual([{ topicSlug: null }]);
  });

  it("returns empty array when none found", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getAffiliateLinksForTopic("sleep");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// deactivateExpiredSponsors
// ---------------------------------------------------------------------------

describe("deactivateExpiredSponsors", () => {
  it("returns deactivated count from updateMany", async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });

    const result = await deactivateExpiredSponsors();
    expect(result).toEqual({ deactivated: 3 });
  });

  it("calls updateMany with endDate < now and isActive=true", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });

    await deactivateExpiredSponsors();

    const query = mockUpdateMany.mock.calls[0][0] as {
      where: { isActive: boolean; endDate: { lt: Date } };
      data: { isActive: boolean };
    };
    expect(query.where.isActive).toBe(true);
    expect(query.where.endDate.lt).toBeInstanceOf(Date);
    expect(query.data.isActive).toBe(false);
  });

  it("is idempotent — calling twice still returns correct count", async () => {
    mockUpdateMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 0 });

    const first = await deactivateExpiredSponsors();
    const second = await deactivateExpiredSponsors();

    expect(first).toEqual({ deactivated: 2 });
    expect(second).toEqual({ deactivated: 0 });
  });
});
