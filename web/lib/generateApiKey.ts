import generateApiKey from "generate-api-key";

import { PostgrestError } from "@supabase/supabase-js";
import { hashAuth, supabaseClient } from "./supabaseClient";

export default function generateUserAPIKey({
  name,
  userId,
  onSuccess,
  onError,
}: {
  name: string;
  userId: string;
  onSuccess: (api_key: string) => void;
  onError: (error: PostgrestError) => void;
}): void {
  const apiKey = generateApiKey({ method: "base32", dashes: true }).toString();
  // supabase.auth.user()?.id;
  void supabaseClient
    .from("helicone_keys")
    .insert([
      {
        user_id: userId,
        api_key_hash: hashAuth(apiKey),
        key_name: name,
        api_key_preview: apiKey.slice(0, 4),
      },
    ])
    .then(({ data, error }) => {
      if (error != null) {
        onError(error);
      } else {
        onSuccess(apiKey);
      }
    });
}
