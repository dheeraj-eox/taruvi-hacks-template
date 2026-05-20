import { Create, useAutocomplete } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { TextField, Checkbox, FormControlLabel, Box, Autocomplete } from "@mui/material";

const TYPES = ["Dog", "Cat", "Bird", "Fish", "Rabbit", "Turtle"];

export const AnimalCreate = () => {
  const { saveButtonProps, register, formState: { errors } } = useForm({ resource: "animals" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField {...register("name", { required: "Name is required" })} label="Name" error={!!errors.name} helperText={errors.name?.message as string} />
        <Autocomplete
          options={TYPES}
          renderInput={(params) => <TextField {...params} {...register("type", { required: "Type is required" })} label="Type" error={!!errors.type} helperText={errors.type?.message as string} />}
        />
        <TextField {...register("breed")} label="Breed" />
        <TextField {...register("age", { valueAsNumber: true })} label="Age" type="number" />
        <TextField {...register("weight", { valueAsNumber: true })} label="Weight (kg)" type="number" />
        <TextField {...register("color")} label="Color" />
        <FormControlLabel control={<Checkbox {...register("is_vaccinated")} />} label="Vaccinated" />
        <TextField {...register("date_of_birth")} label="Date of Birth" type="date" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField {...register("notes")} label="Notes" multiline rows={3} />
      </Box>
    </Create>
  );
};
