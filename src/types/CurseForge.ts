export type CfMod = {
  id: number;
  name: string;
  slug: string;
  links?: { websiteUrl?: string };
  dateModified?: string;
  downloadCount?: number;
};

export type CfFile = {
  id: number;
  displayName: string;
  fileName: string;
  fileDate: string; /** ISO */
};

export type LatestFileInfo = {
  mod: CfMod;
  latestFile: CfFile;
  latestFileUrl: string; /** Project files URL */
  matchScore?: number;
  matchType?: string;
};