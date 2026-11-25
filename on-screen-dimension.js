(() => {
  "use strict";

  const canvas = document.getElementById("dimension-board");
  const boardShell = document.getElementById("board-shell");
  const context = canvas.getContext("2d");
  const screenSizeInput = document.getElementById("screen-size");
  const scaleInput = document.getElementById("scale");
  const unitInput = document.getElementById("unit");
  const spacingInput = document.getElementById("spacing");
  const focusButton = document.getElementById("focus-button");
  const exitFocusButton = document.getElementById("exit-focus-button");
  const deleteButton = document.getElementById("delete-button");
  const undoButton = document.getElementById("undo-button");
  const clearButton = document.getElementById("clear-button");
  const exportButton = document.getElementById("export-button");
  const exportDialog = document.getElementById("export-dialog");
  const toolButtons = Array.from(document.querySelectorAll(".tool-button"));
  const status = document.getElementById("board-status");
  const calibrationSummary = document.getElementById("calibration-summary");
  const screenResolution = document.getElementById("screen-resolution");

  const entries = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pixelsPerUnit = 0;
  let gridSpacingPixels = 0;
  let previewPoint = null;
  let pendingPoint = null;
  let arcMiddlePoint = null;
  let activeTool = "pointer";
  let selectedId = null;
  let nextEntryId = 1;
  let redrawFrame = 0;

  function positiveValue(input, fallback) {
    const value = Number(input.value);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function currentSettings() {
    return {
      diagonal: positiveValue(screenSizeInput, 27),
      scale: positiveValue(scaleInput, 100) / 100,
      unit: unitInput.value,
      spacing: positiveValue(spacingInput, 1)
    };
  }

  function screenPoint(point) {
    const unitsPerInch = currentSettings().unit === "cm" ? 2.54 : 1;
    return {
      x: canvasWidth / 2 + point.x * unitsPerInch * pixelsPerUnit,
      y: canvasHeight / 2 + point.y * unitsPerInch * pixelsPerUnit
    };
  }

  function updateCalibration() {
    const settings = currentSettings();
    const displayDiagonalPixels = Math.hypot(window.screen.width, window.screen.height);
    const pixelsPerInch = displayDiagonalPixels / settings.diagonal;
    pixelsPerUnit = (settings.unit === "cm" ? pixelsPerInch / 2.54 : pixelsPerInch) * settings.scale;
    gridSpacingPixels = pixelsPerUnit * settings.spacing;
    calibrationSummary.textContent = `${settings.diagonal} in screen · ${Math.round(settings.scale * 100)}% scale`;
    screenResolution.textContent = `${window.screen.width} × ${window.screen.height} display · ${settings.spacing} ${settings.unit} grid`;
  }

  function drawGrid() {
    if (!gridSpacingPixels || !Number.isFinite(gridSpacingPixels)) return;

    const settings = currentSettings();
    const majorEvery = Math.max(1, Math.round(1 / settings.spacing));
    const dotRadius = gridSpacingPixels < 8 ? 0.75 : gridSpacingPixels < 18 ? 1.1 : 1.45;
    const firstColumn = Math.ceil((-canvasWidth / 2) / gridSpacingPixels);
    const lastColumn = Math.floor((canvasWidth / 2) / gridSpacingPixels);
    const firstRow = Math.ceil((-canvasHeight / 2) / gridSpacingPixels);
    const lastRow = Math.floor((canvasHeight / 2) / gridSpacingPixels);

    context.beginPath();
    context.fillStyle = "#c2c9c1";
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      for (let row = firstRow; row <= lastRow; row += 1) {
        if (column % majorEvery === 0 && row % majorEvery === 0) continue;
        const x = canvasWidth / 2 + column * gridSpacingPixels;
        const y = canvasHeight / 2 + row * gridSpacingPixels;
        context.moveTo(x + dotRadius, y);
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
    }
    context.fill();

    context.beginPath();
    context.fillStyle = "#607168";
    for (let column = Math.ceil(firstColumn / majorEvery) * majorEvery; column <= lastColumn; column += majorEvery) {
      for (let row = Math.ceil(firstRow / majorEvery) * majorEvery; row <= lastRow; row += majorEvery) {
        const x = canvasWidth / 2 + column * gridSpacingPixels;
        const y = canvasHeight / 2 + row * gridSpacingPixels;
        context.moveTo(x + 3.1, y);
        context.arc(x, y, 3.1, 0, Math.PI * 2);
      }
    }
    context.fill();
  }

  function formatDistance(distance, prefix = "") {
    const settings = currentSettings();
    const digits = settings.unit === "cm" ? 2 : 3;
    const value = (distance / pixelsPerUnit).toFixed(digits).replace(/\.?0+$/, "");
    return `${prefix}${value} ${settings.unit}`;
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const settings = currentSettings();
    const inchesPerUnit = settings.unit === "cm" ? 1 / 2.54 : 1;
    const column = Math.round((x - canvasWidth / 2) / gridSpacingPixels);
    const row = Math.round((y - canvasHeight / 2) / gridSpacingPixels);
    return {
      x: column * settings.spacing * inchesPerUnit,
      y: row * settings.spacing * inchesPerUnit
    };
  }

  function drawDimension(start, end, highlighted, prefix = "") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return;

    const angle = Math.atan2(dy, dx);
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const labelX = (start.x + end.x) / 2 + normalX * 17;
    const labelY = (start.y + end.y) / 2 + normalY * 17;
    const label = formatDistance(distance, prefix);

    context.save();
    context.translate(labelX, labelY);
    context.rotate(dx < 0 ? angle + Math.PI : angle);
    context.font = `${highlighted ? "500" : "400"} 11px "DM Mono", monospace`;
    const boxWidth = context.measureText(label).width + 14;
    context.fillStyle = highlighted ? "#d6e26e" : "rgba(255,255,255,.95)";
    context.fillRect(-boxWidth / 2, -11, boxWidth, 22);
    context.strokeStyle = highlighted ? "#234535" : "#d8ddd6";
    context.lineWidth = highlighted ? 2 : 1;
    context.strokeRect(-boxWidth / 2, -11, boxWidth, 22);
    context.fillStyle = highlighted ? "#17271e" : "#234535";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 0, 0);
    context.restore();
  }

  function entryPoints(entry) {
    return [entry.start, entry.end, entry.middle].filter(Boolean).map(screenPoint);
  }

  function arcGeometry(start, middle, end) {
    const ax = middle.x - start.x;
    const ay = middle.y - start.y;
    const bx = end.x - start.x;
    const by = end.y - start.y;
    const denominator = 2 * (ax * by - ay * bx);
    if (Math.abs(denominator) < 1e-9) return null;
    const aSquared = ax * ax + ay * ay;
    const bSquared = bx * bx + by * by;
    const center = {
      x: start.x + (by * aSquared - ay * bSquared) / denominator,
      y: start.y + (ax * bSquared - bx * aSquared) / denominator
    };
    const radius = Math.hypot(start.x - center.x, start.y - center.y);
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const middleAngle = Math.atan2(middle.y - center.y, middle.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    const positiveSweep = (endAngle - startAngle + Math.PI * 2) % (Math.PI * 2);
    const positiveMiddle = (middleAngle - startAngle + Math.PI * 2) % (Math.PI * 2);
    const counterclockwise = positiveMiddle > positiveSweep;
    const sweep = counterclockwise ? Math.PI * 2 - positiveSweep : positiveSweep;
    const middleSweepAngle = startAngle + (counterclockwise ? -1 : 1) * sweep / 2;
    return {
      center,
      radius,
      startAngle,
      endAngle,
      counterclockwise,
      sweep,
      length: radius * sweep,
      middleAngle: middleSweepAngle
    };
  }

  function drawEntry(entry, highlighted = false, preview = false) {
    const [start, end, middle] = entryPoints(entry);
    const same = selectedId === entry.id;
    const emphasized = highlighted || same;
    const stroke = preview ? "#0e5fa8" : emphasized ? "#172d22" : "#315a47";

    context.save();
    context.strokeStyle = stroke;
    context.lineWidth = emphasized ? 4 : 2.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    if (preview) context.setLineDash([7, 5]);

    if (entry.type === "line") {
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
      if (!preview) drawDimension(start, end, emphasized);
    } else if (entry.type === "rectangle") {
      context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      if (!preview) {
        const bottomLeft = { x: Math.min(start.x, end.x), y: Math.max(start.y, end.y) };
        const bottomRight = { x: Math.max(start.x, end.x), y: bottomLeft.y };
        const topRight = { x: bottomRight.x, y: Math.min(start.y, end.y) };
        drawDimension(bottomLeft, bottomRight, emphasized, "W ");
        drawDimension(topRight, bottomRight, emphasized, "H ");
      }
    } else if (entry.type === "circle") {
      const radius = Math.hypot(end.x - start.x, end.y - start.y);
      context.beginPath();
      context.arc(start.x, start.y, radius, 0, Math.PI * 2);
      context.stroke();
      if (!preview) {
        drawDimension(
          { x: start.x - radius, y: start.y },
          { x: start.x + radius, y: start.y },
          emphasized,
          "Ø "
        );
      }
    } else if (entry.type === "arc" && middle) {
      const arc = arcGeometry(start, middle, end);
      if (arc) {
        context.beginPath();
        context.arc(arc.center.x, arc.center.y, arc.radius, arc.startAngle, arc.endAngle, arc.counterclockwise);
        context.stroke();
      }
      if (arc && !preview) {
        const labelAngle = arc.middleAngle;
        const labelPoint = {
          x: arc.center.x + Math.cos(labelAngle) * arc.radius,
          y: arc.center.y + Math.sin(labelAngle) * arc.radius
        };
        const arcLabel = `Arc ${formatDistance(arc.length)}`;
        const radiusLabel = `R ${formatDistance(arc.radius)}`;
        context.save();
        context.font = `${emphasized ? "500" : "400"} 11px "DM Mono", monospace`;
        const width = Math.max(context.measureText(arcLabel).width, context.measureText(radiusLabel).width) + 14;
        context.fillStyle = emphasized ? "#d6e26e" : "rgba(255,255,255,.95)";
        context.fillRect(labelPoint.x - width / 2, labelPoint.y - 38, width, 38);
        context.strokeStyle = emphasized ? "#234535" : "#d8ddd6";
        context.lineWidth = emphasized ? 2 : 1;
        context.strokeRect(labelPoint.x - width / 2, labelPoint.y - 38, width, 38);
        context.fillStyle = "#17271e";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(arcLabel, labelPoint.x, labelPoint.y - 27);
        context.fillText(radiusLabel, labelPoint.x, labelPoint.y - 10);
        context.restore();
      }
    }

    context.setLineDash([]);
    if (emphasized || preview) {
      for (const point of middle ? [start, middle, end] : [start, end]) {
        context.beginPath();
        context.fillStyle = "#fff";
        context.arc(point.x, point.y, emphasized ? 5.5 : 4.5, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = stroke;
        context.lineWidth = 2.5;
        context.stroke();
      }
    }
    context.restore();
  }

  function drawAngleBadge(joint, selectedEnd, connectedEnd) {
    const vectorA = { x: selectedEnd.x - joint.x, y: selectedEnd.y - joint.y };
    const vectorB = { x: connectedEnd.x - joint.x, y: connectedEnd.y - joint.y };
    const lengthA = Math.hypot(vectorA.x, vectorA.y);
    const lengthB = Math.hypot(vectorB.x, vectorB.y);
    if (!lengthA || !lengthB) return;

    const cosine = Math.max(-1, Math.min(1, (vectorA.x * vectorB.x + vectorA.y * vectorB.y) / (lengthA * lengthB)));
    const angle = Math.acos(cosine) * 180 / Math.PI;
    const angleA = Math.atan2(vectorA.y, vectorA.x);
    const angleB = Math.atan2(vectorB.y, vectorB.x);
    let bisector = Math.atan2(
      Math.sin(angleA) + Math.sin(angleB),
      Math.cos(angleA) + Math.cos(angleB)
    );
    if (!Number.isFinite(bisector)) bisector = angleA + Math.PI / 2;
    const radius = 30;

    context.save();
    context.strokeStyle = "#315a47";
    context.lineWidth = 2;
    context.beginPath();
    const cross = vectorA.x * vectorB.y - vectorA.y * vectorB.x;
    const startAngle = cross >= 0 ? angleA : angleB;
    const endAngle = cross >= 0 ? angleB : angleA;
    context.arc(joint.x, joint.y, 16, startAngle, endAngle);
    context.stroke();

    const labelX = joint.x + Math.cos(bisector) * radius;
    const labelY = joint.y + Math.sin(bisector) * radius;
    const label = `${angle.toFixed(1).replace(/\.0$/, "")}°`;
    context.font = '500 11px "DM Mono", monospace';
    const width = context.measureText(label).width + 14;
    context.fillStyle = "#d6e26e";
    context.fillRect(labelX - width / 2, labelY - 11, width, 22);
    context.strokeStyle = "#234535";
    context.lineWidth = 2;
    context.strokeRect(labelX - width / 2, labelY - 11, width, 22);
    context.fillStyle = "#17271e";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, labelX, labelY);
    context.restore();
  }

  function drawConnectedAngles(selected) {
    if (selected.type !== "line") return;
    for (const other of entries) {
      if (other.id === selected.id || other.type !== "line") continue;
      for (const selectedPoint of ["start", "end"]) {
        const joint = selected[selectedPoint];
        const connectedPoint = samePoint(joint, other.start)
          ? "start"
          : samePoint(joint, other.end)
            ? "end"
            : null;
        if (!connectedPoint) continue;
        const selectedEnd = selected[selectedPoint === "start" ? "end" : "start"];
        const connectedEnd = other[connectedPoint === "start" ? "end" : "start"];
        drawAngleBadge(screenPoint(joint), screenPoint(selectedEnd), screenPoint(connectedEnd));
      }
    }
  }

  function draw() {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#fbfcf9";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    drawGrid();

    for (const entry of entries) {
      if (entry.id !== selectedId) drawEntry(entry);
    }

    if (selectedId !== null) {
      const selected = entries.find((entry) => entry.id === selectedId);
      if (selected) {
        drawEntry(selected, true);
        drawConnectedAngles(selected);
      }
    }

    if (pendingPoint && previewPoint) {
      const arcPreview = activeTool === "arc" && arcMiddlePoint
        ? { middle: previewPoint, end: arcMiddlePoint }
        : { middle: activeTool === "arc" ? null : arcMiddlePoint, end: previewPoint };
      drawEntry({
        type: activeTool,
        start: pendingPoint,
        ...arcPreview,
        id: -1
      }, false, true);
    }

    if (previewPoint && activeTool !== "pointer") {
      const point = screenPoint(previewPoint);
      context.strokeStyle = "#0e5fa8";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(point.x, point.y, 7, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function requestDraw() {
    if (redrawFrame) return;
    redrawFrame = window.requestAnimationFrame(() => {
      redrawFrame = 0;
      draw();
    });
  }

  function resizeCanvas() {
    const bounds = boardShell.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    updateCalibration();
    previewPoint = null;
    requestDraw();
  }

  function updateButtons() {
    deleteButton.disabled = selectedId === null;
    undoButton.disabled = entries.length === 0;
    clearButton.disabled = entries.length === 0;
    exportButton.disabled = entries.length === 0;
  }

  function samePoint(first, second) {
    return first && second && first.x === second.x && first.y === second.y;
  }

  function chooseTool(tool) {
    activeTool = tool;
    pendingPoint = null;
    arcMiddlePoint = null;
    previewPoint = null;
    toolButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tool === tool)));
    if (tool === "pointer") {
      status.textContent = "Click a line, rectangle, or circle to select it. Press Delete to remove it.";
    } else if (tool === "circle") {
      status.textContent = "Circle: click the center dot, then click an edge dot.";
    } else if (tool === "arc") {
      status.textContent = "Arc: click the first endpoint, second endpoint, then a point midway along the arc edge.";
    } else {
      status.textContent = tool === "line"
        ? "Line: click the first dot, then keep clicking dots to continue the connected line."
        : "Rectangle: click the first dot, then the second dot.";
    }
    requestDraw();
  }

  function addEntry(endPoint) {
    if (!pendingPoint || samePoint(pendingPoint, endPoint)) {
      status.textContent = "Choose a different dot to finish the entry.";
      return;
    }
    if (activeTool === "arc" && !arcGeometry(pendingPoint, endPoint, arcMiddlePoint)) {
      status.textContent = "Those three dots form a straight line. Choose a midpoint off that line.";
      return;
    }
    const entry = {
      id: nextEntryId,
      type: activeTool,
      start: { ...pendingPoint },
      middle: activeTool === "arc" ? { ...endPoint } : null,
      end: activeTool === "arc" ? { ...arcMiddlePoint } : { ...endPoint }
    };
    nextEntryId += 1;
    entries.push(entry);
    selectedId = entry.id;
    updateButtons();
    if (activeTool === "line") {
      const connectedToExistingPoint = entries
        .slice(0, -1)
        .some((other) => [other.start, other.middle, other.end]
          .filter(Boolean)
          .some((point) => samePoint(point, endPoint)));
      pendingPoint = connectedToExistingPoint ? null : { ...endPoint };
      status.textContent = connectedToExistingPoint
        ? "Line connected and ended. Click a new dot to start another line."
        : "Line added. Click another dot to continue, or press Enter to end this line.";
    } else {
      pendingPoint = null;
      arcMiddlePoint = null;
      previewPoint = null;
      status.textContent = `${entry.type[0].toUpperCase() + entry.type.slice(1)} added and selected. Choose a tool or delete the selected entry.`;
    }
    requestDraw();
  }

  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
    const amount = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    return Math.hypot(point.x - (start.x + amount * dx), point.y - (start.y + amount * dy));
  }

  function entryDistance(entry, point) {
    const start = screenPoint(entry.start);
    const end = screenPoint(entry.end);
    if (entry.type === "line") return distanceToSegment(point, start, end);
    if (entry.type === "arc") {
      const arc = arcGeometry(start, screenPoint(entry.middle), end);
      if (!arc) return Infinity;
      const angle = Math.atan2(point.y - arc.center.y, point.x - arc.center.x);
      const progress = arc.counterclockwise
        ? (arc.startAngle - angle + Math.PI * 2) % (Math.PI * 2)
        : (angle - arc.startAngle + Math.PI * 2) % (Math.PI * 2);
      if (progress > arc.sweep + 0.1) return Infinity;
      return Math.abs(Math.hypot(point.x - arc.center.x, point.y - arc.center.y) - arc.radius);
    }
    if (entry.type === "rectangle") {
      const corners = [
        { x: start.x, y: start.y },
        { x: end.x, y: start.y },
        { x: end.x, y: end.y },
        { x: start.x, y: end.y }
      ];
      return Math.min(...corners.map((corner, index) => distanceToSegment(point, corner, corners[(index + 1) % 4])));
    }
    const radius = Math.hypot(end.x - start.x, end.y - start.y);
    return Math.abs(Math.hypot(point.x - start.x, point.y - start.y) - radius);
  }

  function selectEntry(event) {
    const bounds = canvas.getBoundingClientRect();
    const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    const hits = [];
    for (const entry of [...entries].reverse()) {
      const distance = entryDistance(entry, point);
      if (distance <= 20) hits.push({ entry, distance });
    }
    hits.sort((first, second) => first.distance - second.distance || second.entry.id - first.entry.id);
    const selectedIndex = hits.findIndex((hit) => hit.entry.id === selectedId);
    const closest = hits.length ? hits[(selectedIndex + 1) % hits.length].entry : null;
    selectedId = closest ? closest.id : null;
    status.textContent = closest
      ? `${closest.type[0].toUpperCase() + closest.type.slice(1)} selected. Its dimension is highlighted.`
      : "Selection cleared. Choose an entry to highlight its dimensions.";
    updateButtons();
    requestDraw();
  }

  function deleteSelected() {
    if (selectedId === null) return;
    const index = entries.findIndex((entry) => entry.id === selectedId);
    if (index < 0) return;
    const [removed] = entries.splice(index, 1);
    selectedId = null;
    pendingPoint = null;
    updateButtons();
    status.textContent = `${removed.type[0].toUpperCase() + removed.type.slice(1)} deleted.`;
    requestDraw();
  }

  function undoLastEntry() {
    if (!entries.length) return;
    const removed = entries.pop();
    selectedId = entries.length ? entries[entries.length - 1].id : null;
    pendingPoint = null;
    previewPoint = null;
    updateButtons();
    status.textContent = `${removed.type[0].toUpperCase() + removed.type.slice(1)} removed.`;
    requestDraw();
  }

  function downloadFile(contents, filename, type) {
    const blob = contents instanceof Blob ? contents : new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `${filename} exported.`;
  }

  function exportBounds() {
    const points = entries.flatMap((entry) => {
      if (entry.type === "arc") return [entry.start, entry.middle, entry.end];
      if (entry.type !== "circle") return [entry.start, entry.end];
      const radius = Math.hypot(entry.end.x - entry.start.x, entry.end.y - entry.start.y);
      return [
        { x: entry.start.x - radius, y: entry.start.y - radius },
        { x: entry.start.x + radius, y: entry.start.y + radius }
      ];
    });
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const margin = 0.35;
    const minX = Math.min(...xs) - margin;
    const minY = Math.min(...ys) - margin;
    const maxX = Math.max(...xs) + margin;
    const maxY = Math.max(...ys) + margin;
    return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  function svgNumber(value) {
    return Number(value.toFixed(5));
  }

  function svgLabel(entry) {
    const settings = currentSettings();
    const factor = settings.unit === "cm" ? 2.54 : 1;
    if (entry.type === "circle") {
      const radius = Math.hypot(entry.end.x - entry.start.x, entry.end.y - entry.start.y);
      return `Ø ${(radius * 2 * factor).toFixed(3).replace(/\.?0+$/, "")} ${settings.unit}`;
    }
    if (entry.type === "rectangle") {
      return `W ${(Math.abs(entry.end.x - entry.start.x) * factor).toFixed(3).replace(/\.?0+$/, "")} × H ${(Math.abs(entry.end.y - entry.start.y) * factor).toFixed(3).replace(/\.?0+$/, "")} ${settings.unit}`;
    }
    if (entry.type === "arc") {
      const arc = arcGeometry(entry.start, entry.middle, entry.end);
      return `Arc ${arc ? (arc.length * factor).toFixed(3).replace(/\.?0+$/, "") : "0"} ${settings.unit} · R ${(arc ? arc.radius * factor : 0).toFixed(3).replace(/\.?0+$/, "")}`;
    }
    return `${(Math.hypot(entry.end.x - entry.start.x, entry.end.y - entry.start.y) * factor).toFixed(3).replace(/\.?0+$/, "")} ${settings.unit}`;
  }

  function exportSvg() {
    if (!entries.length) return;
    const bounds = exportBounds();
    const shapes = entries.map((entry) => {
      const style = 'fill="none" stroke="#315a47" stroke-width="0.025" vector-effect="non-scaling-stroke"';
      const label = svgLabel(entry);
      let geometry = "";
      let labelX = (entry.start.x + entry.end.x) / 2;
      let labelY = (entry.start.y + entry.end.y) / 2 - 0.1;
      if (entry.type === "line") {
        geometry = `<line x1="${svgNumber(entry.start.x)}" y1="${svgNumber(entry.start.y)}" x2="${svgNumber(entry.end.x)}" y2="${svgNumber(entry.end.y)}" ${style}/>`;
      } else if (entry.type === "rectangle") {
        geometry = `<rect x="${svgNumber(Math.min(entry.start.x, entry.end.x))}" y="${svgNumber(Math.min(entry.start.y, entry.end.y))}" width="${svgNumber(Math.abs(entry.end.x - entry.start.x))}" height="${svgNumber(Math.abs(entry.end.y - entry.start.y))}" ${style}/>`;
        labelY = Math.max(entry.start.y, entry.end.y) + 0.18;
      } else if (entry.type === "circle") {
        const radius = Math.hypot(entry.end.x - entry.start.x, entry.end.y - entry.start.y);
        geometry = `<circle cx="${svgNumber(entry.start.x)}" cy="${svgNumber(entry.start.y)}" r="${svgNumber(radius)}" ${style}/>`;
        labelX = entry.start.x;
        labelY = entry.start.y - 0.1;
      } else {
        const arc = arcGeometry(entry.start, entry.middle, entry.end);
        if (arc) {
          geometry = `<path d="M ${svgNumber(entry.start.x)} ${svgNumber(entry.start.y)} A ${svgNumber(arc.radius)} ${svgNumber(arc.radius)} 0 ${arc.sweep > Math.PI ? 1 : 0} ${arc.counterclockwise ? 0 : 1} ${svgNumber(entry.end.x)} ${svgNumber(entry.end.y)}" ${style}/>`;
          labelX = entry.middle.x;
          labelY = entry.middle.y - 0.1;
        }
      }
      return `<g>${geometry}<text x="${svgNumber(labelX)}" y="${svgNumber(labelY)}" fill="#234535" font-family="monospace" font-size="0.12" text-anchor="middle">${label}</text></g>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgNumber(bounds.width)}in" height="${svgNumber(bounds.height)}in" viewBox="${svgNumber(bounds.minX)} ${svgNumber(bounds.minY)} ${svgNumber(bounds.width)} ${svgNumber(bounds.height)}"><title>On-screen Dimension export</title><rect x="${svgNumber(bounds.minX)}" y="${svgNumber(bounds.minY)}" width="${svgNumber(bounds.width)}" height="${svgNumber(bounds.height)}" fill="#ffffff"/>${shapes}</svg>`;
    downloadFile(svg, "on-screen-dimension.svg", "image/svg+xml;charset=utf-8");
  }

  function dxfPair(code, value) {
    return `${code}\n${value}\n`;
  }

  function exportDxf() {
    if (!entries.length) return;
    let dxf = "";
    dxf += dxfPair(0, "SECTION") + dxfPair(2, "HEADER") + dxfPair(9, "$ACADVER") + dxfPair(1, "AC1015");
    dxf += dxfPair(9, "$INSUNITS") + dxfPair(70, 1) + dxfPair(0, "ENDSEC");
    dxf += dxfPair(0, "SECTION") + dxfPair(2, "ENTITIES");

    for (const entry of entries) {
      if (entry.type === "line") {
        dxf += dxfPair(0, "LINE") + dxfPair(8, "DIMENSIONS") + dxfPair(10, svgNumber(entry.start.x)) + dxfPair(20, svgNumber(-entry.start.y)) + dxfPair(30, 0) + dxfPair(11, svgNumber(entry.end.x)) + dxfPair(21, svgNumber(-entry.end.y)) + dxfPair(31, 0);
      } else if (entry.type === "circle") {
        const radius = Math.hypot(entry.end.x - entry.start.x, entry.end.y - entry.start.y);
        dxf += dxfPair(0, "CIRCLE") + dxfPair(8, "DIMENSIONS") + dxfPair(10, svgNumber(entry.start.x)) + dxfPair(20, svgNumber(-entry.start.y)) + dxfPair(30, 0) + dxfPair(40, svgNumber(radius));
      } else if (entry.type === "arc") {
        const arc = arcGeometry(entry.start, entry.middle, entry.end);
        if (arc) {
          const startDegrees = arc.startAngle * 180 / Math.PI;
          const endDegrees = arc.endAngle * 180 / Math.PI;
          dxf += dxfPair(0, "ARC") + dxfPair(8, "DIMENSIONS") + dxfPair(10, svgNumber(arc.center.x)) + dxfPair(20, svgNumber(-arc.center.y)) + dxfPair(30, 0) + dxfPair(40, svgNumber(arc.radius)) + dxfPair(50, svgNumber(startDegrees)) + dxfPair(51, svgNumber(endDegrees));
        }
      } else {
        const corners = [
          entry.start,
          { x: entry.end.x, y: entry.start.y },
          entry.end,
          { x: entry.start.x, y: entry.end.y },
          entry.start
        ];
        for (let index = 1; index < corners.length; index += 1) {
          dxf += dxfPair(0, "LINE") + dxfPair(8, "DIMENSIONS") + dxfPair(10, svgNumber(corners[index - 1].x)) + dxfPair(20, svgNumber(-corners[index - 1].y)) + dxfPair(30, 0) + dxfPair(11, svgNumber(corners[index].x)) + dxfPair(21, svgNumber(-corners[index].y)) + dxfPair(31, 0);
        }
      }
    }
    dxf += dxfPair(0, "ENDSEC") + dxfPair(0, "EOF");
    downloadFile(dxf, "on-screen-dimension.dxf", "application/dxf;charset=utf-8");
  }

  function exportPng() {
    if (!entries.length) return;
    draw();
    canvas.toBlob((blob) => {
      if (blob) downloadFile(blob, "on-screen-dimension.png", "image/png");
      else status.textContent = "PNG export could not be created.";
    }, "image/png");
  }

  function setFocusMode(active) {
    document.body.classList.toggle("focus-mode", active);
    focusButton.setAttribute("aria-pressed", String(active));
    exitFocusButton.hidden = !active;
    window.requestAnimationFrame(resizeCanvas);
  }

  async function enterFocusMode() {
    setFocusMode(true);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        status.textContent = "UI hidden. Press Escape or use Exit full screen to return.";
      }
    }
  }

  async function exitFocusMode() {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        setFocusMode(false);
      }
    } else {
      setFocusMode(false);
    }
  }

  for (const input of [screenSizeInput, scaleInput, unitInput, spacingInput]) {
    input.addEventListener("change", () => {
      updateCalibration();
      previewPoint = null;
      pendingPoint = null;
      arcMiddlePoint = null;
      status.textContent = "Calibration updated. Existing entries keep their physical positions.";
      requestDraw();
    });
  }

  toolButtons.forEach((button) => button.addEventListener("click", () => chooseTool(button.dataset.tool)));
  canvas.addEventListener("pointermove", (event) => {
    previewPoint = canvasPoint(event);
    requestDraw();
  });
  canvas.addEventListener("pointerleave", () => {
    previewPoint = null;
    requestDraw();
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (activeTool === "pointer") {
      selectEntry(event);
      return;
    }
    const point = canvasPoint(event);
    if (activeTool === "arc" && pendingPoint && !arcMiddlePoint) {
      arcMiddlePoint = point;
      status.textContent = "Second endpoint placed. Click a midpoint on the arc edge.";
      requestDraw();
    } else if (pendingPoint) addEntry(point);
    else {
      pendingPoint = point;
      arcMiddlePoint = null;
      selectedId = null;
      updateButtons();
      status.textContent = activeTool === "circle"
        ? "Center placed. Click another dot to set the radius."
        : activeTool === "arc"
        ? "First endpoint placed. Click the second endpoint."
          : "First point placed. Click another dot to finish the entry.";
      requestDraw();
    }
  });

  deleteButton.addEventListener("click", deleteSelected);
  undoButton.addEventListener("click", undoLastEntry);
  exportButton.addEventListener("click", () => exportDialog.showModal());
  exportDialog.addEventListener("close", () => {
    if (exportDialog.returnValue !== "export") return;
    const fileType = exportDialog.querySelector('input[name="export-type"]:checked').value;
    if (fileType === "png") exportPng();
    else if (fileType === "svg") exportSvg();
    else exportDxf();
  });
  clearButton.addEventListener("click", () => {
    entries.length = 0;
    selectedId = null;
    pendingPoint = null;
    arcMiddlePoint = null;
    previewPoint = null;
    updateButtons();
    status.textContent = "Board cleared. Choose a drawing tool to add a new entry.";
    requestDraw();
  });

  focusButton.addEventListener("click", enterFocusMode);
  exitFocusButton.addEventListener("click", exitFocusMode);
  document.addEventListener("fullscreenchange", () => setFocusMode(Boolean(document.fullscreenElement)));
  document.addEventListener("keydown", (event) => {
    const tagName = event.target.tagName;
    const isFormField = ["INPUT", "SELECT", "TEXTAREA"].includes(tagName);
    if (isFormField) return;

    if (event.key === "Delete") {
      deleteSelected();
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      undoLastEntry();
    }
    if (event.key === "Enter" && activeTool === "line") {
      event.preventDefault();
      pendingPoint = null;
      previewPoint = null;
      status.textContent = "Line ended. Click a dot to start another line.";
      requestDraw();
    }
    if (event.key === "Escape") {
      chooseTool("pointer");
      if (document.body.classList.contains("focus-mode") && !document.fullscreenElement) {
        setFocusMode(false);
      }
    }
  });
  window.addEventListener("resize", resizeCanvas);
  if ("ResizeObserver" in window) new ResizeObserver(resizeCanvas).observe(boardShell);

  resizeCanvas();
  updateButtons();
})();
