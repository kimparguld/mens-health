import { auth, signOut } from "@/lib/auth";
import { Fragment } from "react";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    redirect("/admin/login");
  }

  const nav = [
    { label: "Dashboard", href: "/admin" },
    { label: "Review queue", href: "/admin/videos" },
    { label: "Social drafts", href: "/admin/social/drafts" },
    { label: "Social calendar", href: "/admin/social/calendar" },
    { label: "Social accounts", href: "/admin/social/accounts" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r bg-white">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-sm font-semibold text-gray-900">MHD Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {nav.map(({ label, href }, i) => (
            <Fragment key={href}>
              <Link
                key={href}
                href={href}
                className={twMerge(
                  "rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                {label}
              </Link>
              {i === 1 && <div className="border-b" />}
            </Fragment>
          ))}
        </nav>
        <div className="border-t p-4">
          <p className="mb-2 truncate text-xs text-gray-500">
            {session?.user?.email}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
