// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// The router keeps module state (history position, scroll and view state per entry),
// so every test loads a fresh copy of it, of React, and starts from a clean history entry.

type Nav = typeof import("./nav");
type ReactNS = typeof import("react");

interface PageApi {
  route: string;
  q: string;
  setQ: (v: string) => void;
  sheet: boolean;
  setSheet: (v: boolean) => void;
  draft: string;
  setDraft: (v: string) => void;
}

let nav: Nav;
let React: ReactNS;
let act: ReactNS["act"];
let unmount: () => void;
let page: PageApi;
let mounts = 0;

// jsdom has no layout: fake a page whose height (and so max scroll) the test controls.
let y = 0;
let maxY = 10_000;

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
/** Let history events (queued by jsdom), React renders and the scroll retries run. */
const settle = async (ms = 60) => {
  await act(async () => {
    await wait(ms);
  });
};

async function load(state: unknown = null, hash = "#/home") {
  const { vi } = await import("vitest");
  vi.resetModules();
  history.replaceState(state, "", hash);
  y = 0;
  maxY = 10_000;
  mounts = 0;
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => y });
  window.scrollTo = ((a: number | ScrollToOptions, b?: number) => {
    const to = typeof a === "number" ? (b ?? 0) : (a.top ?? 0);
    y = Math.max(0, Math.min(to, maxY));
  }) as typeof window.scrollTo;
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  React = await import("react");
  act = React.act;
  nav = await import("./nav");
  const { createRoot } = await import("react-dom/client");
  const h = React.createElement;

  function Sheet({ onClose }: { onClose: () => void }) {
    nav.useBackClose(onClose);
    return null;
  }

  function Page({ route }: { route: string }) {
    const [q, setQ] = nav.useViewState("q", "");
    const [sheet, setSheet] = nav.useViewState("sheet", false);
    const [draft, setDraft] = nav.useViewState("sheet:draft", "");
    React.useEffect(() => {
      mounts++;
    }, []);
    page = { route, q, setQ, sheet, setSheet, draft, setDraft };
    return sheet ? h(Sheet, { onClose: () => setSheet(false) }) : null;
  }

  function App() {
    const parts = nav.useRoute();
    // like App.tsx: a page remounts per record, not per tab (the third part)
    return h(Page, { key: parts.slice(0, 2).join("/"), route: parts.join("/") });
  }

  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(h(App)));
  unmount = () => act(() => root.unmount());
  await settle();
}

const i = () => (history.state as { i?: number } | null)?.i;
const sheets = () => (history.state as { sheet?: number } | null)?.sheet ?? 0;
const go = async (...p: string[]) => {
  await act(async () => nav.go(...p));
  await settle();
};
const back = async (...parent: string[]) => {
  await act(async () => nav.back(...parent));
  await settle();
};
const browserBack = async () => {
  await act(async () => history.back());
  await settle();
};
const set = async (f: () => void) => {
  await act(async () => f());
  await settle(10);
};

beforeEach(async () => {
  await load();
});
afterEach(() => unmount());

describe("pages and back", () => {
  it("go adds an entry; back returns to the page before", async () => {
    const len = history.length;
    await go("clients");
    expect(page.route).toBe("clients");
    expect(history.length).toBe(len + 1);
    expect(i()).toBe(1);
    await back("home");
    expect(page.route).toBe("home");
    expect(i()).toBe(0);
  });

  it("back on a page opened directly goes to its parent without leaving the app", async () => {
    unmount();
    await load(null, "#/session/s1");
    const len = history.length;
    await back("client", "c1");
    expect(page.route).toBe("client/c1");
    expect(history.length).toBe(len);
    expect(location.hash).toBe("#/client/c1");
  });

  it("going where you already are adds no entry and scrolls to the top", async () => {
    await go("clients");
    y = 500;
    const len = history.length;
    await go("clients");
    expect(history.length).toBe(len);
    expect(y).toBe(0);
  });

  it("the phone's back button behaves like the page's back button", async () => {
    await go("client", "c1");
    await go("history", "c1", "ex1");
    await browserBack();
    expect(page.route).toBe("client/c1");
    await browserBack();
    expect(page.route).toBe("home");
  });

  it("forward returns to the page left with back, as it was", async () => {
    await go("clients");
    await set(() => page.setQ("ana"));
    await browserBack();
    await act(async () => history.forward());
    await settle();
    expect(page.route).toBe("clients");
    expect(page.q).toBe("ana");
  });

  it("parts are encoded and decoded", async () => {
    await go("history", "c1", "n:Hip hike / E");
    expect(page.route).toBe("history/c1/n:Hip hike / E");
  });
});

