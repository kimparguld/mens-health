import { env } from "@/env";

// Matches the key file already hosted at public/e6182a5a89bb4f3f8a9752d77947b0b1.txt
const INDEXNOW_KEY = "e6182a5a89bb4f3f8a9752d77947b0b1";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Notifies IndexNow-participating search engines (Bing, Yandex, and others)
 * that the given URLs were added or changed. Best-effort — failures are
 * logged, never thrown, so this can't block a publish/cron job.
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: appUrl.hostname,
        key: INDEXNOW_KEY,
        keyLocation: `${appUrl.origin}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    if (!res.ok) {
      console.warn(`[indexnow] submission returned ${res.status}`);
    }
  } catch (error) {
    console.warn("[indexnow] submission failed:", error);
  }
}
