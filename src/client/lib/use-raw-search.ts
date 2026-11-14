"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type SearchSnapshot = {
    params: ReturnType<typeof useSearchParams>;
    value: string;
};

export function useRawSearch(): string | null {
    const params = useSearchParams();
    const [snapshot, setSnapshot] = useState<SearchSnapshot | null>(null);

    useEffect(() => {
        setSnapshot({ params, value: window.location.search });
    }, [params]);

    return snapshot?.params === params ? snapshot.value : null;
}
