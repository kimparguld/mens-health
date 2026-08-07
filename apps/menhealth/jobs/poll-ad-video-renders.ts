import { pollRenderingPackages } from '@/lib/social/generate-ad-video-package';

export async function pollAdVideoRenders(): Promise<{
  checked: number;
  completed: number;
  failed: number;
}> {
  const result = await pollRenderingPackages();
  if (!result.ok) {
    return { checked: 0, completed: 0, failed: 1 };
  }
  return result.value;
}
