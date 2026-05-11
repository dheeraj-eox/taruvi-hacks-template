import { useState, useEffect, useMemo } from "react";
import { useList, useOne, useUpdate, useNotification } from "@refinedev/core";
import { Edit } from "@refinedev/mui";
import { useParams, useNavigate } from "react-router";
import {
  Box, TextField, Typography, Alert, Autocomplete, CircularProgress,
  InputAdornment, Divider, Paper, Skeleton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

const useDebounce = (value: string, delay = 350) => {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
};

export const AdminResourceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { open: notify } = useNotification();

  const { data: resourceData, isLoading: resLoading } = useOne({ resource: "resources", id: id! });
  const record: any = resourceData?.data;

  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [orgSearch, setOrgSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [attrsStr, setAttrsStr] = useState("{}");
  const [attrsErr, setAttrsErr] = useState(false);
  const [metaStr, setMetaStr] = useState("{}");
  const [metaErr, setMetaErr] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const dOrgSearch = useDebounce(orgSearch);
  const dTypeSearch = useDebounce(typeSearch);
  const dParentSearch = useDebounce(parentSearch);

  const { data: orgsData, isLoading: orgsLoading } = useList({
    resource: "organizations",
    filters: dOrgSearch ? [{ field: "name", operator: "containss" as any, value: dOrgSearch }] : [],
    pagination: { pageSize: 20 },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { data: typesData, isLoading: typesLoading } = useList({
    resource: "resource_types",
    filters: [
      ...(selectedOrg ? [{ field: "organization_id", operator: "eq" as any, value: selectedOrg.id }] : []),
      ...(dTypeSearch ? [{ field: "name", operator: "containss" as any, value: dTypeSearch }] : []),
    ],
    pagination: { pageSize: 20 },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { enabled: !!selectedOrg },
  });

  const { data: parentsData, isLoading: parentsLoading } = useList({
    resource: "resources",
    filters: [
      ...(selectedOrg ? [{ field: "organization_id", operator: "eq" as any, value: selectedOrg.id }] : []),
      ...(dParentSearch ? [{ field: "name", operator: "containss" as any, value: dParentSearch }] : []),
    ],
    pagination: { pageSize: 20 },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { enabled: !!selectedOrg },
  });

  const orgs: any[] = (orgsData?.data ?? []) as any[];
  const types: any[] = (typesData?.data ?? []) as any[];
  const parents: any[] = (parentsData?.data ?? []) as any[];

  // Initialize form from record once orgs/types are loaded
  useEffect(() => {
    if (!record || initialized) return;
    setName(record.name ?? "");
    setCapacity(record.capacity ?? 1);
    setAttrsStr(record.attributes ? JSON.stringify(record.attributes, null, 2) : "{}");
    setMetaStr(record.metadata ? JSON.stringify(record.metadata, null, 2) : "{}");
  }, [record?.id]);

  useEffect(() => {
    if (!record || initialized || orgs.length === 0) return;
    const org = orgs.find((o) => o.id === record.organization_id);
    if (org) { setSelectedOrg(org); setInitialized(true); }
  }, [record?.id, orgs.length]);

  useEffect(() => {
    if (!record || !selectedOrg || types.length === 0) return;
    const type = types.find((t) => t.id === record.type_id);
    if (type) setSelectedType(type);
  }, [record?.type_id, types.length]);

  useEffect(() => {
    if (!record || !selectedOrg || parents.length === 0 || !record.parent_resource_id) return;
    const parent = parents.find((p) => p.id === record.parent_resource_id);
    if (parent) setSelectedParent(parent);
  }, [record?.parent_resource_id, parents.length]);

  const { mutate: updateResource } = useUpdate();

  const attrsHint = selectedType?.required_attributes
    ? JSON.stringify(selectedType.required_attributes, null, 2)
    : null;

  const handleSave = () => {
    if (!name.trim()) { notify?.({ type: "error", message: "Resource name is required" }); return; }
    if (!selectedOrg) { notify?.({ type: "error", message: "Organization is required" }); return; }
    if (!selectedType) { notify?.({ type: "error", message: "Resource type is required" }); return; }
    if (attrsErr || metaErr) { notify?.({ type: "error", message: "Fix JSON errors before saving" }); return; }

    let attributes = null;
    let metadata = null;
    try { const a = JSON.parse(attrsStr); if (Object.keys(a).length > 0) attributes = a; } catch { /* empty */ }
    try { const m = JSON.parse(metaStr); if (Object.keys(m).length > 0) metadata = m; } catch { /* empty */ }

    setSaving(true);
    updateResource(
      {
        resource: "resources",
        id: id!,
        values: {
          name: name.trim(),
          type_id: selectedType.id,
          organization_id: selectedOrg.id,
          capacity,
          attributes,
          metadata,
          parent_resource_id: selectedParent?.id ?? null,
        },
      },
      {
        onSuccess: () => {
          notify?.({ type: "success", message: "Resource updated" });
          navigate("/admin/resources");
        },
        onError: (err: any) => {
          notify?.({ type: "error", message: err?.message ?? "Update failed" });
          setSaving(false);
        },
      }
    );
  };

  if (resLoading) {
    return <Box sx={{ p: 3 }}><Skeleton height={400} /></Box>;
  }

  return (
    <Edit
      resource="admin_resources"
      isLoading={saving}
      saveButtonProps={{ onClick: handleSave, disabled: saving }}
      title={<Typography variant="h5" fontWeight={700}>Edit Resource</Typography>}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 720 }}>

        <Autocomplete
          options={orgs}
          getOptionLabel={(o) => o.name ?? ""}
          loading={orgsLoading}
          value={selectedOrg}
          onChange={(_, v) => { setSelectedOrg(v); setSelectedType(null); setSelectedParent(null); }}
          onInputChange={(_, v) => setOrgSearch(v)}
          renderInput={(params) => (
            <TextField {...params} label="Organization *" InputLabelProps={{ shrink: true }}
              InputProps={{ ...params.InputProps, endAdornment: <>{orgsLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }}
            />
          )}
        />

        <Autocomplete
          options={types}
          getOptionLabel={(t) => t.name ?? ""}
          loading={typesLoading}
          value={selectedType}
          disabled={!selectedOrg}
          onChange={(_, v) => setSelectedType(v)}
          onInputChange={(_, v) => setTypeSearch(v)}
          renderInput={(params) => (
            <TextField {...params} label="Resource Type *" InputLabelProps={{ shrink: true }}
              helperText={!selectedOrg ? "Select an organization first" : ""}
              InputProps={{ ...params.InputProps, endAdornment: <>{typesLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }}
            />
          )}
        />

        {attrsHint && attrsHint !== "{}" && (
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "info.main" + "08" }}>
            <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "info.main", fontWeight: 600 }}>
              <InfoIcon sx={{ fontSize: 14 }} /> Required Attributes Schema for {selectedType?.name}
            </Typography>
            <Box component="pre" sx={{ fontSize: 11, mt: 0.5, m: 0, color: "text.secondary", fontFamily: "monospace", overflow: "auto" }}>
              {attrsHint}
            </Box>
          </Paper>
        )}

        <Divider />

        <TextField label="Resource Name *" value={name} onChange={(e) => setName(e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />

        <TextField
          label="Capacity" type="number" value={capacity}
          onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
          inputProps={{ min: 1 }}
          InputProps={{ endAdornment: <InputAdornment position="end">units</InputAdornment> }}
          helperText="Simultaneous bookings allowed"
          sx={{ width: 220 }}
          InputLabelProps={{ shrink: true }}
        />

        <Autocomplete
          options={parents.filter((p) => p.id !== id)}
          getOptionLabel={(r) => r.name ?? ""}
          loading={parentsLoading}
          value={selectedParent}
          disabled={!selectedOrg}
          onChange={(_, v) => setSelectedParent(v)}
          onInputChange={(_, v) => setParentSearch(v)}
          renderInput={(params) => (
            <TextField {...params} label="Parent Resource (optional)" InputLabelProps={{ shrink: true }}
              InputProps={{ ...params.InputProps, endAdornment: <>{parentsLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }}
            />
          )}
        />

        <Divider />

        <Box>
          <Typography variant="body2" fontWeight={600} gutterBottom>Attributes (JSON)</Typography>
          <TextField
            multiline rows={5} value={attrsStr}
            onChange={(e) => { setAttrsStr(e.target.value); try { JSON.parse(e.target.value); setAttrsErr(false); } catch { setAttrsErr(true); } }}
            error={attrsErr} helperText={attrsErr ? "Invalid JSON" : " "} fullWidth
            inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} gutterBottom>Metadata (JSON)</Typography>
          <TextField
            multiline rows={3} value={metaStr}
            onChange={(e) => { setMetaStr(e.target.value); try { JSON.parse(e.target.value); setMetaErr(false); } catch { setMetaErr(true); } }}
            error={metaErr} helperText={metaErr ? "Invalid JSON" : " "} fullWidth
            inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
          />
        </Box>

        {(attrsErr || metaErr) && <Alert severity="warning">Fix JSON errors before saving</Alert>}
      </Box>
    </Edit>
  );
};
