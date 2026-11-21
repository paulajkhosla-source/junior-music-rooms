/** Lets one task run at a time. A second start while the first is in flight is ignored, so a double tap cannot send the same request twice. */
export function singleFlight() {
  let busy = false;
  return function run(task: () => Promise<unknown>): boolean {
    if (busy) return false;
    busy = true;
    task().catch(() => {}).finally(() => { busy = false; });
    return true;
  };
}
