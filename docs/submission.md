# Submission Steps

The repository and hosted demo are ready for review. The recording must be made in your own voice.

1. Run `docker compose up --build` from a fresh clone after running `node scripts/setup-env.mjs` to generate private credentials. Check the login, Jashim acceptance, Shirin's last seat, cancellation, and ride completion.
2. Run unit tests. Create a separate PostgreSQL database ending in `_test`, migrate it, and run the integration test. Do not aim the integration test at the demo database because it resets ride tables.
3. Record a maximum six-minute walkthrough using [the outline](demo-video-outline.md). The live database currently has Nusrat and Rafiq matched (2/3 seats); check its state before recording and show only what actually happens. Upload the video to an accessible service, verify the link while signed out, and replace the README placeholder with the real URL.
4. Review the uploaded [GitHub repository](https://github.com/mubtasim-fuad/dhaka-tesla-pool) and [live app](https://dhaka-tesla-pool-web-nine.vercel.app/). The API and database are on Vercel and Neon; the web project is connected to GitHub and deploys from `main`, while API changes still need a separate deployment.
5. Check the public README, screenshots, diagrams, branch names, video link, and AI usage. Share the hosted demo password only through a private assessment channel.

Use `main` for the current deployed web revision. The recording link and any subsequent fixes should be committed after they are verified.
