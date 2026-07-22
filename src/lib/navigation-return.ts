const RETURN_KEY = "nav_return_v1";
const LAYER_KEY = "nav_content_layer_v1";
const FROM_HUB_KEY = "nav_from_hub_v1";
const HOME_STATE_KEY = "hub_home_state_v1";
const EXPLORE_STATE_KEY = "hub_explore_state_v1";

/** Mesma janela do cache do explorar */
export const RETURN_MAX_AGE_MS = 10 * 60 * 1000;

export interface ReturnPoint {
  href: string;
  scrollY: number;
  at: number;
}

export interface HomeHubState {
  at: number;
  kind: "manga" | "anime" | "shorts";
  query: string;
  selectedGenre: string | null;
  hasSearched: boolean;
  scrollY: number;
}

export interface ExploreHubState {
  at: number;
  explorePage: number;
  isExploreMode: boolean;
  query: string;
  selectedGenre: string | null;
  hasSearched: boolean;
  scrollY: number;
}

export function isHubPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/explore" ||
    pathname === "/sources"
  );
}

/** Camadas a pular no histórico: capa=1, episódio/capítulo=2 */
export function contentLayer(pathname: string): number {
  if (
    pathname.startsWith("/watch/") ||
    pathname.startsWith("/read/") ||
    pathname.startsWith("/shorts/watch/")
  ) {
    return 2;
  }
  if (
    pathname.startsWith("/anime/") ||
    pathname.startsWith("/manga/") ||
    pathname.startsWith("/shorts/")
  ) {
    return 1;
  }
  return 0;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function rememberHubLocation(href: string, scrollY = 0) {
  writeJson(RETURN_KEY, {
    href,
    scrollY,
    at: Date.now(),
  } satisfies ReturnPoint);
}

export function updateHubScroll(scrollY: number) {
  const cur = readJson<ReturnPoint>(RETURN_KEY);
  if (!cur) return;
  writeJson(RETURN_KEY, { ...cur, scrollY, at: cur.at });
}

export function getReturnPoint(): ReturnPoint | null {
  const cur = readJson<ReturnPoint>(RETURN_KEY);
  if (!cur?.href) return null;
  if (Date.now() - cur.at > RETURN_MAX_AGE_MS) return null;
  if (!isHubPath(cur.href.split("?")[0] || cur.href)) return null;
  return cur;
}

export function getReturnHref(fallback = "/"): string {
  return getReturnPoint()?.href || fallback;
}

export function setContentNavState(layer: number, fromHub: boolean) {
  try {
    sessionStorage.setItem(LAYER_KEY, String(layer));
    sessionStorage.setItem(FROM_HUB_KEY, fromHub ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function getContentNavState(): { layer: number; fromHub: boolean } {
  try {
    const layer = Number(sessionStorage.getItem(LAYER_KEY) || "0") || 0;
    const fromHub = sessionStorage.getItem(FROM_HUB_KEY) === "1";
    return { layer, fromHub };
  } catch {
    return { layer: 0, fromHub: false };
  }
}

export function saveHomeHubState(state: Omit<HomeHubState, "at">) {
  writeJson(HOME_STATE_KEY, { ...state, at: Date.now() } satisfies HomeHubState);
}

export function loadHomeHubState(): HomeHubState | null {
  const s = readJson<HomeHubState>(HOME_STATE_KEY);
  if (!s || Date.now() - s.at > RETURN_MAX_AGE_MS) return null;
  return s;
}

export function saveExploreHubState(state: Omit<ExploreHubState, "at">) {
  writeJson(EXPLORE_STATE_KEY, {
    ...state,
    at: Date.now(),
  } satisfies ExploreHubState);
}

export function loadExploreHubState(): ExploreHubState | null {
  const s = readJson<ExploreHubState>(EXPLORE_STATE_KEY);
  if (!s || Date.now() - s.at > RETURN_MAX_AGE_MS) return null;
  return s;
}

export function consumeReturnScroll(): number | null {
  const point = getReturnPoint();
  if (!point || point.scrollY <= 0) return null;
  return point.scrollY;
}
