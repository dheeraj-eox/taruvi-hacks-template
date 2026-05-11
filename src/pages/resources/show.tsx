import { useState, useMemo, useEffect } from "react";
import { useOne, useNotification, useCustom } from "@refinedev/core";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  Box, Card, CardContent, Typography, Chip, Button, TextField,
  CircularProgress, Divider, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Skeleton, InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventIcon from "@mui/icons-material/Event";
import PeopleIcon from "@mui/icons-material/People";
import LockIcon from "@mui/icons-material/Lock";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { CalendarWidget, DayData } from "../../components/calendar/CalendarWidget";
import { executeFunction } from "../../utils/functionHelpers";

const SLOT_TYPE_COLORS: Record<string, string> = {
  open: "#4CAF50", blocked: "#F44336", exclusive: "#9C27B0",
  tentative: "#FF9800", hold: "#607D8B", waitlist: "#2196F3",
};

const AVAIL_TYPE_LABELS: Record<string, string> = {
  free_form: "Free Booking", slot_based: "Slot-Based",
  request_based: "Request Required", scheduled: "Scheduled",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDT = (dateStr: string, hour: number, min = 0) =>
  `${dateStr}T${pad(hour)}:${pad(min)}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const todayStr = () => new Date().toISOString().split("T")[0];

function validateBooking(opts: {
  availType: string; startTime: string; endTime: string;
  amount: number; availableCapacity: number;
  selectedSlotId: string | null; validations: any;
}): string[] {
  const { availType, startTime, endTime, amount, availableCapacity, selectedSlotId, validations } = opts;
  const errors: string[] = [];
  const isSlotBased = availType === "slot_based" || availType === "scheduled";

  if (isSlotBased) {
    if (!selectedSlotId) errors.push("Please select a time slot.");
  } else {
    if (!startTime) errors.push("Start time is required.");
    if (!endTime) errors.push("End time is required.");
    if (startTime && endTime) {
      const start = new Date(startTime), end = new Date(endTime), now = new Date();
      if (start <= now) errors.push("Start time must be in the future.");
      if (end <= start) errors.push("End time must be after start time.");
      const durMins = (end.getTime() - start.getTime()) / 60000;
      const maxDur = validations?.max_booking_duration_minutes;
      if (maxDur && durMins > maxDur) {
        const h = Math.floor(maxDur / 60), m = maxDur % 60;
        errors.push(`Max duration: ${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}min` : ""}.`);
      }
      const minLead = validations?.min_lead_time_minutes ?? 0;
      if (minLead) {
        const leadMins = (start.getTime() - now.getTime()) / 60000;
        if (leadMins < minLead) {
          const h = Math.floor(minLead / 60), m = minLead % 60;
          errors.push(`Min lead time: ${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}min` : ""}.`);
        }
      }
      const advDays = validations?.advance_booking_days;
      if (advDays) {
        const daysAhead = (start.getTime() - now.getTime()) / 86400000;
        if (daysAhead > advDays) errors.push(`Cannot book more than ${advDays} days ahead.`);
      }
    }
  }
  if (amount < 1) errors.push("Amount must be at least 1.");
  if (amount > availableCapacity) errors.push(`Only ${availableCapacity} unit${availableCapacity !== 1 ? "s" : ""} available.`);
  if (availableCapacity < 1) errors.push("This resource is fully booked for the selected period.");
  return errors;
}

export const ResourceShow = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { open: notify } = useNotification();

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") ?? "");

  // Booking form state
  const [startTime, setStartTime] = useState(selectedDate ? toLocalDT(selectedDate, 9) : "");
  const [endTime, setEndTime] = useState(selectedDate ? toLocalDT(selectedDate, 12) : "");
  const [amount, setAmount] = useState(1);
  const [notes, setNotes] = useState("");
  const [bookingScope, setBookingScope] = useState<"unit" | "exclusive">("unit");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  // Fetch resource + type
  const { data: resourceData, isLoading: resLoading } = useOne({ resource: "resources", id: id! });
  const resource: any = resourceData?.data;
  const { data: typeData } = useOne({
    resource: "resource_types", id: resource?.type_id,
    queryOptions: { enabled: !!resource?.type_id },
  });
  const resourceType: any = typeData?.data;

  // Fetch availability for current calendar month
  const monthStart = `${calYear}-${pad(calMonth)}-01`;
  const lastDay = new Date(calYear, calMonth, 0).getDate();
  const monthEnd = `${calYear}-${pad(calMonth)}-${pad(lastDay)}`;

  const { data: availData, isLoading: availLoading } = useCustom({
    url: "get-resource-availability",
    method: "post",
    dataProviderName: "app",
    payload: { resource_id: id, start_date: monthStart, end_date: monthEnd },
    meta: { kind: "function" },
    queryOptions: { enabled: !!id, queryKey: ["availability", id, calYear, calMonth] },
  });

  const availResult: any = (availData as any)?.data;
  const allSlots: any[] = availResult?.availability_slots ?? [];
  const availableCapacity: number = availResult?.available_amount ?? resource?.capacity ?? 0;

  const availType: string = resourceType?.availability_type ?? "free_form";
  const isSlotBased = availType === "slot_based" || availType === "scheduled";
  const isRequestBased = availType === "request_based";
  const validations: any = resourceType?.validations ?? {};

  // Build calendar day data from slots
  const dayData = useMemo<Record<string, DayData>>(() => {
    const map: Record<string, DayData> = {};
    if (!resource) return map;

    if (!isSlotBased) {
      // free_form / request_based: mark every day as available, blocked days from availability
      const blockedDays = new Set<string>();
      allSlots.filter((s: any) => s.slot_type === "blocked").forEach((s: any) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          blockedDays.add(d.toISOString().split("T")[0]);
        }
      });
      for (let d = 1; d <= lastDay; d++) {
        const ds = `${calYear}-${pad(calMonth)}-${pad(d)}`;
        if (ds < todayStr()) continue;
        map[ds] = blockedDays.has(ds)
          ? { status: "blocked", label: "Blocked — unavailable" }
          : { status: "available", label: isRequestBased ? "Request available" : "Available — pick any time" };
      }
    } else {
      // slot_based: group slots by day
      const byDay: Record<string, { open: number; blocked: number }> = {};
      for (const s of allSlots) {
        const day = s.start_time.substring(0, 10);
        if (!byDay[day]) byDay[day] = { open: 0, blocked: 0 };
        if (s.slot_type === "open" || s.slot_type === "tentative") byDay[day].open++;
        else if (s.slot_type === "blocked") byDay[day].blocked++;
      }
      Object.entries(byDay).forEach(([day, counts]) => {
        if (day < todayStr()) return;
        const openSlots = counts.open;
        const blocked = counts.blocked;
        if (blocked > 0 && openSlots === 0)
          map[day] = { status: "blocked", label: "Blocked" };
        else if (openSlots > 0 && availableCapacity > 0)
          map[day] = { status: "available", openSlots, label: `${openSlots} slot${openSlots !== 1 ? "s" : ""} available` };
        else if (openSlots > 0)
          map[day] = { status: "full", openSlots, label: "All slots booked" };
      });
    }
    return map;
  }, [allSlots, resource, isSlotBased, isRequestBased, calYear, calMonth, lastDay, availableCapacity]);

  // Slots for the selected day
  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    return allSlots.filter((s: any) =>
      s.start_time.startsWith(selectedDate) &&
      (s.slot_type === "open" || s.slot_type === "tentative")
    );
  }, [allSlots, selectedDate]);

  // When a day is clicked in the calendar
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlotId(null);
    setTouched(false);
    if (!isSlotBased) {
      setStartTime(toLocalDT(dateStr, 9));
      setEndTime(toLocalDT(dateStr, 10));
    }
    // Scroll to booking form
    setTimeout(() => {
      document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleMonthChange = (y: number, m: number) => {
    setCalYear(y);
    setCalMonth(m);
    if (selectedDate && !selectedDate.startsWith(`${y}-${pad(m)}`)) {
      setSelectedDate("");
      setSelectedSlotId(null);
    }
  };

  const selectedSlot = daySlots.find((s: any) => s.id === selectedSlotId) ?? null;

  const durationLabel = useMemo(() => {
    if (!startTime || !endTime) return null;
    const mins = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
  }, [startTime, endTime]);

  const validationErrors = useMemo(() => validateBooking({
    availType, startTime, endTime, amount, availableCapacity, selectedSlotId, validations,
  }), [availType, startTime, endTime, amount, availableCapacity, selectedSlotId, validations]);
  const isValid = validationErrors.length === 0;

  const handleOpenConfirm = () => { setTouched(true); if (isValid) setConfirmOpen(true); };

  const handleBook = async () => {
    if (!id || !isValid) return;
    const payload: any = { resource_id: id, amount, booking_scope: bookingScope };
    if (notes.trim()) payload.notes = notes.trim();
    if (isSlotBased && selectedSlot) {
      payload.availability_id = selectedSlotId;
      payload.start_time = selectedSlot.start_time;
      payload.end_time = selectedSlot.end_time;
    } else {
      payload.start_time = new Date(startTime).toISOString();
      payload.end_time = new Date(endTime).toISOString();
    }
    setSubmitting(true);
    try {
      const res: any = await executeFunction("create-booking", payload);
      if (res?.success) {
        notify?.({ type: "success", message: isRequestBased ? "Request submitted — awaiting approval" : "Booking confirmed!" });
        setConfirmOpen(false);
        navigate("/my-bookings");
      } else {
        notify?.({ type: "error", message: res?.error ?? "Booking failed" });
      }
    } catch (e: any) {
      notify?.({ type: "error", message: e?.message ?? "An error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  if (resLoading) {
    return <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}><Skeleton height={500} sx={{ borderRadius: 2 }} /></Box>;
  }
  if (!resource) {
    return <Box sx={{ p: 3, textAlign: "center" }}><Typography>Resource not found.</Typography><Button onClick={() => navigate("/resources")} sx={{ mt: 2 }}>Back</Button></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/resources")} sx={{ mb: 2 }} color="inherit">
        Browse Resources
      </Button>

      {/* Resource Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>{resource.name}</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {resourceType && <Chip label={resourceType.name} color="primary" size="small" />}
                <Chip label={AVAIL_TYPE_LABELS[availType] ?? availType} size="small" variant="outlined" color={isRequestBased ? "warning" : "success"} />
                <Chip icon={<PeopleIcon />} label={`Capacity: ${resource.capacity}`} size="small" variant="outlined" />
              </Box>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="h3" fontWeight={800} color={availableCapacity > 0 ? "success.main" : "error.main"}>
                {availableCapacity}
              </Typography>
              <Typography variant="caption" color="text.secondary">Available this month</Typography>
            </Box>
          </Box>

          {resource.attributes && Object.keys(resource.attributes).length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" gutterBottom>DETAILS</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1 }}>
                {Object.entries(resource.attributes).map(([k, v]: [string, any]) => (
                  <Box key={k} sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontSize={10}>{k.replace(/_/g, " ")}</Typography>
                    <Typography variant="body2" fontWeight={600}>{String(v)}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}

          {Object.keys(validations).length > 0 && (
            <Alert severity="info" variant="outlined" sx={{ mt: 2, fontSize: 12 }}>
              {validations.min_lead_time_minutes > 0 && <span>Min lead time: <strong>{validations.min_lead_time_minutes}min</strong>. </span>}
              {validations.max_booking_duration_minutes && <span>Max duration: <strong>{Math.floor(validations.max_booking_duration_minutes / 60)}h{validations.max_booking_duration_minutes % 60 > 0 ? ` ${validations.max_booking_duration_minutes % 60}min` : ""}</strong>. </span>}
              {validations.advance_booking_days && <span>Book up to <strong>{validations.advance_booking_days} days</strong> ahead.</span>}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>
        {/* Calendar */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EventIcon color="primary" fontSize="small" /> Pick a Date
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isSlotBased
                ? "Green days have available slots. Click a day to see them below."
                : "Click any available day to pre-fill the booking form."}
            </Typography>
            <CalendarWidget
              year={calYear}
              month={calMonth}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              selectedDate={selectedDate}
              dayData={dayData}
              isLoading={availLoading}
            />
            {selectedDate && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: "primary.main" + "0D", border: "1px solid", borderColor: "primary.light" }}>
                <Typography variant="body2" fontWeight={600} color="primary">
                  Selected: {new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </Typography>
                {isSlotBased && daySlots.length === 0 && (
                  <Typography variant="caption" color="text.secondary">No open slots on this day.</Typography>
                )}
                {isSlotBased && daySlots.length > 0 && (
                  <Typography variant="caption" color="text.secondary">{daySlots.length} slot{daySlots.length !== 1 ? "s" : ""} available — see booking form →</Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card id="booking-form">
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleIcon color="primary" fontSize="small" />
              {isRequestBased ? "Request This Resource" : isSlotBased ? "Choose a Slot" : "Book This Resource"}
            </Typography>

            {isRequestBased && <Alert severity="warning" sx={{ mb: 2 }}>Requires admin approval.</Alert>}
            {availableCapacity < 1 && <Alert severity="error" sx={{ mb: 2 }}>Fully booked — no units available.</Alert>}
            {!selectedDate && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {isSlotBased ? "← Select a date on the calendar to see available slots" : "← Select a date on the calendar to get started"}
              </Alert>
            )}

            {/* Slot picker (slot_based) */}
            {isSlotBased && selectedDate && (
              <Box>
                {availLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
                ) : daySlots.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>No open slots on this day. Try another date.</Alert>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                    {daySlots.map((slot: any) => (
                      <Card
                        key={slot.id}
                        variant="outlined"
                        onClick={() => setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id)}
                        sx={{
                          cursor: "pointer",
                          borderColor: slot.id === selectedSlotId ? "primary.main" : "divider",
                          borderWidth: slot.id === selectedSlotId ? 2 : 1,
                          bgcolor: slot.id === selectedSlotId ? "primary.main" + "0D" : undefined,
                          transition: "all 0.12s",
                          "&:hover": { borderColor: "primary.main" },
                        }}
                      >
                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                            </Typography>
                            {slot.notes && <Typography variant="caption" color="text.secondary">{slot.notes}</Typography>}
                          </Box>
                          <Chip
                            label={slot.slot_type}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: (SLOT_TYPE_COLORS[slot.slot_type] ?? "#4CAF50") + "20", color: SLOT_TYPE_COLORS[slot.slot_type] ?? "#4CAF50" }}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Datetime pickers (free_form / request_based) */}
            {!isSlotBased && selectedDate && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                <TextField
                  label="Start Time" type="datetime-local" value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setTouched(false); }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().slice(0, 16) }} fullWidth
                  error={touched && !startTime}
                />
                <TextField
                  label="End Time" type="datetime-local" value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); setTouched(false); }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: startTime || new Date().toISOString().slice(0, 16) }} fullWidth
                  helperText={durationLabel ? `Duration: ${durationLabel}` : " "}
                  error={touched && (!endTime || (startTime && endTime && endTime <= startTime))}
                />
              </Box>
            )}

            {/* Amount */}
            {resource.capacity > 1 && selectedDate && (
              <TextField
                label="Units to Book" type="number" value={amount}
                onChange={(e) => setAmount(Math.max(1, Math.min(resource.capacity, parseInt(e.target.value) || 1)))}
                inputProps={{ min: 1, max: availableCapacity }}
                size="small" sx={{ mb: 2, width: 200 }}
                helperText={`Available: ${availableCapacity} of ${resource.capacity}`}
                InputProps={{ endAdornment: <InputAdornment position="end">units</InputAdornment> }}
                error={touched && amount > availableCapacity}
              />
            )}

            {/* Exclusive scope */}
            {resource.capacity > 1 && selectedDate && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Booking scope</Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Chip label="Standard" onClick={() => setBookingScope("unit")} color={bookingScope === "unit" ? "primary" : "default"} variant={bookingScope === "unit" ? "filled" : "outlined"} icon={<PeopleIcon />} clickable />
                  <Chip label="Exclusive" onClick={() => setBookingScope("exclusive")} color={bookingScope === "exclusive" ? "secondary" : "default"} variant={bookingScope === "exclusive" ? "filled" : "outlined"} icon={<LockIcon />} clickable />
                </Box>
              </Box>
            )}

            {/* Notes */}
            {selectedDate && (
              <TextField
                label="Notes (optional)" multiline rows={2} value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements..."
                fullWidth sx={{ mb: 2 }}
              />
            )}

            {/* Validation errors */}
            {touched && validationErrors.length > 0 && (
              <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                </Box>
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button variant="outlined" color="inherit" onClick={() => navigate("/resources")}>Cancel</Button>
              <Button
                variant="contained" size="large"
                startIcon={<CheckCircleIcon />}
                onClick={handleOpenConfirm}
                disabled={!selectedDate || availableCapacity < 1}
                color={isRequestBased ? "warning" : "primary"}
              >
                {isRequestBased ? "Submit Request" : "Book Now"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{isRequestBased ? "Confirm Request" : "Confirm Booking"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Resource</Typography>
              <Typography fontWeight={600}>{resource.name}</Typography>
            </Box>
            {selectedSlot && (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Date</Typography>
                  <Typography fontWeight={600}>{fmtDate(selectedSlot.start_time)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Time</Typography>
                  <Typography fontWeight={600}>{fmtTime(selectedSlot.start_time)} – {fmtTime(selectedSlot.end_time)}</Typography>
                </Box>
              </>
            )}
            {!isSlotBased && startTime && (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Start</Typography>
                  <Typography fontWeight={600}>{fmtDateTime(startTime)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">End</Typography>
                  <Typography fontWeight={600}>{fmtDateTime(endTime)}</Typography>
                </Box>
                {durationLabel && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Duration</Typography>
                    <Typography fontWeight={600}>{durationLabel}</Typography>
                  </Box>
                )}
              </>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Units</Typography>
              <Typography fontWeight={600}>{amount}</Typography>
            </Box>
            <Divider />
            {isRequestBased
              ? <Alert severity="warning">Will remain <strong>pending</strong> until approved.</Alert>
              : <Alert severity="success">Booking will be <strong>confirmed immediately</strong>.</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={submitting}>Back</Button>
          <Button variant="contained" onClick={handleBook} disabled={submitting}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
            color={isRequestBased ? "warning" : "primary"}>
            {isRequestBased ? "Submit Request" : "Confirm Booking"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
