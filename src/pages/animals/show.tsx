import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/mui";
import { Typography, Stack, Chip } from "@mui/material";

export const AnimalShow = () => {
  const { result, query: { isLoading } } = useShow({ resource: "animals" });

  return (
    <Show isLoading={isLoading}>
      <Stack spacing={2}>
        {[
          ["Name", result?.name],
          ["Type", result?.type],
          ["Breed", result?.breed],
          ["Age", result?.age],
          ["Weight", result?.weight ? `${result.weight} kg` : undefined],
          ["Color", result?.color],
          ["Date of Birth", result?.date_of_birth],
          ["Notes", result?.notes],
        ].map(([label, value]) => value ? (
          <div key={label as string}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body1">{value}</Typography>
          </div>
        ) : null)}
        <div>
          <Typography variant="body2" color="text.secondary">Vaccinated</Typography>
          <Chip label={result?.is_vaccinated ? "Yes" : "No"} color={result?.is_vaccinated ? "success" : "default"} size="small" />
        </div>
      </Stack>
    </Show>
  );
};
