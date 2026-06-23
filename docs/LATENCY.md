# Low Latency Mode

Applied optimizations:

- Controller sends input at ~60Hz instead of ~30Hz.
- Important touch/pointer movement is sent immediately via `markInputDirty()`.
- Browser touch gestures are disabled on controls with `touch-action:none`.
- WebSocket compression is disabled to avoid CPU delay for small real-time messages.
- TV state stream is ~60Hz when socket buffer is healthy.
- Old viewer states are overwritten; only the newest state is rendered.
- Socket buffer guards drop stale frames instead of building latency.
- Host rendering reuses the same serialized state per frame to avoid duplicate work.

## Practical recommendations

For lowest delay:
- TV/host and controllers on the same Wi-Fi 5GHz or wired host.
- Avoid VPN.
- Use Chrome/Edge.
- Keep the host tab focused.
- Prefer `/play` state rendering over video/screen streaming.
