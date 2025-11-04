import { z } from 'zod';

const configSchema = z.object({
  DISCORD_TOKEN: z.string().min(59),
  CLIENT_ID: z.string().min(18),
  GUILD_ID: z.string().min(18),
  AMP_USERNAME: z.string().min(1),
  AMP_PASS: z.string().min(1),
  UPDATE_CHECK_TIME: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  UPDATE_CHANNEL_ID: z.string().min(0).optional(),
  CURSEFORGE_API_KEY: z.string().min(10),
});

export function validateConfig(cfg: unknown) {
  const r = configSchema.safeParse(cfg);
  if (!r.success) throw new Error(`Invalid config: ${r.error.message}`);
  return r.data;
}