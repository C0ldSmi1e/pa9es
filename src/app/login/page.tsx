import { LoginForm } from "@/src/components/auth/login-form";

type PageProps = { searchParams: Promise<{ error?: string }> };

// Failed email-verification links land here (redirected via /app) with
// better-auth's error code in the query. Only known codes get a notice;
// anything else is ignored rather than echoed.
const NOTICES: Record<string, string> = {
  TOKEN_EXPIRED:
    "That verification link has expired. Sign in below and we'll email you a fresh one.",
  INVALID_TOKEN:
    "That verification link is invalid or was already used. If your email still isn't verified, sign in below to get a new link.",
};

const LoginPage = async ({ searchParams }: PageProps) => {
  const { error } = await searchParams;
  return <LoginForm notice={error ? (NOTICES[error] ?? null) : null} />;
};

export default LoginPage;
