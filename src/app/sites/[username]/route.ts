import { notFoundPage } from "@/src/utils/serve-page";

// Subdomain root (<username>.ROOT_DOMAIN/) never resolves to a page.
const GET = async () => notFoundPage();

export { GET };
