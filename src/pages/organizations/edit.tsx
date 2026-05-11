import { useState, useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { Edit } from "@refinedev/mui";
import { Box, TextField, Typography, Alert } from "@mui/material";

export const OrganizationEdit = () => {
  const [metadataStr, setMetadataStr] = useState("{}");
  const [metadataError, setMetadataError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    refineCore: { onFinish, formLoading, queryResult },
    saveButtonProps,
  } = useForm({ resource: "organizations", action: "edit" });

  const record = queryResult?.data?.data;

  useEffect(() => {
    if (record?.metadata != null) {
      setMetadataStr(JSON.stringify(record.metadata, null, 2));
    }
  }, [record?.metadata]);

  const onSubmit = handleSubmit(async (values: any) => {
    let metadata = {};
    try { metadata = JSON.parse(metadataStr); } catch { /* submit empty */ }
    await onFinish({ ...values, metadata });
  });

  return (
    <Edit
      isLoading={formLoading}
      saveButtonProps={{ ...saveButtonProps, onClick: onSubmit }}
      title={<Typography variant="h5" fontWeight={700}>Edit Organization</Typography>}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 600 }}>
        <TextField
          {...register("name", { required: "Name is required" })}
          label="Organization Name"
          error={!!errors.name}
          helperText={(errors.name as any)?.message}
          fullWidth
          required
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          {...register("slug", { required: "Slug is required", pattern: { value: /^[a-z0-9-]+$/, message: "Only lowercase letters, numbers, and hyphens" } })}
          label="Slug"
          error={!!errors.slug}
          helperText={(errors.slug as any)?.message ?? "URL-safe identifier, lowercase with hyphens"}
          fullWidth
          required
          InputLabelProps={{ shrink: true }}
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
    </Edit>
  );
};