describe("view state", () => {
  it("is back as it was after going to another page and back", async () => {
    await go("clients");
    await set(() => page.setQ("ana"));
    await go("client", "c1");
    expect(page.q).toBe("");
    await back("clients");
    expect(page.route).toBe("clients");
    expect(page.q).toBe("ana");
  });

  it("starts clean when the same page is opened again as a new one", async () => {
    await go("clients");
    await set(() => page.setQ("ana"));
    await back("home");
    await go("clients");
    expect(page.q).toBe("");
  });

  it("the same page twice in the history keeps one state each", async () => {
    await go("session", "s1");
    await set(() => page.setQ("first"));
    await go("history", "c1", "ex1");
    await go("session", "s1");
    expect(page.q).toBe("");
    await set(() => page.setQ("second"));
    await back();
    await back();
    expect(page.route).toBe("session/s1");
    expect(page.q).toBe("first");
    await act(async () => history.forward());
    await settle();
    await act(async () => history.forward());
    await settle();
    expect(page.q).toBe("second");
  });

  it("a page that replaced another at the same position does not inherit its state", async () => {
    unmount();
    await load(null, "#/session/s1");
    await set(() => page.setQ("from session"));
    await back("client", "c1"); // opened directly: replaced in place
    expect(page.route).toBe("client/c1");
    expect(page.q).toBe("");
  });

  it("changing tab keeps the page's state and adds no entry", async () => {
    await go("client", "c1", "sessions");
    await set(() => page.setQ("x"));
    const len = history.length;
    await act(async () => nav.replaceRoute("client", "c1", "records"));
    await settle();
    expect(history.length).toBe(len);
    expect(page.route).toBe("client/c1/records");
    expect(page.q).toBe("x");
    await go("history", "c1", "ex1");
    await back();
    expect(page.route).toBe("client/c1/records");
    expect(page.q).toBe("x");
    await back();
    expect(page.route).toBe("home");
  });

  it("clearViewState forgets only the keys under the prefix", async () => {
    await go("session", "s1");
    await set(() => page.setQ("keep"));
    await set(() => page.setDraft("drop"));
    nav.clearViewState("sheet:");
    await go("history", "c1", "ex1");
    await back();
    expect(page.q).toBe("keep");
    expect(page.draft).toBe("");
  });

  it("survives a reload: pages write to the position they are at", async () => {
    unmount();
    await load({ i: 5 }, "#/session/s1");
    await set(() => page.setQ("after reload"));
    await go("history", "c1", "ex1");
    expect(i()).toBe(6);
    await back();
    expect(i()).toBe(5);
    expect(page.q).toBe("after reload");
  });

  it("functional updates see the latest value", async () => {
    await go("clients");
    await act(async () => {
      page.setQ("a");
    });
    const setQ = page.setQ as unknown as (f: (p: string) => string) => void;
    await act(async () => {
      setQ((p) => p + "b");
      setQ((p) => p + "c");
    });
    await go("client", "c1");
    await back();
    expect(page.q).toBe("abc");
  });
});

