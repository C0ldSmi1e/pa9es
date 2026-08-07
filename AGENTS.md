# Guidelines for Coding Agents

## Default to using Bun instead of Node.js

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx` instead of `npx`

## Refer to docs to understand the codebase

- Read docs to have better understanding
- You can ask users questions to clarify things
- If you update the code, you should also update the docs correspondingly if you need

## Use custom standard response format in API endpoints

- All the API endpoints will return custom standard response (unless errors in network)
- Use `@/src/utils/create-response` to construct return object
- Refer to `@/src/schemas/standard-response` to understand the response format
- Refer to `@/src/app/api/route.ts` to see how an API endpoint work in this system
- By default, `GET` methods return all the entities from database (with hard cap set in `@/src/config/settings.ts`). With pagination parameters, they will follow the paginated configuration.

## Use aboslute path instead of relative path in import

- For example: `import { foo } from "@/src/xyz/abc"`.