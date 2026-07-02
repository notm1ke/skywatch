import { Marker } from "react-map-gl/mapbox";
import { useState, useEffect, useRef } from "react";

type PlaneIconProps = {
	track: number;
	size?: number;
}

const PlaneIcon: React.FC<PlaneIconProps> = ({ track, size = 24 }) => (
	<div
		className="flex items-center justify-center"
		style={{
			transform: `rotate(${track}deg)`,
			width: size,
			height: size,
		}}
	>
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-blue-600 drop-shadow-lg"
			style={{ transform: 'rotate(-90deg)' }}
		>
			<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
		</svg>
	</div>
)

interface AnimatedPlaneIconProps {
  lat: number;
  lon: number;
  track: number;
  animationDuration?: number;
}

export const AnimatedPlaneIcon: React.FC<AnimatedPlaneIconProps> = ({
  lat,
  lon,
  track,
  animationDuration = 1000,
}) => {
  const [displayLat, setDisplayLat] = useState(lat);
  const [displayLon, setDisplayLon] = useState(lon);
  const [displayTrack, setDisplayTrack] = useState(track);

  const stateRef = useRef({
    lat,
    lon,
    track,
    prevLat: lat,
    prevLon: lon,
    prevTrack: track,
    latVelocity: 0,
    lonVelocity: 0,
    trackVelocity: 0,
    lastUpdateTime: Date.now(),
  });

  const getShortestAngleDiff = (from: number, to: number): number => {
    let diff = to - from;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  };

  // Update when new data arrives
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = Math.max(now - stateRef.current.lastUpdateTime, 1); // Avoid division by zero

    // Calculate velocity (change per millisecond)
    const latVelocity = (lat - stateRef.current.lat) / timeSinceLastUpdate;
    const lonVelocity = (lon - stateRef.current.lon) / timeSinceLastUpdate;
    const trackDiff = getShortestAngleDiff(stateRef.current.track, track);
    const trackVelocity = trackDiff / timeSinceLastUpdate;

    stateRef.current = {
      lat,
      lon,
      track,
      prevLat: stateRef.current.lat,
      prevLon: stateRef.current.lon,
      prevTrack: stateRef.current.track,
      latVelocity,
      lonVelocity,
      trackVelocity,
      lastUpdateTime: now,
    };
  }, [lat, lon, track]);

  // Continuous animation loop - always running
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - stateRef.current.lastUpdateTime;

      // Extrapolate based on velocity
      const predictedLat = stateRef.current.lat + stateRef.current.latVelocity * timeSinceLastUpdate;
      const predictedLon = stateRef.current.lon + stateRef.current.lonVelocity * timeSinceLastUpdate;
      const predictedTrack =
        (stateRef.current.track + stateRef.current.trackVelocity * timeSinceLastUpdate) % 360;

      setDisplayLat(predictedLat);
      setDisplayLon(predictedLon);
      setDisplayTrack(predictedTrack);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <Marker latitude={displayLat} longitude={displayLon}>
      <div style={{ transform: `rotate(${displayTrack}deg)` }}>
        <PlaneIcon track={0} size={32} />
      </div>
    </Marker>
  );
};