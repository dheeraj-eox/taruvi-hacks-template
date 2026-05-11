import { useState, useEffect } from "react";
import { useDataGrid, List, EditButton, DeleteButton, CreateButton } from "@refinedev/mui";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Box, TextField, InputAdornment, Typography, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";

export const OrganizationList = () => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { dataGridProps } = useDataGrid({
    resource: "organizations",
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
      minWidth: 180,
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BusinessIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600}>{value}</Typography>
        </Box>
      ),
    },
    {
      field: "slug",
      headerName: "Slug",
      width: 180,
      renderCell: ({ value }) => (
        <Chip label={value} size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: 11 }} />
      ),
    },
    {
      field: "metadata",
      headerName: "Metadata",
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: ({ value }) => {
        if (!value || Object.keys(value).length === 0) {
          return <Typography variant="caption" color="text.secondary">—</Typography>;
        }
        const preview = Object.entries(value).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ");
        return <Typography variant="caption" color="text.secondary">{preview}</Typography>;
      },
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
          <BusinessIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Organizations</Typography>
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
        sx={{ "& .MuiDataGrid-row:hover": { cursor: "pointer" } }}
      />
    </List>
  );
};
