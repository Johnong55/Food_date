"use client";

import { useCallback, useState } from "react";

import type { SelectedLocation } from "@/features/discovery/types";

type LocationStatus = "idle" | "locating" | "success" | "error";

function getLocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Bạn chưa cho phép truy cập vị trí. Hãy chọn khu vực thủ công nhé.";
    case error.POSITION_UNAVAILABLE:
      return "Thiết bị chưa xác định được vị trí. Hãy thử chọn khu vực bên dưới.";
    case error.TIMEOUT:
      return "Tìm vị trí hơi lâu. Bạn có thể thử lại hoặc chọn khu vực thủ công.";
    default:
      return "Không lấy được vị trí hiện tại.";
  }
}

export function useCurrentLocation(
  onLocated: (location: SelectedLocation) => void,
) {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Trình duyệt này không hỗ trợ định vị.");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocated({
          id: "current-location",
          label: "Vị trí hiện tại",
          source: "current",
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
        setStatus("success");
      },
      (locationError) => {
        setStatus("error");
        setError(getLocationErrorMessage(locationError));
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, [onLocated]);

  return {
    requestLocation,
    isLocating: status === "locating",
    error,
  };
}
