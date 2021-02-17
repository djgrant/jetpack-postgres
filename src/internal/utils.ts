export function log(msg: any, ...rest: any[]) {
  if (msg instanceof Error) console.log(msg, ...rest);
  else console.log(`[Jetpack]: ${msg}`, ...rest);
}
