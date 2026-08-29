"use client";

import { useCallback, useState } from "react";

import { haversineDistanceMeters } from "@/lib/geo/distance";
import type { Coordinates } from "@/types/place";

type DistanceStatus = "idle" | "locating" | "success" | "error";

function getErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Bạn chưa cho phép dùng vị trí để tính khoảng cách.";
    case error.POSITION_UNAVAILABLE:
      return "Thiết bị chưa xác định được vị trí hiện tại.";
    case error.TIMEOUT:
      return "Tìm vị trí hơi lâu. Hãy thử lại nhé.";
    default:
      return "Không tính được khoảng cách lúc này.";
  }
}

export function usePlaceDistance(target: Coordinates) {
  const [status, setStatus] = useState<DistanceStatus>("idle");
  const [distanceMeters, setDistanceMeters] = useState<number>();
  const [error, setError] = useState<string>();

  const calculateDistance = useCallback(() => {
    setError(undefined);
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Trình duyệt này không hỗ trợ định vị.");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDistanceMeters(
          haversineDistanceMeters(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            target,
          ),
        );
        setStatus("success");
      },
      (locationError) => {
        setStatus("error");
        setError(getErrorMessage(locationError));
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, [target]);

  return {
    calculateDistance,
    distanceMeters,
    isLocating: status === "locating",
    error,
  };
}
