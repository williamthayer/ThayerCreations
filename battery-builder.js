(() => {
  const profiles = {
    lfp: { name: 'LFP (LiFePO4)', nominal: 3.2, voltages: [2.5, 3.1, 3.2, 3.23, 3.25, 3.27, 3.29, 3.3, 3.32, 3.35, 3.65] },
    'li-ion': { name: 'Lithium-ion (3.7 V)', nominal: 3.7, voltages: [3, 3.4, 3.55, 3.65, 3.7, 3.75, 3.8, 3.87, 3.95, 4.08, 4.2] },
    'li-sulfur': { name: 'Lithium-sulfur', nominal: 2.1, voltages: [1.7, 1.85, 1.95, 2, 2.03, 2.06, 2.09, 2.12, 2.16, 2.3, 2.5] },
    'sodium-ion': { name: 'Sodium-ion', nominal: 3, voltages: [1.5, 2.2, 2.5, 2.65, 2.75, 2.85, 3, 3.15, 3.3, 3.5, 3.95] },
    nimh: { name: 'Nickel metal hydride (NiMH)', nominal: 1.2, voltages: [1, 1.1, 1.15, 1.18, 1.2, 1.22, 1.24, 1.26, 1.29, 1.34, 1.45] },
    lead: { name: 'Lead acid', nominal: 2, voltages: [1.75, 1.95, 1.97, 1.99, 2.01, 2.03, 2.05, 2.07, 2.09, 2.11, 2.15] },
    alkaline: { name: 'Alkaline (primary)', nominal: 1.5, voltages: [0.8, 0.95, 1.05, 1.12, 1.18, 1.24, 1.3, 1.36, 1.42, 1.5, 1.6] },
    'silver-oxide': { name: 'Silver oxide (primary)', nominal: 1.55, voltages: [1.2, 1.4, 1.48, 1.51, 1.53, 1.54, 1.55, 1.56, 1.57, 1.58, 1.6] }
  };
  const form = document.getElementById('battery-form');
  const fields = Object.fromEntries([
    'chemistry', 'series-mode', 'series-cells', 'voltage-target', 'cell-capacity',
    'c-rating', 'cell-current', 'parallel-cells',
    'pack-capacity', 'pack-current', 'custom-name', 'custom-nominal', 'cost-per-cell'
  ].map((id) => [id, document.getElementById(id)]));
  const status = document.getElementById('status');
  const seriesStatus = document.getElementById('series-status');
  const results = document.getElementById('results');
  const resultText = document.getElementById('result-text');
  const copyStatus = document.getElementById('copy-status');
  const table = document.getElementById('voltage-table');
  const chart = document.getElementById('voltage-chart');
  const chartHelp = document.getElementById('chart-help');
  const customProfile = document.getElementById('custom-profile');
  const customTable = document.getElementById('custom-table');
  const customTableContainer = document.getElementById('custom-table-container');
  const toggleCustomTable = document.getElementById('toggle-custom-table');
  const pasteStatus = document.getElementById('paste-status');
  const customPercentages = [0, 5, 10, 20, 30, 40, 50, 60, 70, 85, 90, 95, 100];
  const liveFieldIds = ['series-cells', 'voltage-target', 'cell-capacity', 'c-rating', 'cell-current', 'parallel-cells', 'pack-capacity', 'pack-current', 'series-mode'];
  const svgNamespace = 'http://www.w3.org/2000/svg';
  let liveState = null;
  let pendingTarget = null;
  let invalidField = null;
  let customInvalid = false;

  for (const percent of customPercentages) {
    const row = customTable.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = `${percent}%`;
    row.append(heading);
    const input = document.createElement('input');
    input.id = `custom-soc-${percent}`;
    input.type = 'number';
    input.min = '0';
    input.max = '1000000';
    input.step = 'any';
    input.inputMode = 'decimal';
    input.setAttribute('aria-label', `Cell voltage at ${percent}% charge (V)`);
    row.insertCell().append(input);
    fields[input.id] = input;
  }

  function getProfile() {
    if (fields.chemistry.value !== 'custom') return profiles[fields.chemistry.value];
    const nominal = number('custom-nominal', 'the custom nominal cell voltage', true);
    const points = customPercentages.map((percent) => ({
      percent,
      voltage: number(`custom-soc-${percent}`, `the custom ${percent}% cell voltage`, percent === 0 || percent === 100)
    }));
    const min = points[0].voltage;
    const max = points[points.length - 1].voltage;
    if (min >= max) throw new Error('The custom 100% voltage must be greater than the 0% voltage.');
    const voltages = Array(11).fill(null);
    voltages[0] = min;
    voltages[10] = max;
    return { name: fields['custom-name'].value.trim() || 'Custom', nominal, voltages, points };
  }

  function updateCustomVisibility() {
    customProfile.hidden = fields.chemistry.value !== 'custom';
  }

  function setCustomTableExpanded(expanded) {
    customTableContainer.hidden = !expanded;
    toggleCustomTable.setAttribute('aria-expanded', String(expanded));
    toggleCustomTable.textContent = expanded ? 'Hide voltage table' : 'Show voltage table';
  }

  function updateRatingState() {
    fields['c-rating'].disabled = fields['cell-current'].value.trim() !== '';
    fields['cell-current'].disabled = fields['c-rating'].value.trim() !== '';
  }

  function updateParallelState() {
    const ids = ['parallel-cells', 'pack-capacity', 'pack-current'];
    const selected = ids.find((id) => fields[id].value.trim() !== '');
    for (const id of ids) fields[id].disabled = Boolean(selected && id !== selected);
  }

  function updateModes() {
    fields['series-cells'].disabled = fields['voltage-target'].value.trim() !== '';
    fields['voltage-target'].disabled = fields['series-cells'].value.trim() !== '';
    updateRatingState();
    updateParallelState();
  }

  function clearOutputs() {
    results.hidden = true;
    status.textContent = '';
    status.dataset.error = 'false';
    resultText.value = '';
    copyStatus.textContent = '';
    for (const id of ['series-cells', 'voltage-target', 'c-rating', 'cell-current', 'parallel-cells', 'pack-capacity', 'pack-current']) {
      if (fields[id].disabled) fields[id].value = '';
    }
  }

  function number(id, label, required = false, integer = false) {
    const field = fields[id];
    if (field.validity.badInput) throw new Error(`Enter a valid number for ${label}.`);
    if (field.value.trim() === '') {
      if (required) throw new Error(`Enter ${label}.`);
      return null;
    }
    const value = Number(field.value);
    const max = Number(field.max);
    if (!Number.isFinite(value) || value <= 0 || value > max || (integer && !Number.isInteger(value))) {
      throw new Error(`${label} must be ${integer ? 'a whole number' : 'a number'} greater than zero and no more than ${max.toLocaleString()}.`);
    }
    return value;
  }

  function wholeCells(value, direction) {
    const nearest = Math.round(value);
    const normalized = Math.abs(value - nearest) <= 1e-12 * Math.max(1, Math.abs(value)) ? nearest : value;
    const count = direction === 'up' ? Math.ceil(normalized) : Math.floor(normalized);
    if (count < 1) throw new Error('The maximum voltage limit is below the assumed maximum for one cell.');
    if (count > 10000) throw new Error('The selected target requires more than 10,000 cells in a group.');
    return count;
  }

  function seriesCount(profile) {
    const count = number('series-cells', 'the series cell count', false, true);
    if (count !== null) return count;
    const target = number('voltage-target', 'the voltage target or limit');
    if (target !== null) {
      const minimum = fields['series-mode'].value === 'min';
      const perCell = minimum ? profile.voltages[0] : profile.voltages[10];
      return wholeCells(target / perCell, minimum ? 'up' : 'down');
    }
    return 4;
  }

  function roundedValue(value) {
    const digits = value > 0 && value < 0.001 ? Math.min(12, 2 - Math.floor(Math.log10(value))) : 3;
    return Number(value.toFixed(digits));
  }

  function format(value) {
    return roundedValue(value).toLocaleString('en-US', { maximumFractionDigits: 12 });
  }

  function voltagePrecision(values) {
    return Math.max(2, ...values.map((value) => {
      const text = roundedValue(value).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 12 });
      return (text.split('.')[1] || '').length;
    }));
  }

  function formatVoltage(value, digits) {
    return roundedValue(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function roundedCurrent(value) {
    const digits = Math.min(12, Math.max(3, 2 - Math.floor(Math.log10(value))));
    const scale = 10 ** digits;
    return Math.floor(value * scale) / scale;
  }

  function formatCurrent(value) {
    return roundedCurrent(value).toLocaleString('en-US', { maximumFractionDigits: 12 });
  }

  function updateSeriesOutput(profile, series) {
    if (fields['series-cells'].disabled) fields['series-cells'].value = series;
    if (fields['voltage-target'].disabled) {
      const perCell = fields['series-mode'].value === 'min' ? profile.voltages[0] : profile.voltages[10];
      fields['voltage-target'].value = String(roundedValue(perCell * series));
    }
  }

  function updateSeriesLive() {
    seriesStatus.hidden = true;
    seriesStatus.textContent = '';
    if (!fields['series-cells'].value.trim() && !fields['voltage-target'].value.trim()) return;
    try {
      const profile = getProfile();
      updateSeriesOutput(profile, seriesCount(profile));
    } catch (error) {
      seriesStatus.textContent = error.message;
      seriesStatus.hidden = false;
    }
  }

  function svgElement(name, attributes, text) {
    const element = document.createElementNS(svgNamespace, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    if (text !== undefined) element.textContent = text;
    chart.append(element);
  }

  function renderChart(points) {
    chart.replaceChildren();
    const left = 78;
    const right = 455;
    const top = 20;
    const bottom = 250;
    const available = points.filter((point) => point.voltage !== null);
    const low = Math.min(...available.map((point) => point.voltage));
    const high = Math.max(...available.map((point) => point.voltage));
    const padding = low === high ? Math.max(low * 0.05, 0.1) : 0;
    const min = low - padding;
    const max = high + padding;
    const ticks = Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4);
    const digits = voltagePrecision(ticks);
    for (let index = 0; index <= 4; index += 1) {
      const y = bottom - (bottom - top) * index / 4;
      svgElement('line', { x1: left, y1: y, x2: right, y2: y, class: 'grid-line' });
      svgElement('text', { x: left - 8, y: y + 4, 'text-anchor': 'end' }, formatVoltage(ticks[index], digits));
    }
    for (const percent of [0, 5, 20, 40, 60, 80, 95, 100]) {
      const x = left + (right - left) * percent / 100;
      svgElement('text', { x, y: 272, 'text-anchor': 'middle' }, String(percent));
    }
    let segment = [];
    function drawSegment() {
      if (segment.length > 1) svgElement('polyline', { points: segment.map((point) => point.join(',')).join(' '), class: 'curve' });
      segment = [];
    }
    for (const point of points) {
      if (point.voltage === null) {
        drawSegment();
        continue;
      }
      const x = left + (right - left) * point.percent / 100;
      const y = bottom - (bottom - top) * (point.voltage - min) / (max - min);
      segment.push([x, y]);
    }
    drawSegment();
    for (const point of available) {
      const cx = left + (right - left) * point.percent / 100;
      const cy = bottom - (bottom - top) * (point.voltage - min) / (max - min);
      svgElement('circle', { cx, cy, r: 3 });
    }
  }

  function cellCurrentOf(state) {
    if (state.rating === null) return null;
    if (state.ratingMode === 'current') return state.rating;
    return state.capacity === null ? null : state.capacity * state.rating;
  }

  function syncLiveFields(except = []) {
    const state = liveState;
    const profile = getProfile();
    const current = cellCurrentOf(state);
    const perCell = fields['series-mode'].value === 'min' ? profile.voltages[0] : profile.voltages[10];
    const values = {
      'series-cells': state.series,
      'voltage-target': state.series === null ? null : roundedValue(state.series * perCell),
      'cell-capacity': state.capacity,
      'c-rating': state.ratingMode === 'c' ? state.rating
        : state.capacity === null || current === null ? null : roundedValue(current / state.capacity),
      'cell-current': current === null ? null : roundedCurrent(current),
      'parallel-cells': state.parallel,
      'pack-capacity': state.capacity === null || state.parallel === null ? null : roundedValue(state.capacity * state.parallel),
      'pack-current': current === null || state.parallel === null ? null : roundedCurrent(current * state.parallel)
    };
    for (const [id, value] of Object.entries(values)) {
      if (!except.includes(id)) fields[id].value = value === null ? '' : String(value);
    }
  }

  function renderResults(state) {
    copyStatus.textContent = '';
    status.dataset.error = 'false';
    if (state.series === null || state.parallel === null) {
      results.hidden = true;
      resultText.value = '';
      status.textContent = state.series === null ? 'Enter a series cell count or voltage target.' : 'Enter a parallel cell count or pack target.';
      status.dataset.error = 'true';
      return;
    }
    const { series, parallel, capacity } = state;
    const profile = getProfile();
    const cellCurrent = cellCurrentOf(state);
    const packCapacity = capacity === null ? null : capacity * parallel;
    const packCurrent = cellCurrent === null ? null : cellCurrent * parallel;
    const knownPoints = profile.points && profile.points.filter((point) => point.voltage !== null);
    const points = knownPoints
      ? Array.from({ length: 21 }, (_, index) => {
        const percent = index * 5;
        const upperIndex = knownPoints.findIndex((point) => point.percent >= percent);
        const upper = knownPoints[upperIndex];
        if (upper.percent === percent) return { percent, voltage: upper.voltage * series, calculated: false };
        const lower = knownPoints[upperIndex - 1];
        const fraction = (percent - lower.percent) / (upper.percent - lower.percent);
        return { percent, voltage: (lower.voltage + (upper.voltage - lower.voltage) * fraction) * series, calculated: true };
      })
      : Array.from({ length: 21 }, (_, index) => {
        const lower = Math.floor(index / 2);
        const voltage = index % 2 === 0
          ? profile.voltages[lower]
          : (profile.voltages[lower] + profile.voltages[lower + 1]) / 2;
        return { percent: index * 5, voltage: voltage * series };
      });
    const tablePoints = points.filter(({ percent }) => profile.points
      ? customPercentages.includes(percent)
      : percent % 10 === 0 || percent === 5 || percent === 95);
    const nominalVoltage = profile.nominal * series;
    const minVoltage = profile.voltages[0] * series;
    const maxVoltage = profile.voltages[10] * series;
    const digits = voltagePrecision([nominalVoltage, minVoltage, maxVoltage, ...tablePoints.map((point) => point.voltage)]);
    const costPerCell = number('cost-per-cell', 'cost per cell');
    const totalCells = series * parallel;
    const totalCost = costPerCell === null ? null : costPerCell * totalCells;
    const resultLines = [
      `Chemistry: ${profile.name}${profile.points && fields['custom-name'].value.trim() ? ' (Custom)' : ''}`,
      `Configuration: ${series}S${parallel}P (${format(series * parallel)} cells)`,
      `Nominal voltage: ${formatVoltage(nominalVoltage, digits)} V`,
      `Assumed minimum voltage: ${formatVoltage(minVoltage, digits)} V`,
      `Assumed maximum voltage: ${formatVoltage(maxVoltage, digits)} V`
    ];
    if (packCapacity !== null) {
      resultLines.push(`Total capacity: ${format(packCapacity)} Ah`);
      resultLines.push(`Nominal energy: ${format(packCapacity * profile.nominal * series)} Wh`);
    }
    if (packCurrent !== null) resultLines.push(`Max continuous current: ${formatCurrent(packCurrent)} A`);
    if (totalCost !== null) resultLines.push(`Total cost: $${format(totalCost)}`);
    resultLines.push('Estimates only; verify cell ratings and limits before use.');
    resultText.value = resultLines.join('\n');
    table.replaceChildren();
    tablePoints.forEach(({ percent, voltage, calculated }) => {
      const row = table.insertRow();
      row.insertCell().textContent = `${percent}%`;
      row.insertCell().textContent = `${formatVoltage(voltage, digits)} V${calculated ? ' (calculated)' : ''}`;
    });
    chartHelp.textContent = profile.points
      ? 'Horizontal: state of charge (%). Vertical: pack voltage (V). Missing values are linearly interpolated estimates, not measured data.'
      : 'Horizontal: state of charge (%). Vertical: pack voltage (V). Points are illustrative estimates, not measured cell data.';
    renderChart(points);
    results.hidden = false;
    status.textContent = 'Calculation complete. Results are estimates.';
  }

  function calculate() {
    if (liveState !== null) {
      if (!pendingTarget && !invalidField && !customInvalid) renderResults(liveState);
      return;
    }
    clearOutputs();
    try {
      const profile = getProfile();
      const series = seriesCount(profile);
      updateSeriesOutput(profile, series);
      const capacity = number('cell-capacity', 'cell capacity');
      const ratingMode = fields['cell-current'].value.trim() !== '' || fields['cell-current'].validity.badInput ? 'current' : 'c';
      const rating = number(ratingMode === 'c' ? 'c-rating' : 'cell-current', 'the cell discharge rating');
      const state = { series, parallel: 1, capacity, ratingMode, rating };
      const parallelMode = ['parallel-cells', 'pack-capacity', 'pack-current']
        .find((id) => fields[id].value.trim() !== '' || fields[id].validity.badInput);
      if (parallelMode === 'parallel-cells') {
        state.parallel = number('parallel-cells', 'the parallel cell count', true, true);
      } else if (parallelMode === 'pack-capacity') {
        const target = number('pack-capacity', 'the minimum pack capacity', true);
        if (capacity === null) throw new Error('Enter cell capacity to size the pack by capacity.');
        state.parallel = wholeCells(target / capacity, 'up');
      } else if (parallelMode === 'pack-current') {
        const target = number('pack-current', 'the minimum pack current', true);
        const current = cellCurrentOf(state);
        if (current === null) throw new Error('Enter cell capacity and a discharge rating, or a cell discharge current, to size the pack by current.');
        state.parallel = wholeCells(target / current, 'up');
      }
      liveState = state;
      for (const id of ['series-cells', 'voltage-target', 'c-rating', 'cell-current', 'parallel-cells', 'pack-capacity', 'pack-current']) {
        fields[id].disabled = false;
      }
      syncLiveFields();
      renderResults(state);
    } catch (error) {
      status.textContent = error.message;
      status.dataset.error = 'true';
    }
  }

  function showLiveError(message) {
    results.hidden = true;
    resultText.value = '';
    copyStatus.textContent = '';
    status.textContent = message;
    status.dataset.error = 'true';
  }

  function updateLive(id) {
    if (invalidField && invalidField !== id) {
      showLiveError('Correct the invalid field before continuing.');
      return;
    }
    const state = { ...liveState };
    try {
      if (id === 'series-cells') {
        state.series = number(id, 'the series cell count', false, true);
      } else if (id === 'voltage-target') {
        const target = number(id, 'the voltage target or limit');
        const minimum = fields['series-mode'].value === 'min';
        const profile = getProfile();
        const perCell = minimum ? profile.voltages[0] : profile.voltages[10];
        state.series = target === null ? null : wholeCells(target / perCell, minimum ? 'up' : 'down');
      } else if (id === 'cell-capacity') {
        state.capacity = number(id, 'cell capacity');
      } else if (id === 'c-rating' || id === 'cell-current') {
        state.ratingMode = id === 'c-rating' ? 'c' : 'current';
        state.rating = number(id, 'the cell discharge rating');
      } else if (id === 'parallel-cells') {
        state.parallel = number(id, 'the parallel cell count', false, true);
        pendingTarget = null;
      } else if (id === 'pack-capacity' || id === 'pack-current') {
        const target = number(id, id === 'pack-capacity' ? 'the minimum pack capacity' : 'the minimum pack current');
        state.parallel = null;
        pendingTarget = target === null ? null : { id, target };
      }
      invalidField = null;
    } catch (error) {
      invalidField = id;
      showLiveError(error.message);
      return;
    }
    liveState = state;
    if (pendingTarget) {
      const base = pendingTarget.id === 'pack-capacity' ? state.capacity : cellCurrentOf(state);
      if (base === null) {
        syncLiveFields([id, pendingTarget.id]);
        showLiveError(pendingTarget.id === 'pack-capacity'
          ? 'Enter cell capacity to size the pack by capacity.'
          : 'Enter cell capacity and a discharge rating, or a cell discharge current, to size the pack by current.');
        return;
      }
      try {
        state.parallel = wholeCells(pendingTarget.target / base, 'up');
        pendingTarget = null;
      } catch (error) {
        syncLiveFields([id, pendingTarget.id]);
        showLiveError(error.message);
        return;
      }
    }
    syncLiveFields([id]);
    renderResults(state);
  }

  toggleCustomTable.addEventListener('click', () => {
    setCustomTableExpanded(customTableContainer.hidden);
  });

  customTable.addEventListener('paste', (event) => {
    const start = customPercentages.findIndex((percent) => event.target.id === `custom-soc-${percent}`);
    if (start < 0) return;
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n').replace(/\n$/, '');
    const rows = text.split('\n').map((line) => line.split('\t'));
    const columns = rows[0].length;
    let error = '';
    if ((columns !== 1 && columns !== 2) || rows.some((row) => row.length !== columns)) {
      error = 'Paste one voltage column or two columns containing SOC and voltage.';
    } else if (start + rows.length > customPercentages.length) {
      error = 'The pasted data has more rows than the remaining voltage fields.';
    } else {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const voltage = row[columns - 1].trim();
        if (columns === 2) {
          const socText = row[0].trim();
          const soc = Number(socText.replace(/%$/, ''));
          const expected = customPercentages[start + index];
          if (!socText || !Number.isFinite(soc) || (soc !== expected && (socText.endsWith('%') || soc * 100 !== expected))) {
            error = `The pasted SOC must match the ${expected}% row.`;
            break;
          }
        }
        const value = Number(voltage);
        if (voltage && (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(voltage) || !Number.isFinite(value) || value <= 0 || value > 1000000)) {
          error = `Enter a valid positive voltage in the ${customPercentages[start + index]}% row.`;
          break;
        }
      }
    }
    if (error) {
      pasteStatus.textContent = error;
      pasteStatus.dataset.error = 'true';
      pasteStatus.hidden = false;
      return;
    }
    rows.forEach((row, index) => {
      const voltage = row[columns - 1].trim();
      fields[`custom-soc-${customPercentages[start + index]}`].value = voltage ? String(Number(voltage)) : '';
    });
    pasteStatus.textContent = `Pasted ${rows.length} voltage ${rows.length === 1 ? 'value' : 'values'}.`;
    pasteStatus.dataset.error = 'false';
    pasteStatus.hidden = false;
    event.target.dispatchEvent(new Event('input', { bubbles: true }));
  });

  form.addEventListener('input', (event) => {
    if (event.target.id === 'chemistry') updateCustomVisibility();
    if (liveState !== null) {
      try {
        getProfile();
        if (customInvalid) {
          for (const id of liveFieldIds) fields[id].disabled = false;
          customInvalid = false;
        }
      } catch (error) {
        customInvalid = true;
        for (const id of liveFieldIds) fields[id].disabled = true;
        showLiveError(`${error.message} Complete the custom cell details to continue.`);
        return;
      }
      updateLive(event.target.id);
      return;
    }
    clearOutputs();
    updateModes();
    updateSeriesLive();
  });
  form.addEventListener('focusout', () => {
    if (liveState !== null && !invalidField && !pendingTarget && !customInvalid) syncLiveFields();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });
  document.getElementById('copy-results').addEventListener('click', async () => {
    if (!resultText.value) return;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      resultText.focus();
      resultText.select();
      copyStatus.textContent = 'Clipboard access is unavailable. Results are selected; press Ctrl+C to copy.';
      return;
    }
    try {
      await navigator.clipboard.writeText(resultText.value);
      copyStatus.textContent = 'Results copied to clipboard.';
    } catch (error) {
      resultText.focus();
      resultText.select();
      copyStatus.textContent = 'Clipboard access was blocked. Results are selected; press Ctrl+C to copy.';
    }
  });
  form.addEventListener('reset', () => {
    liveState = null;
    pendingTarget = null;
    invalidField = null;
    customInvalid = false;
    setTimeout(() => {
      for (const id of liveFieldIds) fields[id].disabled = false;
      updateCustomVisibility();
      setCustomTableExpanded(true);
      pasteStatus.hidden = true;
      pasteStatus.textContent = '';
      updateModes();
      clearOutputs();
      updateSeriesLive();
    }, 0);
  });
  updateCustomVisibility();
  updateModes();
})();
