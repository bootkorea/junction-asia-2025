import React, { useEffect } from "react";

const KakaoMapWithZoomInfo = ({ map }) => {
  useEffect(() => {
    if (!map || !window.kakao) return; // kakao SDK 로드 확인

    const zoomControl = new window.kakao.maps.ZoomControl();
	map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    return () => {
      map.removeControl(zoomControl);
    };
  }, [map]);

  return null;
};

export default KakaoMapWithZoomInfo;
