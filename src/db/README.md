## Local database (default)

This project supports a **local-first** database using **SQLite + Drizzle**.

### Commands

- Generate migrations (from `src/db/schema.ts`):

```bash
npm run db:generate
```

- Apply migrations:

```bash
npm run db:migrate
```

- Open Drizzle Studio:

```bash
npm run db:studio
```

### Database URL

Use `DATABASE_URL` in `.env.local`:

```bash
DATABASE_URL="file:./local.db"
```

