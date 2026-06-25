const characterPositions = [
  { className: "analyst-a" },
  { className: "analyst-b" },
  { className: "manager-walk" },
  { className: "cooler-chat" },
  { className: "janitor" },
];

export default function SocRpgBackdrop() {
  return (
    <div className="soc-rpg-backdrop" aria-hidden="true">
      <img
        className="soc-rpg-room-image"
        src="/assets/soc-room-reference.png"
        alt=""
        draggable={false}
      />

      {characterPositions.map((character) => (
        <div
          key={character.className}
          className={`soc-rpg-character ${character.className}`}
        >
          <span className="sprite-shadow" />
          <img
            className="agent-frame front"
            src="/assets/agent-sprites/agent-front.png"
            alt=""
            draggable={false}
          />
          <img
            className="agent-frame back"
            src="/assets/agent-sprites/agent-back.png"
            alt=""
            draggable={false}
          />
          <img
            className="agent-frame left"
            src="/assets/agent-sprites/agent-left.png"
            alt=""
            draggable={false}
          />
          <img
            className="agent-frame right"
            src="/assets/agent-sprites/agent-right.png"
            alt=""
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
