import {
  ArrowTopRightOnSquareIcon,
  ChevronDoubleDownIcon,
  InformationCircleIcon,
  KeyIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";

import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { hydrate } from "react-dom";
import { DEMO_EMAIL } from "../../../lib/constants";
import { middleTruncString } from "../../../lib/stringHelpers";
import { hashAuth } from "../../../lib/supabaseClient";
import { useKeys } from "../../../lib/useKeys";
import { Database } from "../../../supabase/database.types";
import ThemedTable from "../../shared/themedTable";

interface KeyPageProps {}

const HeliconeKeyPage = (props: KeyPageProps) => {
  const user = useUser();

  const supabaseClient = useSupabaseClient<Database>();
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  const [keyName, setKeyName] = useState("");
  const [hashedApiKey, setHashedApiKey] = useState("");

  useEffect(() => {
    if (apiKey === "") {
      setHashedApiKey("");
      return;
    }
    hashAuth(apiKey).then((hash) => {
      setHashedApiKey(hash);
    });
  }, [apiKey]);

  const { apiKeys, getKeys } = useKeys(supabaseClient);

  async function addKey() {
    if (hashedApiKey === "") {
      setError("Please enter a key");
      return;
    }
    if (!user?.id) {
      setError("Please login to add a key");
      return;
    }
    supabaseClient
      .from("user_api_keys")
      .insert([
        {
          user_id: user?.id!,
          api_key_hash: hashedApiKey,
          api_key_preview: middleTruncString(apiKey, 8),
          key_name: keyName,
        },
      ])
      .then((res) => {
        if (res.error) {
          console.error(res.error);
          setError(
            `Error saving key - please contact us on discord!\n${res.error.message}`
          );
        }
        setApiKey("");
        setError(null);
        setKeyName("");
        getKeys();
      });
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h1 className="text-2xl font-semibold">Helicone API Keys</h1>
        <div className="mt-2 w-full sm:w-2/3 border-2 p-4 text-sm rounded-md flex flex-row items-center text-gray-600 border-gray-300 gap-4">
          <div>
            <LightBulbIcon className="h-10 w-10 text-gray-600" />
          </div>
          <p className="text-base">
            <span className="font-semibold">Note</span>: These keys are only for{" "}
            <Link
              as="span"
              href="https://docs.helicone.ai/getting-started/how-encryption-works"
              target="_blank"
              rel="noopener noreferrer"
              className="underline inline-flex flex-row w-fit"
            >
              Async logging
            </Link>
            . You are probably using{" "}
            <Link
              as="span"
              href="https://docs.helicone.ai/getting-started/how-encryption-works"
              target="_blank"
              rel="noopener noreferrer"
              className="underline inline-flex flex-row w-fit"
            >
              Helione{"'"}s proxy service
            </Link>
            , in which can you will want to{" "}
            <Link
              as="span"
              href="https://docs.helicone.ai/getting-started/how-encryption-works"
              target="_blank"
              rel="noopener noreferrer"
              className="underline inline-flex flex-row w-fit"
            >
              add your OpenAI key
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row w-full gap-4 sm:gap-0 ">
          <div className="w-full">
            <label
              htmlFor="keyName"
              className="block text-sm font-medium text-black"
            >
              Key Name
            </label>
            <div className="relative mt-1 items-center flex-row flex gap-5">
              <input
                type="text"
                name="keyName"
                id="keyName"
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Enter in a name for this key"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
              <div className="w-full">
                <button
                  onClick={addKey}
                  className="rounded-md bg-black px-3.5 py-1.5 text-base font-semibold leading-7 text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Generate Key
                </button>
              </div>
            </div>
          </div>
          <div className="w-full"></div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 flex flex-col gap-2 mt-2 whitespace-pre-line">
          <p>{error}</p>
        </div>
      )}
      {apiKeys !== undefined && apiKeys.length < 1 ? (
        <div className="mt-10 relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          <div className="w-full justify-center align-middle items-center">
            <KeyIcon className="h-10 w-10 mx-auto" />
          </div>

          <span className="mt-2 block text-sm font-medium text-gray-900">
            Add a key to get started
          </span>
        </div>
      ) : (
        <ThemedTable
          columns={[
            { name: "Name", key: "key_name", hidden: false },
            { name: "Hash", key: "api_key_hash", hidden: true },
            { name: "Preview", key: "api_key_preview", hidden: true },
            { name: "Created", key: "created_at", hidden: false },
          ]}
          rows={apiKeys}
          deleteHandler={(row) => {
            supabaseClient
              .from("user_api_keys")
              .delete()
              .eq("api_key_hash", row.api_key_hash)
              .then((res) => {
                if (user?.email === DEMO_EMAIL) {
                  setError("You can't delete keys on the demo account");
                  return;
                }

                if (res.error) {
                  console.error(res.error);
                  setError(
                    `Error deleting key - please contact us on discord!\n${res.error.message}`
                  );
                  return;
                }
                getKeys();
              });
          }}
        />
      )}
    </div>
  );
};

export default HeliconeKeyPage;
