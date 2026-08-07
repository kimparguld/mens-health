type UploadToBlobInput = {
  pathname: string;
  body: Uint8Array;
  contentType: string;
  token: string;
};

const BLOB_API_BASE_URL = 'https://blob.vercel-storage.com';

export async function uploadToBlob({
  pathname,
  body,
  contentType,
  token,
}: UploadToBlobInput): Promise<string> {
  const normalizedPath = pathname.startsWith('/')
    ? pathname.slice(1)
    : pathname;
  const binaryPayload = Uint8Array.from(body);

  const response = await fetch(`${BLOB_API_BASE_URL}/${normalizedPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'x-add-random-suffix': '1',
      'x-content-type': contentType,
    },
    body: new Blob([binaryPayload], { type: contentType }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Blob upload failed (${response.status}): ${details}`);
  }

  const jsonPayload = (await response.json()) as { url?: string };
  if (!jsonPayload.url) {
    throw new Error('Blob upload response did not include a URL');
  }

  return jsonPayload.url;
}
