import { useLanguage } from "../i18n/Language.jsx";
import { Shirt, ArrowRight } from "lucide-react";
export default function Empty({ title, text, action, onClick }) {
  const { t } = useLanguage();
  return (
    <section className="empty">
      <Shirt size={42} />
      <h1>{t(title)}</h1>
      <p>{t(text)}</p>
      <button className="primary" onClick={onClick}>
        {t(action)}
        <ArrowRight size={18} />
      </button>
    </section>
  );
}
