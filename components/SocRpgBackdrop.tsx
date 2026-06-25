const workstationRows = [
  [
    { left: "28%", top: "46%" },
    { left: "40%", top: "46%" },
    { left: "52%", top: "46%" },
    { left: "64%", top: "46%" },
  ],
  [
    { left: "28%", top: "70%" },
    { left: "40%", top: "70%" },
    { left: "52%", top: "70%" },
    { left: "64%", top: "70%" },
  ],
];

export default function SocRpgBackdrop() {
  return (
    <div className="soc-rpg-backdrop" aria-hidden="true">
      <div className="soc-rpg-room">
        <div className="soc-rpg-label entrance">ENTRANCE</div>
        <div className="soc-rpg-label exit">EXIT</div>
        <div className="soc-rpg-label manager">OPERATIONS<br />MANAGER</div>
        <div className="soc-rpg-label board">STATUS<br />BOARD</div>
        <div className="soc-rpg-label video">VIDEO WALL</div>
        <div className="soc-rpg-label racks">SERVER<br />RACKS</div>
        <div className="soc-rpg-label stations">ANALYST WORKSTATIONS</div>
        <div className="soc-rpg-label tools">TOOLS &<br />STORAGE</div>
        <div className="soc-rpg-label cooler">COOLER</div>
        <div className="soc-rpg-label lounge">LOUNGE</div>

        <div className="soc-rpg-door top-door" />
        <div className="soc-rpg-door bottom-door" />
        <div className="soc-rpg-office manager-office" />
        <div className="soc-rpg-office tools-office" />

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

        {workstationRows.flat().map((desk) => (
          <div key={`${desk.left}-${desk.top}`} className="soc-rpg-workstation" style={desk}>
            <span className="monitor" />
            <span className="monitor" />
            <span className="keyboard" />
            <span className="chair" />
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

        {["17% 11%", "49% 10%", "60% 10%", "34% 30%", "70% 30%", "38% 48%", "56% 48%", "38% 72%", "56% 72%", "91% 52%", "94% 82%"].map(
          (position) => {
            const [left, top] = position.split(" ");
            return <div key={position} className="soc-rpg-plant" style={{ left, top }} />;
          },
        )}

        <div className="soc-rpg-character analyst-a">
          <span className="head" />
          <span className="hair" />
          <span className="feet" />
        </div>
        <div className="soc-rpg-character analyst-b">
          <span className="head" />
          <span className="hair" />
          <span className="feet" />
        </div>
        <div className="soc-rpg-character manager-walk">
          <span className="head" />
          <span className="hair" />
          <span className="feet" />
        </div>
        <div className="soc-rpg-character cooler-chat">
          <span className="head" />
          <span className="hair" />
          <span className="feet" />
        </div>
        <div className="soc-rpg-character janitor">
          <span className="head" />
          <span className="hair" />
          <span className="feet" />
        </div>
      </div>
    </div>
  );
}
