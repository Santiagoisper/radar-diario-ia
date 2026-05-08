export function logApi(level: string, msg: string, extra?: Record<string, unknown>): void {
  const line = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    service: "radar-api",
    ...extra,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}
