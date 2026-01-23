"use client";

import React, { useState, useRef, useEffect } from "react";
import { widgetRegistry } from "@/lib/widgets/registry";
import { useWidgets } from "@/lib/widgets/context";
import { WidgetConfig } from "@/lib/widgets/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Move, Maximize2 } from "lucide-react";

interface WidgetGridProps {
  className?: string;
}

export function WidgetGrid({ className }: WidgetGridProps) {
  const { widgets, isEditing, updateWidget, gridSettings } = useWidgets();
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [resizingWidgetId, setResizingWidgetId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    col: number;
    row: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const { cols: GRID_COLS, rows: GRID_ROWS } = gridSettings;

  const enabledWidgets = widgets.filter((w) => w.enabled);

  // Check if a position is occupied by any widget
  const isPositionOccupied = (
    col: number,
    row: number,
    width: number,
    height: number,
    excludeId?: string,
  ) => {
    if (
      col < 0 ||
      row < 0 ||
      col + width > GRID_COLS ||
      row + height > GRID_ROWS
    ) {
      return true;
    }

    return enabledWidgets.some((widget) => {
      if (excludeId && widget.id === excludeId) return false;
      const { x, y, width: wWidth, height: wHeight } = widget.position;
      const overlapX = !(col + width <= x || col >= x + wWidth);
      const overlapY = !(row + height <= y || row >= y + wHeight);
      return overlapX && overlapY;
    });
  };

  const getCellFromEvent = (
    e:
      | React.DragEvent
      | React.TouchEvent
      | React.MouseEvent
      | MouseEvent
      | TouchEvent,
  ) => {
    if (!gridRef.current) return null;

    const rect = gridRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      const touch = e.type === "touchend" ? e.changedTouches[0] : e.touches[0];
      clientX = touch?.clientX;
      clientY = touch?.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    if (clientX === undefined || clientY === undefined) return null;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const col = Math.floor((x / rect.width) * GRID_COLS);
    const row = Math.floor((y / rect.height) * GRID_ROWS);

    return {
      col: Math.max(0, Math.min(col, GRID_COLS - 1)),
      row: Math.max(0, Math.min(row, GRID_ROWS - 1)),
    };
  };

  const handleDragStart = (e: React.DragEvent, widget: WidgetConfig) => {
    if (resizingWidgetId) return; // Don't drag if resizing
    setDraggedWidgetId(widget.id);
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", widget.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setHoveredCell(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const cell = getCellFromEvent(e);
    if (cell) {
      if (
        !hoveredCell ||
        hoveredCell.col !== cell.col ||
        hoveredCell.row !== cell.row
      ) {
        setHoveredCell(cell);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const cell = getCellFromEvent(e);
    const widgetId = e.dataTransfer.getData("text/plain") || draggedWidgetId;

    if (cell && widgetId) {
      const widget = widgets.find((w) => w.id === widgetId);
      if (widget) {
        if (
          !isPositionOccupied(
            cell.col,
            cell.row,
            widget.position.width,
            widget.position.height,
            widget.id,
          )
        ) {
          try {
            await updateWidget(widgetId, {
              position: { ...widget.position, x: cell.col, y: cell.row },
            });
            toast.success("Widget moved");
          } catch (error) {
            toast.error("Failed to move widget");
          }
        } else {
          toast.error("Position occupied");
        }
      }
    }

    handleDragEnd();
  };

  // Resize logic
  const handleResizeStart = (
    e: React.MouseEvent | React.TouchEvent,
    widgetId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingWidgetId(widgetId);
  };

  useEffect(() => {
    if (!resizingWidgetId) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!gridRef.current) return;

      const widget = widgets.find((w) => w.id === resizingWidgetId);
      if (!widget) return;

      const rect = gridRef.current.getBoundingClientRect();
      let clientX, clientY;

      if ("touches" in e) {
        const touch = e.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Calculate which cell the mouse is over
      const cellCol = Math.floor((x / rect.width) * GRID_COLS);
      const cellRow = Math.floor((y / rect.height) * GRID_ROWS);

      const widgetDefinition = widgetRegistry.get(widget.type);
      const minWidth = widgetDefinition?.minSize?.width || 1;
      const minHeight = widgetDefinition?.minSize?.height || 1;

      // Calculate new size based on cell position
      const newWidth = Math.max(
        minWidth,
        Math.min(
          cellCol - widget.position.x + 1,
          GRID_COLS - widget.position.x,
        ),
      );
      const newHeight = Math.max(
        minHeight,
        Math.min(
          cellRow - widget.position.y + 1,
          GRID_ROWS - widget.position.y,
        ),
      );

      if (
        newWidth !== widget.position.width ||
        newHeight !== widget.position.height
      ) {
        if (
          !isPositionOccupied(
            widget.position.x,
            widget.position.y,
            newWidth,
            newHeight,
            widget.id,
          )
        ) {
          updateWidget(resizingWidgetId, {
            position: {
              ...widget.position,
              width: newWidth,
              height: newHeight,
            },
          });
        }
      }
    };

    const handleMouseUp = () => {
      setResizingWidgetId(null);
      toast.success("Widget resized");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [resizingWidgetId, widgets, updateWidget, GRID_COLS, GRID_ROWS]);

  const renderWidget = (widget: WidgetConfig) => {
    const definition = widgetRegistry.get(widget.type);
    if (!definition) return null;

    const WidgetComponent = definition.component;
    const { x, y, width, height } = widget.position;
    const isBeingDragged = draggedWidgetId === widget.id;
    const isBeingResized = resizingWidgetId === widget.id;

    return (
      <div
        key={widget.id}
        className={cn(
          "transition-all duration-200 z-10 relative group",
          "flex flex-col overflow-hidden",
          isEditing && "hover:ring-2 hover:ring-primary/20",
          isBeingDragged && "opacity-20 grayscale scale-95",
          isBeingResized && "ring-2 ring-primary z-30 shadow-2xl scale-[1.02]",
        )}
        style={{
          gridColumn: `${x + 1} / span ${width}`,
          gridRow: `${y + 1} / span ${height}`,
        }}
        draggable={isEditing && !resizingWidgetId}
        onDragStart={(e) => handleDragStart(e, widget)}
        onDragEnd={handleDragEnd}
      >
        {isEditing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity">
            <div className="bg-background/80 backdrop-blur-sm border rounded-full p-2 shadow-lg scale-75 group-hover:scale-100 transition-transform">
              <Move className="size-5 text-primary" />
            </div>
          </div>
        )}

        <WidgetComponent
          config={widget}
          onUpdateConfig={(updates) => updateWidget(widget.id, updates)}
          isEditing={isEditing}
        />

        {isEditing && (
          <div
            className="absolute bottom-0 right-0 size-8 cursor-nwse-resize z-30 flex items-end justify-end p-1 hover:scale-125 transition-transform pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, widget.id)}
            onTouchStart={(e) => handleResizeStart(e, widget.id)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-4 bg-primary rounded-tl-lg rounded-br-lg shadow-sm flex items-center justify-center">
              <Maximize2 className="size-2.5 text-primary-foreground rotate-90" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGridCells = () => {
    const cells = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        cells.push(
          <div
            key={`${col}-${row}`}
            className="border border-dashed border-muted-foreground/10 rounded-xl"
          />,
        );
      }
    }
    return cells;
  };

  const renderDragPreview = () => {
    if (!isEditing || !draggedWidgetId || !hoveredCell) return null;

    const draggedWidgetConfig = widgets.find((w) => w.id === draggedWidgetId);
    if (!draggedWidgetConfig) return null;

    const { width, height } = draggedWidgetConfig.position;
    const canDrop = !isPositionOccupied(
      hoveredCell.col,
      hoveredCell.row,
      width,
      height,
      draggedWidgetId,
    );

    return (
      <div
        className={cn(
          "absolute pointer-events-none border-2 rounded-2xl transition-all duration-75 z-20",
          canDrop
            ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            : "border-destructive bg-destructive/10",
        )}
        style={{
          gridColumn: `${hoveredCell.col + 1} / span ${width}`,
          gridRow: `${hoveredCell.row + 1} / span ${height}`,
        }}
      />
    );
  };

  const rowHeight = 120;
  const minHeight = GRID_ROWS * rowHeight + (GRID_ROWS - 1) * 16; // Add gap spacing

  return (
    <div
      ref={gridRef}
      className={cn(
        "relative w-full transition-all duration-300 p-4",
        isEditing &&
          "rounded-[2rem] bg-muted/20 ring-1 ring-border shadow-inner",
        className,
      )}
      style={{ minHeight: `${minHeight}px` }}
      onDragOver={isEditing ? handleDragOver : undefined}
      onDrop={isEditing ? handleDrop : undefined}
    >
      <div
        className="grid w-full h-full gap-4 relative"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, ${rowHeight}px)`,
        }}
      >
        {/* Background Grid Cells */}
        {isEditing && (
          <div
            className="absolute inset-0 grid gap-4 pointer-events-none opacity-30"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_ROWS}, ${rowHeight}px)`,
            }}
          >
            {renderGridCells()}
          </div>
        )}

        {/* Drag Preview */}
        {renderDragPreview()}

        {/* Widgets */}
        {enabledWidgets.map(renderWidget)}
      </div>
    </div>
  );
}
