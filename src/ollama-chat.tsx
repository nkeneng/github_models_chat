import React from "react";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./lib/types";
import GithubChatView from "./lib/ui/GithubChatView";

const p = getPreferenceValues<Preferences>();
if (!p.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  return <GithubChatView />;
}
