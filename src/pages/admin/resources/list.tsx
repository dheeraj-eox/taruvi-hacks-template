import { useState, useEffect, useMemo } from "react";
import { useDataGrid, List, EditButton, DeleteButton, CreateButton } from "@refinedev/mui";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Box, TextField, InputAdornment, Typography, Chip, Button,
  FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InventoryIcon from "@mui/icons-material/Inventory";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

export const AdminResourceList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const permanentFilters: any[] = [];
  if (debounced) permanentFilters.push({ field: "name", operator: "containss", value: debounced });
  if (orgFilter) permanentFilters.push({ field: "organization_id", operator: "eq", value: orgFilter });
  if (typeFilter) permanentFilters.push({ field: "type_id", operator: "eq", value: typeFilter });

  const { dataGridProps } = useDataGrid({
    resource: "resources",
    filters: { permanent: permanentFilters },
    sorters: { initial: [{ field: "name", order: "asc" }] },
    pagination: { pageSize: 10 },
  });

  const { data: orgsData } = useList({ resource: "organizations", pagination: { pageSize: 100 }, sorters: [{ field: "name", order: "asc" }] });
  const { data: typesData } = useList({
    resource: "resource_types",
    pagination: { pageSize: 100 },
    filters: orgFilter ? [{ field: "organization_id", operator: "eq" as any, value: orgFilter }] : [],
    sorters: [{ field: "name", order: "asc" }],
  });

  const orgs: any[] = (orgsData?.data ?? []) as any[];
  const types: any[] = (typesData?.data ?? []) as any[];

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);
  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);

  const AVAIL_COLORS: Record<string, string> = {
    free_form: "#4CAF50", slot_based: "#2196F3",
    request_based: "#FF9800", scheduled: "#9C27B0",
  };

  const columns: GridColDef[] = [
    {
      field: "name", headerName: "Resource", flex: 1, minWidth: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InventoryIcon fontSize="small" color="primary" />
          <Box>
            <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
            {row.parent_resource_id && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                <AccountTreeIcon sx={{ fontSize: 10 }} /> sub-resource
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: "organization_id", headerName: "Organization", width: 160,
      renderCell: ({ value }) => (
        <Typography variant="body2">{orgMap[value]?.name ?? <em style={{ opacity: 0.4 }}>—</em>}</Typography>
      ),
    },
    {
      field: "type_id", headerName: "Type", width: 160,
      renderCell: ({ value }) => {
        const t = typeMap[value];
        if (!t) return <Typography variant="caption" color="text.secondary">—</Typography>;
        const at = t.availability_type ?? "free_form";
        return (
          <Chip
            label={t.name}
            size="small"
            sx={{ bgcolor: (AVAIL_COLORS[at] ?? "#6366f1") + "20", color: AVAIL_COLORS[at] ?? "#6366f1", fontWeight: 600, fontSize: 11 }}
          />
        );
      },
    },
    {
      field: "capacity", headerName: "Capacity", width: 100, align: "center", headerAlign: "center",
      renderCell: ({ value }) => <Typography variant="body2" fontWeight={700}>{value}</Typography>,
    },
    {
      field: "actions", headerName: "Actions", sortable: false, width: 220,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <EditButton hideText recordItemId={row.id} size="small" resource="admin_resources" />
          <DeleteButton hideText recordItemId={row.id} size="small" resource="resources" />
          <Tooltip title="Manage Availability">
            <Button
              size="small" variant="outlined" color="secondary"
              startIcon={<CalendarMonthIcon />}
              onClick={() => navigate(`/availability/new?resource_id=${row.id}&resource_name=${encodeURIComponent(row.name)}`)}
              sx={{ fontSize: 11, py: 0.3 }}
            >
              Availability
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <List
      resource="admin_resources"
      headerButtons={<CreateButton resource="admin_resources" />}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InventoryIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Manage Resources</Typography>
        </Box>
      }
    >
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small" sx={{ width: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Organization</InputLabel>
          <Select label="Organization" value={orgFilter} onChange={(e: SelectChangeEvent) => { setOrgFilter(e.target.value); setTypeFilter(""); }}>
            <MenuItem value="">All</MenuItem>
            {orgs.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Resource Type</InputLabel>
          <Select label="Resource Type" value={typeFilter} onChange={(e: SelectChangeEvent) => setTypeFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {types.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>
        {(orgFilter || typeFilter || debounced) && (
          <Button size="small" color="inherit" onClick={() => { setSearch(""); setOrgFilter(""); setTypeFilter(""); }}>Clear</Button>
        )}
      </Box>
      <DataGrid {...dataGridProps} columns={columns} autoHeight pageSizeOptions={[10, 20, 50]} disableColumnFilter />
    </List>
  );
};
