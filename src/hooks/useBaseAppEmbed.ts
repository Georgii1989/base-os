"use client";

import { useEffect, useState } from "react";
import { isBaseAppEmbed } from "@/lib/isBaseAppEmbed";

/** Client-only detection of Base App mini-app shell. */
export function useBaseAppEmbed(): boolean {
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    setEmbedded(isBaseAppEmbed());
  }, []);

  return embedded;
}
