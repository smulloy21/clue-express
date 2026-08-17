export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box stack how-to-play">
        <h3>How to play</h3>

        <p>
          You're one of three detectives — you and two AI opponents — trying to work out the secret
          solution: which suspect, which weapon, and which room. Six cards from each category are
          dealt across the three hands; the remaining three (one per category) are hidden in the
          envelope as the solution.
        </p>

        <h4>Opponents</h4>
        <p className="muted">
          Set a difficulty for each opponent. Hard bots track failed disprovals and narrow down
          possibilities more aggressively — pick Easy for a gentler game.
        </p>

        <h4>Mode</h4>
        <p className="muted">
          <strong>Normal</strong> — you take your own notes. The Detective Notepad starts prefilled
          with only your own hand; click any cell to mark it yes, no, or unknown as you work it out
          yourself.
        </p>
        <p className="muted">
          <strong>Training</strong> — the notepad fills in automatically, and after every turn the
          game pauses to explain exactly what was just revealed and what could be deduced from it. A
          good way to learn the reasoning before switching to Normal.
        </p>

        <h4>Playing a turn</h4>
        <p className="muted">
          On your turn, guess a suspect, weapon, and room — any cards, including your own. The next
          player who holds a matching card must privately show you one; if nobody can, that becomes
          public information. Once you're confident you know the full solution, accuse: get it right
          and you win immediately; get it wrong and you're out of the running to win (though you may
          still be asked to disprove other players' guesses).
        </p>

        <h4>Daily challenge</h4>
        <p className="muted">
          Optional. Everyone who plays it on a given day gets the same secret deal, so you can
          compare notes with others playing that day.
        </p>

        <div className="row">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
