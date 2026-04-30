import { useState, useEffect, useRef } from "react";

export interface DominantColors {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
}

const DEFAULT_COLORS: DominantColors = {
  primary: [255, 65, 153],
  secondary: [60, 40, 200],
  accent: [0, 180, 160],
};

function rgbDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    (a[0] - b[0]) * (a[0] - b[0]) +
    (a[1] - b[1]) * (a[1] - b[1]) +
    (a[2] - b[2]) * (a[2] - b[2])
  );
}

function isTooDark(c: [number, number, number]): boolean {
  return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) < 35;
}

function isTooLight(c: [number, number, number]): boolean {
  return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) > 230;
}

function isTooGray(c: [number, number, number]): boolean {
  var max = Math.max(c[0], c[1], c[2]);
  var min = Math.min(c[0], c[1], c[2]);
  return (max - min) < 25;
}

function extractColors(imageData: ImageData): DominantColors {
  var pixels = imageData.data;
  var buckets: { [key: string]: { sum: [number, number, number]; count: number } } = {};

  for (var i = 0; i < pixels.length; i += 16) {
    var r = pixels[i];
    var g = pixels[i + 1];
    var b = pixels[i + 2];
    var a = pixels[i + 3];

    if (a < 128) continue;

    var color: [number, number, number] = [r, g, b];
    if (isTooDark(color) || isTooLight(color) || isTooGray(color)) continue;

    var qr = Math.round(r / 32) * 32;
    var qg = Math.round(g / 32) * 32;
    var qb = Math.round(b / 32) * 32;
    var key = qr + "," + qg + "," + qb;

    if (!buckets[key]) {
      buckets[key] = { sum: [0, 0, 0], count: 0 };
    }
    buckets[key].sum[0] += r;
    buckets[key].sum[1] += g;
    buckets[key].sum[2] += b;
    buckets[key].count += 1;
  }

  var sorted = Object.keys(buckets).sort(function(a, b) {
    return buckets[b].count - buckets[a].count;
  });

  if (sorted.length === 0) return DEFAULT_COLORS;

  var results: [number, number, number][] = [];

  for (var j = 0; j < sorted.length && results.length < 3; j++) {
    var bucket = buckets[sorted[j]];
    var avg: [number, number, number] = [
      Math.round(bucket.sum[0] / bucket.count),
      Math.round(bucket.sum[1] / bucket.count),
      Math.round(bucket.sum[2] / bucket.count),
    ];

    var tooClose = false;
    for (var k = 0; k < results.length; k++) {
      if (rgbDistance(avg, results[k]) < 80) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      results.push(avg);
    }
  }

  while (results.length < 3) {
    results.push(DEFAULT_COLORS[results.length === 0 ? 'primary' : results.length === 1 ? 'secondary' : 'accent']);
  }

  return {
    primary: results[0],
    secondary: results[1],
    accent: results[2],
  };
}

export function useImageColors(imageUrl: string | undefined): DominantColors {
  var colorsRef = useRef<DominantColors>(DEFAULT_COLORS);
  var cacheRef = useRef<{ [url: string]: DominantColors }>({});
  var mountedRef = useRef(true);
  var [colors, setColors] = useState<DominantColors>(DEFAULT_COLORS);

  useEffect(function() {
    mountedRef.current = true;
    return function() { mountedRef.current = false; };
  }, []);

  useEffect(function() {
    if (!imageUrl) {
      colorsRef.current = DEFAULT_COLORS;
      setColors(DEFAULT_COLORS);
      return;
    }

    if (cacheRef.current[imageUrl]) {
      colorsRef.current = cacheRef.current[imageUrl];
      setColors(cacheRef.current[imageUrl]);
      return;
    }

    var img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function() {
      try {
        var canvas = document.createElement("canvas");
        var size = 64;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, size, size);
        var data = ctx.getImageData(0, 0, size, size);
        var extracted = extractColors(data);

        if (mountedRef.current) {
          cacheRef.current[imageUrl] = extracted;
          colorsRef.current = extracted;
          setColors(extracted);
        }

        canvas.width = 0;
        canvas.height = 0;
      } catch (e) {
        if (mountedRef.current) {
          colorsRef.current = DEFAULT_COLORS;
          setColors(DEFAULT_COLORS);
        }
      }
    };

    img.onerror = function() {
      if (mountedRef.current) {
        colorsRef.current = DEFAULT_COLORS;
        setColors(DEFAULT_COLORS);
      }
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return colors;
}
