# EA888 Visual Simulator

High-definition, real-time visual simulator of the Volkswagen EA888 inline-four engine using Three.js + Vite + TypeScript. It renders a simplified slider–crank mechanism (crankshaft, connecting rods, pistons) with basic lighting and orbit controls. RPM is adjustable live via GUI.

## Features
- Three.js renderer with ACES tone mapping, shadows, HD pixel ratio
- Orbit controls, FPS stats, and GUI
- Inline-four assembly with per-cylinder kinematics, animated by RPM

## Requirements
- Node.js 18+ and npm
- Alternatively, Docker

## Quick start (local)
```bash
cd ea888-visual-simulator
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

- Use the mouse to orbit/pan/zoom.
- Use the GUI to adjust RPM.

## Production preview
```bash
npm run start
```
This builds and serves a production bundle at http://localhost:5173.

## Docker
Build image:
```bash
docker build -t ea888-sim .
```
Run container:
```bash
docker run --rm -p 5173:5173 ea888-sim
```
Open http://localhost:5173.

## Project structure
- `src/main.ts`: renderer, scene, controls, GUI, and animation loop
- `src/engine.ts`: kinematics and assembly for the inline-four
- `index.html`: entry HTML
- `src/style.css`: global styles

## Next steps
- Add detailed EA888 geometry (valves, cam lobes, chain drive)
- Materials and textures for metals and plastics
- Exploded view and labeling
- Camera paths and cinematic shots

## Deploy to a public webpage (GitHub Pages)
1. Create a new GitHub repository and push this project:
   ```bash
   cd ea888-visual-simulator
   git remote add origin https://github.com/<your-username>/ea888-visual-simulator.git
   git branch -M main
   git push -u origin main
   ```
2. Ensure GitHub Pages is enabled:
   - In your repo settings → Pages → Build and deployment → Source: GitHub Actions.
3. On push to `main`, the included workflow builds and deploys to Pages.
4. Your app will be available at:
   - `https://<your-username>.github.io/ea888-visual-simulator/`

Notes:
- The workflow sets the correct base path automatically using the repository name.
- If you use a custom domain, add a `public/CNAME` file with your domain.