"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/src/clients/auth";

const SignOutButton = () => {
  const router = useRouter();

  const onClick = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      Sign out
    </button>
  );
};

export { SignOutButton };
