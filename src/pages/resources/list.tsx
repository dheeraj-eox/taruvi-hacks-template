import { useState, useEffect, useMemo } from "react";
import { useCustom, useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Button,
  TextField, InputAdornment, CircularProgress, Pagination, MenuItem, Select,
  FormControl, InputLabel, SelectChangeEvent, Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PeopleIcon from "@mui/icons-material/People";
import LaptopIcon from "@mui/icons-material/Laptop";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import InventoryIcon from "@mui/icons-material/Inventory";
import CloseIcon from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";

const PAGE_SIZE = 12;

const AVAIL_TYPE_LABELS: Record<string, string> = {
  free_form: "Free Booking",
  slot_based: "Slot-Based",
  request_based: "By Request",
  scheduled: "Scheduled",
};

const AVAIL_TYPE_COLORS: Record<string, string> = {
  free_form: "#4CAF50",
  slot_based: "#2196F3",
  request_based: "#FF9800",
  scheduled: "#9C27B0",
};

const DAY_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  available:  { label: "Available",      color: "#4CAF50", icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  full:       { label: "Fully Booked",   color: "#F44336", icon: <EventBusyIcon sx={{ fontSize: 14 }} /> },
  blocked:    { label: "Blocked",        color: "#9E9E9E", icon: <EventBusyIcon sx={{ fontSize: 14 }} /> },
  no_slots:   { label: "No Slots",       color: "#9E9E9E", icon: null },
};

const ResourceIcon = ({ typeName }: { typeName: string }) => {
  const n = (typeName ?? "").toLowerCase();
  if (n.includes("boat") || n.includes("vessel")) return <DirectionsBoatIcon />;
  if (n.includes("room") || n.includes("meeting")) return <MeetingRoomIcon />;
  if (n.includes("computer") || n.includes("workstation") || n.includes("laptop")) return <LaptopIcon />;
  if (n.includes("person") || n.includes("people")) return <PeopleIcon />;
  return <InventoryIcon />;
};

const todayStr = () => new Date().toISOString().split("T")[0];

export const ResourceList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter, orgFilter, selectedDate]);

  // When date is selected, call the date-aware function
  const { data: dateFilterData, isLoading: dateLoading } = useCustom({
    url: "get-resources-by-date",
    method: "post",
    dataProviderName: "app",
    payload: {
      date: selectedDate || undefined,
      organization_id: orgFilter || undefined,
      type_id: typeFilter || undefined,
      search: debouncedSearch || undefined,
    },
    meta: { kind: "function" },
    queryOptions: {
      queryKey: ["get-resources-by-date", selectedDate, orgFilter, typeFilter, debouncedSearch],
      enabled: true,
    },
  } as any);

  const { data: typesData } = useList({ resource: "resource_types", pagination: { pageSize: 100 }, sorters: [{ field: "name", order: "asc" }] });
  const { data: orgsData } = useList({ resource: "organizations", pagination: { pageSize: 100 }, sorters: [{ field: "name", order: "asc" }] });

  const functionResult: any = (dateFilterData as any)?.data;
  const allResources: any[] = (functionResult?.data ?? []) as any[];

  // Client-side pagination on the function result
  const total = allResources.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const resources = allResources.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const types: any[] = (typesData?.data ?? []) as any[];
  const orgs: any[] = (orgsData?.data ?? []) as any[];

  const isLoading = dateLoading;
  const hasDateFilter = !!selectedDate;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalendarMonthIcon fontSize="inherit" /> Browse Resources
        </Typography>
        <Typography color="text.secondary">
          {hasDateFilter
            ? `Showing availability for ${new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`
            : "Find and book available resources"}
        </Typography>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          display: "flex", flexWrap: "wrap", gap: 2, mb: 3,
          p: 2, bgcolor: "background.paper", borderRadius: 2,
          border: "1px solid", borderColor: hasDateFilter ? "primary.main" : "divider",
          transition: "border-color 0.2s",
        }}
      >
        {/* Date picker — primary filter */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1, minWidth: 200 }}>
          <CalendarMonthIcon color={hasDateFilter ? "primary" : "disabled"} />
          <TextField
            label="Filter by date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: todayStr() }}
          />
          {selectedDate && (
            <IconButton size="small" onClick={() => setSelectedDate("")}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />

        <TextField
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={typeFilter} onChange={(e: SelectChangeEvent) => setTypeFilter(e.target.value)}>
            <MenuItem value="">All Types</MenuItem>
            {types.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Organization</InputLabel>
          <Select label="Organization" value={orgFilter} onChange={(e: SelectChangeEvent) => setOrgFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {orgs.map((o: any) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </Select>
        </FormControl>
        {(typeFilter || orgFilter || debouncedSearch || selectedDate) && (
          <Button size="small" color="inherit" onClick={() => { setSearch(""); setTypeFilter(""); setOrgFilter(""); setSelectedDate(""); }}>
            Clear all
          </Button>
        )}
      </Box>

      {/* Results count */}
      {!isLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {total} resource{total !== 1 ? "s" : ""}
          {hasDateFilter ? " available on selected date" : " found"}
        </Typography>
      )}

      {/* Resource Cards */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <CalendarMonthIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
          <Typography variant="h6">
            {hasDateFilter ? "No resources available on this date" : "No resources found"}
          </Typography>
          <Typography variant="body2">
            {hasDateFilter ? "Try a different date or clear the filter" : "Adjust your search or filters"}
          </Typography>
          {hasDateFilter && (
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => setSelectedDate("")}>
              Show all resources
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
            gap: 2, mb: 3,
          }}
        >
          {resources.map((resource: any) => {
            const rtype = resource.resource_type ?? {};
            const availType: string = rtype.availability_type ?? "free_form";
            const dayStatus: string | null = resource.day_status ?? null;
            const dsConfig = dayStatus ? DAY_STATUS_CONFIG[dayStatus] : null;
            const isUnavailable = dayStatus === "blocked" || dayStatus === "no_slots";

            return (
              <Card
                key={resource.id}
                sx={{
                  display: "flex", flexDirection: "column", height: "100%",
                  transition: "box-shadow 0.2s, transform 0.2s",
                  opacity: isUnavailable ? 0.6 : 1,
                  "&:hover": isUnavailable ? {} : { boxShadow: 6, transform: "translateY(-2px)" },
                  cursor: isUnavailable ? "default" : "pointer",
                }}
                onClick={() => !isUnavailable && navigate(`/resources/${resource.id}${selectedDate ? `?date=${selectedDate}` : ""}`)}
              >
                <Box sx={{ height: 4, bgcolor: AVAIL_TYPE_COLORS[availType] ?? "#6366f1", borderRadius: "4px 4px 0 0" }} />
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 44, height: 44, borderRadius: 2, flexShrink: 0,
                        bgcolor: (AVAIL_TYPE_COLORS[availType] ?? "#6366f1") + "1A",
                        color: AVAIL_TYPE_COLORS[availType] ?? "#6366f1",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <ResourceIcon typeName={rtype.name ?? ""} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1" fontWeight={600}
                        sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={resource.name}
                      >
                        {resource.name}
                      </Typography>
                      {rtype.name && (
                        <Typography variant="caption" color="text.secondary">{rtype.name}</Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    <Chip
                      label={AVAIL_TYPE_LABELS[availType] ?? availType}
                      size="small"
                      sx={{
                        bgcolor: (AVAIL_TYPE_COLORS[availType] ?? "#6366f1") + "20",
                        color: AVAIL_TYPE_COLORS[availType] ?? "#6366f1",
                        fontWeight: 600, fontSize: 10,
                      }}
                    />
                    <Chip label={`Cap: ${resource.capacity}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                  </Box>

                  {/* Date-specific availability badge */}
                  {hasDateFilter && dsConfig && (
                    <Box
                      sx={{
                        display: "flex", alignItems: "center", gap: 0.5,
                        p: 0.75, borderRadius: 1,
                        bgcolor: dsConfig.color + "14",
                        border: "1px solid " + dsConfig.color + "40",
                        mt: 1,
                      }}
                    >
                      <Box sx={{ color: dsConfig.color, display: "flex", alignItems: "center" }}>{dsConfig.icon}</Box>
                      <Typography variant="caption" fontWeight={600} sx={{ color: dsConfig.color }}>
                        {dsConfig.label}
                        {dayStatus === "available" && resource.open_slots > 0 && ` — ${resource.open_slots} slot${resource.open_slots !== 1 ? "s" : ""}`}
                        {dayStatus === "available" && resource.available_capacity > 0 && availType !== "slot_based" && ` — ${resource.available_capacity} unit${resource.available_capacity !== 1 ? "s" : ""} free`}
                      </Typography>
                    </Box>
                  )}

                  {resource.attributes && Object.keys(resource.attributes).length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(resource.attributes).slice(0, 2).map(([k, v]: [string, any]) => (
                        <Typography key={k} variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {k.replace(/_/g, " ")}: <strong>{String(v)}</strong>
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ pt: 0, px: 2, pb: 1.5 }}>
                  <Button
                    fullWidth variant={isUnavailable ? "outlined" : "contained"}
                    size="small"
                    disabled={isUnavailable}
                    color={availType === "request_based" ? "warning" : "primary"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isUnavailable) navigate(`/resources/${resource.id}${selectedDate ? `?date=${selectedDate}` : ""}`);
                    }}
                  >
                    {isUnavailable
                      ? (dayStatus === "blocked" ? "Unavailable" : "No Slots")
                      : availType === "request_based" ? "Request" : "Book Now"}
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" showFirstButton showLastButton />
        </Box>
      )}
    </Box>
  );
};
