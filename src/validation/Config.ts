import { z } from 'zod';

const configSchema = z.object({
  DISCORD_TOKEN: z.string().min(59),
  CLIENT_ID: z.string().min(18),
  GUILD_IDS: z.array(z.string().min(18)),
  AMP_USERNAME: z.string().min(1),
  AMP_PASS: z.string().min(1),
  AMP_API_BASE_URL: z.string().url().optional(),
  UPDATE_CHECK_TIME: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  UPDATE_CHANNEL_ID: z.string().min(0).optional(),
  DISBOARD_CHANNEL_ID: z.string().min(0).optional(),
  CURSEFORGE_API_KEY: z.string().min(10),
  AUTO_UPDATE_DEPS: z.boolean(),
  IS_PROD: z.boolean(),
  DISABLED_COMMANDS: z.array(z.string()).optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

export function validateConfig(cfg: unknown): AppConfig {
  const r = configSchema.safeParse(cfg);
  if (!r.success) throw new Error(`Invalid config: ${r.error.message}`);
  return r.data;
}
