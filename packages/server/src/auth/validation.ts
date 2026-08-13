import { z } from "zod";

export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "username must be at least 3 characters")
    .max(32, "username must be at most 32 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "username may only contain letters, numbers, underscores and hyphens",
    ),
  password: z.string().min(8, "password must be at least 8 characters").max(256),
});

export type Credentials = z.infer<typeof credentialsSchema>;
