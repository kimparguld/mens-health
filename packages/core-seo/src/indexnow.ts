const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Notifies IndexNow-participating search engines (Bing, Yandex, and others)
 * that the given URLs were added or changed. Best-effort — failures are
 * logged, never thrown, so this can't block a publish/cron job.
 *
 * `indexNowKey` must match a key file hosted at `${siteUrl}/<key>.txt` —
 * each site registers its own IndexNow key (see IndexNow's docs), so this
 * is per-site config, not a shared constant.
 */
export async function submitUrlsToIndexNow(
  urls: string[],
  siteUrl: string,
  indexNowKey: string,
): Promise<void> {
  if (urls.length === 0) return;

  const appUrl = new URL(siteUrl);

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: appUrl.hostname,
        key: indexNowKey,
        keyLocation: `${appUrl.origin}/${indexNowKey}.txt`,
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
