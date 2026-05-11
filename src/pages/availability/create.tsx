import { useState, useEffect } from "react";
import { useList, useCreate, useNotification } from "@refinedev/core";
import { Create } from "@refinedev/mui";
import { useNavigate, useSearchParams } from "react-router";
import {
  Box, TextField, Typography, Alert, Autocomplete, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, Switch,
  FormControlLabel,
} from "@mui/material";

const SLOT_TYPES = ["open", "blocked", "exclusive", "tentative", "hold", "waitlist"];
const SLOT_DESCRIPTIONS: Record<string, string> = {
  open: "Bookable normally",
  blocked: "Hard close — maintenance, holiday",
  exclusive: "Whole resource only — blocks all sub-resources",
  tentative: "Soft hold — auto-releases at hold_expires_at",
  hold: "Admin lock pending external action",
  waitlist: "At capacity — accepting queue",
};

const useDebounce = (v: string, d = 350) => {
  const [db, setDb] = useState(v);
  useEffect(() => { const t = setTimeout(() => setDb(v), d); return () => clearTimeout(t); }, [v, d]);
  return db;
};

export const AvailabilityCreate = () => {
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const [searchParams] = useSearchParams();
  const prefilledResourceId = searchParams.get("resource_id") ?? "";
  const prefilledResourceName = searchParams.get("resource_name") ? decodeURIComponent(searchParams.get("resource_name")!) : "";

  const [selectedResource, setSelectedResource] = useState<any>(prefilledResourceId ? { id: prefilledResourceId, name: prefilledResourceName } : null);
  const [resourceSearch, setResourceSearch] = useState(prefilledResourceName);
  const [slotType, setSlotType] = useState("open");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [rrule, setRrule] = useState("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
  const [rruleEndDate, setRruleEndDate] = useState("");
  const [holdExpiresAt, setHoldExpiresAt] = useState("");
  const [capacityOverride, setCapacityOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const dResourceSearch = useDebounce(resourceSearch);

  const { data: resourcesData, isLoading: resLoading } = useList({
    resource: "resources",
    filters: dResourceSearch ? [{ field: "name", operator: "containss" as any, value: dResourceSearch }] : [],
    pagination: { pageSize: 20 },
    sorters: [{ field: "name", order: "asc" }],
  });
  const resources: any[] = (resourcesData?.data ?? []) as any[];

  const { mutate: createSlot } = useCreate();

  const nowStr = () => { const d = new Date(); d.setSeconds(0, 0); return d.toISOString().slice(0, 16); };

  const handleSave = () => {
    if (!selectedResource) { notify?.({ type: "error", message: "Resource is required" }); return; }
    if (!startTime) { notify?.({ type: "error", message: "Start time is required" }); return; }
    if (!endTime) { notify?.({ type: "error", message: "End time is required" }); return; }
    if (new Date(endTime) <= new Date(startTime)) { notify?.({ type: "error", message: "End time must be after start time" }); return; }

    const values: any = {
      resource_id: selectedResource.id,
      slot_type: slotType,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    };
    if (isRecurring && rrule) { values.recurrence_rule = rrule; if (rruleEndDate) values.recurrence_end_date = rruleEndDate; }
    if ((slotType === "tentative" || slotType === "hold") && holdExpiresAt) values.hold_expires_at = new Date(holdExpiresAt).toISOString();
    if (capacityOverride) values.capacity_override = parseInt(capacityOverride);
    if (notes.trim()) values.notes = notes.trim();

    setSaving(true);
    createSlot(
      { resource: "availability", values },
      {
        onSuccess: () => {
          notify?.({ type: "success", message: "Availability slot created" });
          navigate(prefilledResourceId ? `/availability?resource_id=${prefilledResourceId}` : "/availability");
        },
        onError: (err: any) => { notify?.({ type: "error", message: err?.message ?? "Failed to create slot" }); setSaving(false); },
      }
    );
  };

  return (
    <Create
      isLoading={saving}
      saveButtonProps={{ onClick: handleSave, disabled: saving }}
      title={<Typography variant="h5" fontWeight={700}>Add Availability Slot</Typography>}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 680 }}>

        <Autocomplete
          options={resources}
          getOptionLabel={(r) => r.name ?? ""}
          loading={resLoading}
          value={selectedResource}
          onChange={(_, v) => setSelectedResource(v)}
          onInputChange={(_, v) => setResourceSearch(v)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Resource *"
              helperText="Which resource is this slot for?"
              InputProps={{ ...params.InputProps, endAdornment: <>{resLoading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }}
            />
          )}
        />

        <FormControl fullWidth>
          <InputLabel>Slot Type *</InputLabel>
          <Select label="Slot Type *" value={slotType} onChange={(e) => setSlotType(e.target.value)}>
            {SLOT_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                <Box>
                  <Typography variant="body2" fontWeight={600} textTransform="capitalize">{t}</Typography>
                  <Typography variant="caption" color="text.secondary">{SLOT_DESCRIPTIONS[t]}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{SLOT_DESCRIPTIONS[slotType]}</FormHelperText>
        </FormControl>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Start Time *" type="datetime-local" value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }} inputProps={{ min: nowStr() }} fullWidth
          />
          <TextField
            label="End Time *" type="datetime-local" value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }} inputProps={{ min: startTime || nowStr() }} fullWidth
            error={!!(startTime && endTime && endTime <= startTime)}
            helperText={startTime && endTime && endTime <= startTime ? "Must be after start" : " "}
          />
        </Box>

        {(slotType === "tentative" || slotType === "hold") && (
          <TextField
            label="Hold Expires At" type="datetime-local" value={holdExpiresAt}
            onChange={(e) => setHoldExpiresAt(e.target.value)}
            InputLabelProps={{ shrink: true }} fullWidth
            helperText="Slot auto-releases after this time if not confirmed"
          />
        )}

        <TextField
          label="Capacity Override (optional)" type="number" value={capacityOverride}
          onChange={(e) => setCapacityOverride(e.target.value)}
          inputProps={{ min: 1 }} sx={{ width: 280 }}
          helperText="Override the resource's normal capacity for this slot only"
        />

        {/* Recurrence */}
        <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <FormControlLabel
            control={<Switch checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />}
            label={<Typography fontWeight={600}>Recurring Slot</Typography>}
          />
          {isRecurring && (
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="iCal RRULE" value={rrule} onChange={(e) => setRrule(e.target.value)}
                helperText='e.g. "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" or "FREQ=DAILY;COUNT=30"'
                fullWidth inputProps={{ style: { fontFamily: "monospace" } }}
              />
              <TextField
                label="Recurrence End Date" type="date" value={rruleEndDate}
                onChange={(e) => setRruleEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ width: 220 }}
                helperText="Leave empty to repeat indefinitely"
              />
            </Box>
          )}
        </Box>

        <TextField
          label="Notes (optional)" multiline rows={2} value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Closed for annual maintenance"
          fullWidth
        />

        {slotType === "blocked" && (
          <Alert severity="warning">
            A blocked slot will prevent all bookings on this resource during the selected window.
          </Alert>
        )}
        {slotType === "exclusive" && (
          <Alert severity="info">
            An exclusive slot means the resource can only be booked as a whole during this window (no individual sub-resource bookings).
          </Alert>
        )}
      </Box>
    </Create>
  );
};
