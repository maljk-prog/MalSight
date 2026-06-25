const workstations = [
  { left: "26%", top: "44%" },
  { left: "43%", top: "44%" },
  { left: "60%", top: "44%" },
  { left: "26%", top: "67%" },
  { left: "43%", top: "67%" },
  { left: "60%", top: "67%" },
];

export default function SocRpgBackdrop() {
  return (
    <div className="soc-rpg-backdrop" aria-hidden="true">
      <div className="soc-rpg-room">
        <div className="soc-rpg-label video">VIDEO WALL</div>
        <div className="soc-rpg-label stations">ANALYST WORKSTATIONS</div>
        <div className="soc-rpg-label cooler">COOLER</div>

        <div className="soc-rpg-door top-door" />
        <div className="soc-rpg-door bottom-door" />

        <div className="soc-rpg-manager-desk">
          <span />
          <span />
          <span />
        </div>

        <div className="soc-rpg-status-board">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="soc-rpg-video-wall">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="soc-rpg-racks">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>

        {workstations.map((desk, index) => (
          <div
            key={`${desk.left}-${desk.top}`}
            className="soc-rpg-workstation"
            style={{ left: desk.left, top: desk.top }}
          >
            <span />
            <span />
          </div>
        ))}

        <div className="soc-rpg-tools">
          <span />
          <span />
          <span />
        </div>

        <div className="soc-rpg-cooler" />
        <div className="soc-rpg-table">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="soc-rpg-lounge">
          <span />
          <span />
          <span />
        </div>

        {["12% 16%", "37% 32%", "55% 34%", "72% 30%", "83% 54%", "34% 68%", "58% 68%"].map(
          (position) => {
            const [left, top] = position.split(" ");
            return <div key={position} className="soc-rpg-plant" style={{ left, top }} />;
          },
        )}

        <div className="soc-rpg-character analyst-a">
          <span />
        </div>
        <div className="soc-rpg-character analyst-b">
          <span />
        </div>
        <div className="soc-rpg-character manager-walk">
          <span />
        </div>
        <div className="soc-rpg-character cooler-chat">
          <span />
        </div>
        <div className="soc-rpg-character janitor">
          <span />
        </div>
      </div>
    </div>
  );
}
