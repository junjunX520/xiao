export default function StudioWaveTitle({ text }) {
  let glyphIndex = 0;
  const tokens = String(text).split(/(\s+)/);

  return (
    <h2
      id="studio-title"
      className="studio-wave-title"
      aria-label={String(text)}
    >
      <span className="sr-only">{text}</span>
      {tokens.map((token, tokenIndex) => {
        if (!token) return null;
        if (/^\s+$/.test(token)) return ' ';

        return (
          <span className="studio-wave-word" aria-hidden="true" key={tokenIndex}>
            {[...token].map((char, charIndex) => (
              <span
                className="studio-wave-char"
                style={{ '--wave-index': glyphIndex++ }}
                key={`${charIndex}-${char}`}
              >
                {char}
              </span>
            ))}
          </span>
        );
      })}
    </h2>
  );
}
