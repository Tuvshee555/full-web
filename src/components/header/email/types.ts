export interface FacebookAuthResponse {
  authResponse?: {
    accessToken?: string;
  };
}

export interface GooglePayload {
  credential?: string;
}
