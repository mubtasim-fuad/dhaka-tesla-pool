# Submission Steps

The code and local Git history are ready to review. These steps require the candidate's GitHub account and voice.

1. Run `docker compose up --build` from a fresh clone after copying `.env.example` to `.env` and setting a new `JWT_SECRET`. Check the login, Jashim acceptance, Shirin's last seat, cancellation, and ride completion.
2. Run unit tests. Create a separate PostgreSQL database ending in `_test`, migrate it, and run the integration test. Do not aim the integration test at the demo database because it resets ride tables.
3. Record a maximum six-minute walkthrough using [the outline](demo-video-outline.md). Upload it to a free accessible video service and replace the README's “To be recorded” line with the actual link.
4. Create an empty public or evaluator-accessible GitHub repository named `dhaka-tesla-pool`. From the project folder, run:

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/dhaka-tesla-pool.git
   git push --all origin
   git push origin v1.0.0
   ```

5. If a suitable free host is available, deploy the frontend, API, and Postgres, configure HTTPS, `VITE_API_URL`, `WEB_ORIGIN`, and new secrets, and replace the README deployment line with the URL. The brief explicitly allows the reproducible Docker route if free backend hosting is unavailable.
6. Check the public README on GitHub, including screenshots, diagrams, branch names, video link, and AI usage. Do not share seeded demo passwords on any public production deployment.

The feature branches show the engineering changes; `pre-release` holds integration work and documentation; `release/v1.0.0` is the demo revision. Continue making your own commits for test feedback and the video link.
