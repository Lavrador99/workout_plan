import { useEffect, useRef, useState } from "react";

// Hash router: #/client/abc → ["client", "abc"].
//
// Every history entry carries `i`, its position since the app was opened, so "back"
// can tell a real previous page from a link opened directly. Sheets add an entry of
// their own (`sheet`, how many are open), so the phone's back button closes them.

const readHash = () => location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
const toHash = (parts: string[]) => "#/" + parts.map(encodeURIComponent).join("/");
const openSheets = (): number => history.state?.sheet ?? 0;

let index = 0;
/** The next route change is a new page (starts at the top), not a return to one. */
let fresh = false;
/** A history traversal is on its way: closing sheets must not start another one. */
let leaving = false;
const scrollAt = new Map<string, number>();

let restoring: ReturnType<typeof setTimeout> | undefined;

function notifyRoute() {
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Pages load their data after the route changes, so wait until there is room to scroll to. */
function restoreScroll(y: number) {
  clearTimeout(restoring);
  let tries = 30;
  const step = () => {
    window.scrollTo(0, y);
    if (window.scrollY < y && tries-- > 0) restoring = setTimeout(step, 20);
  };
  step();
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    history.scrollRestoration = "manual";
    if (typeof history.state?.i !== "number") history.replaceState({ ...history.state, i: 0 }, "");
    index = history.state.i;

    const onHash = () => {
      if (typeof history.state?.i === "number") index = history.state.i;
      else history.replaceState({ ...history.state, i: ++index }, "");
      const y = fresh ? 0 : (scrollAt.get(location.hash) ?? 0);
      fresh = false;
      setRoute(readHash());
      restoreScroll(y);
    };
    const onPop = () => {
      leaving = false;
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  return route;
}

/** Open a page. Going where you already are scrolls back to the top. */
export function go(...parts: string[]) {
  const hash = toHash(parts);
  if (hash === (location.hash || "#/")) return window.scrollTo({ top: 0, behavior: "smooth" });
  scrollAt.set(location.hash, window.scrollY);
  fresh = true;
  if (openSheets()) replaceRoute(...parts); // leaving from a sheet: its entry goes too
  else location.hash = hash;
}

/** Change the route in place: same page, another view of it (a tab), no extra back step. */
export function replaceRoute(...parts: string[]) {
  fresh = true;
  const { sheet: _sheet, ...state } = history.state ?? {};
  history.replaceState(state, "", toHash(parts));
  notifyRoute();
}

/** Back to where you came from, or to `parent` when the page was opened directly. */
export function back(...parent: string[]) {
  if (!history.state?.i) return replaceRoute(...parent);
  leaving = true;
  history.go(-1 - openSheets());
}

/** A sheet just closed; one opening in the same commit takes over its history entry. */
let closing: { timer: ReturnType<typeof setTimeout>; depth: number } | null = null;

/** While mounted, the back button closes this overlay instead of leaving the page. */
export function useBackClose(onClose: () => void, enabled = true) {
  const latest = useRef(onClose);
  latest.current = onClose;
  const depth = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (closing) {
      clearTimeout(closing.timer);
      depth.current = closing.depth;
      closing = null;
    } else {
      depth.current = openSheets() + 1;
      history.pushState({ ...history.state, sheet: depth.current }, "");
    }
    const onPop = () => {
      if (openSheets() < depth.current) latest.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      const mine = depth.current;
      const timer = setTimeout(() => {
        closing = null;
        if (!leaving && openSheets() >= mine) history.back();
      }, 0);
      closing = { timer, depth: mine };
    };
  }, [enabled]);
}
