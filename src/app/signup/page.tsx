import { app } from "@/src/server/env";
import { SignupForm } from "@/src/components/auth/signup-form";

const SignupPage = () => {
  return <SignupForm rootDomain={app.rootDomain} />;
};

export default SignupPage;
