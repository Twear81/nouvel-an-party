// Chaque caractère dans une case de largeur fixe : un compteur ne « danse » pas à cause des chiffres plus ou moins larges.
export function Digits({ text }: { text: string }) {
  return (
    <>
      {[...text].map((c, i) => (
        <span key={i} className="inline-block text-center" style={{ width: c === "," ? "0.4em" : c === "+" || c === "−" ? "0.7em" : "0.8em" }}>
          {c}
        </span>
      ))}
    </>
  );
}
