"use client";

import { Fragment, type ReactNode } from "react";
import { GRID_SIZE } from "@/lib/battleship10";
import { colLabel, rowLabel } from "@/lib/battleship10Grid";

type Props = {
  renderCell: (row: number, col: number) => ReactNode;
  className?: string;
};

export function Battleship10LabeledGrid({ renderCell, cellInteractive, className }: Props) {
  return (
    <div className={className}>
      <div
        className="grid gap-0.5 sm:gap-1"
        style={{
          gridTemplateColumns: `minmax(1.25rem, auto) repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        }}
      >
        <div className="h-4 sm:h-5" aria-hidden />
        {Array.from({ length: GRID_SIZE }, (_, col) => (
          <div
            key={`col-${col}`}
            className="flex h-4 items-end justify-center pb-0.5 font-mono text-[9px] font-bold text-slate-500 sm:h-5 sm:text-[10px]"
          >
            {colLabel(col)}
          </div>
        ))}

        {Array.from({ length: GRID_SIZE }, (_, row) => (
          <Fragment key={`row-${row}`}>
            <div className="flex items-center justify-end pr-1 font-mono text-[9px] font-bold text-slate-500 sm:text-[10px]">
              {rowLabel(row)}
            </div>
            {Array.from({ length: GRID_SIZE }, (_, col) => (
              <div key={`${row}-${col}`} className="min-w-0">
                {renderCell(row, col)}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
