# NIGHTFALL — Ma Sói Online

## Deploy
- Runtime: Node.js 18+
- Install/build: `npm install`
- Start: `npm start`
- Port: use the platform-provided `PORT` environment variable (defaults to 3000).
- Health check: `/health`
- Requires WebSocket support for Socket.IO.

For Docker platforms, use the included Dockerfile.

## Important limitations
Rooms and player state are held in server memory. Restarting/redeploying the server clears active rooms. Players who disconnect are removed and cannot resume their previous role. This version is suitable for testing and casual play, not persistent production rooms.

Role artwork currently uses emoji/CSS rather than individual AI illustrations. Role descriptions may vary by edition; agree on house rules before playing.


## Navigation update
- The role screen now has a button to return to the current room.
- The role screen has a button to leave the room and return home.
- Players can return from the room screen to their revealed role.
- The server handles an explicit room-leave event.
