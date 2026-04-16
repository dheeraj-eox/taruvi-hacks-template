import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useNotification } from "@refinedev/core";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

type ErrorEntry = {
  id: number;
  timestamp: string;
  text: string;
  source: "console-error" | "window-error" | "unhandled-rejection";
};

type ErrorStore = {
  entries: ErrorEntry[];
  listeners: Set<() => void>;
  nextId: number;
};

const MAX_ENTRIES = 100;

const store: ErrorStore = {
  entries: [],
  listeners: new Set(),
  nextId: 1,
};

let consoleCaptureInstalled = false;

const notifyStore = () => {
  store.listeners.forEach((listener) => listener());
};

const serializeValue = (value: unknown, seen = new WeakSet<object>()): string => {
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (typeof value === "bigint") {
    return `${value.toString()}n`;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (
    typeof Element !== "undefined" &&
    value instanceof Element
  ) {
    const attributes = Array.from(value.attributes)
      .map((attribute) => `${attribute.name}="${attribute.value}"`)
      .join(" ");
    return `<${value.tagName.toLowerCase()}${attributes ? ` ${attributes}` : ""}>`;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  try {
    return JSON.stringify(
      value,
      (_key, nestedValue) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            stack: nestedValue.stack,
          };
        }

        if (typeof nestedValue === "bigint") {
          return `${nestedValue.toString()}n`;
        }

        if (typeof nestedValue === "function") {
          return `[Function ${nestedValue.name || "anonymous"}]`;
        }

        if (typeof nestedValue === "symbol") {
          return nestedValue.toString();
        }

        if (nestedValue && typeof nestedValue === "object") {
          if (seen.has(nestedValue as object)) {
            return "[Circular]";
          }

          seen.add(nestedValue as object);
        }

        return nestedValue;
      },
      2,
    );
  } catch {
    return Object.prototype.toString.call(value);
  }
};

const pushEntry = (source: ErrorEntry["source"], values: unknown[]) => {
  const text = values
    .map((value) => serializeValue(value))
    .filter(Boolean)
    .join(" ");

  store.entries = [
    ...store.entries,
    {
      id: store.nextId++,
      timestamp: new Date().toISOString(),
      text,
      source,
    },
  ].slice(-MAX_ENTRIES);

  notifyStore();
};

const installConsoleCapture = () => {
  if (consoleCaptureInstalled || typeof window === "undefined") {
    return;
  }

  consoleCaptureInstalled = true;

  const originalError = console.error;

  console.error = (...args: unknown[]) => {
    pushEntry("console-error", args);
    originalError.apply(console, args);
  };

  window.addEventListener("error", (event) => {
    pushEntry("window-error", [
      event.message,
      event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : "",
      event.error ?? "",
    ]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    pushEntry("unhandled-rejection", ["Unhandled promise rejection", event.reason]);
  });
};

const subscribe = (listener: () => void) => {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
};

const getSnapshot = () => store.entries;

const clearEntries = () => {
  store.entries = [];
  notifyStore();
};

const formatEntry = (entry: ErrorEntry) => {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  return `[${time}] [${entry.source}] ${entry.text}`;
};

const copyText = async (text: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is not available in this browser.");
  }

  await navigator.clipboard.writeText(text);
};

export const ConsoleLogDrawer = () => {
  const { open } = useNotification();
  const entries = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const previousCountRef = useRef(0);

  useEffect(() => {
    installConsoleCapture();
  }, []);

  useEffect(() => {
    if (entries.length > previousCountRef.current) {
      const latestEntry = entries[entries.length - 1];
      setIsOpen(true);
      open?.({
        type: "error",
        message: "Application error detected",
        description: latestEntry ? latestEntry.text.slice(0, 160) : "Open the error panel for details.",
      });
    }

    previousCountRef.current = entries.length;
  }, [entries, open]);

  const latestEntry = useMemo(() => entries[entries.length - 1] ?? null, [entries]);

  const handleCopyVisible = async () => {
    const text = latestEntry ? formatEntry(latestEntry) : "";

    if (!text) {
      open?.({
        type: "error",
        message: "No error to copy",
        description: "There is no captured error yet.",
      });
      return;
    }

    try {
      await copyText(text);
      open?.({
        type: "success",
        message: "Error copied",
        description: "The latest error is in your clipboard.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Copy failed",
        description: serializeValue(error),
      });
    }
  };

  if (entries.length === 0 && !isOpen) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: { xs: 220, md: 240 },
        },
      }}
    >
      <DialogContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 3 }}>
        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            p: 2,
            borderColor: "error.main",
            bgcolor: "error.light",
            color: "error.contrastText",
          }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="pre"
                variant="body2"
                sx={{
                  m: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "Monaco, Consolas, 'Courier New', monospace",
                }}
              >
                {latestEntry?.text ?? "Unknown error"}
              </Typography>
            </Box>
            <Tooltip title="Copy error">
              <IconButton onClick={handleCopyVisible} sx={{ color: "inherit", flexShrink: 0 }}>
                <ContentCopyRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => setIsOpen(false)} variant="contained" color="error">
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
};
