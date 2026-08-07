import {
  buildSrtFromWordTimestamps,
  createAdVideoPackageGenerator,
  type SocialAiClient,
} from '@menhealth/core-social';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbStub = {
  adVideoPackage: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function makeAiClient(jsonPayload: object): SocialAiClient {
  return {
    defaultModel: 'test-model',
    anthropic: {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(jsonPayload) }],
        }),
      },
    },
  };
}

function makeConfig(overrides?: {
  db?: DbStub;
  aiClient?: SocialAiClient;
  elevenLabsApiKey?: string | undefined;
  elevenLabsVoiceId?: string | undefined;
  uploadAsset?: (input: {
    pathname: string;
    body: Uint8Array;
    contentType: string;
  }) => Promise<string>;
}) {
  const db =
    overrides?.db ??
    ({
      adVideoPackage: {
        create: vi.fn().mockResolvedValue({ id: 'pkg_1' }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: 'pkg_1' }),
      },
    } satisfies DbStub);

  const aiClient =
    overrides?.aiClient ??
    makeAiClient({
      script:
        "Men's health content is noisy. We summarize what matters, flag weak claims, and give practical takeaways you can use this week.",
      caption:
        'Skip the noise. Get five clear summaries each week with claim checks and practical takeaways. Educational only. Not medical advice. https://example.com/?utm_source=social&utm_medium=video&utm_campaign=site_promo_ad',
      hashtags: ['MensHealth', 'Fitness'],
    });

  const uploadAsset =
    overrides?.uploadAsset ??
    vi.fn(
      async ({ pathname }: { pathname: string }) =>
        `https://blob.test/${pathname}`
    );

  return {
    db,
    aiClient,
    aiConfigured: true,
    siteName: 'MenHealth Digest',
    offerCopy:
      'Five summarized videos, checked claims, practical takeaways, and easy unsubscribe.',
    disclaimerLine: 'Educational only. Not medical advice.',
    utmUrl:
      'https://example.com/?utm_source=social&utm_medium=video&utm_campaign=site_promo_ad',
    forbiddenPatterns: [{ pattern: /this\s+cures?/i, reason: 'Cure claim' }],
    highRiskKeywords: ['testosterone', 'trt', 'cancer'],
    creatomateApiKey: 'creatomate-test',
    creatomateTemplateId: 'template_test',
    elevenLabsApiKey: overrides?.elevenLabsApiKey ?? 'elevenlabs-test',
    elevenLabsVoiceId: overrides?.elevenLabsVoiceId ?? 'voice_test',
    uploadAsset,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('createAdVideoPackageGenerator.generateAdVideoPackage', () => {
  it('rejects forbidden copy and creates no DB row', async () => {
    const config = makeConfig({
      aiClient: makeAiClient({
        script: 'This cures low energy fast.',
        caption:
          'Fast fix. Educational only. Not medical advice. https://example.com/?utm_source=social&utm_medium=video&utm_campaign=site_promo_ad',
        hashtags: ['menshealth'],
      }),
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const generator = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0]
    );

    const result = await generator.generateAdVideoPackage();

    expect(result.ok).toBe(false);
    expect(config.db.adVideoPackage.create).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('creates a RENDERING package when voice + render start succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('elevenlabs')) {
          return new Response(
            JSON.stringify({
              audio_base64: 'YXVkaW8=',
              temporary_url: 'https://temp.example.com/voiceover.mp3',
              word_timestamps: [
                { word: 'Hello', start_ms: 0, end_ms: 250 },
                { word: 'world', start_ms: 260, end_ms: 580 },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('creatomate.com/v1/renders')) {
          return new Response(JSON.stringify({ id: 'render_123' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('not found', { status: 404 });
      }
    );

    const config = makeConfig();
    const generator = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0]
    );

    const result = await generator.generateAdVideoPackage();

    if (!result.ok) {
      throw new Error(result.error.message);
    }
    expect(result.ok).toBe(true);
    expect(config.db.adVideoPackage.create).toHaveBeenCalledOnce();
    const args = config.db.adVideoPackage.create.mock.calls[0]?.[0] as {
      data: { status: string; renderProviderId: string };
    };
    expect(args.data.status).toBe('RENDERING');
    expect(args.data.renderProviderId).toBe('render_123');
  });

  it('creates a RENDERING package without ElevenLabs by using free fallback timestamps', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('creatomate.com/v1/renders')) {
          return new Response(JSON.stringify({ id: 'render_free_mode' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('not found', { status: 404 });
      });

    const config = makeConfig({
      elevenLabsApiKey: '',
      elevenLabsVoiceId: undefined,
    });
    const generator = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0]
    );

    const result = await generator.generateAdVideoPackage();

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.ok).toBe(true);
    expect(config.db.adVideoPackage.create).toHaveBeenCalledOnce();
    const args = config.db.adVideoPackage.create.mock.calls[0]?.[0] as {
      data: {
        renderProviderId: string;
        voiceoverWordTimestamps: Array<{ word: string }>;
        voiceoverUrl?: string;
      };
    };
    expect(args.data.renderProviderId).toBe('render_free_mode');
    expect(args.data.voiceoverWordTimestamps.length).toBeGreaterThan(0);
    expect(args.data.voiceoverUrl).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('creatomate.com/v1/renders');
  });

  it('accepts Creatomate array responses and extracts render id from first item', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('elevenlabs')) {
          return new Response(
            JSON.stringify({
              audio_base64: 'YXVkaW8=',
              temporary_url: 'https://temp.example.com/voiceover.mp3',
              word_timestamps: [{ word: 'Hi', start_ms: 0, end_ms: 300 }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('creatomate.com/v1/renders')) {
          return new Response(JSON.stringify([{ id: 'render_from_array' }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('not found', { status: 404 });
      }
    );

    const config = makeConfig();
    const generator = createAdVideoPackageGenerator(
      config as Parameters<typeof createAdVideoPackageGenerator>[0]
    );

    const result = await generator.generateAdVideoPackage();
    if (!result.ok) throw new Error(result.error.message);

    const args = config.db.adVideoPackage.create.mock.calls[0]?.[0] as {
      data: { renderProviderId: string };
    };
    expect(args.data.renderProviderId).toBe('render_from_array');
  });
});

describe('createAdVideoPackageGenerator.pollRenderingPackages', () => {
  it('handles complete, failed, and errored rows in one batch', async () => {
    const db: DbStub = {
      adVideoPackage: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'pkg_complete',
            renderProviderId: 'render_complete',
            voiceoverWordTimestamps: [
              { word: 'One', startMs: 0, endMs: 240 },
              { word: 'line.', startMs: 260, endMs: 500 },
            ],
            voiceoverUrl: 'https://temp.example.com/voiceover.mp3',
          },
          {
            id: 'pkg_failed',
            renderProviderId: 'render_failed',
            voiceoverWordTimestamps: [{ word: 'No', startMs: 0, endMs: 120 }],
            voiceoverUrl: null,
          },
          {
            id: 'pkg_error',
            renderProviderId: 'render_error',
            voiceoverWordTimestamps: [
              { word: 'Retry', startMs: 0, endMs: 250 },
            ],
            voiceoverUrl: null,
          },
        ]),
        update: vi.fn().mockResolvedValue({ id: 'pkg_x' }),
      },
    };

    const uploadAsset = vi.fn(
      async ({ pathname }: { pathname: string }) =>
        `https://blob.test/${pathname}`
    );

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith('/render_complete')) {
          return new Response(
            JSON.stringify({
              status: 'completed',
              output: {
                landscapeUrl: 'https://assets.test/landscape.mp4',
                verticalUrl: 'https://assets.test/vertical.mp4',
                squareUrl: 'https://assets.test/square.mp4',
                thumbnailUrl: 'https://assets.test/thumb.png',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url.endsWith('/render_failed')) {
          return new Response(
            JSON.stringify({
              status: 'failed',
              errorMessage: 'Template failed',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url.endsWith('/render_error')) {
          return new Response('upstream timeout', { status: 503 });
        }

        if (
          url.startsWith('https://assets.test/') ||
          url.includes('voiceover.mp3')
        ) {
          return new Response(new Uint8Array([1, 2, 3, 4]));
        }

        return new Response('not found', { status: 404 });
      }
    );

    const generator = createAdVideoPackageGenerator(
      makeConfig({ db, uploadAsset }) as Parameters<
        typeof createAdVideoPackageGenerator
      >[0]
    );

    const result = await generator.pollRenderingPackages();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected poll to succeed');

    expect(result.value).toEqual({ checked: 3, completed: 1, failed: 2 });
    expect(db.adVideoPackage.update).toHaveBeenCalled();

    const updateCalls = db.adVideoPackage.update.mock.calls.map(
      (call) =>
        call[0] as {
          where: { id: string };
          data: { status?: string; errorMessage?: string | null };
        }
    );

    expect(
      updateCalls.some(
        (call) =>
          call.where.id === 'pkg_complete' &&
          call.data.status === 'PENDING_REVIEW'
      )
    ).toBe(true);

    expect(
      updateCalls.some(
        (call) =>
          call.where.id === 'pkg_failed' && call.data.status === 'FAILED'
      )
    ).toBe(true);

    expect(
      updateCalls.some(
        (call) =>
          call.where.id === 'pkg_error' &&
          typeof call.data.errorMessage === 'string'
      )
    ).toBe(true);
  });
});

describe('buildSrtFromWordTimestamps', () => {
  it('creates numbered cues with expected timing format', () => {
    const srt = buildSrtFromWordTimestamps([
      { word: 'Hello', startMs: 0, endMs: 350 },
      { word: 'there.', startMs: 360, endMs: 800 },
      { word: 'General', startMs: 1600, endMs: 2100 },
      { word: 'Kenobi', startMs: 2110, endMs: 2600 },
    ]);

    expect(srt).toContain('1\n00:00:00,000 --> 00:00:00,800\nHello there.');
    expect(srt).toContain('2\n00:00:01,600 --> 00:00:02,600\nGeneral Kenobi');
  });
});
