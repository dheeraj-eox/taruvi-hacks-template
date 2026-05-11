import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress, Button,
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import BusinessIcon from "@mui/icons-material/Business";
import InventoryIcon from "@mui/icons-material/Inventory";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ExploreIcon from "@mui/icons-material/Explore";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800",
  confirmed: "#4CAF50",
  cancelled: "#F44336",
  completed: "#2196F3",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const StatCard = ({ title, value, icon, color, loading }: StatCardProps) => (
  <Card sx={{ borderLeft: `4px solid ${color}`, height: "100%" }}>
    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2.5 }}>
      <Box
        sx={{
          width: 56, height: 56, borderRadius: 2,
          bgcolor: color + "1A",
          display: "flex", alignItems: "center", justifyContent: "center",
          color, flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <Typography variant="h4" fontWeight={700} lineHeight={1}>{value}</Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{title}</Typography>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const navigate = useNavigate();

  const { data: orgData, isLoading: orgLoading } = useList({
    resource: "organizations",
    meta: { aggregate: ["count(*)"] },
    pagination: { pageSize: 1 },
  });

  const { data: resourceData, isLoading: resLoading } = useList({
    resource: "resources",
    meta: { aggregate: ["count(*)"] },
    pagination: { pageSize: 1 },
  });

  const { data: bookingStats, isLoading: statsLoading } = useList({
    resource: "bookings",
    meta: { aggregate: ["count(*)"], groupBy: ["status"] },
    pagination: { pageSize: 10 },
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useList({
    resource: "bookings",
    filters: [
      { field: "status", operator: "in", value: ["pending", "confirmed"] },
    ],
    sorters: [{ field: "start_time", order: "asc" }],
    pagination: { current: 1, pageSize: 6 },
  });

  const orgCount = (orgData?.data as any)?.[0]?.count ?? 0;
  const resCount = (resourceData?.data as any)?.[0]?.count ?? 0;
  const statsRows: any[] = (bookingStats?.data ?? []) as any[];
  const totalBookings = statsRows.reduce((s: number, r: any) => s + Number(r.count ?? 0), 0);
  const confirmedCount = statsRows.find((r: any) => r.status === "confirmed")?.count ?? 0;

  const chartData = statsRows.map((r: any) => ({
    status: STATUS_LABELS[r.status] ?? r.status,
    rawStatus: r.status,
    count: Number(r.count ?? 0),
  }));

  const upcoming: any[] = (upcomingData?.data ?? []) as any[];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
        <Typography color="text.secondary">Resource Calendar Overview</Typography>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard title="Organizations" value={orgCount} icon={<BusinessIcon />} color="#6366f1" loading={orgLoading} />
        <StatCard title="Total Resources" value={resCount} icon={<InventoryIcon />} color="#0ea5e9" loading={resLoading} />
        <StatCard title="Total Bookings" value={totalBookings} icon={<EventNoteIcon />} color="#8b5cf6" loading={statsLoading} />
        <StatCard title="Confirmed" value={confirmedCount} icon={<CheckCircleIcon />} color={STATUS_COLORS.confirmed} loading={statsLoading} />
      </Box>

      {/* Charts + Upcoming */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        {/* Bookings by Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Bookings by Status</Typography>
            {statsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : chartData.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, color: "text.secondary" }}>
                <EventNoteIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography>No bookings yet</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(val) => [val, "Bookings"]} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.rawStatus] ?? "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>Upcoming Bookings</Typography>
              <Button size="small" onClick={() => navigate("/my-bookings")}>View All</Button>
            </Box>
            {upcomingLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : upcoming.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, color: "text.secondary" }}>
                <BookmarkIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography>No upcoming bookings</Typography>
                <Button
                  variant="outlined" size="small" sx={{ mt: 2 }}
                  onClick={() => navigate("/resources")}
                >
                  Browse Resources
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {upcoming.map((b: any) => {
                  const start = new Date(b.start_time);
                  const end = new Date(b.end_time);
                  return (
                    <Box
                      key={b.id}
                      sx={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        p: 1.5, borderRadius: 2, bgcolor: "action.hover",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {b.amount} unit{b.amount !== 1 ? "s" : ""} · {b.booking_scope}
                        </Typography>
                      </Box>
                      <Chip
                        label={b.status}
                        size="small"
                        sx={{
                          bgcolor: STATUS_COLORS[b.status] ?? "grey.400",
                          color: "white",
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: "capitalize",
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
