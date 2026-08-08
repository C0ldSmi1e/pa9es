import { notFoundPage } from "@/src/server/serve-page";

// Subdomain root (<username>.ROOT_DOMAIN/) never resolves to a page.
const GET = async () => notFoundPage();

export { GET };
