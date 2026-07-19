import { describe, it, expect } from "vitest";
import {
  buildVideoObjectSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildItemListSchema,
} from "@/lib/seo/json-ld";

describe("buildVideoObjectSchema", () => {
  const base = {
    title: "How to Boost Testosterone Naturally",
    description: "A deep dive into natural testosterone optimisation.",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    publishedAt: new Date("2024-01-15T10:00:00Z"),
    channelTitle: "Health Lab",
    youtubeVideoId: "abc123",
    appUrl: "https://menhealthdigest.com",
    slug: "how-to-boost-testosterone-naturally",
  };

  it("sets @type to VideoObject", () => {
    expect(buildVideoObjectSchema(base)["@type"]).toBe("VideoObject");
  });

  it("uses youtube-nocookie-free embedUrl", () => {
    const schema = buildVideoObjectSchema(base);
    expect(schema.embedUrl).toContain("abc123");
    expect(schema.contentUrl).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("sets uploadDate as ISO string", () => {
    expect(buildVideoObjectSchema(base).uploadDate).toBe(
      "2024-01-15T10:00:00.000Z",
    );
  });

  it("omits thumbnailUrl when null", () => {
    const schema = buildVideoObjectSchema({ ...base, thumbnailUrl: null });
    expect(schema.thumbnailUrl).toBeUndefined();
  });
});

describe("buildBreadcrumbSchema", () => {
  it("sets @type to BreadcrumbList", () => {
    const schema = buildBreadcrumbSchema([
      { name: "Home", url: "https://menhealthdigest.com" },
    ]);
    expect(schema["@type"]).toBe("BreadcrumbList");
  });

  it("assigns correct positions", () => {
    const items = [
      { name: "Home", url: "https://menhealthdigest.com" },
      {
        name: "Testosterone",
        url: "https://menhealthdigest.com/topics/testosterone",
      },
    ];
    const schema = buildBreadcrumbSchema(items) as {
      itemListElement: Array<{ position: number; name: string }>;
    };
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
    expect(schema.itemListElement[1].name).toBe("Testosterone");
  });
});

describe("buildFaqSchema", () => {
  it("sets @type to FAQPage", () => {
    const schema = buildFaqSchema([
      { question: "What is testosterone?", answer: "A hormone." },
    ]);
    expect(schema["@type"]).toBe("FAQPage");
  });

  it("wraps each FAQ in a Question entity", () => {
    const schema = buildFaqSchema([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]) as { mainEntity: Array<{ "@type": string; name: string }> };
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]["@type"]).toBe("Question");
    expect(schema.mainEntity[0].name).toBe("Q1");
  });
});

describe("buildItemListSchema", () => {
  it("sets numberOfItems correctly", () => {
    const schema = buildItemListSchema("Best videos", [
      { name: "Video A", url: "https://example.com/a" },
      { name: "Video B", url: "https://example.com/b" },
    ]) as { numberOfItems: number };
    expect(schema.numberOfItems).toBe(2);
  });

  it("sets @type to ItemList", () => {
    expect(buildItemListSchema("test", [])["@type"]).toBe("ItemList");
  });
});
