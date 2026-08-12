"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";

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
      className="text-sm text-dim transition-colors hover:text-ink"
    >
      Sign out
    </button>
  );
};

export { SignOutButton };
