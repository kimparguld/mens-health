import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900 hover:text-blue-700"
          >
            MenHealth Digest
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/topics/testosterone"
              className="text-gray-600 hover:text-gray-900"
            >
              Topics
            </Link>
            <Link href="/digest" className="text-gray-600 hover:text-gray-900">
              Newsletter
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400">
          <p>
            MenHealth Digest — Educational content only. Not medical advice.
          </p>
          <p className="mt-1">
            © {new Date().getFullYear()} MenHealth Digest. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
