"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

type GeoJsonFeature = {
  id?: string;
  properties?: { name?: string };
  geometry?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type GlobeSource = {
  ip: string;
  attacks: number;
  reports: number;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  organization: string;
  asn: number | null;
  providers: string[];
  categories: string[];
};

type GlobeCountry = {
  country: string;
  countryCode: string;
  attacks: number;
  latitude: number;
  longitude: number;
};

type ProjectedPoint = {
  x: number;
  y: number;
  z: number;
};

type Palette = {
  ocean: string;
  land: string;
  border: string;
  grid: string;
  accent: string;
  warm: string;
  light: string;
  text: string;
};

const DEFAULT_PALETTE: Palette = {
  ocean: "#13231D",
  land: "#3F6B5A",
  border: "#8DA99B",
  grid: "#C8DDD2",
  accent: "#73E2A7",
  warm: "#F4B942",
  light: "#F5F4EF",
  text: "#F5F4EF",
};

function cssColor(styles: CSSStyleDeclaration, name: string, fallback: string) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function readPalette(element: HTMLElement): Palette {
  const styles = getComputedStyle(element);

  return {
    ocean: cssColor(styles, "--theme-deep-panel", DEFAULT_PALETTE.ocean),
    land: cssColor(styles, "--theme-accent", DEFAULT_PALETTE.land),
    border: cssColor(styles, "--theme-border", DEFAULT_PALETTE.border),
    grid: cssColor(styles, "--theme-deep-muted", DEFAULT_PALETTE.grid),
    accent: cssColor(styles, "--theme-light", DEFAULT_PALETTE.accent),
    warm: cssColor(styles, "--theme-warm", DEFAULT_PALETTE.warm),
    light: cssColor(styles, "--theme-surface", DEFAULT_PALETTE.light),
    text: cssColor(styles, "--theme-deep-text", DEFAULT_PALETTE.text),
  };
}

function withAlpha(color: string, alpha: number) {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const value = Number.parseInt(color.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  return color;
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function projectPoint(
  longitude: number,
  latitude: number,
  rotation: { longitude: number; latitude: number },
  centerX: number,
  centerY: number,
  radius: number,
): ProjectedPoint {
  const lambda = ((longitude - rotation.longitude) * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const phi0 = (rotation.latitude * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const x = cosPhi * Math.sin(lambda);
  const y = Math.sin(phi) * Math.cos(phi0) - cosPhi * Math.cos(lambda) * Math.sin(phi0);
  const z = Math.sin(phi) * Math.sin(phi0) + cosPhi * Math.cos(lambda) * Math.cos(phi0);

  return {
    x: centerX + radius * x,
    y: centerY - radius * y,
    z,
  };
}

function polygonsForFeature(feature: GeoJsonFeature) {
  if (!feature.geometry) return [];
  if (feature.geometry.type === "Polygon") {
    return [feature.geometry.coordinates as number[][][]];
  }
  return feature.geometry.coordinates as number[][][][];
}

function drawProjectedLine(
  context: CanvasRenderingContext2D,
  coordinates: number[][],
  rotation: { longitude: number; latitude: number },
  centerX: number,
  centerY: number,
  radius: number,
  closePath: boolean,
) {
  let drawing = false;

  coordinates.forEach(([longitude, latitude]) => {
    const point = projectPoint(longitude, latitude, rotation, centerX, centerY, radius);

    if (point.z <= -0.03) {
      drawing = false;
      return;
    }

    if (!drawing) {
      context.moveTo(point.x, point.y);
      drawing = true;
    } else {
      context.lineTo(point.x, point.y);
    }
  });

  if (closePath && drawing) context.closePath();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function signalColor(source: GlobeSource, palette: Palette) {
  const category = source.categories[0];
  if (category === "Botnet C2") return "#FF6B6B";
  if (category === "Compromised Host") return "#F4B942";
  if (category === "Abuse Activity") return "#C084FC";
  if (category === "Scanning") return "#73E2A7";
  return palette.warm;
}

export default function ThreatGlobe({
  features,
  sources,
  countries,
}: {
  features: GeoJsonFeature[];
  sources: GlobeSource[];
  countries: GlobeCountry[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const rotationRef = useRef({ longitude: -18, latitude: 18 });
  const zoomRef = useRef(1);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    longitude: number;
    latitude: number;
    moved: boolean;
  } | null>(null);
  const projectedSourcesRef = useRef<Array<GlobeSource & ProjectedPoint>>([]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(rotationRef.current);
  const [selectedSource, setSelectedSource] = useState<GlobeSource | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);

  const maxCountryAttacks = Math.max(...countries.map((country) => country.attacks), 1);
  const maxSourceAttacks = Math.max(...sources.map((source) => source.attacks), 1);
  const visibleSourceCount = useMemo(
    () => projectedSourcesRef.current.filter((source) => source.z > 0).length,
    [rotation, zoom, sources],
  );

  const updateZoom = useCallback((nextZoom: number) => {
    const clamped = Math.max(0.72, Math.min(2.35, nextZoom));
    zoomRef.current = clamped;
    setZoom(clamped);
  }, []);

  const updateRotation = useCallback((longitude: number, latitude: number) => {
    const next = {
      longitude: ((longitude + 540) % 360) - 180,
      latitude: Math.max(-78, Math.min(78, latitude)),
    };
    rotationRef.current = next;
    setRotation(next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setThemeVersion((value) => value + 1));
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let deviceScale = 1;

    const resize = () => {
      const bounds = shell.getBoundingClientRect();
      width = Math.max(320, bounds.width);
      height = Math.max(460, Math.min(680, width * 0.58));
      deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * deviceScale);
      canvas.height = Math.round(height * deviceScale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);

    const draw = (time: number) => {
      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      context.clearRect(0, 0, width, height);

      const palette = readPalette(shell);
      const centerX = width / 2;
      const centerY = height / 2 + 10;
      const radius = Math.min(width * 0.42, height * 0.43) * zoomRef.current;
      const currentRotation = rotationRef.current;

      const backdrop = context.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.55);
      backdrop.addColorStop(0, withAlpha(palette.accent, 0.16));
      backdrop.addColorStop(0.62, withAlpha(palette.ocean, 0.96));
      backdrop.addColorStop(1, "rgba(2, 8, 10, 1)");
      context.fillStyle = backdrop;
      context.fillRect(0, 0, width, height);

      context.save();
      context.shadowColor = withAlpha(palette.accent, 0.52);
      context.shadowBlur = 34;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fillStyle = palette.ocean;
      context.fill();
      context.restore();

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.clip();

      context.strokeStyle = withAlpha(palette.grid, 0.2);
      context.lineWidth = 0.8;
      for (let latitude = -60; latitude <= 60; latitude += 30) {
        const coordinates = Array.from({ length: 73 }, (_, index) => [-180 + index * 5, latitude]);
        context.beginPath();
        drawProjectedLine(context, coordinates, currentRotation, centerX, centerY, radius, false);
        context.stroke();
      }
      for (let longitude = -180; longitude < 180; longitude += 30) {
        const coordinates = Array.from({ length: 35 }, (_, index) => [longitude, -85 + index * 5]);
        context.beginPath();
        drawProjectedLine(context, coordinates, currentRotation, centerX, centerY, radius, false);
        context.stroke();
      }

      context.fillStyle = withAlpha(palette.land, 0.68);
      context.strokeStyle = withAlpha(palette.border, 0.72);
      context.lineWidth = Math.max(0.55, 0.9 / zoomRef.current);
      features.forEach((feature) => {
        polygonsForFeature(feature).forEach((polygon) => {
          context.beginPath();
          polygon.forEach((ring) =>
            drawProjectedLine(context, ring, currentRotation, centerX, centerY, radius, true),
          );
          context.fill("evenodd");
          context.stroke();
        });
      });

      countries.forEach((country) => {
        const point = projectPoint(
          country.longitude,
          country.latitude,
          currentRotation,
          centerX,
          centerY,
          radius,
        );
        if (point.z <= 0) return;
        const intensity = Math.sqrt(country.attacks / maxCountryAttacks);
        const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 18 + intensity * 42);
        glow.addColorStop(0, withAlpha(palette.warm, 0.82));
        glow.addColorStop(0.3, withAlpha(palette.accent, 0.42));
        glow.addColorStop(1, withAlpha(palette.accent, 0));
        context.fillStyle = glow;
        context.beginPath();
        context.arc(point.x, point.y, 18 + intensity * 42, 0, Math.PI * 2);
        context.fill();
      });

      const projectedSources = sources.map((source) => ({
        ...source,
        ...projectPoint(
          source.longitude,
          source.latitude,
          currentRotation,
          centerX,
          centerY,
          radius,
        ),
      }));
      projectedSourcesRef.current = projectedSources;

      projectedSources.forEach((source) => {
        if (source.z <= 0) return;
        const intensity = Math.sqrt(source.attacks / maxSourceAttacks);
        const sourceColor = signalColor(source, palette);
        const phase = ((time / 1900 + (hash(source.ip) % 1000) / 1000) % 1 + 1) % 1;
        const pulseRadius = 3 + phase * (12 + intensity * 15);

        context.strokeStyle = withAlpha(sourceColor, (1 - phase) * (0.35 + intensity * 0.5));
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(source.x, source.y, pulseRadius, 0, Math.PI * 2);
        context.stroke();

        const angle = ((hash(source.ip) % 360) * Math.PI) / 180;
        const hopDistance = phase * (10 + intensity * 20);
        const hopX = source.x + Math.cos(angle) * hopDistance;
        const hopY = source.y + Math.sin(angle) * hopDistance * 0.55;
        context.fillStyle = withAlpha(sourceColor, 0.95 - phase * 0.65);
        context.beginPath();
        context.arc(hopX, hopY, 1.4 + intensity * 2.4, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = sourceColor;
        context.beginPath();
        context.arc(source.x, source.y, 1.6 + intensity * 2.2, 0, Math.PI * 2);
        context.fill();
      });

      const shade = context.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      shade.addColorStop(0, "rgba(0,0,0,0.58)");
      shade.addColorStop(0.48, "rgba(0,0,0,0.03)");
      shade.addColorStop(1, "rgba(255,255,255,0.06)");
      context.fillStyle = shade;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.strokeStyle = withAlpha(palette.accent, 0.7);
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();

      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [features, sources, countries, maxCountryAttacks, maxSourceAttacks, themeVersion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      longitude: rotationRef.current.longitude,
      latitude: rotationRef.current.latitude,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    updateRotation(
      drag.longitude - dx * (0.32 / zoomRef.current),
      drag.latitude + dy * (0.24 / zoomRef.current),
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!drag.moved) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const nearest = projectedSourcesRef.current
        .filter((source) => source.z > 0)
        .map((source) => ({ source, distance: Math.hypot(source.x - x, source.y - y) }))
        .filter((candidate) => candidate.distance <= 18)
        .sort((a, b) => a.distance - b.distance)[0];
      setSelectedSource(nearest?.source || null);
    }

    dragRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    updateZoom(zoomRef.current + (event.deltaY < 0 ? 0.12 : -0.12));
  };

  return (
    <div
      ref={shellRef}
      className="relative min-h-[460px] overflow-hidden rounded-2xl bg-[var(--theme-deep-panel)]"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Rotatable globe showing categorized public threat-feed source-IP activity"
        className="block w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onWheel={handleWheel}
      />

      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs font-bold text-white backdrop-blur">
        <p>LIVE SOURCE VIEW</p>
        <p className="mt-1 text-white/70">
          {visibleSourceCount} of {sources.length} enriched IPs facing camera
        </p>
      </div>

      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          aria-label="Zoom globe in"
          onClick={() => updateZoom(zoomRef.current + 0.2)}
          className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-sm font-black text-white backdrop-blur"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom globe out"
          onClick={() => updateZoom(zoomRef.current - 0.2)}
          className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-sm font-black text-white backdrop-blur"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            updateZoom(1);
            updateRotation(-18, 18);
            setSelectedSource(null);
          }}
          className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-sm font-bold text-white backdrop-blur"
        >
          Reset
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold text-white/85 backdrop-blur">
        <p>Drag to rotate · Scroll or use +/− to zoom · Click a visible source pulse for details</p>
        <p className="mt-1 text-white/60">
          View {rotation.longitude.toFixed(0)}° lon / {rotation.latitude.toFixed(0)}° lat · {zoom.toFixed(1)}×
        </p>
      </div>

      {selectedSource && (
        <div className="absolute bottom-20 right-4 w-[min(320px,calc(100%-2rem))] rounded-2xl border border-white/20 bg-black/70 p-4 text-white shadow-2xl backdrop-blur">
          <button
            type="button"
            aria-label="Close source details"
            onClick={() => setSelectedSource(null)}
            className="absolute right-3 top-2 text-lg font-black text-white/70"
          >
            ×
          </button>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Observed source</p>
          <p className="mt-2 text-xl font-black">{selectedSource.ip}</p>
          <p className="mt-1 text-sm text-white/75">
            {selectedSource.city}, {selectedSource.country}
          </p>
          <p className="mt-3 text-sm font-bold">{formatNumber(selectedSource.attacks)} attacks · {formatNumber(selectedSource.reports)} reports</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {selectedSource.categories.map((category) => (
              <span key={category} className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs font-bold">
                {category}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-white/65">
            {selectedSource.organization}{selectedSource.asn ? ` · AS${selectedSource.asn}` : ""}
          </p>
          <p className="mt-2 text-xs text-white/55">Seen by {selectedSource.providers.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
