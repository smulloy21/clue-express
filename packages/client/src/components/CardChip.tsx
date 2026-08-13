import { categoryOfCard, type CardName } from "@clue/engine";

export function CardChip({ card }: { card: CardName }) {
  const category = categoryOfCard(card);
  return (
    <span className="card-chip">
      <span className={`category-dot category-${category}`} />
      {card}
    </span>
  );
}
