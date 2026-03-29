/** `<option>` list for spoke count 12–52 even (shared by Spokes + Tension). */
export function spokeOptions(selected: number): string {
  const opts: string[] = [];
  for (let n = 12; n <= 52; n += 2) {
    opts.push(
      `<option value="${n}"${n === selected ? " selected" : ""}>${n}</option>`,
    );
  }
  return opts.join("");
}
