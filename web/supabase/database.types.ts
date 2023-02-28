import { Database as GenDB, Json } from "./generated.database.types";

interface MaterializedViews {
  public: {
    Tables: {
      materialized_response_and_request: {
        Row: {
          response_body: Json;
          response_id: string;
          response_created_at: string;
          request_id: string;
          request_body: Json;
          request_path: string;
          request_created_at: string;
          request_user_id: string | null;
          api_key_preview: string;
          user_id: string;
          request_properties: Json | null;
          formatted_prompt_id: string | null;
          prompt_values: Json | null;
          prompt_name: string | null;
          prompt_regex: string | null;
          is_cached: boolean;
          user_api_key_hash: string;
        };
      };
    };
  };
}

export type Database = GenDB & MaterializedViews;
