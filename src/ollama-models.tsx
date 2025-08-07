import React from "react";
import GithubModelsView from "./lib/ui/GithubModelsView";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  return <GithubModelsView />;
}
