import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { BanButton } from "@/src/components/admin/ban-button";
import { auth } from "@/src/server/auth";
import { getSession } from "@/src/server/session";

// Role-gated: non-admins get a 404, not a 403, so the route's existence
// isn't advertised.
const AdminPage = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    notFound();
  }

  const { users: listedUsers, total } = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
  });
  // listUsers is typed by the admin plugin alone; the username column is
  // present at runtime but missing from UserWithRole.
  const users = listedUsers as Array<
    (typeof listedUsers)[number] & { username: string | null }
  >;

  return (
    <main className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Admin
            </h1>
            <span className="text-sm text-zinc-500">
              {total} user{total === 1 ? "" : "s"}
            </span>
          </div>
          <Link
            href="/app"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Dashboard
          </Link>
        </header>

        <section className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {user.username ?? user.name}
                  </span>
                  {user.role === "admin" && (
                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white dark:bg-zinc-50 dark:text-zinc-900">
                      admin
                    </span>
                  )}
                  {user.banned ? (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-red-700 dark:bg-red-950 dark:text-red-400">
                      banned
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {user.email} · joined{" "}
                  {new Date(user.createdAt).toISOString().slice(0, 10)}
                </div>
              </div>
              {user.id === session.user.id ? (
                <span className="text-xs text-zinc-400">you</span>
              ) : (
                <BanButton userId={user.id} banned={Boolean(user.banned)} />
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default AdminPage;
