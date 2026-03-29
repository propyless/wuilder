import "./style.css";
import { renderHome } from "./ui/home";
import { renderSavedBuilds } from "./ui/savedBuilds";
import { renderSpokes } from "./ui/spokes";
import { renderTension } from "./ui/tension";

function getAppRoot(): HTMLElement {
  const el = document.querySelector<HTMLElement>("#app");
  if (!el) throw new Error("#app missing");
  return el;
}
const root = getAppRoot();

function updateSiteNavActive(route: string): void {
  document.querySelectorAll<HTMLAnchorElement>(".nav-links a[data-route]").forEach((a) => {
    const r = a.getAttribute("data-route");
    a.classList.toggle("nav-link--active", r === route);
  });
}

function parseHash(): string {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const path = raw.split("?")[0].replace(/^\//, "") || "home";
  return path;
}

function setBodyPageClass(route: string): void {
  document.body.className =
    route === "spokes"
      ? "page-spoke page-wide"
      : route === "tension"
        ? "page-tension page-wide"
        : route === "builds"
          ? "page-saved-builds page-wide"
          : "";
}

function render(): void {
  const route = parseHash();
  updateSiteNavActive(route);
  setBodyPageClass(route);
  if (route === "spokes") {
    renderSpokes(root);
    return;
  }
  if (route === "tension") {
    renderTension(root);
    return;
  }
  if (route === "builds") {
    renderSavedBuilds(root);
    return;
  }
  renderHome(root);
}

window.addEventListener("hashchange", render);
render();
