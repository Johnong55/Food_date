import { z } from "zod";

import { googlePlaceIdSchema } from "@/features/restaurant/detail-contract";
import type { ApiErrorBody } from "@/features/discovery/search-contract";
import type { MenuApiData } from "@/types/menu";

export const menuResolveRequestSchema = z
  .object({
    placeId: googlePlaceIdSchema,
  })
  .strict();

export type MenuResolveRequest = z.infer<typeof menuResolveRequestSchema>;

export type MenuApiSuccessBody = {
  data: MenuApiData;
  requestId: string;
};

export type MenuApiResponseBody = MenuApiSuccessBody | ApiErrorBody;
