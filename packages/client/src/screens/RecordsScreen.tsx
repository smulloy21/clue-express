import { useEffect, useState } from "react";
import { getRecords, type GameRecordDto } from "../api/client.js";

interface RecordsScreenProps {
  onBack: () => void;
}

export function RecordsScreen({ onBack }: RecordsScreenProps) {
  const [records, setRecords] = useState<GameRecordDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRecords()
      .then((res) => {
        if (!cancelled) setRecords(res.records);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your records.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="screen">
      <div className="panel stack">
        <div className="row row-between">
          <h2>Your records</h2>
          <button type="button" className="btn" onClick={onBack}>
            Back
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
        {!records && !error && <p className="muted">Loading…</p>}
        {records && records.length === 0 && <p className="muted">No finished games yet.</p>}

        {records && records.length > 0 && (
          <table className="records">
            <thead>
              <tr>
                <th>Date</th>
                <th>Result</th>
                <th>Opponents</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.finishedAt).toLocaleString()}</td>
                  <td>{record.humanWon ? "Won" : "Lost"}</td>
                  <td>
                    {record.participants
                      .filter((p) => p.type === "bot")
                      .map((p) => p.difficulty)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
