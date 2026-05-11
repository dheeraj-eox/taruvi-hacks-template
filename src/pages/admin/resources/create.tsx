import { useState, useEffect } from "react";
import { useList, useCreate, useNotification } from "@refinedev/core";
import { Create } from "@refinedev/mui";
import { useNavigate } from "react-router";
import {
  Box, TextField, Typography, Alert, Autocomplete, CircularProgress,
  InputAdornment, Divider, Paper,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

const useDebounce = (value: string, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export const AdminResourceCreate = () => {
  const navigate = useNavigate();
  const { open: notify } = useNotification();

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
  const [saving, setSaving] = useState(false);

  const debouncedOrg = useDebounce(orgSearch);
  const debouncedType = useDebounce(typeSearch);
  const debouncedParent = useDebounce(parentSearch);

  const { data: orgsData, isLoading: orgsLoading } = useList({
    resource: "organizations",
    filters: debouncedOrg ? [{ field: "name", operator: "containss" as any, value: debouncedOrg }] : [],
    pagination: { pageSize: 10 },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { data: typesData, isLoading: typesLoading } = useList({
    resource: "resource_types",
    filters: [
      ...(selectedOrg ? [{ field: "organization_id", operator: "eq" as any, value: selectedOrg.id }] : []),
      ...(debouncedType ? [{ field: "name", operator: "containss" as any, value: debouncedType }] : []),
    ],
    pagination: { pageSize: 20 },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { enabled: !!selectedOrg },
  });

  const { data: parentsData, isLoading: parentsLoading } = useList({
    resource: "resources",
    filters: [
      ...(selectedOrg ? [{ field: "organization_id", operator: "eq" as any, value: selectedOrg.id }] : []),
      ...(debouncedParent ? [{ field: "name", operator: "containss" as any, value: debouncedParent }] : []),
    ],
    pagination: { pageSize: 20 },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { enabled: !!selectedOrg },
  });

  const { mutate: createResource } = useCreate();

  // When org changes, reset type
  useEffect(() => {
    setSelectedType(null);
    setSelectedParent(null);
  }, [selectedOrg?.id]);

  // When type changes, auto-set default capacity and empty attributes template
  useEffect(() => {
    if (selectedType) {
      setCapacity(selectedType.default_capacity ?? 1);
      const schema = selectedType.required_attributes;
      if (schema?.properties && Object.keys(schema.properties).length > 0) {
        const template: Record<string, string> = {};
        Object.keys(schema.properties).forEach((k) => { template[k] = ""; });
        setAttrsStr(JSON.stringify(template, null, 2));
      } else {
        setAttrsStr("{}");
      }
    }
  }, [selectedType?.id]);

  const attrsHint = selectedType?.required_attributes
    ? JSON.stringify(selectedType.required_attributes, null, 2)
    : null;

  const handleSave = () => {
    if (!name.trim()) { notify?.({ type: "error", message: "Resource name is required" }); return; }
    if (!selectedOrg) { notify?.({ type: "error", message: "Organization is required" }); return; }
    if (!selectedType) { notify?.({ type: "error", message: "Resource type is required" }); return; }
    if (attrsErr || metaErr) { notify?.({ type: "error", message: "Fix JSON errors before saving" }); return; }

    let attributes = {};
    let metadata = {};
    try { attributes = JSON.parse(attrsStr); } catch { /* empty */ }
    try { metadata = JSON.parse(metaStr); } catch { /* empty */ }

    setSaving(true);
    createResource(
      {
        resource: "resources",
        values: {
          name: name.trim(),
          type_id: selectedType.id,
          organization_id: selectedOrg.id,
          capacity,
          attributes: Object.keys(attributes).length > 0 ? attributes : null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          parent_resource_id: selectedParent?.id ?? null,
        },
      },
      {
        onSuccess: (data) => {
          notify?.({ type: "success", message: `Resource "${name}" created successfully` });
          navigate("/admin/resources");
        },
        onError: (err: any) => {
          notify?.({ type: "error", message: err?.message ?? "Failed to create resource" });
          setSaving(false);
        },
      }
    );
  };

  const orgs: any[] = (orgsData?.data ?? []) as any[];
  const types: any[] = (typesData?.data ?? []) as any[];
  const parents: any[] = (parentsData?.data ?? []) as any[];

  return (
    <Create
      resource="admin_resources"
      isLoading={saving}
      saveButtonProps={{ onClick: handleSave, disabled: saving }}
      title={<Typography variant="h5" fontWeight={700}>New Resource</Typography>}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 720 }}>

        {/* Step 1: Organization */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
            STEP 1 — SELECT ORGANIZATION
          </Typography>
          <Autocomplete
            options={orgs}
            getOptionLabel={(o) => o.name ?? ""}
            loading={orgsLoading}
            value={selectedOrg}
            onChange={(_, v) => setSelectedOrg(v)}
            onInputChange={(_, v) => setOrgSearch(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Organization *"
                helperText="All resource types and parent resources will be filtered to this organization"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: <>{orgsLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>,
                }}
              />
            )}
            noOptionsText="No organizations — create one first"
          />
        </Box>

        {/* Step 2: Resource Type */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
            STEP 2 — SELECT RESOURCE TYPE
          </Typography>
          <Autocomplete
            options={types}
            getOptionLabel={(t) => t.name ?? ""}
            loading={typesLoading}
            value={selectedType}
            disabled={!selectedOrg}
            onChange={(_, v) => setSelectedType(v)}
            onInputChange={(_, v) => setTypeSearch(v)}
            renderOption={(props, t) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.availability_type?.replace(/_/g, " ")} · capacity: {t.default_capacity}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Resource Type *"
                helperText={!selectedOrg ? "Select an organization first" : "Determines booking model and required attributes"}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: <>{typesLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>,
                }}
              />
            )}
            noOptionsText={selectedOrg ? "No types for this org — create one in Resource Types" : "Select org first"}
          />

          {/* Required attributes hint */}
          {attrsHint && attrsHint !== "{}" && attrsHint !== "null" && (
            <Paper variant="outlined" sx={{ mt: 1, p: 1.5, bgcolor: "info.main" + "08" }}>
              <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "info.main", fontWeight: 600 }}>
                <InfoIcon sx={{ fontSize: 14 }} /> Required Attributes Schema
              </Typography>
              <Box component="pre" sx={{ fontSize: 11, mt: 0.5, m: 0, color: "text.secondary", fontFamily: "monospace", overflow: "auto" }}>
                {attrsHint}
              </Box>
            </Paper>
          )}
        </Box>

        <Divider />

        {/* Step 3: Resource Details */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
            STEP 3 — RESOURCE DETAILS
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Resource Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boat #3 – Blue Hull, Conference Room A"
              fullWidth
              required
            />

            <TextField
              label="Capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
              InputProps={{ endAdornment: <InputAdornment position="end">units</InputAdornment> }}
              helperText="How many simultaneous bookings this resource accepts"
              sx={{ width: 220 }}
            />

            {/* Parent resource (optional) */}
            <Autocomplete
              options={parents.filter((p) => p.name !== name)}
              getOptionLabel={(r) => r.name ?? ""}
              loading={parentsLoading}
              value={selectedParent}
              disabled={!selectedOrg}
              onChange={(_, v) => setSelectedParent(v)}
              onInputChange={(_, v) => setParentSearch(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Parent Resource (optional)"
                  helperText="Set if this resource is a sub-resource, e.g. Table inside a Restaurant"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: <>{parentsLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>,
                  }}
                />
              )}
              noOptionsText="No other resources in this org yet"
            />
          </Box>
        </Box>

        <Divider />

        {/* Step 4: JSON Fields */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
            STEP 4 — ATTRIBUTES &amp; METADATA
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Attributes (JSON) {selectedType ? `— matches ${selectedType.name} schema` : ""}
              </Typography>
              <TextField
                multiline rows={5}
                value={attrsStr}
                onChange={(e) => {
                  setAttrsStr(e.target.value);
                  try { JSON.parse(e.target.value); setAttrsErr(false); } catch { setAttrsErr(true); }
                }}
                error={attrsErr}
                helperText={attrsErr ? "Invalid JSON" : "Instance values matching this resource type's required_attributes schema"}
                fullWidth
                inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
              />
            </Box>

            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>Metadata (JSON) — optional</Typography>
              <TextField
                multiline rows={3}
                value={metaStr}
                onChange={(e) => {
                  setMetaStr(e.target.value);
                  try { JSON.parse(e.target.value); setMetaErr(false); } catch { setMetaErr(true); }
                }}
                error={metaErr}
                helperText={metaErr ? "Invalid JSON" : "e.g. {\"purchase_year\": 2021, \"location\": \"Dock B\"}"}
                fullWidth
                inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
              />
            </Box>

            {(attrsErr || metaErr) && <Alert severity="warning">Fix JSON errors before saving</Alert>}
          </Box>
        </Box>
      </Box>
    </Create>
  );
};
