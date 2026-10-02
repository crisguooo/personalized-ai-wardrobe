import { useLanguage, LanguageSwitcher } from "./i18n/Language.jsx";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { BY_ID } from "./data/catalog.js";
import { sampleDemoCloset } from "./engine/demo-closet.js";
import { learn, validity } from "./engine/wardrobe.js";
import { weatherCandidates, today } from "./engine/weather.js";
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
import Today from "./pages/Today.jsx";
const adapter = createStorage({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
const navigation = [
  ["today", "Today"],
  ["closet", "Closet"],
  ["outfits", "Outfits"],
  ["style", "My style"],
  ["missing", "Missing"],
];
const urlPage = () => {
  const p = location.hash.slice(1);
  return ["today", "closet", "swipe", "outfits", "style", "missing"].includes(p)
    ? p
    : "today";
};
export default function App() {
  const { t } = useLanguage();
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
  const candidates = useMemo(
    () =>
      state.onboarded && page === "swipe"
        ? weatherCandidates(
            state.closet,
            profile,
            state.weather?.date === today() ? state.weather : undefined,
            state.thermalOverrides,
          )
        : [],
    [
      state.closet,
      profile,
      state.weather,
      state.thermalOverrides,
      state.onboarded,
      page,
    ],
  );
  const ready = ["top", "bottom", "shoes"].every((category) =>
    owned.some((i) => i.category === category),
  );
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
          saved: s.saved.filter(
            (o) => !validity(o, closet, { physical: false }).length,
          ),
          generated: s.generated.filter((o) => !validity(o, closet).length),
        },
        event(removing ? "closet_item_removed" : "closet_item_added", { id }),
      );
    });
  };
  const addDemoClothes = (advance = false) => {
    const addedIds = sampleDemoCloset(state.closet);
    setState((s) => {
      const closet = [...new Set([...s.closet, ...addedIds])];
      if (closet.length === s.closet.length && !advance) return s;
      return appendEvents(
        { ...s, closet, setupPhase: advance ? "weather" : s.setupPhase },
        event("demo_closet_loaded", { added: closet.length - s.closet.length }),
      );
    });
  };
  if (!state.onboarded) {
    return (
      <>
        <ColorFilters />
        <div className="onboarding-language">
          <LanguageSwitcher />
        </div>
        {state.setupPhase === "edit" ? (
          <main>
            <Closet
              {...{ state, owned, toggle, ready }}
              onAddDemo={() => addDemoClothes()}
              start={() => setState((s) => ({ ...s, setupPhase: "weather" }))}
            />
          </main>
        ) : state.setupPhase === "weather" ? (
          <Today
            {...{ state, setState, profile }}
            onboarding
            onComplete={start}
            onCloset={() => setState((s) => ({ ...s, setupPhase: "edit" }))}
          />
        ) : (
          <Onboarding
            {...{ state, setState, storageError }}
            onDemo={() => addDemoClothes(true)}
            onComplete={() =>
              setState((s) => ({ ...s, setupPhase: "weather" }))
            }
          />
        )}
      </>
    );
  }
  return (
    <>
      <ColorFilters />
      <header className="header">
        <a className="wordmark" href="#closet" aria-label={t("Wearwell home")}>
          wearwell<span>✳</span>
        </a>
        <nav aria-label={t("Main navigation")}>
          {navigation.map(([key, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => navigate(key)}
              aria-current={page === key ? "page" : undefined}
            >
              {t(label)}
              {key === "missing" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="taste-status" onClick={() => navigate("style")}>
            <span className="avatar">Y</span>
            <span>
              {t("Your wardrobe,")}
              <br />
              <b>
                {t(
                  state.feedback.length
                    ? "getting to know you"
                    : "a little more you",
                )}
              </b>
            </span>
          </button>
          <LanguageSwitcher />
        </div>
      </header>
      {storageError && (
        <div className="error-banner" role="alert">
          {t(storageError)}
        </div>
      )}
      <main>
        {page === "today" && (
          <Today
            {...{ state, setState, profile }}
            onComplete={() => (ready ? navigate("swipe") : navigate("closet"))}
            onCloset={() => navigate("closet")}
          />
        )}
        {page === "closet" && (
          <Closet
            {...{ state, owned, toggle, ready }}
            start={() => navigate("today")}
            onAddDemo={() => addDemoClothes()}
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
              title={t("A few pieces make a world of outfits.")}
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
              onWeather={() => navigate("today")}
            />
          ) : (
            <Empty
              title={t("Let's give your style a starting point.")}
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
                    t(
                      "Start fresh? This clears the closet, ratings and saved looks in this browser.",
                    ),
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
              {t("Start a fresh demo")}
            </button>
          </>
        )}
        {page === "missing" &&
          (ready ? (
            <Missing
              {...{ state, profile, track }}
              onAdd={(id) => {
                if (!BY_ID[id]) return;
                setState((s) =>
                  s.closet.includes(id)
                    ? s
                    : appendEvents(
                        { ...s, closet: [...s.closet, id] },
                        event("closet_item_added", { id, source: "missing" }),
                      ),
                );
              }}
            />
          ) : (
            <Empty
              title={t("First, the pieces you already love.")}
              text="Build a small closet so we can find what would make it go further."
              action="Build my closet"
              onClick={() => navigate("closet")}
            />
          ))}
      </main>
      <footer className="site-footer">
        <span>{t("LESS GUESSWORK. MORE YOU.")}</span>
        <span>
          {t("Your closet stays in this browser.")}
          {t(" ")}
          <span className="tiny-star">✳</span>
        </span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {t(notice)}
        </div>
      )}
    </>
  );
}
