import { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { Create } from "@refinedev/mui";
import { Box, TextField, Typography, Alert } from "@mui/material";

export const OrganizationCreate = () => {
  const [metadataStr, setMetadataStr] = useState("{}");
  const [metadataError, setMetadataError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    refineCore: { onFinish, formLoading },
    saveButtonProps,
  } = useForm({ resource: "organizations", action: "create" });

  const onSubmit = handleSubmit(async (values: any) => {
    let metadata = {};
    try { metadata = JSON.parse(metadataStr); } catch { /* invalid JSON - submit empty */ }
    await onFinish({ ...values, metadata });
  });

  return (
    <Create
      isLoading={formLoading}
      saveButtonProps={{ ...saveButtonProps, onClick: onSubmit }}
      title={<Typography variant="h5" fontWeight={700}>New Organization</Typography>}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 600 }}>
        <TextField
          {...register("name", { required: "Name is required" })}
          label="Organization Name"
          placeholder="e.g. EOX Vantage Rowing Club"
          error={!!errors.name}
          helperText={(errors.name as any)?.message}
          fullWidth
          required
        />
        <TextField
          {...register("slug", { required: "Slug is required", pattern: { value: /^[a-z0-9-]+$/, message: "Only lowercase letters, numbers, and hyphens" } })}
          label="Slug"
          placeholder="e.g. eox-rowing"
          error={!!errors.slug}
          helperText={(errors.slug as any)?.message ?? "URL-safe identifier, lowercase with hyphens"}
          fullWidth
          required
        />
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Metadata (JSON) — optional
          </Typography>
          <TextField
            multiline
            rows={4}
            value={metadataStr}
            onChange={(e) => {
              setMetadataStr(e.target.value);
              try { JSON.parse(e.target.value); setMetadataError(false); } catch { setMetadataError(true); }
            }}
            error={metadataError}
            helperText={metadataError ? "Invalid JSON" : "Additional data as JSON object"}
            fullWidth
            inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
          />
          {metadataError && <Alert severity="warning" sx={{ mt: 1 }}>Fix JSON before saving</Alert>}
        </Box>
      </Box>
    </Create>
  );
};
