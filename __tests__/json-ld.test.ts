import { describe, it, expect } from "vitest";
import {
  buildVideoObjectSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildItemListSchema,
  buildDefinedTermSchema,
  buildDefinedTermSetSchema,
  secondsToIso8601Duration,
} from "@/lib/seo/json-ld";

describe("buildVideoObjectSchema", () => {
  const base = {
    title: "How to Boost Testosterone Naturally",
    description: "A deep dive into natural testosterone optimisation.",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    publishedAt: new Date("2024-01-15T10:00:00Z"),
    channelTitle: "Health Lab",
    youtubeVideoId: "abc123",
    appUrl: "https://menhealth-digest.com",
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

  it("sets duration as an ISO 8601 string when durationSeconds is provided", () => {
    const schema = buildVideoObjectSchema({ ...base, durationSeconds: 330 });
    expect(schema.duration).toBe("PT5M30S");
  });

  it("omits duration when durationSeconds is null or absent", () => {
    expect(
      buildVideoObjectSchema({ ...base, durationSeconds: null }).duration,
    ).toBeUndefined();
    expect(buildVideoObjectSchema(base).duration).toBeUndefined();
  });
});

describe("secondsToIso8601Duration", () => {
  it("formats minutes and seconds", () => {
    expect(secondsToIso8601Duration(330)).toBe("PT5M30S");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(secondsToIso8601Duration(3725)).toBe("PT1H2M5S");
  });

  it("formats whole minutes without a trailing 0S", () => {
    expect(secondsToIso8601Duration(300)).toBe("PT5M");
  });

  it("formats zero seconds as PT0S", () => {
    expect(secondsToIso8601Duration(0)).toBe("PT0S");
  });
});

describe("buildBreadcrumbSchema", () => {
  it("sets @type to BreadcrumbList", () => {
    const schema = buildBreadcrumbSchema([
      { name: "Home", url: "https://menhealth-digest.com" },
    ]);
    expect(schema["@type"]).toBe("BreadcrumbList");
  });

  it("assigns correct positions", () => {
    const items = [
      { name: "Home", url: "https://menhealth-digest.com" },
      {
        name: "Testosterone",
        url: "https://menhealth-digest.com/topics/testosterone",
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

describe("buildDefinedTermSchema", () => {
  it("sets @type to DefinedTerm and includes inDefinedTermSet when provided", () => {
    const schema = buildDefinedTermSchema({
      name: "Testosterone",
      description: "The primary male sex hormone.",
      url: "https://example.com/glossary/testosterone",
      inDefinedTermSetUrl: "https://example.com/glossary",
    }) as { "@type": string; inDefinedTermSet: string };
    expect(schema["@type"]).toBe("DefinedTerm");
    expect(schema.inDefinedTermSet).toBe("https://example.com/glossary");
  });

  it("omits inDefinedTermSet when not provided", () => {
    const schema = buildDefinedTermSchema({
      name: "Testosterone",
      description: "The primary male sex hormone.",
      url: "https://example.com/glossary/testosterone",
    });
    expect(schema).not.toHaveProperty("inDefinedTermSet");
  });
});

describe("buildDefinedTermSetSchema", () => {
  it("sets @type to DefinedTermSet and maps terms to hasDefinedTerm", () => {
    const schema = buildDefinedTermSetSchema({
      name: "Men's Health Glossary",
      url: "https://example.com/glossary",
      terms: [
        {
          name: "Testosterone",
          description: "The primary male sex hormone.",
          url: "https://example.com/glossary/testosterone",
        },
      ],
    }) as {
      "@type": string;
      hasDefinedTerm: Array<{ "@type": string; name: string }>;
    };
    expect(schema["@type"]).toBe("DefinedTermSet");
    expect(schema.hasDefinedTerm).toHaveLength(1);
    const [firstTerm] = schema.hasDefinedTerm;
    expect(firstTerm?.["@type"]).toBe("DefinedTerm");
    expect(firstTerm?.name).toBe("Testosterone");
  });
});
