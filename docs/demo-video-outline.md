# Six Minute Demo Video Outline

Record this yourself in your own words after running the app. Show the repository and working screens, and put the video URL near the top of the README. Keep the total under six minutes.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–1:00 | Login screen and story | Nusrat and Rafiq have different destinations but share a Banani pickup. Bullet has three seats. Each rider needs a private fare and status. |
| 1:00–1:45 | README architecture diagram and ERD | Browser → React → Express → PostgreSQL; requests are separate from pools and membership fares. |
| 1:45–2:30 | `pooling.js` and migration 002 | Vehicle row lock, atomic `occupied_seats` update, capacity check, and last-seat race. This is the most useful engineering decision to defend. |
| 2:30–3:00 | Fare and route rule | Tk 98 for Nusrat, Tk 86 for Rafiq; the Banani corridor assumption and fixed discount trade-off. |
| 3:00–3:45 | Jashim driver dashboard | Accept Nusrat; Rafiq joins; show manifest and 2/3 seats. |
| 3:45–4:30 | Shirin passenger dashboard | Request Banani → Gulshan 1; show 3/3 seats and Shirin's own fare/status. Show that a fourth request waits. |
| 4:30–5:15 | Driver transitions | Arrived → started → completed; rider timeline and collected cash status. Try an invalid transition or late cancellation. |
| 5:15–6:00 | Tests, Docker setup, limitations | Point to the integration test and explain why no real route map or public hosted URL is included. Mention the next improvement you would build. |

Before recording, run a clean demo, keep your cursor visible, and speak without reading this outline verbatim. A reviewer may ask you to modify this code live.
