export type ContentType = "card" | "post" | "video_script" | "poster";

export interface CreateContentDto {
  contentType: ContentType;
  targetPlatform: string;
  prompt: string;
}

