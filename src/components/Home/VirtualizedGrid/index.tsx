import { useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";

const COLUMN_WIDTH = 100;
const ROW_HEIGHT = 30;
const TOTAL_COLUMNS = 10000;
const TOTAL_ROWS = 10000;

interface ICell {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
}
const Cell: React.FC<ICell> = ({ columnIndex, rowIndex, style }) => {
  const [value, setValue] = useState(`Cell ${rowIndex}, ${columnIndex}`);

  return (
    <div style={{ ...style, padding: "4px" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          outline: "none",
          padding: 0,
          boxSizing: "border-box",
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
};

const VirtualizedGrid = () => (
  <Grid
    columnCount={TOTAL_COLUMNS}
    rowCount={TOTAL_ROWS}
    columnWidth={COLUMN_WIDTH}
    rowHeight={ROW_HEIGHT}
    height={window.innerHeight}
    width={window.innerWidth}
  >
    {Cell}
  </Grid>
);

export default VirtualizedGrid;
