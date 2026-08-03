import { db } from "@/lib/db/prisma";


export default async function MonetizationPage() {
  const [affiliateLinks, sponsors] = await Promise.all([
    db.affiliateLink.findMany({ orderBy: { createdAt: "desc" } }),
    db.sponsor.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Monetization</h1>

      {/* Sponsors */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Sponsors</h2>
          <a
            href="/admin/monetization/sponsors/new"
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Add sponsor
          </a>
        </div>
        {sponsors.length === 0 ? (
          <p className="text-sm text-gray-500">No sponsors configured.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    CTA
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Ends
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sponsors.map((s: (typeof sponsors)[number]) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.name}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={s.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {s.ctaText}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.endDate
                        ? s.endDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Affiliate links */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Affiliate links
          </h2>
          <a
            href="/admin/monetization/affiliate-links/new"
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Add link
          </a>
        </div>
        {affiliateLinks.length === 0 ? (
          <p className="text-sm text-gray-500">
            No affiliate links configured.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Label
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Topic
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Commission
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {affiliateLinks.map((link: (typeof affiliateLinks)[number]) => (
                  <tr key={link.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {link.productName}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {link.label}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {link.topicSlug ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {link.commission ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          link.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {link.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
