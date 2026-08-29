import type {
  MenuProvider,
  MenuResolveContext,
} from "@/services/menu-resolver/menu-provider";
import type { MenuProviderAttempt, MenuResolution } from "@/types/menu";

export class MenuResolver {
  constructor(private readonly providers: MenuProvider[]) {}

  async resolve(context: MenuResolveContext): Promise<MenuResolution> {
    const attempts: MenuProviderAttempt[] = [];

    for (const provider of this.providers) {
      let result;
      try {
        result = await provider.resolve(context);
      } catch {
        attempts.push({
          provider: provider.id,
          status: "failed",
          reason: "unexpected_provider_error",
        });
        continue;
      }

      attempts.push({
        provider: provider.id,
        status: result.status,
        ...(result.status !== "resolved" && result.reason
          ? { reason: result.reason }
          : {}),
      });

      if (result.status === "resolved") {
        return { status: "resolved", menu: result.menu, attempts };
      }
    }

    return { status: "unavailable", attempts };
  }
}
