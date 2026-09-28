# Submission Steps

The code and local Git history are ready to review. These steps require the candidate's GitHub account and voice.

1. Run `docker compose up --build` from a fresh clone after running `node scripts/setup-env.mjs` to generate private credentials. Check the login, Jashim acceptance, Shirin's last seat, cancellation, and ride completion.
2. Run unit tests. Create a separate PostgreSQL database ending in `_test`, migrate it, and run the integration test. Do not aim the integration test at the demo database because it resets ride tables.
3. Record a maximum six-minute walkthrough using [the outline](demo-video-outline.md). Upload it to an accessible video service and replace the README's recording placeholder with the actual link.
4. Review the uploaded [GitHub repository](https://github.com/mubtasim-fuad/dhaka-tesla-pool) and [live app](https://dhaka-tesla-pool-web-nine.vercel.app/). The API and database are on Vercel and Neon; the Vercel projects were uploaded manually, so future GitHub commits need a separate deployment.
5. Check the public README, screenshots, diagrams, branch names, video link, and AI usage. Share the hosted demo password only through a private assessment channel.

The feature branches show the engineering changes; `pre-release` holds integration work and documentation; `release/v1.0.0` is the demo revision. Continue making your own commits for test feedback and the video link.
