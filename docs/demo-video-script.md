# Dhaka Tesla Pool — 5:50 submission video

This script follows the requested **problem (0:00–1:00), engineering (1:00–3:00), and product tour (3:00–5:50)** structure. The guided MP4 uses captures of the real public GitHub repository and deployed landing page. Its signed-in passenger and driver screens are actual repository screenshots from a prior demo session, labeled as such. Record your own signed-in flow before submitting if the reviewer expects continuous live interaction. Keep the private password off screen.

| Time | Tab / screen | Easy voiceover |
| --- | --- | --- |
| 0:00–0:30 | Live deployment · landing | “Here is the deployed Dhaka Tesla Pool app. The problem is simple: several people leave Banani in a similar direction, but separate rides leave seats empty. A passenger wants a clear fare and a clear status. A driver wants a simple way to fill a three-seat car.” |
| 0:30–1:00 | GitHub · repository README | “My core idea is one shared trip with separate passenger records. Nusrat and Rafiq can ride together in Jashim’s car, Bullet. Shirin may take the last seat. Each person sees their own request, fare, and ride history. The GitHub repo holds the code, setup steps, diagrams, tests, and trade-offs.” |
| 1:00–1:25 | GitHub README · architecture | “The React frontend talks to an Express API over HTTP. The API checks roles and ride rules, then writes to PostgreSQL. This is a small, direct architecture: one web app, one API, and one database. The browser refreshes ride state every six seconds.” |
| 1:25–1:50 | GitHub README · ERD and tables | “In the database, a request belongs to one passenger. A pool is one shared driver trip. Memberships join passengers to that pool and keep each rider’s fare. Events store the timeline. This split lets the driver see the whole car while a passenger sees only their own ride.” |
| 1:50–2:15 | GitHub · SQL migration | “The SQL schema checks roles, ride states, vehicle capacity, and valid pickup and destination. It also uses indexes and unique rules. Those database rules matter because the API can receive two requests at nearly the same time.” |
| 2:15–2:35 | GitHub · frontend source | “The passenger page asks the API for a quote, creates a request, and loads the rider’s timeline. The driver page accepts a request and moves a pool from matched to arrived, started, and completed. The interface reflects the API state rather than keeping a separate ride truth.” |
| 2:35–3:00 | GitHub · pooling code | “My key decision was to protect the last seat in the database. The transaction locks the vehicle, then a conditional update adds seats only when capacity allows. The trade-off is a small matching model based on named zones, not live GPS or traffic. It keeps this demo explainable.” |
| 3:00–3:30 | Passenger capture from repo | “Now the product tour. Nusrat’s screen shows a quote for Banani to Mohakhali. She can request a seat and track her own ride. Her example fare is ninety-eight taka. Rafiq’s compatible trip to Gulshan One has a separate fare of eighty-six taka.” |
| 3:30–4:00 | Passenger capture · zoom | “Notice that the quote and the assigned fare have different meanings. The quote appears before a match. Once assigned, the fare is fixed for that rider. Status and event history show what happened without exposing another passenger’s private details.” |
| 4:00–4:30 | Driver capture from repo | “Jashim’s dashboard shows Bullet with two of three seats filled. Nusrat and Rafiq appear in one pool, each with their own fare. This screenshot came from the repository’s documented demo session; the live deployment landing page is shown separately.” |
| 4:30–5:00 | Driver capture · zoom | “The driver can try to fill the open seat before departure, then mark arrival, start the trip, and complete it. Passengers receive the same state changes in their timelines. Cash collection is recorded on completion. A rider can cancel before the trip starts.” |
| 5:00–5:25 | GitHub · integration test | “The interesting edge case is two people asking for the one remaining seat at once. The integration test checks that only one is matched; the other stays requested. It also covers fares, roles, status transitions, cancellation, and cash state. Tests use a dedicated test database.” |
| 5:25–5:50 | Live deployment + GitHub | “The app is deployed, and the public repository shows its source and documentation. Docker Compose is provided for local setup; the README explains how to run it and what was verified. The limits are zone matching, polling, and cash only. OpenAI Codex assisted parts of the implementation, and the code and tests are available for review.” |

## Browser tabs to open for your own screen recording

1. [Live app](https://dhaka-tesla-pool-web-nine.vercel.app/)
2. [GitHub repo / README](https://github.com/mubtasim-fuad/dhaka-tesla-pool)
3. [Backend pooling code](https://github.com/mubtasim-fuad/dhaka-tesla-pool/blob/main/api/src/pooling.js)
4. [SQL schema](https://github.com/mubtasim-fuad/dhaka-tesla-pool/blob/main/api/sql/001_initial.sql)
5. [Frontend passenger page](https://github.com/mubtasim-fuad/dhaka-tesla-pool/blob/main/web/src/PassengerDashboard.jsx)
6. [Integration test](https://github.com/mubtasim-fuad/dhaka-tesla-pool/blob/main/api/test/ride.integration.test.js)

For a continuous live product tour, sign in privately before recording, then capture a passenger quote/request, Jashim's pool, and the driver transitions. Only describe the states that the deployed app actually shows. Do not run the integration test against production data.
