import { useState, useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList } from "@refinedev/core";
import { Edit } from "@refinedev/mui";
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

export const ResourceTypeEdit = () => {
  const [validationsStr, setValidationsStr] = useState("{}");
  const [requiredAttrsStr, setRequiredAttrsStr] = useState("{}");
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
    refineCore: { onFinish, formLoading, queryResult },
    saveButtonProps,
    setValue,
  } = useForm({ resource: "resource_types", action: "edit" });

  const record = queryResult?.data?.data;

  useEffect(() => {
    if (record) {
      if (record.validations) setValidationsStr(JSON.stringify(record.validations, null, 2));
      if (record.required_attributes) setRequiredAttrsStr(JSON.stringify(record.required_attributes, null, 2));
    }
  }, [record?.id]);

  useEffect(() => {
    if (record?.organization_id && orgs.length > 0) {
      const org = orgs.find((o) => o.id === record.organization_id);
      if (org) setSelectedOrg(org);
    }
  }, [record?.organization_id, orgs.length]);

  const onSubmit = handleSubmit(async (values: any) => {
    let validations = {};
    let required_attributes = {};
    try { validations = JSON.parse(validationsStr); } catch { /* use empty */ }
    try { required_attributes = JSON.parse(requiredAttrsStr); } catch { /* use empty */ }
    await onFinish({ ...values, validations, required_attributes, organization_id: selectedOrg?.id ?? record?.organization_id });
  });

  return (
    <Edit
      isLoading={formLoading}
      saveButtonProps={{ ...saveButtonProps, onClick: onSubmit }}
      title={<Typography variant="h5" fontWeight={700}>Edit Resource Type</Typography>}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 700 }}>
        <TextField
          {...register("name", { required: "Name is required" })}
          label="Type Name"
          error={!!errors.name}
          helperText={(errors.name as any)?.message}
          fullWidth required
          InputLabelProps={{ shrink: true }}
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
              InputLabelProps={{ shrink: true }}
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
            <InputLabel shrink>Booking Model</InputLabel>
            <Select label="Booking Model" {...register("availability_type")} defaultValue={record?.availability_type ?? "free_form"}>
              {AVAIL_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{t.replace(/_/g, " ")}</Typography>
                    <Typography variant="caption" color="text.secondary">{AVAIL_TYPE_LABELS[t]}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>How users book this type</FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel shrink>Default Availability</InputLabel>
            <Select label="Default Availability" {...register("default_availability")} defaultValue={record?.default_availability ?? "open"}>
              {DEFAULT_AVAIL.map((v) => (
                <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel shrink>Capacity Propagation</InputLabel>
            <Select label="Capacity Propagation" {...register("capacity_propagation")} defaultValue={record?.capacity_propagation ?? "independent"}>
              {PROPAGATION_TYPES.map((v) => (
                <MenuItem key={v} value={v}>{v.replace(/_/g, " ")}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            {...register("default_capacity", { valueAsNumber: true, min: 1 })}
            label="Default Capacity"
            type="number"
            inputProps={{ min: 1 }}
            helperText="Default simultaneous bookings"
            fullWidth
            InputLabelProps={{ shrink: true }}
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
            helperText={attrsErr ? "Invalid JSON" : "JSONSchema for resource attributes"}
            fullWidth
            inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
          />
          {(validationsErr || attrsErr) && <Alert severity="warning" sx={{ mt: 1 }}>Fix JSON errors before saving</Alert>}
        </Box>
      </Box>
    </Edit>
  );
};
