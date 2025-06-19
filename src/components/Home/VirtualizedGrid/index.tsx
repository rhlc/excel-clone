import { useState, useCallback, useMemo, useRef } from "react";
import { FixedSizeGrid as Grid } from "react-window";

const COLUMN_WIDTH = 80;
const ROW_HEIGHT = 30;
const TOTAL_COLUMNS = 10000;
const TOTAL_ROWS = 10000;

const getCellKey = (row: number, col: number) => `${row},${col}`;

const cellKeyToLabel = (row: number, col: number) => {
  let colLabel = '';
  let colNum = col;
  while (colNum >= 0) {
    colLabel = String.fromCharCode(65 + (colNum % 26)) + colLabel;
    colNum = Math.floor(colNum / 26) - 1;
    if (colNum < 0) break;
  }
  return `${colLabel}${row + 1}`;
};

const labelToCellKey = (label: string): string | null => {
  const match = label.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const [, colLetters, rowStr] = match;
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 65 + 1);
  }
  return `${parseInt(rowStr) - 1},${col - 1}`;
};

interface ICell {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    getValue: (row: number, col: number) => string;
    setValue: (row: number, col: number, value: string) => void;
    displayValue: (row: number, col: number) => string;
    selectedCell: { row: number; col: number } | null;
    setSelectedCell: (row: number, col: number) => void;
  };
}

const Cell: React.FC<ICell> = ({ columnIndex, rowIndex, style, data }) => {
  const value = data.getValue(rowIndex, columnIndex);
  const display = data.displayValue(rowIndex, columnIndex);
  const isSelected = data.selectedCell?.row === rowIndex && data.selectedCell?.col === columnIndex;
  const cellLabel = cellKeyToLabel(rowIndex, columnIndex);

  return (
    <div 
      style={{ 
        ...style, 
        padding: "0",
        border: isSelected ? ".1px solid #007acc" : ".1px solid #ddd"
      }}
      onClick={() => data.setSelectedCell(rowIndex, columnIndex)}
    >
      <div style={{ 
        position: "relative", 
        height: "100%", 
        display: "flex", 
        flexDirection: "column" 
      }}>
        <div style={{
          fontSize: "8px",
          color: "#666",
          position: "absolute",
          top: "1px",
          left: "2px",
          pointerEvents: "none"
        }}>
          {cellLabel}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => data.setValue(rowIndex, columnIndex, e.target.value)}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            outline: "none",
            padding: "12px 2px 2px 2px",
            boxSizing: "border-box",
            backgroundColor: value.startsWith("=") ? "#f0f8ff" : "transparent",
            fontSize: "11px"
          }}
          title={value.startsWith("=") ? `Formula: ${value}` : `Value: ${display}`}
        />
        {value.startsWith("=") && value !== display && (
          <div style={{ 
            fontSize: "9px", 
            color: "#333", 
            position: "absolute",
            bottom: "1px",
            right: "2px",
            backgroundColor: "rgba(255,255,255,0.8)",
            padding: "0 2px"
          }}>
            {display}
          </div>
        )}
      </div>
    </div>
  );
};

const VirtualizedGrid = () => {
  const [gridData, setGridData] = useState<{ [key: string]: string }>({
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const calculationCache = useRef<{ [key: string]: string }>({});

  const getValue = useCallback(
    (row: number, col: number) => gridData[getCellKey(row, col)] || "",
    [gridData]
  );

  const setValue = useCallback((row: number, col: number, value: string) => {
    setGridData((prev) => ({
      ...prev,
      [getCellKey(row, col)]: value,
    }));
    calculationCache.current = {};
  }, []);

  const displayValue = useCallback(
    (row: number, col: number): string => {
      const cellKey = getCellKey(row, col);
      if (calculationCache.current[cellKey]) {
        return calculationCache.current[cellKey];
      }

      const raw = getValue(row, col);
      if (!raw.startsWith("=")) {
        calculationCache.current[cellKey] = raw;
        return raw;
      }

      const expr = raw.slice(1);
      try {
        const referencedCells = new Set<string>();
        
        const parsedExpr = expr.replace(/[A-Z]+\d+/g, (label) => {
          const key = labelToCellKey(label);
          if (!key) return "0";
          
          if (referencedCells.has(key) || key === cellKey) {
            throw new Error("Circular reference");
          }
          referencedCells.add(key);

          const val = gridData[key];
          if (!val) return "0";
          if (val.startsWith("=")) {
            const [refRow, refCol] = key.split(",").map(Number);
            return displayValue(refRow, refCol);
          }
          return isNaN(Number(val)) ? `"${val}"` : val;
        });

        const result = new Function(`return ${parsedExpr}`)();
        const displayResult = result?.toString() ?? "ERR";
        calculationCache.current[cellKey] = displayResult;
        return displayResult;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "ERR";
        calculationCache.current[cellKey] = errorMsg;
        return errorMsg;
      }
    },
    [gridData, getValue]
  );

  const handleCellSelection = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
  }, []);

  const itemData = useMemo(() => ({
    getValue,
    setValue,
    displayValue,
    selectedCell,
    setSelectedCell: handleCellSelection
  }), [getValue, setValue, displayValue, selectedCell, handleCellSelection]);

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {selectedCell && (
        <div style={{
          position: "fixed",
          top: "10px",
          left: "10px",
          background: "white",
          padding: "0",
          border: "1px solid lightgrey",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 1000
        }}>
          <strong>Cell {cellKeyToLabel(selectedCell.row, selectedCell.col)}:</strong>{" "}
          {getValue(selectedCell.row, selectedCell.col) || "(empty)"}
        </div>
      )}
      <Grid
        columnCount={TOTAL_COLUMNS}
        rowCount={TOTAL_ROWS}
        columnWidth={COLUMN_WIDTH}
        rowHeight={ROW_HEIGHT}
        height={window.innerHeight}
        width={window.innerWidth}
        itemData={itemData}
      >
        {Cell}
      </Grid>
    </div>
  );
};

export default VirtualizedGrid;
