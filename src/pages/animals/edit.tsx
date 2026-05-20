import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { TextField, Checkbox, FormControlLabel, Box, Autocomplete } from "@mui/material";

const TYPES = ["Dog", "Cat", "Bird", "Fish", "Rabbit", "Turtle"];

export const AnimalEdit = () => {
  const { saveButtonProps, register, formState: { errors }, refineCore: { query } } = useForm({ resource: "animals" });
  const record = query?.data?.data;

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField {...register("name", { required: "Name is required" })} label="Name" error={!!errors.name} helperText={errors.name?.message as string} slotProps={{ inputLabel: { shrink: true } }} />
        <Autocomplete
          options={TYPES}
          defaultValue={record?.type}
          renderInput={(params) => <TextField {...params} {...register("type", { required: "Type is required" })} label="Type" error={!!errors.type} helperText={errors.type?.message as string} slotProps={{ inputLabel: { shrink: true } }} />}
        />
        <TextField {...register("breed")} label="Breed" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField {...register("age", { valueAsNumber: true })} label="Age" type="number" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField {...register("weight", { valueAsNumber: true })} label="Weight (kg)" type="number" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField {...register("color")} label="Color" slotProps={{ inputLabel: { shrink: true } }} />
        <FormControlLabel control={<Checkbox {...register("is_vaccinated")} defaultChecked={record?.is_vaccinated} />} label="Vaccinated" />
        <TextField {...register("date_of_birth")} label="Date of Birth" type="date" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField {...register("notes")} label="Notes" multiline rows={3} slotProps={{ inputLabel: { shrink: true } }} />
      </Box>
    </Edit>
  );
};
