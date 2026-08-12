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
    <main className="min-h-screen bg-ground font-sans">
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <header className="flex items-baseline justify-between border-b border-edge pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-ink">Admin</h1>
            <span className="font-mono text-xs text-dim">
              {total} user{total === 1 ? "" : "s"}
            </span>
          </div>
          <Link
            href="/app"
            className="text-sm text-dim transition-colors hover:text-ink"
          >
            ← Pages
          </Link>
        </header>

        <section className="divide-y divide-edge border-y border-edge">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 px-2.5 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {user.username ?? user.name}
                  </span>
                  {user.role === "admin" && (
                    <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-panel">
                      admin
                    </span>
                  )}
                  {user.banned ? (
                    <span className="rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-danger">
                      banned
                    </span>
                  ) : null}
                </div>
                <div className="truncate font-mono text-xs text-dim">
                  {user.email} · joined{" "}
                  {new Date(user.createdAt).toISOString().slice(0, 10)}
                </div>
              </div>
              {user.id === session.user.id ? (
                <span className="text-xs text-faint">you</span>
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
