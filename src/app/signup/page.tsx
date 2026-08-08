import { app } from "@/src/config/settings";
import { SignupForm } from "@/src/app/signup/signup-form";

const SignupPage = () => {
  return <SignupForm rootDomain={app.rootDomain} />;
};

export default SignupPage;
