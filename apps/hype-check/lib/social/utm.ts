import {
  buildUtmUrl as baseBuildUtmUrl,
  type UtmOptions as BaseUtmOptions,
} from "@menhealth/core-social";

export type UtmOptions = Omit<BaseUtmOptions, "baseUrl"> & {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = "https://www.hype-check.net";

/**
 * Build a UTM-tagged URL for a social post, defaulting to this site's own
 * canonical URL when `baseUrl` isn't supplied.
 */
export function buildUtmUrl(options: UtmOptions): string {
  return baseBuildUtmUrl({
    ...options,
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
  });
}
