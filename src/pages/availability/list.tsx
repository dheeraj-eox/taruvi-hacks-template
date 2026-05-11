import { useState, useEffect, useMemo } from "react";
import { useDataGrid, List, EditButton, DeleteButton, CreateButton } from "@refinedev/mui";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useList } from "@refinedev/core";
import { useNavigate, useSearchParams } from "react-router";
import {
  Box, Typography, Chip, Button, FormControl, InputLabel,
  Select, MenuItem, SelectChangeEvent, Alert,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AddIcon from "@mui/icons-material/Add";

const SLOT_COLORS: Record<string, string> = {
  open: "#4CAF50", blocked: "#F44336", exclusive: "#9C27B0",
  tentative: "#FF9800", hold: "#607D8B", waitlist: "#2196F3",
};

const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const AvailabilityList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledResourceId = searchParams.get("resource_id") ?? "";

  const [resourceFilter, setResourceFilter] = useState(prefilledResourceId);

  const permanentFilters: any[] = [];
  if (resourceFilter) permanentFilters.push({ field: "resource_id", operator: "eq", value: resourceFilter });

  const { dataGridProps, tableQueryResult } = useDataGrid({
    resource: "availability",
    filters: { permanent: permanentFilters },
    sorters: { initial: [{ field: "start_time", order: "asc" }] },
    pagination: { pageSize: 10 },
  });

  const { data: resourcesData } = useList({
    resource: "resources",
    pagination: { pageSize: 200 },
    sorters: [{ field: "name", order: "asc" }],
  });
  const resources: any[] = (resourcesData?.data ?? []) as any[];
  const resourceMap = useMemo(() => Object.fromEntries(resources.map((r) => [r.id, r])), [resources]);

  const prefilledResource = resourceMap[prefilledResourceId];

  const columns: GridColDef[] = [
    {
      field: "resource_id", headerName: "Resource", flex: 1, minWidth: 180,
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={600}>{resourceMap[value]?.name ?? value?.slice(0, 8) + "…"}</Typography>
      ),
    },
    {
      field: "slot_type", headerName: "Type", width: 130,
      renderCell: ({ value }) => (
        <Chip
          label={value ?? "open"} size="small"
          sx={{ bgcolor: (SLOT_COLORS[value] ?? "#4CAF50") + "20", color: SLOT_COLORS[value] ?? "#4CAF50", fontWeight: 600, fontSize: 11, textTransform: "capitalize" }}
        />
      ),
    },
    {
      field: "start_time", headerName: "Start", width: 170,
      renderCell: ({ value }) => <Typography variant="body2">{fmtDT(value)}</Typography>,
    },
    {
      field: "end_time", headerName: "End", width: 170,
      renderCell: ({ value }) => <Typography variant="body2">{fmtDT(value)}</Typography>,
    },
    {
      field: "recurrence_rule", headerName: "Recurrence", width: 130,
      renderCell: ({ value }) => value
        ? <Chip label="Recurring" size="small" color="secondary" variant="outlined" />
        : <Typography variant="caption" color="text.secondary">One-time</Typography>,
    },
    {
      field: "capacity_override", headerName: "Cap Override", width: 110, align: "center", headerAlign: "center",
      renderCell: ({ value }) => value != null
        ? <Chip label={value} size="small" variant="outlined" />
        : <Typography variant="caption" color="text.secondary">—</Typography>,
    },
    {
      field: "notes", headerName: "Notes", flex: 1, minWidth: 120,
      renderCell: ({ value }) => <Typography variant="caption" color="text.secondary">{value ?? "—"}</Typography>,
    },
    {
      field: "actions", headerName: "Actions", sortable: false, width: 100,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <EditButton hideText recordItemId={row.id} size="small" />
          <DeleteButton hideText recordItemId={row.id} size="small" />
        </Box>
      ),
    },
  ];

  return (
    <List
      headerButtons={
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => navigate(`/availability/new${resourceFilter ? `?resource_id=${resourceFilter}` : ""}`)}
        >
          Add Slot
        </Button>
      }
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Availability {prefilledResource ? `— ${prefilledResource.name}` : ""}
          </Typography>
        </Box>
      }
    >
      {prefilledResource && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing availability slots for <strong>{prefilledResource.name}</strong>.{" "}
          <Button size="small" onClick={() => { setResourceFilter(""); navigate("/availability"); }}>View all resources</Button>
        </Alert>
      )}

      {!prefilledResource && (
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Filter by Resource</InputLabel>
            <Select label="Filter by Resource" value={resourceFilter} onChange={(e: SelectChangeEvent) => setResourceFilter(e.target.value)}>
              <MenuItem value="">All Resources</MenuItem>
              {resources.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      )}

      <DataGrid {...dataGridProps} columns={columns} autoHeight pageSizeOptions={[10, 20, 50]} disableColumnFilter />
    </List>
  );
};
