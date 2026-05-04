import { useDataGrid, List } from "@refinedev/mui";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useState, useMemo, useCallback } from "react";
import {
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  type SelectChangeEvent,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type { CrudFilters } from "@refinedev/core";

const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "HR", "Finance"];

const columns: GridColDef[] = [
  { field: "first_name", headerName: "First Name", flex: 1, minWidth: 120 },
  { field: "last_name", headerName: "Last Name", flex: 1, minWidth: 120 },
  { field: "email", headerName: "Email", flex: 1.5, minWidth: 200 },
  { field: "phone", headerName: "Phone", flex: 1, minWidth: 130 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 130 },
  { field: "job_title", headerName: "Job Title", flex: 1, minWidth: 150 },
  { field: "gender", headerName: "Gender", flex: 0.8, minWidth: 100 },
  { field: "country", headerName: "Country", flex: 1, minWidth: 120 },
];

export const PeopleList = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  const permanentFilter = useMemo<CrudFilters>(() => {
    const filters: CrudFilters = [];
    if (search) filters.push({ field: "search", operator: "contains", value: search });
    if (department) filters.push({ field: "department", operator: "eq", value: department });
    return filters;
  }, [search, department]);

  const { dataGridProps } = useDataGrid({
    resource: "people",
    pagination: { pageSize: 10 },
    filters: { permanent: permanentFilter },
    meta: { select: "id,first_name,last_name,email,phone,department,job_title,gender,country" },
  });

  const handleDeptChange = useCallback((e: SelectChangeEvent) => {
    setDepartment(e.target.value);
  }, []);

  return (
    <List>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Department</InputLabel>
          <Select value={department} label="Department" onChange={handleDeptChange}>
            <MenuItem value="">All</MenuItem>
            {DEPARTMENTS.map((d) => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <DataGrid
        {...dataGridProps}
        columns={columns}
        autoHeight
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </List>
  );
};
