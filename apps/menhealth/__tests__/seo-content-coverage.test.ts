import { describe, it, expect } from "vitest";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { getTopicContent } from "@/lib/seo/topic-content";
import { getAllTopicSeo } from "@/lib/seo/topic-faq";
import { GLOSSARY_TERMS } from "@/lib/seo/glossary";
import { RELATED_TOPICS } from "@/lib/seo/related-topics";

const TOPIC_SLUGS = new Set(TOPIC_SEEDS.map((t) => t.slug));

describe("topic content coverage", () => {
  it("has topic-content.ts enrichment for every topic", () => {
    const missing = TOPIC_SEEDS.filter((t) => getTopicContent(t.slug) === null);
    expect(missing.map((t) => t.slug)).toEqual([]);
  });

  it("has FAQ data for every topic", () => {
    const allSeo = getAllTopicSeo();
    const missing = TOPIC_SEEDS.filter((t) => !allSeo[t.slug]);
    expect(missing.map((t) => t.slug)).toEqual([]);
  });
});

describe("related topics", () => {
  it("only references valid topic slugs, in both keys and values", () => {
    for (const [slug, related] of Object.entries(RELATED_TOPICS)) {
      expect(TOPIC_SLUGS.has(slug)).toBe(true);
      for (const relatedSlug of related) {
        expect(TOPIC_SLUGS.has(relatedSlug)).toBe(true);
      }
    }
  });

  it("never lists a topic as related to itself", () => {
    for (const [slug, related] of Object.entries(RELATED_TOPICS)) {
      expect(related).not.toContain(slug);
    }
  });

  it("gives every topic at least one inbound link (no orphans)", () => {
    // A topic that never appears as someone else's "related" entry has no
    // server-rendered internal link pointing to it anywhere except
    // sitemap.xml — it's effectively an orphan page for crawling purposes.
    const inbound = new Set(Object.values(RELATED_TOPICS).flat());
    const orphans = TOPIC_SEEDS.filter((t) => !inbound.has(t.slug));
    expect(orphans.map((t) => t.slug)).toEqual([]);
  });
});

describe("glossary", () => {
  it("has unique slugs", () => {
    const slugs = GLOSSARY_TERMS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only references valid topic slugs", () => {
    for (const term of GLOSSARY_TERMS) {
      for (const topicSlug of term.relatedTopicSlugs) {
        expect(TOPIC_SLUGS.has(topicSlug)).toBe(true);
      }
    }
  });
});
