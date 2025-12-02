
"use client";

import { useActionState, useState } from "react";
import { executeQueryAction } from "@/lib/actions";

type FormState = {
  status: "idle" | "success" | "error" | "pending";
  message: string;
  data?: any[];
  debugLog?: string[];
  action?: 'json' | 'csv';
};

const initialState: FormState = {
  status: "idle",
  message: "",
  data: [],
  debugLog: [],
};

export function useFactusol() {
  const [state, executeQuery] = useActionState(executeQueryAction, initialState);
  const [showJson, setShowJson] = useState(false);

  return {
    state,
    executeQuery,
    showJson,
    setShowJson,
  };
}
