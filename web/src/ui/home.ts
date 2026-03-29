export function renderHome(container: HTMLElement): void {
  container.innerHTML = `
    <div class="prose">
      <h1>wuild</h1>
      <p class="lede">Wheel-building helpers: spoke length and tension maps (TM-1). Runs entirely in your browser.</p>
      <p><a href="#/spokes">Spoke length</a> · <a href="#/tension">Tension map (TM-1)</a></p>
      <p class="hint">The previous Django app lives in <code>legacy/</code> for reference and tests.</p>
    </div>
  `;
}
