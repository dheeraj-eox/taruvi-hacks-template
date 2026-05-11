import { useState, useEffect, useMemo } from "react";
import { useDataGrid, List } from "@refinedev/mui";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useList, useUpdate, useNotification } from "@refinedev/core";
import {
  Box, Typography, Chip, Button, FormControl, InputLabel,
  Select, MenuItem, SelectChangeEvent, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import EventNoteIcon from "@mui/icons-material/EventNote";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800", confirmed: "#4CAF50", cancelled: "#9E9E9E", completed: "#2196F3",
};

const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const AdminBookingList = () => {
  const { open: notify } = useNotification();
  const [statusFilter, setStatusFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "confirmed" | "cancelled"; resourceName: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const permanentFilters: any[] = [];
  if (statusFilter) permanentFilters.push({ field: "status", operator: "eq", value: statusFilter });
  if (resourceFilter) permanentFilters.push({ field: "resource_id", operator: "eq", value: resourceFilter });
  if (debounced) permanentFilters.push({ field: "notes", operator: "containss" as any, value: debounced });

  const { dataGridProps, tableQueryResult } = useDataGrid({
    resource: "bookings",
    filters: { permanent: permanentFilters },
    sorters: { initial: [{ field: "start_time", order: "desc" }] },
    pagination: { pageSize: 10 },
  });

  const { data: resourcesData } = useList({ resource: "resources", pagination: { pageSize: 200 }, sorters: [{ field: "name", order: "asc" }] });
  const { data: orgsData } = useList({ resource: "organizations", pagination: { pageSize: 100 } });

  const resources: any[] = (resourcesData?.data ?? []) as any[];
  const orgs: any[] = (orgsData?.data ?? []) as any[];
  const resourceMap = useMemo(() => Object.fromEntries(resources.map((r) => [r.id, r])), [resources]);
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);

  const { mutate: updateBooking } = useUpdate();

  const handleAction = (id: string, action: "confirmed" | "cancelled", resourceName: string) => {
    setConfirmAction({ id, action, resourceName });
  };

  const executeAction = () => {
    if (!confirmAction) return;
    updateBooking(
      { resource: "bookings", id: confirmAction.id, values: { status: confirmAction.action } },
      {
        onSuccess: () => {
          notify?.({
            type: "success",
            message: confirmAction.action === "confirmed" ? "Booking approved" : "Booking cancelled",
          });
          setConfirmAction(null);
          tableQueryResult.refetch();
        },
        onError: (err: any) => {
          notify?.({ type: "error", message: err?.message ?? "Action failed" });
          setConfirmAction(null);
        },
      }
    );
  };

  const columns: GridColDef[] = [
    {
      field: "resource_id", headerName: "Resource", flex: 1, minWidth: 160,
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={600}>{resourceMap[value]?.name ?? "—"}</Typography>
      ),
    },
    {
      field: "organization_id", headerName: "Organization", width: 140,
      renderCell: ({ value }) => (
        <Typography variant="body2" color="text.secondary">{orgMap[value]?.name ?? "—"}</Typography>
      ),
    },
    {
      field: "start_time", headerName: "Start", width: 160,
      renderCell: ({ value }) => <Typography variant="body2">{fmtDT(value)}</Typography>,
    },
    {
      field: "end_time", headerName: "End", width: 160,
      renderCell: ({ value }) => <Typography variant="body2">{fmtDT(value)}</Typography>,
    },
    {
      field: "amount", headerName: "Units", width: 70, align: "center", headerAlign: "center",
      renderCell: ({ value }) => <Typography fontWeight={700}>{value}</Typography>,
    },
    {
      field: "status", headerName: "Status", width: 120,
      renderCell: ({ value }) => (
        <Chip
          label={value} size="small" textTransform="capitalize"
          sx={{ bgcolor: (STATUS_COLORS[value] ?? "#9E9E9E") + "20", color: STATUS_COLORS[value] ?? "#9E9E9E", fontWeight: 700, fontSize: 11, textTransform: "capitalize" }}
        />
      ),
    },
    {
      field: "booking_scope", headerName: "Scope", width: 90,
      renderCell: ({ value }) => (
        <Chip label={value ?? "unit"} size="small" variant="outlined" sx={{ fontSize: 10, textTransform: "capitalize" }} />
      ),
    },
    {
      field: "actions", headerName: "Actions", sortable: false, width: 200,
      renderCell: ({ row }) => {
        const rName = resourceMap[row.resource_id]?.name ?? "this resource";
        return (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {row.status === "pending" && (
              <>
                <Button
                  size="small" color="success" variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleAction(row.id, "confirmed", rName)}
                  sx={{ fontSize: 11, py: 0.3 }}
                >
                  Approve
                </Button>
                <Button
                  size="small" color="error" variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => handleAction(row.id, "cancelled", rName)}
                  sx={{ fontSize: 11, py: 0.3 }}
                >
                  Reject
                </Button>
              </>
            )}
            {row.status === "confirmed" && (
              <Button
                size="small" color="error" variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => handleAction(row.id, "cancelled", rName)}
                sx={{ fontSize: 11, py: 0.3 }}
              >
                Cancel
              </Button>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <List
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EventNoteIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>All Bookings</Typography>
        </Box>
      }
    >
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={statusFilter} onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All Statuses</MenuItem>
            {["pending", "confirmed", "completed", "cancelled"].map((s) => (
              <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Resource</InputLabel>
          <Select label="Resource" value={resourceFilter} onChange={(e: SelectChangeEvent) => setResourceFilter(e.target.value)}>
            <MenuItem value="">All Resources</MenuItem>
            {resources.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </Select>
        </FormControl>
        {(statusFilter || resourceFilter || search) && (
          <Button size="small" color="inherit" onClick={() => { setStatusFilter(""); setResourceFilter(""); setSearch(""); }}>Clear</Button>
        )}
      </Box>

      <DataGrid {...dataGridProps} columns={columns} autoHeight pageSizeOptions={[10, 20, 50]} disableColumnFilter />

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>
          {confirmAction?.action === "confirmed" ? "Approve Booking?" : "Cancel Booking?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmAction?.action === "confirmed"
              ? `Approve the booking for ${confirmAction?.resourceName}? The user will be notified.`
              : `Cancel the booking for ${confirmAction?.resourceName}? This cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmAction(null)} color="inherit">Back</Button>
          <Button
            variant="contained"
            color={confirmAction?.action === "confirmed" ? "success" : "error"}
            onClick={executeAction}
            startIcon={confirmAction?.action === "confirmed" ? <CheckCircleIcon /> : <CancelIcon />}
          >
            {confirmAction?.action === "confirmed" ? "Yes, Approve" : "Yes, Cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </List>
  );
};
