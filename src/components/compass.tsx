import { useEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import * as mgrs from 'mgrs';
import { appendNote, notify } from '../lib/storage';
import { formatMgrs, northReference } from '../casevac/geo';

/** One-tap GPS → MGRS, appended to the Orientation notes. */
export const GetGridButton = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) {
      notify('Geolocation not supported by this browser', 'error');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        const { latitude, longitude } = position.coords;
        try {
          const grid = formatMgrs(mgrs.forward([longitude, latitude], 5));
          appendNote('osmeac-o', `Present Location: ${grid}`);
          notify('Grid added to Orientation notes', 'success');
        } catch (e) {
          console.error(e);
          notify('Could not convert location to MGRS (out of range?)', 'error');
        }
      },
      (err) => {
        setLoading(false);
        console.error(err);
        notify('Location failed — check permissions & services', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading} className="chip chip-solid">
      {loading ? 'LOCATING…' : 'GET GRID'}
    </button>
  );
};

// --- Compass helpers ---

type IOSOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

type PermissionCapableCtor = {
  requestPermission?: () => Promise<PermissionState>;
};

const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

// Keeps rotation smooth across 359 -> 0 instead of spinning the long way around.
const smoothCompassDeg = (
  previousContinuousDeg: number,
  nextNormalizedDeg: number,
  factor = 0.28
): number => {
  const previousNormalized = normalizeDeg(previousContinuousDeg);
  const delta = ((nextNormalizedDeg - previousNormalized + 540) % 360) - 180;
  return previousContinuousDeg + delta * factor;
};

const isInsideFrame = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const CompassArrow = ({
  label,
  rotationDeg,
  color,
  length = 31,
}: {
  label: string;
  rotationDeg: number;
  color: string;
  length?: number;
}) => (
  <div
    className="absolute inset-0 origin-center transition-transform duration-75 ease-linear"
    style={{ transform: `rotate(${rotationDeg}deg)` }}
  >
    <div className="absolute left-1/2 top-[9px] -translate-x-1/2 flex flex-col items-center">
      <div className="font-mono text-[11px] font-black leading-none" style={{ color }}>
        {label}
      </div>
      <div className="relative mt-[2px] w-[2px]" style={{ height: length, backgroundColor: color }}>
        <div
          className="absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent"
          style={{ borderBottomColor: color }}
        />
      </div>
    </div>
  </div>
);

