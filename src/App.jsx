import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { BY_ID, STARTER_IDS } from "./data/catalog.js";
import { generate, learn, validity } from "./engine/wardrobe.js";
import { createStorage, freshState } from "./services/storage.js";
import { event, appendEvents } from "./services/analytics.js";
import { ColorFilters } from "./components/Garment.jsx";
import Empty from "./components/Empty.jsx";
import Closet from "./pages/Closet.jsx";
import Swipe from "./pages/Swipe.jsx";
import Builder from "./pages/Builder.jsx";
import Style from "./pages/Style.jsx";
import Missing from "./pages/Missing.jsx";
import Onboarding from "./pages/Onboarding.jsx";
const adapter = createStorage({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
const navigation = [
  ["closet", "Closet"],
  ["outfits", "Outfits"],
  ["style", "My style"],
  ["missing", "Missing"],
];
const urlPage = () => {
  const p = location.hash.slice(1);
  return ["closet", "swipe", "outfits", "style", "missing"].includes(p)
    ? p
    : "closet";
};
export default function App() {
  const [loaded] = useState(() => adapter.load());
  const [state, setState] = useState(loaded.state);
  const [storageError, setStorageError] = useState(loaded.error);
  const [page, setPage] = useState(urlPage);
  const [notice, setNotice] = useState("");
  const profile = useMemo(() => learn(state.feedback), [state.feedback]);
  useEffect(() => {
    setStorageError(adapter.save(state));
  }, [state]);
  useEffect(() => {
    const change = () => setPage(urlPage());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const navigate = (p) => {
    location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const track = (name, properties) =>
    setState((s) => appendEvents(s, event(name, properties)));
  const owned = state.closet.map((id) => BY_ID[id]);
  const candidates = useMemo(() => generate(state.closet), [state.closet]);
  const ready = candidates.length > 0;
  const start = () => {
    if (!ready) return;
    setState((s) =>
      appendEvents(
        { ...s, onboarded: true },
        event("closet_completed", { count: s.closet.length }),
      ),
    );
    navigate("swipe");
  };
  const toggle = (id) => {
    setState((s) => {
      const removing = s.closet.includes(id);
      const closet = removing
        ? s.closet.filter((i) => i !== id)
        : [...s.closet, id];
      return appendEvents(
        {
          ...s,
          closet,
          saved: s.saved.filter((o) => !validity(o, closet).length),
          generated: s.generated.filter((o) => !validity(o, closet).length),
        },
        event(removing ? "closet_item_removed" : "closet_item_added", { id }),
      );
    });
  };
  if (!state.onboarded) {
    return (
      <>
        <ColorFilters />
        <Onboarding {...{ state, setState, storageError }} onComplete={start} />
      </>
    );
  }
  return (
    <>
      <ColorFilters />
      <header className="header">
        <a className="wordmark" href="#closet" aria-label="Wearwell home">
          wearwell<span>✳</span>
        </a>
        <nav aria-label="Main navigation">
          {navigation.map(([key, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => navigate(key)}
              aria-current={page === key ? "page" : undefined}
            >
              {label}
              {key === "missing" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <button className="taste-status" onClick={() => navigate("style")}>
          <span className="avatar">Y</span>
          <span>
            Your wardrobe,
            <br />
            <b>
              {state.feedback.length
                ? "getting to know you"
                : "a little more you"}
            </b>
          </span>
        </button>
      </header>
      {storageError && (
        <div className="error-banner" role="alert">
          {storageError}
        </div>
      )}
      <main>
        {page === "closet" && (
          <Closet
            {...{ state, owned, toggle, start, ready }}
            onStarter={() => {
              setState((s) => {
                const closet = [...new Set([...s.closet, ...STARTER_IDS])];
                return appendEvents(
                  { ...s, closet },
                  ...STARTER_IDS.filter((id) => !s.closet.includes(id)).map(
                    (id) =>
                      event("closet_item_added", { id, source: "starter" }),
                  ),
                );
              });
              setNotice("18 everyday pieces added. Make them yours.");
            }}
          />
        )}
        {page === "swipe" &&
          (ready ? (
            <Swipe
              {...{ state, setState, profile, candidates, track }}
              onBuilder={() => navigate("outfits")}
            />
          ) : (
            <Empty
              title="A few pieces make a world of outfits."
              text="Add at least one top, bottom and pair of shoes to start learning your taste."
              action="Build my closet"
              onClick={() => navigate("closet")}
            />
          ))}
        {page === "outfits" &&
          (ready ? (
            <Builder
              {...{ state, setState, profile, candidates, track }}
              notify={setNotice}
              onLearn={() => navigate("swipe")}
            />
          ) : (
            <Empty
              title="Let's give your style a starting point."
              text="Add a top, a bottom and shoes to your closet. Then we can put them together."
              action="Build my closet"
              onClick={() => navigate("closet")}
            />
          ))}
        {page === "style" && (
          <>
            <Style
              {...{ profile, state }}
              onLearn={() => (ready ? navigate("swipe") : navigate("closet"))}
            />
            <button
              className="demo-reset"
              onClick={() => {
                if (
                  window.confirm(
                    "Start fresh? This clears the closet, ratings and saved looks in this browser.",
                  )
                ) {
                  setState(freshState());
                  navigate("closet");
                  setNotice(
                    "A fresh start. Your next closet is yours to build.",
                  );
                }
              }}
            >
              Start a fresh demo
            </button>
          </>
        )}
        {page === "missing" &&
          (ready ? (
            <Missing {...{ state, profile, track }} />
          ) : (
            <Empty
              title="First, the pieces you already love."
              text="Build a small closet so we can find what would make it go further."
              action="Build my closet"
              onClick={() => navigate("closet")}
            />
          ))}
      </main>
      <footer className="site-footer">
        <span>LESS GUESSWORK. MORE YOU.</span>
        <span>
          Your closet stays in this browser.{" "}
          <span className="tiny-star">✳</span>
        </span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
    </>
  );
}
