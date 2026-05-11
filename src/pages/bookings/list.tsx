import { useState } from "react";
import { useCustom, useNotification } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Box, Card, CardContent, Typography, Chip, Button, CircularProgress,
  Tabs, Tab, Pagination, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CancelIcon from "@mui/icons-material/Cancel";
import ExploreIcon from "@mui/icons-material/Explore";
import EventIcon from "@mui/icons-material/Event";
import { executeFunction } from "../../utils/functionHelpers";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800",
  confirmed: "#4CAF50",
  cancelled: "#9E9E9E",
  completed: "#2196F3",
};

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtDateRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${
      s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } – ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${fmtDateTime(start)} – ${fmtDateTime(end)}`;
};

export const BookingList = () => {
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const [statusTab, setStatusTab] = useState("");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  const { data: bookingsData, isLoading, refetch } = useCustom({
    url: "list-my-bookings",
    method: "post",
    dataProviderName: "app",
    payload: { status: statusTab || undefined, page, page_size: 10 },
    meta: { kind: "function" },
    queryOptions: {
      queryKey: ["list-my-bookings", statusTab, page],
    },
  } as any);

  const result: any = (bookingsData as any)?.data;
  const bookings: any[] = result?.data ?? [];
  const total: number = result?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res: any = await executeFunction("cancel-booking", { booking_id: cancelTarget.id });
      if (res?.success) {
        notify?.({ type: "success", message: "Booking cancelled successfully" });
        setCancelTarget(null);
        refetch();
      } else {
        notify?.({ type: "error", message: res?.error ?? "Could not cancel booking" });
      }
    } catch (e: any) {
      notify?.({ type: "error", message: e?.message ?? "An error occurred" });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BookmarkIcon fontSize="inherit" /> My Bookings
          </Typography>
          <Typography color="text.secondary">{total} booking{total !== 1 ? "s" : ""} total</Typography>
        </Box>
        <Button variant="contained" startIcon={<ExploreIcon />} onClick={() => navigate("/resources")}>
          Browse Resources
        </Button>
      </Box>

      {/* Status Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={statusTab}
          onChange={(_, v) => { setStatusTab(v); setPage(1); }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {STATUS_TABS.map((t) => (
            <Tab key={t.value} label={t.label} value={t.value} />
          ))}
        </Tabs>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : bookings.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <EventIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
          <Typography variant="h6">
            {statusTab ? `No ${statusTab} bookings` : "No bookings yet"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            {statusTab ? "Try a different filter" : "Book a resource to get started"}
          </Typography>
          <Button variant="outlined" onClick={() => navigate("/resources")} startIcon={<ExploreIcon />}>
            Browse Resources
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {bookings.map((booking: any) => {
            const canCancel = booking.status === "pending" || booking.status === "confirmed";
            const resourceName = booking.resource?.name ?? "Unknown Resource";
            return (
              <Card
                key={booking.id}
                sx={{
                  borderLeft: `4px solid ${STATUS_COLORS[booking.status] ?? "#ccc"}`,
                  transition: "box-shadow 0.15s",
                  "&:hover": { boxShadow: 3 },
                }}
              >
                <CardContent sx={{ pb: "12px !important" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                        <Typography variant="subtitle1" fontWeight={700}>{resourceName}</Typography>
                        <Chip
                          label={booking.status}
                          size="small"
                          sx={{
                            bgcolor: STATUS_COLORS[booking.status] ?? "grey.400",
                            color: "white",
                            fontWeight: 600,
                            fontSize: 11,
                            textTransform: "capitalize",
                          }}
                        />
                        {booking.booking_scope === "exclusive" && (
                          <Chip label="Exclusive" size="small" color="secondary" variant="outlined" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <EventIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                        {fmtDateRange(booking.start_time, booking.end_time)}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Typography variant="caption" color="text.secondary">
                          Amount: <strong>{booking.amount}</strong>
                        </Typography>
                        {booking.notes && (
                          <Typography variant="caption" color="text.secondary">
                            Note: <em>{booking.notes}</em>
                          </Typography>
                        )}
                        {booking.external_validation_passed === false && (
                          <Alert severity="error" sx={{ py: 0, px: 1, fontSize: 12 }}>Validation failed</Alert>
                        )}
                        {booking.status === "pending" && (
                          <Typography variant="caption" color="warning.main">
                            Awaiting approval
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>
                      {canCancel && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => setCancelTarget(booking)}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      {/* Cancel Confirm Dialog */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Cancel Booking?</DialogTitle>
        <DialogContent>
          <Typography>
            Cancel your booking for <strong>{cancelTarget?.resource?.name ?? "this resource"}</strong>?
          </Typography>
          {cancelTarget?.start_time && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {fmtDateRange(cancelTarget.start_time, cancelTarget.end_time)}
            </Typography>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>This action cannot be undone.</Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep Booking</Button>
          <Button
            color="error" variant="contained"
            onClick={handleCancel}
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={14} color="inherit" /> : <CancelIcon />}
          >
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
