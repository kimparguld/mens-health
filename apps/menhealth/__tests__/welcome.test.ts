import { describe, it, expect } from "vitest";
import {
  welcomeSubject,
  buildWelcomeHtml,
  buildWelcomeText,
} from "@/lib/newsletter/welcome";

const APP_URL = "https://menhealth-digest.com";
const UNSUB_URL =
  "https://menhealth-digest.com/api/newsletter/unsubscribe?id=sub_123";

describe("welcomeSubject", () => {
  it("mentions the site name", () => {
    expect(welcomeSubject).toContain("MenHealth Digest");
  });
});

describe("buildWelcomeHtml", () => {
  it("includes the welcome copy", () => {
    const html = buildWelcomeHtml(APP_URL, UNSUB_URL);
    expect(html).toContain("Thanks for subscribing");
  });

  it("includes the cadence copy", () => {
    const html = buildWelcomeHtml(APP_URL, UNSUB_URL);
    expect(html).toContain("fact-checked against the evidence");
  });

  it("includes highlight links to /topics, /rankings, /creators, /weekly", () => {
    const html = buildWelcomeHtml(APP_URL, UNSUB_URL);
    expect(html).toContain(`${APP_URL}/topics`);
    expect(html).toContain(`${APP_URL}/rankings`);
    expect(html).toContain(`${APP_URL}/creators`);
    expect(html).toContain(`${APP_URL}/weekly`);
  });

  it("adds UTM parameters to internal links", () => {
    const html = buildWelcomeHtml(APP_URL, UNSUB_URL);
    expect(html).toContain("utm_source=newsletter");
    expect(html).toContain("utm_medium=email");
    expect(html).toContain("utm_campaign=welcome_email");
  });

  it("includes the unsubscribe link", () => {
    const html = buildWelcomeHtml(APP_URL, UNSUB_URL);
    expect(html).toContain(UNSUB_URL);
  });

  it("includes the health disclaimer", () => {
    const html = buildWelcomeHtml(APP_URL, UNSUB_URL);
    expect(html.toLowerCase()).toContain("disclaimer");
    expect(html).toContain("does not constitute medical advice");
  });
});

describe("buildWelcomeText", () => {
  it("includes the welcome copy", () => {
    const text = buildWelcomeText(APP_URL, UNSUB_URL);
    expect(text).toContain("Thanks for subscribing");
  });

  it("includes highlight links with UTM params", () => {
    const text = buildWelcomeText(APP_URL, UNSUB_URL);
    expect(text).toContain(`${APP_URL}/topics`);
    expect(text).toContain("utm_source=newsletter");
    expect(text).toContain("utm_campaign=welcome_email");
  });

  it("includes the unsubscribe URL", () => {
    const text = buildWelcomeText(APP_URL, UNSUB_URL);
    expect(text).toContain(UNSUB_URL);
  });

  it("includes the disclaimer", () => {
    const text = buildWelcomeText(APP_URL, UNSUB_URL);
    expect(text).toContain("does not constitute medical advice");
  });
});
