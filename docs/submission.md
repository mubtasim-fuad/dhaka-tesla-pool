# Submission Steps

The repository and hosted demo are ready for review.

1. Run `docker compose up --build` from a fresh clone after running `node scripts/setup-env.mjs` to generate private credentials. Check login, Jashim's acceptance, Shirin's last seat, cancellation, and ride completion.
2. Run unit tests. Create a separate PostgreSQL database ending in `_test`, migrate it, and run the integration test. Do not aim the integration test at the demo database because it resets ride tables.
3. Review the [GitHub repository](https://github.com/mubtasim-fuad/dhaka-tesla-pool) and [live app](https://dhaka-tesla-pool-web-nine.vercel.app/). The API and database are on Vercel and Neon; the web project is connected to GitHub and deploys from `main`, while API changes still need a separate deployment.
4. Check the public README, screenshots, diagrams, branch names, and AI usage. Share the hosted demo password only through a private assessment channel.

Use `main` for the current deployed web revision. Commit subsequent fixes after they are verified.
