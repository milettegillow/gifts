# Giftbook

A private gift planner at [giftbook.milettegillow.com](https://giftbook.milettegillow.com).

Next.js App Router, Clerk email link sign-in and Neon Postgres.

```bash
npm install
npm run db:setup   # applies db/schema.sql and db/migrations/
npm run dev
```

Needs `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY` and `BLOB_READ_WRITE_TOKEN` in `.env.local`.
