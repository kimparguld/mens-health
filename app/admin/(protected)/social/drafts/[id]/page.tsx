import { db } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import DraftActions from "./DraftActions";

export const dynamic = "force-dynamic";

const RISK_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-green-100 text-green-800",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SCHEDULED: "bg-indigo-100 text-indigo-800",
  PUBLISHED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-200 text-red-900",
};

export default async function SocialDraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await db.socialPost.findUnique({
    where: { id },
    include: { attempts: { orderBy: { attemptedAt: "desc" }, take: 5 } },
  });

  if (!post) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/social/drafts"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Drafts
        </Link>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status] ?? "bg-gray-100 text-gray-700"}`}
        >
          {post.status}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_COLORS[post.riskLevel] ?? ""}`}
        >
          {post.riskLevel} risk
        </span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {post.platform.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Hook</h2>
          <p className="text-gray-900">{post.hook}</p>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Script</h2>
          <pre className="text-sm whitespace-pre-wrap text-gray-900">
            {post.script}
          </pre>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Caption</h2>
          <pre className="text-sm whitespace-pre-wrap text-gray-900">
            {post.caption}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">UTM URL</h2>
          <a
            href={post.utmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm break-all text-blue-600 hover:underline"
          >
            {post.utmUrl}
          </a>
        </section>

        {post.scheduledAt && (
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">
              Scheduled for
            </h2>
            <p className="text-sm text-gray-900">
              {new Date(post.scheduledAt).toLocaleString()}
            </p>
          </section>
        )}

        {post.platformUrl && (
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">
              Platform URL
            </h2>
            <a
              href={post.platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {post.platformUrl}
            </a>
          </section>
        )}

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Actions</h2>
          <DraftActions
            postId={post.id}
            platform={post.platform}
            status={post.status}
            riskLevel={post.riskLevel}
            requiresReview={post.requiresReview}
          />
        </section>

        {post.attempts.length > 0 && (
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Publish attempts
            </h2>
            <ul className="space-y-2">
              {post.attempts.map((attempt) => (
                <li key={attempt.id} className="text-sm">
                  <span
                    className={`mr-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      attempt.success
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {attempt.success ? "OK" : "FAILED"}
                  </span>
                  <span className="text-gray-600">
                    {new Date(attempt.attemptedAt).toLocaleString()}
                  </span>
                  {attempt.errorMsg && (
                    <span className="ml-2 text-red-600">
                      {attempt.errorMsg}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
