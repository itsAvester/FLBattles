"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type RegisteredProducerCountProps = {
  suffix?: string;
  className?: string;
};

export default function RegisteredProducerCount({
  suffix = "",
  className = "",
}: RegisteredProducerCountProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const loadCount = async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error("Error loading registered producer count:", error);
        return;
      }

      setCount(count ?? 0);
    };

    loadCount();
  }, []);

  if (count === null) {
    return <span className={className}>...</span>;
  }

  return (
    <span className={className}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}