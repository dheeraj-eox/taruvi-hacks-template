import { useState, useEffect } from "react";
import { useDataGrid, List, EditButton, DeleteButton, CreateButton } from "@refinedev/mui";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Box, TextField, InputAdornment, Typography, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CategoryIcon from "@mui/icons-material/Category";

const AVAIL_TYPE_COLORS: Record<string, string> = {
  free_form: "#4CAF50",
  slot_based: "#2196F3",
  request_based: "#FF9800",
  scheduled: "#9C27B0",
};

const AVAIL_TYPE_LABELS: Record<string, string> = {
  free_form: "Free Form",
  slot_based: "Slot-Based",
  request_based: "By Request",
  scheduled: "Scheduled",
};

const PROPAGATION_LABELS: Record<string, string> = {
  independent: "Independent",
  aggregate: "Aggregate",
  exclusive_only: "Exclusive Only",
  shared_pool: "Shared Pool",
};

export const ResourceTypeList = () => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { dataGridProps } = useDataGrid({
    resource: "resource_types",
    filters: {
      permanent: debounced
        ? [{ field: "name", operator: "containss" as any, value: debounced }]
        : [],
    },
    sorters: { initial: [{ field: "name", order: "asc" }] },
    pagination: { pageSize: 10 },
  });

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CategoryIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600}>{value}</Typography>
        </Box>
      ),
    },
    {
      field: "availability_type",
      headerName: "Booking Model",
      width: 150,
      renderCell: ({ value }) => (
        <Chip
          label={AVAIL_TYPE_LABELS[value] ?? value ?? "—"}
          size="small"
          sx={{
            bgcolor: (AVAIL_TYPE_COLORS[value] ?? "#6366f1") + "20",
            color: AVAIL_TYPE_COLORS[value] ?? "#6366f1",
            fontWeight: 600, fontSize: 11,
          }}
        />
      ),
    },
    {
      field: "default_availability",
      headerName: "Default",
      width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value ?? "open"}
          size="small"
          color={value === "closed" ? "error" : "success"}
          variant="outlined"
          sx={{ fontSize: 11 }}
        />
      ),
    },
    {
      field: "capacity_propagation",
      headerName: "Propagation",
      width: 150,
      renderCell: ({ value }) => (
        <Typography variant="caption" color="text.secondary">
          {PROPAGATION_LABELS[value] ?? value ?? "—"}
        </Typography>
      ),
    },
    {
      field: "default_capacity",
      headerName: "Def. Capacity",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={600}>{value ?? 1}</Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      width: 130,
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
      headerButtons={<CreateButton />}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CategoryIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Resource Types</Typography>
        </Box>
      }
    >
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
      </Box>
      <DataGrid
        {...dataGridProps}
        columns={columns}
        autoHeight
        pageSizeOptions={[10, 20, 50]}
        disableColumnFilter
      />
    </List>
  );
};
