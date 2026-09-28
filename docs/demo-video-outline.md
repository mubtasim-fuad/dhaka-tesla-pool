# Six-minute demo video plan

Record the walkthrough yourself in your own voice. Keep the private demo password, .env files, and Vercel settings off screen. Rehearse with a timer and leave ten seconds for delays.

The hosted demo may already have Nusrat and Rafiq matched in Bullet (2/3 seats). If so, start from that real state and let Shirin request the last seat. If the state changed, prepare fresh compatible requests before recording or show the existing screenshot and describe it accurately. Do not delete production data just to reset the demo.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:40 | Live landing page and README | Problem, users, Bullet's three seats, individual fares and timelines. |
| 0:40–1:25 | Architecture diagram and database table | React/Vite → Express → PostgreSQL; requests, pools, membership, and events. |
| 1:25–2:10 | `api/src/pooling.js` and migration 002 | Vehicle lock, conditional seat claim, database capacity guard, last-seat race. |
| 2:10–2:45 | Fare assumptions or `api/src/domain.js` | Compatible Banani routes; Tk 98 for Nusrat, Tk 86 for Rafiq; integer paisa. |
| 2:45–3:35 | Jashim driver dashboard | Show the 2/3 pool or accept a fresh request and watch the compatible rider join. |
| 3:35–4:20 | Shirin passenger page, then driver page | Quote, request, 3/3 capacity if it actually appears; own status and timeline. |
| 4:20–5:10 | Driver transitions and passenger timeline | Arrived → started → completed, event history, cash collected. |
| 5:10–5:50 | Integration test, limits, and live URL | Test coverage, zones/polling/cash limits, honest AI assistance disclosure. |

Check the exported recording for legible text, clear audio, and a duration under six minutes. Upload it, test its link while signed out, and replace the README placeholder with the actual video URL. Share demo credentials only through the private assessment channel.
