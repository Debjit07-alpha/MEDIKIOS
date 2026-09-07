export class GoogleProviderUnavailableError extends Error {
  constructor() {
    super("Google Cloud credentials are not configured");
    this.name = "GoogleProviderUnavailableError";
  }
}

export function assertGoogleCredentials() {
  const hasCredentialsFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const hasServiceAccount = Boolean(
    process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY,
  );

  if (!hasCredentialsFile && !hasServiceAccount) {
    throw new GoogleProviderUnavailableError();
  }
}