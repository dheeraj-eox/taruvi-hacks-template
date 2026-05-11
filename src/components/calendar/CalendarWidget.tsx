import { Box, Typography, IconButton, Tooltip, CircularProgress } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useMemo } from "react";

export type DayStatus = "available" | "full" | "blocked" | "no_slots" | "partial" | null;

export interface DayData {
  status: DayStatus;
  openSlots?: number;
  label?: string;
}

interface CalendarWidgetProps {
  year: number;
  month: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
  onDayClick: (dateStr: string) => void;
  selectedDate: string | null;
  dayData: Record<string, DayData>; // "YYYY-MM-DD" -> DayData
  isLoading?: boolean;
  minDate?: string; // "YYYY-MM-DD", defaults to today
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Mo","Tu","We","Th","Fr","Sa","Su"];

const STATUS_STYLE: Record<string, { bg: string; dot: string; label: string }> = {
  available: { bg: "#4CAF5018", dot: "#4CAF50", label: "Available" },
  full:      { bg: "#FF980018", dot: "#FF9800", label: "Fully booked" },
  blocked:   { bg: "#F4433618", dot: "#F44336", label: "Blocked" },
  no_slots:  { bg: "transparent", dot: "#9E9E9E", label: "No slots" },
  partial:   { bg: "#2196F318", dot: "#2196F3", label: "Partially available" },
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export const CalendarWidget = ({
  year, month, onMonthChange, onDayClick,
  selectedDate, dayData, isLoading, minDate,
}: CalendarWidgetProps) => {
  const today = new Date().toISOString().split("T")[0];
  const effectiveMin = minDate ?? today;

  const { cells, weeks } = useMemo(() => {
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const startPad = (firstDow + 6) % 7; // Monday-first offset
    const daysInMonth = new Date(year, month, 0).getDate();
    const total = startPad + daysInMonth;
    const weeks = Math.ceil(total / 7);
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return { cells, weeks };
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <IconButton size="small" onClick={prevMonth}><ChevronLeftIcon /></IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {MONTH_NAMES[month - 1]} {year}
          </Typography>
          {isLoading && <CircularProgress size={14} />}
        </Box>
        <IconButton size="small" onClick={nextMonth}><ChevronRightIcon /></IconButton>
      </Box>

      {/* Day-of-week headers */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.5 }}>
        {DAY_NAMES.map((d) => (
          <Typography key={d} variant="caption" align="center" color="text.secondary" fontWeight={600}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {cells.map((day, idx) => {
          if (!day) return <Box key={`e-${idx}`} />;

          const dateStr = toDateStr(year, month, day);
          const isPast = dateStr < effectiveMin;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const data = dayData[dateStr];
          const style = data?.status ? STATUS_STYLE[data.status] : null;

          return (
            <Tooltip
              key={dateStr}
              title={
                isPast ? "Past" :
                data?.status ? (data.label ?? style?.label ?? data.status) : ""
              }
              placement="top"
            >
              <Box
                onClick={() => !isPast && onDayClick(dateStr)}
                sx={{
                  position: "relative",
                  height: 40,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1.5,
                  cursor: isPast ? "default" : "pointer",
                  bgcolor: isSelected
                    ? "primary.main"
                    : style
                    ? style.bg
                    : "transparent",
                  border: "1px solid",
                  borderColor: isSelected
                    ? "primary.main"
                    : isToday
                    ? "primary.light"
                    : "transparent",
                  transition: "all 0.12s",
                  "&:hover": isPast
                    ? {}
                    : { bgcolor: isSelected ? "primary.dark" : "action.hover", borderColor: "primary.light" },
                  outline: isToday && !isSelected ? "2px solid" : "none",
                  outlineColor: "primary.light",
                  outlineOffset: "-1px",
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={isSelected || isToday ? 700 : 400}
                  color={
                    isSelected ? "primary.contrastText" :
                    isPast ? "text.disabled" : "text.primary"
                  }
                  sx={{ lineHeight: 1 }}
                >
                  {day}
                </Typography>

                {/* Status dot */}
                {style && !isPast && (
                  <Box
                    sx={{
                      width: 4, height: 4, borderRadius: "50%",
                      bgcolor: isSelected ? "rgba(255,255,255,0.8)" : style.dot,
                      mt: 0.3,
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Legend */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1.5 }}>
        {(["available", "full", "blocked", "no_slots"] as DayStatus[]).map((s) => {
          if (!s) return null;
          const st = STATUS_STYLE[s];
          return (
            <Box key={s} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: st.dot }} />
              <Typography variant="caption" color="text.secondary">{st.label}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
