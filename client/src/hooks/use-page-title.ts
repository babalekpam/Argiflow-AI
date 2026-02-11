import { useEffect } from "react";

const BASE_TITLE = "ArgiFlow AI";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} - Automated Client Acquisition Platform`;
  }, [title]);
}
