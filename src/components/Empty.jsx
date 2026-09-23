import { Shirt, ArrowRight } from "lucide-react";
export default function Empty({ title, text, action, onClick }) {
  return (
    <section className="empty">
      <Shirt size={42} />
      <h1>{title}</h1>
      <p>{text}</p>
      <button className="primary" onClick={onClick}>
        {action}
        <ArrowRight size={18} />
      </button>
    </section>
  );
}
