type ServeControlProps = {
  disabled: boolean;
  totalPct: number;
  onServe: () => void;
};

export function ServeControl({ disabled, totalPct, onServe }: ServeControlProps) {
  return (
    <button className="serve-button" type="button" disabled={disabled} onClick={onServe}>
      <span>SERVE</span>
      <small>{totalPct > 0 ? `${totalPct}% · READY` : "EMPTY GLASS"}</small>
    </button>
  );
}
