import { GoogleAuth, JWT } from "google-auth-library";

const CLOUD_PLATFORM_SCOPE =
  "https://www.googleapis.com/auth/cloud-platform";

export interface GooglePlacesRequestAuthenticator {
  getRequestHeaders(): Promise<Record<string, string>>;
}

type AccessTokenResponse =
  | string
  | null
  | undefined
  | { token?: string | null };

export interface GoogleAccessTokenProvider {
  getAccessToken(): Promise<AccessTokenResponse>;
}

export type GooglePlacesOAuthConfig = {
  projectId: string;
  serviceAccount?: {
    email: string;
    privateKey: string;
  };
};

export class GoogleApiKeyPlacesAuth
  implements GooglePlacesRequestAuthenticator
{
  private readonly apiKey: string;

  constructor(apiKey: string) {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
      throw new Error("Google Places API key is required.");
    }
    this.apiKey = normalizedApiKey;
  }

  async getRequestHeaders() {
    return { "X-Goog-Api-Key": this.apiKey };
  }
}

export class GoogleOAuthPlacesAuth
  implements GooglePlacesRequestAuthenticator
{
  constructor(
    private readonly projectId: string,
    private readonly tokenProvider: GoogleAccessTokenProvider,
  ) {
    if (!projectId.trim()) {
      throw new Error("Google Cloud project ID is required for OAuth.");
    }
  }

  async getRequestHeaders() {
    const response = await this.tokenProvider.getAccessToken();
    const token =
      typeof response === "string" ? response : response?.token;

    if (!token) {
      throw new Error("Google OAuth access token is unavailable.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "X-Goog-User-Project": this.projectId,
    };
  }
}

export function createGoogleOAuthPlacesAuth(
  config: GooglePlacesOAuthConfig,
): GoogleOAuthPlacesAuth {
  const tokenProvider: GoogleAccessTokenProvider = config.serviceAccount
    ? new JWT({
        email: config.serviceAccount.email,
        key: config.serviceAccount.privateKey,
        scopes: [CLOUD_PLATFORM_SCOPE],
      })
    : new GoogleAuth({
        projectId: config.projectId,
        scopes: [CLOUD_PLATFORM_SCOPE],
      });

  return new GoogleOAuthPlacesAuth(config.projectId, tokenProvider);
}
