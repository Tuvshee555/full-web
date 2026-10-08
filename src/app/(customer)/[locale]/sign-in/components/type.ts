export interface FacebookAuthResponse {
  authResponse: {
    accessToken: string;
  } | null;
}

export interface GoogleLoginPayload {
  credential?: string;
}