export const TopCompass = () => {
  const [isActive, setIsActive] = useState(false);
  const [magHeadingDeg, setMagHeadingDeg] = useState<number | null>(null);
  const [gmAngle, setGmAngle] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const lastHeadingRef = useRef<number | null>(null);
  const noEventTimerRef = useRef<number | null>(null);

  const clearNoEventTimer = () => {
    if (noEventTimerRef.current !== null) {
      window.clearTimeout(noEventTimerRef.current);
      noEventTimerRef.current = null;
    }
  };

  const stopCompass = () => {
    clearNoEventTimer();
    lastHeadingRef.current = null;
    setMagHeadingDeg(null);
    setStatusMsg('');
    setIsActive(false);
  };

  const startCompass = async () => {
    setStatusMsg('Requesting motion…');

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setStatusMsg('HTTPS required for compass.');
      return;
    }

    const orientationCtor = (window as any).DeviceOrientationEvent as
      PermissionCapableCtor | undefined;
    const motionCtor = (window as any).DeviceMotionEvent as PermissionCapableCtor | undefined;

    if (!orientationCtor) {
      setStatusMsg('Compass unsupported on this device.');
      return;
    }

    try {
      // Request BOTH sensor permissions immediately from the tap gesture. Do NOT await
      // geolocation first — on iOS that can consume the user gesture and fail the prompt.
      const requests: Promise<PermissionState>[] = [];
      if (typeof orientationCtor.requestPermission === 'function') {
        requests.push(orientationCtor.requestPermission());
      }
      if (typeof motionCtor?.requestPermission === 'function') {
        requests.push(motionCtor.requestPermission());
      }
      if (requests.length > 0) {
        const results = await Promise.all(
          requests.map((r) => r.catch(() => 'denied' as PermissionState))
        );
        if (results.some((r) => r !== 'granted')) {
          setStatusMsg(
            isInsideFrame() ? 'Motion blocked in preview frame.' : 'Motion permission denied.'
          );
          return;
        }
      }

      lastHeadingRef.current = null;
      setMagHeadingDeg(null);
      setIsActive(true);
      setStatusMsg('Move phone to wake compass…');

      clearNoEventTimer();
      noEventTimerRef.current = window.setTimeout(() => {
        if (lastHeadingRef.current === null) {
          setStatusMsg(
            isInsideFrame()
              ? 'No sensor events — open as a standalone app.'
              : 'No compass events yet.'
          );
        }
      }, 3000);

      // Real G-M angle from location — WMM declination minus UTM grid convergence — fetched
      // AFTER activation so a slow or denied GPS fix never blocks the compass. Stays null on failure.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setGmAngle(northReference(latitude, longitude)?.gm ?? null);
          },
          (error) => console.warn('Geolocation for declination failed:', error),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      }
    } catch (error) {
      console.error('Compass permission error:', error);
      setStatusMsg(isInsideFrame() ? 'Sensor blocked by app frame.' : 'Compass permission failed.');
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const handleOrientation = (rawEvent: Event) => {
      const event = rawEvent as IOSOrientationEvent;
      let nextMagHeading: number | null = null;

      if (
        typeof event.webkitCompassHeading === 'number' &&
        Number.isFinite(event.webkitCompassHeading)
      ) {
        // iPhone/iPad WebKit — best real-world heading source (0 = north, clockwise).
        nextMagHeading = normalizeDeg(event.webkitCompassHeading);
        if (typeof event.webkitCompassAccuracy === 'number' && event.webkitCompassAccuracy > 30) {
          setStatusMsg('CAL: move phone in a figure-8');
        } else {
          setStatusMsg('');
        }
      } else if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
        // Android / other browsers — absolute alpha ≈ 360 - heading.
        nextMagHeading = normalizeDeg(360 - event.alpha);
        setStatusMsg('');
      }

      if (nextMagHeading === null) return;

      const previous = lastHeadingRef.current;
      const smoothed =
        previous === null ? nextMagHeading : smoothCompassDeg(previous, nextMagHeading);
      lastHeadingRef.current = smoothed;
      setMagHeadingDeg(smoothed);
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation as EventListener, true);

    return () => {
      window.removeEventListener(
        'deviceorientationabsolute',
        handleOrientation as EventListener,
        true
      );
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
      clearNoEventTimer();
    };
  }, [isActive]);

  if (!isActive) {
    return (
      <div className="compass-slot">
        <button
          type="button"
          onClick={startCompass}
          className="icon-btn icon-btn-lg"
          title="Tap to enable compass"
          aria-label="Tap to enable compass"
        >
          <Compass size={20} strokeWidth={2.5} />
        </button>
        {statusMsg && <div className="compass-status">{statusMsg}</div>}
      </div>
    );
  }

  // "G" arrow = grid north: magnetic heading corrected by the G-M angle (East positive).
  const gm = gmAngle ?? 0;
  const magneticNorthRotation = magHeadingDeg === null ? gm : -magHeadingDeg;
  const gridNorthRotation = magHeadingDeg === null ? 0 : -(magHeadingDeg + gm);

  const magDisplay =
    magHeadingDeg === null
      ? '---°M'
      : `${Math.round(normalizeDeg(magHeadingDeg)).toString().padStart(3, '0')}°M`;
  const gmDisplay =
    gmAngle === null
      ? 'G-M --'
      : `G-M ${Math.abs(Math.round(gmAngle))}°${gmAngle >= 0 ? 'E' : 'W'}`;

  return (
    <div className="compass-slot compass-slot-active">
      <button
        type="button"
        onClick={stopCompass}
        className="relative h-[86px] w-[86px] rounded-full border border-[var(--border)] bg-[var(--surface-alt)] shadow-sm"
        title="Tap to close compass"
        aria-label="Tap to close compass"
      >
        <CompassArrow
          label="G"
          rotationDeg={gridNorthRotation}
          color="var(--text-primary)"
          length={33}
        />
        <CompassArrow
          label="M"
          rotationDeg={magneticNorthRotation}
          color="var(--accent-red)"
          length={28}
        />

        <div className="absolute left-1/2 top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-primary)]" />

        <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] font-bold leading-none text-[var(--text-primary)]">
          {magDisplay}
        </div>
        <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] font-bold leading-none text-[var(--text-tertiary)]">
          {gmDisplay}
        </div>
      </button>
      {statusMsg && <div className="compass-status">{statusMsg}</div>}
    </div>
  );
};
