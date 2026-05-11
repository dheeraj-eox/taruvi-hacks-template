import { useState, useEffect } from "react";
import { useOne, useList, useUpdate, useNotification } from "@refinedev/core";
import { Edit } from "@refinedev/mui";
import { useParams, useNavigate } from "react-router";
import {
  Box, TextField, Typography, Alert, Autocomplete, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, Switch,
  FormControlLabel, Skeleton,
} from "@mui/material";

const SLOT_TYPES = ["open", "blocked", "exclusive", "tentative", "hold", "waitlist"];
const SLOT_DESCRIPTIONS: Record<string, string> = {
  open: "Bookable normally", blocked: "Hard close",
  exclusive: "Whole resource only", tentative: "Soft hold with expiry",
  hold: "Admin lock pending action", waitlist: "At capacity — queue only",
};

const toLocalDT = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const useDebounce = (v: string, d = 350) => {
  const [db, setDb] = useState(v);
  useEffect(() => { const t = setTimeout(() => setDb(v), d); return () => clearTimeout(t); }, [v, d]);
  return db;
};

export const AvailabilityEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { open: notify } = useNotification();

  const { data: slotData, isLoading } = useOne({ resource: "availability", id: id! });
  const record: any = slotData?.data;

  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [resourceSearch, setResourceSearch] = useState("");
  const [slotType, setSlotType] = useState("open");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [rrule, setRrule] = useState("");
  const [rruleEndDate, setRruleEndDate] = useState("");
  const [holdExpiresAt, setHoldExpiresAt] = useState("");
  const [capacityOverride, setCapacityOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const dResourceSearch = useDebounce(resourceSearch);

  const { data: resourcesData, isLoading: resLoading } = useList({
    resource: "resources",
    filters: dResourceSearch ? [{ field: "name", operator: "containss" as any, value: dResourceSearch }] : [],
    pagination: { pageSize: 20 },
    sorters: [{ field: "name", order: "asc" }],
  });
  const resources: any[] = (resourcesData?.data ?? []) as any[];

  const { mutate: updateSlot } = useUpdate();

  // Populate form from record
  useEffect(() => {
    if (!record || initialized) return;
    setSlotType(record.slot_type ?? "open");
    setStartTime(toLocalDT(record.start_time));
    setEndTime(toLocalDT(record.end_time));
    if (record.recurrence_rule) { setIsRecurring(true); setRrule(record.recurrence_rule); }
    if (record.recurrence_end_date) setRruleEndDate(record.recurrence_end_date);
    if (record.hold_expires_at) setHoldExpiresAt(toLocalDT(record.hold_expires_at));
    if (record.capacity_override != null) setCapacityOverride(String(record.capacity_override));
    setNotes(record.notes ?? "");
    setInitialized(true);
  }, [record?.id]);

  useEffect(() => {
    if (!record || !resources.length) return;
    const r = resources.find((x) => x.id === record.resource_id);
    if (r && !selectedResource) setSelectedResource(r);
  }, [record?.resource_id, resources.length]);

  const handleSave = () => {
    if (!selectedResource) { notify?.({ type: "error", message: "Resource is required" }); return; }
    if (!startTime || !endTime) { notify?.({ type: "error", message: "Start and end times are required" }); return; }
    if (new Date(endTime) <= new Date(startTime)) { notify?.({ type: "error", message: "End time must be after start time" }); return; }

    const values: any = {
      resource_id: selectedResource.id,
      slot_type: slotType,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      recurrence_rule: isRecurring && rrule ? rrule : null,
      recurrence_end_date: isRecurring && rruleEndDate ? rruleEndDate : null,
      hold_expires_at: holdExpiresAt ? new Date(holdExpiresAt).toISOString() : null,
      capacity_override: capacityOverride ? parseInt(capacityOverride) : null,
      notes: notes.trim() || null,
    };

    setSaving(true);
    updateSlot(
      { resource: "availability", id: id!, values },
      {
        onSuccess: () => { notify?.({ type: "success", message: "Slot updated" }); navigate("/availability"); },
        onError: (err: any) => { notify?.({ type: "error", message: err?.message ?? "Update failed" }); setSaving(false); },
      }
    );
  };

  if (isLoading) return <Box sx={{ p: 3 }}><Skeleton height={400} /></Box>;

  return (
    <Edit
      isLoading={saving}
      saveButtonProps={{ onClick: handleSave, disabled: saving }}
      title={<Typography variant="h5" fontWeight={700}>Edit Availability Slot</Typography>}
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
            <TextField {...params} label="Resource *" InputLabelProps={{ shrink: true }}
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
          <TextField label="Start Time *" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="End Time *" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Box>

        {(slotType === "tentative" || slotType === "hold") && (
          <TextField label="Hold Expires At" type="datetime-local" value={holdExpiresAt} onChange={(e) => setHoldExpiresAt(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth helperText="Slot auto-releases after this time" />
        )}

        <TextField label="Capacity Override (optional)" type="number" value={capacityOverride} onChange={(e) => setCapacityOverride(e.target.value)} inputProps={{ min: 1 }} sx={{ width: 280 }} />

        <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <FormControlLabel
            control={<Switch checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />}
            label={<Typography fontWeight={600}>Recurring Slot</Typography>}
          />
          {isRecurring && (
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField label="iCal RRULE" value={rrule} onChange={(e) => setRrule(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ style: { fontFamily: "monospace" } }} helperText='e.g. "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"' />
              <TextField label="Recurrence End Date" type="date" value={rruleEndDate} onChange={(e) => setRruleEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 220 }} />
            </Box>
          )}
        </Box>

        <TextField label="Notes (optional)" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
      </Box>
    </Edit>
  );
};
