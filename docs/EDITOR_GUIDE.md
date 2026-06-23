# Level Editor Guide

The editor is the source of truth for creating stages.

## Available component groups

- `plataforma`: chão, blocos, pontes, paredes e arena
- `inimigo`: all regular enemies
- `chefe`: all bosses
- `perigo`: fire, acid, saw, turret, crusher, blades, spikes, moving lasers, pendulum and mines
- `animal`: beast, raptor, snake and bat swarm hazards
- `pickup`: HP, life, revive, bombs and rapid-fire
- `arma`: all 30 weapon drops
- `decor`: visual decoration
- `sistema`: portal

## Controls

- Select objects and drag to move
- Delete selected object
- Duplicate selected object
- Zoom in/out
- Pan around the level
- Export/save level JSON

## Contract with the game runtime

Custom levels are serialized as:

```json
{
  "name": "Minha fase",
  "width": 4200,
  "music": "fire",
  "bg": ["#151520", "#1c2235"],
  "portalY": 558,
  "platforms": [[0,650,4200,80]],
  "enemies": [["runner", 600, 500]],
  "hazards": [],
  "pickups": [],
  "decor": [],
  "portal": {"x":4050,"y":558,"w":86,"h":92}
}
```