describe("scroll", () => {
  it("a new page starts at the top; back returns to where it was", async () => {
    await go("clients");
    y = 640;
    await go("client", "c1");
    expect(y).toBe(0);
    y = 120;
    await back();
    expect(y).toBe(640);
    await act(async () => history.forward());
    await settle();
    expect(y).toBe(120);
  });

  it("waits for the content to load before scrolling back", async () => {
    await go("clients");
    y = 900;
    await go("client", "c1");
    maxY = 0; // the page under has no data yet
    await act(async () => history.back());
    await settle(30);
    expect(y).toBe(0);
    maxY = 10_000; // data arrived
    await settle(80);
    expect(y).toBe(900);
  });

  it("stops restoring as soon as the user scrolls", async () => {
    await go("clients");
    y = 900;
    await go("client", "c1");
    maxY = 0;
    await act(async () => history.back());
    await settle(30);
    window.dispatchEvent(new Event("wheel"));
    maxY = 10_000;
    await settle(80);
    expect(y).toBe(0);
  });

  it("gives up when the page never gets tall enough", async () => {
    await go("clients");
    y = 900;
    await go("client", "c1");
    maxY = 300;
    await act(async () => history.back());
    await settle(1800);
    expect(y).toBe(300);
    maxY = 10_000;
    await settle(80);
    expect(y).toBe(300);
  });

  it("changing tab starts at the top", async () => {
    await go("client", "c1", "sessions");
    y = 400;
    await act(async () => nav.replaceRoute("client", "c1", "records"));
    await settle();
    expect(y).toBe(0);
  });

  it("each copy of the same page keeps its own scroll", async () => {
    await go("session", "s1");
    y = 300;
    await go("history", "c1", "ex1");
    await go("session", "s1");
    y = 50;
    await go("history", "c1", "ex1");
    await back();
    expect(y).toBe(50);
    await back();
    await back();
    expect(y).toBe(300);
  });
});

describe("sheets", () => {
  it("opening adds an entry; the back button closes it and stays on the page", async () => {
    await go("session", "s1");
    const len = history.length;
    await set(() => page.setSheet(true));
    expect(sheets()).toBe(1);
    expect(history.length).toBe(len + 1);
    await browserBack();
    expect(page.sheet).toBe(false);
    expect(page.route).toBe("session/s1");
    expect(sheets()).toBe(0);
  });

  it("closing it from the page removes its entry", async () => {
    await go("session", "s1");
    await set(() => page.setSheet(true));
    await set(() => page.setSheet(false));
    await settle();
    expect(sheets()).toBe(0);
    expect(page.route).toBe("session/s1");
    await back();
    expect(page.route).toBe("home");
  });

  it("back from a page with a sheet open leaves the page in one step", async () => {
    await go("session", "s1");
    await set(() => page.setSheet(true));
    await back("client", "c1");
    expect(page.route).toBe("home");
    expect(sheets()).toBe(0);
  });

  it("going to a page from a sheet: back returns to the sheet with its draft", async () => {
    await go("session", "s1");
    await set(() => page.setSheet(true));
    await set(() => page.setDraft("3x10 Hip thrust"));
    const base = i()!;
    await go("history", "c1", "ex1");
    expect(page.route).toBe("history/c1/ex1");
    expect(i()).toBe(base + 1);
    expect(sheets()).toBe(0);
    await back();
    expect(page.route).toBe("session/s1");
    expect(page.sheet).toBe(true);
    expect(page.draft).toBe("3x10 Hip thrust");
    expect(sheets()).toBe(1); // the reopened sheet has its back step again
    await browserBack();
    expect(page.sheet).toBe(false);
    expect(page.route).toBe("session/s1");
    await back();
    expect(page.route).toBe("home");
  });

  it("the page opened from a sheet starts clean, even at the position of an older page", async () => {
    await go("session", "s1");
    await go("clients");
    await set(() => page.setQ("old"));
    await back(); // to the session; "clients" (i=2) stays in the forward history
    await set(() => page.setSheet(true));
    await go("client", "c1"); // takes position 2
    expect(page.q).toBe("");
  });

  it("a sheet on a page opened directly: going on and back still works", async () => {
    unmount();
    await load(null, "#/session/s1");
    await set(() => page.setSheet(true));
    await go("history", "c1", "ex1");
    expect(i()).toBe(1);
    await back("client", "c1");
    expect(page.route).toBe("session/s1");
    expect(page.sheet).toBe(true);
  });

  it("a page that mounts once per visit", async () => {
    await go("session", "s1");
    const before = mounts;
    await set(() => page.setSheet(true));
    await browserBack();
    expect(mounts).toBe(before);
  });
});
