import { useDataGrid, List, EditButton, ShowButton, DeleteButton } from "@refinedev/mui";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useState, useMemo, useCallback } from "react";
import { TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel, Stack, type SelectChangeEvent, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type { CrudFilters } from "@refinedev/core";

const TYPES = ["Dog", "Cat", "Bird", "Fish", "Rabbit", "Turtle"];

const columns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1, minWidth: 120 },
  { field: "type", headerName: "Type", flex: 0.8, minWidth: 100 },
  { field: "breed", headerName: "Breed", flex: 1, minWidth: 130 },
  { field: "age", headerName: "Age", type: "number", flex: 0.5, minWidth: 70 },
  { field: "weight", headerName: "Weight (kg)", type: "number", flex: 0.7, minWidth: 100 },
  { field: "color", headerName: "Color", flex: 0.8, minWidth: 100 },
  {
    field: "is_vaccinated", headerName: "Vaccinated", flex: 0.7, minWidth: 100,
    renderCell: ({ value }) => <Chip label={value ? "Yes" : "No"} color={value ? "success" : "default"} size="small" />,
  },
  { field: "date_of_birth", headerName: "DOB", flex: 0.8, minWidth: 110 },
  {
    field: "actions", headerName: "Actions", flex: 1, minWidth: 150, sortable: false,
    renderCell: ({ row }) => (
      <Stack direction="row" spacing={1}>
        <EditButton hideText size="small" recordItemId={row.id} />
        <ShowButton hideText size="small" recordItemId={row.id} />
        <DeleteButton hideText size="small" recordItemId={row.id} />
      </Stack>
    ),
  },
];

export const AnimalList = () => {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const permanentFilter = useMemo<CrudFilters>(() => {
    const filters: CrudFilters = [];
    if (search) filters.push({ field: "name", operator: "contains", value: search });
    if (type) filters.push({ field: "type", operator: "eq", value: type });
    return filters;
  }, [search, type]);

  const { dataGridProps } = useDataGrid({
    resource: "animals",
    pagination: { pageSize: 10 },
    filters: { permanent: permanentFilter },
  });

  const handleTypeChange = useCallback((e: SelectChangeEvent) => setType(e.target.value), []);

  return (
    <List>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select value={type} label="Type" onChange={handleTypeChange}>
            <MenuItem value="">All</MenuItem>
            {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
      <DataGrid {...dataGridProps} columns={columns} autoHeight pageSizeOptions={[10, 20, 50]} />
    </List>
  );
};
