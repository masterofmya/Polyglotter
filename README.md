# Polyglotter

A social 3D world for practicing languages. Pick one of 6 characters, hang out in the Polyglotter Plaza, step through portals into language rooms (English, French, Italian, Spanish, German, Portuguese), and chat with people. Click "Translate" on any chat message to see it in your language.

## Run it
1. Install Node.js (nodejs.org)
2. In this folder run `npm install`, then `npm start`
3. Open http://localhost:3000 (open two tabs to see multiplayer)

## Controls
WASD move · Mouse look · Space jump · Shift run · Enter chat · E sit on benches · Hold click to draw on the map in the gazebo · C clear it · Esc free your mouse

## Where things live
- `server.js`: the multiplayer server (rooms, chat, whiteboard drawings)
- `public/game.js`: the main game (controls, chat, start screen)
- `public/js/characters.js`: the 6 characters
- `public/js/lobby.js`: the Polyglotter Plaza map
- `public/js/rooms.js`: portals and the language rooms
