import { useState, useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList } from "@refinedev/core";
import { Create } from "@refinedev/mui";
import {
  Box, TextField, Typography, Alert, MenuItem, Select,
  FormControl, InputLabel, Autocomplete, CircularProgress, FormHelperText,
} from "@mui/material";

const AVAIL_TYPES = ["free_form", "slot_based", "request_based", "scheduled"];
const AVAIL_TYPE_LABELS: Record<string, string> = {
  free_form: "Free Form — user picks any time",
  slot_based: "Slot-Based — must pick from pre-defined slots",
  request_based: "By Request — admin approval required",
  scheduled: "Scheduled — recurring slot pattern",
};
const PROPAGATION_TYPES = ["independent", "aggregate", "exclusive_only", "shared_pool"];
const DEFAULT_AVAIL = ["open", "closed"];

export const ResourceTypeCreate = () => {
  const [validationsStr, setValidationsStr] = useState('{\n  "max_booking_duration_minutes": null,\n  "min_lead_time_minutes": 0,\n  "advance_booking_days": null\n}');
  const [requiredAttrsStr, setRequiredAttrsStr] = useState('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
  const [validationsErr, setValidationsErr] = useState(false);
  const [attrsErr, setAttrsErr] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [debouncedOrgSearch, setDebouncedOrgSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedOrgSearch(orgSearch), 350);
    return () => clearTimeout(t);
  }, [orgSearch]);

  const { data: orgsData, isLoading: orgsLoading } = useList({
    resource: "organizations",
    filters: debouncedOrgSearch ? [{ field: "name", operator: "containss" as any, value: debouncedOrgSearch }] : [],
    pagination: { pageSize: 10 },
    sorters: [{ field: "name", order: "asc" }],
  });
  const orgs: any[] = (orgsData?.data ?? []) as any[];

  const {
    register,
    handleSubmit,
    formState: { errors },
    refineCore: { onFinish, formLoading },
    saveButtonProps,
    setValue,
  } = useForm({ resource: "resource_types", action: "create" });

  const onSubmit = handleSubmit(async (values: any) => {
    let validations = {};
    let required_attributes = {};
    try { validations = JSON.parse(validationsStr); } catch { /* use empty */ }
    try { required_attributes = JSON.parse(requiredAttrsStr); } catch { /* use empty */ }
    await onFinish({ ...values, validations, required_attributes, organization_id: selectedOrg?.id });
  });

  return (
    <Create
      isLoading={formLoading}
      saveButtonProps={{ ...saveButtonProps, onClick: onSubmit }}
      title={<Typography variant="h5" fontWeight={700}>New Resource Type</Typography>}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 700 }}>

        <TextField
          {...register("name", { required: "Name is required" })}
          label="Type Name"
          placeholder="e.g. Boat, Meeting Room, Workstation"
          error={!!errors.name}
          helperText={(errors.name as any)?.message}
          fullWidth required
        />

        <Autocomplete
          options={orgs}
          getOptionLabel={(o) => o.name ?? ""}
          loading={orgsLoading}
          value={selectedOrg}
          onChange={(_, v) => { setSelectedOrg(v); if (v) setValue("organization_id", v.id); }}
          onInputChange={(_, v) => setOrgSearch(v)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Organization *"
              error={!selectedOrg && false}
              InputProps={{
                ...params.InputProps,
                endAdornment: (<>{orgsLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>),
              }}
            />
          )}
          noOptionsText="No organizations found"
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Booking Model</InputLabel>
            <Select defaultValue="free_form" label="Booking Model" {...register("availability_type")}>
              {AVAIL_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{t.replace(/_/g, " ")}</Typography>
                    <Typography variant="caption" color="text.secondary">{AVAIL_TYPE_LABELS[t]}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>How users book this type of resource</FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Default Availability</InputLabel>
            <Select defaultValue="open" label="Default Availability" {...register("default_availability")}>
              {DEFAULT_AVAIL.map((v) => (
                <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>
              ))}
            </Select>
            <FormHelperText>Baseline state when no availability slots exist</FormHelperText>
          </FormControl>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Capacity Propagation</InputLabel>
            <Select defaultValue="independent" label="Capacity Propagation" {...register("capacity_propagation")}>
              {PROPAGATION_TYPES.map((v) => (
                <MenuItem key={v} value={v}>{v.replace(/_/g, " ")}</MenuItem>
              ))}
            </Select>
            <FormHelperText>How parent/child capacity interacts</FormHelperText>
          </FormControl>

          <TextField
            {...register("default_capacity", { valueAsNumber: true, min: 1 })}
            label="Default Capacity"
            type="number"
            defaultValue={1}
            inputProps={{ min: 1 }}
            helperText="Default simultaneous bookings allowed"
            fullWidth
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} gutterBottom>Validation Rules (JSON)</Typography>
          <TextField
            multiline rows={5}
            value={validationsStr}
            onChange={(e) => {
              setValidationsStr(e.target.value);
              try { JSON.parse(e.target.value); setValidationsErr(false); } catch { setValidationsErr(true); }
            }}
            error={validationsErr}
            helperText={validationsErr ? "Invalid JSON" : "max_booking_duration_minutes, min_lead_time_minutes, advance_booking_days"}
            fullWidth
            inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} gutterBottom>Required Attributes Schema (JSONSchema)</Typography>
          <TextField
            multiline rows={6}
            value={requiredAttrsStr}
            onChange={(e) => {
              setRequiredAttrsStr(e.target.value);
              try { JSON.parse(e.target.value); setAttrsErr(false); } catch { setAttrsErr(true); }
            }}
            error={attrsErr}
            helperText={attrsErr ? "Invalid JSON" : "JSONSchema defining required attributes for resources of this type"}
            fullWidth
            inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
          />
          {(validationsErr || attrsErr) && <Alert severity="warning" sx={{ mt: 1 }}>Fix JSON errors before saving</Alert>}
        </Box>
      </Box>
    </Create>
  );
};
