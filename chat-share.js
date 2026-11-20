(() => {
  const WORDS = [
    'acorn', 'amber', 'anchor', 'apricot', 'arch', 'arrow', 'atlas', 'aurora',
    'badger', 'bamboo', 'beacon', 'birch', 'blossom', 'bluejay', 'breeze', 'brook',
    'cactus', 'candle', 'canvas', 'cedar', 'cherry', 'cinder', 'cobalt', 'comet',
    'coral', 'cosmos', 'cricket', 'crystal', 'daisy', 'delta', 'dolphin', 'dune',
    'eagle', 'echo', 'elm', 'ember', 'falcon', 'fern', 'field', 'finch',
    'flame', 'flint', 'forest', 'fossil', 'fountain', 'fox', 'galaxy', 'garden',
    'garlic', 'gecko', 'ginger', 'glacier', 'glimmer', 'globe', 'goldfinch', 'granite',
    'harbor', 'hazel', 'heron', 'honey', 'horizon', 'hyacinth', 'iceberg', 'indigo',
    'island', 'ivory', 'jasmine', 'jigsaw', 'juniper', 'kestrel', 'kiwi', 'lagoon',
    'lantern', 'laurel', 'lemon', 'lilac', 'linden', 'lotus',
    'lunar', 'maple', 'marble', 'marigold', 'meadow', 'meteor', 'mint', 'mist',
    'moon', 'moss', 'mountain', 'nectar', 'newt', 'nickel', 'north', 'nova',
    'oak', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'orchid', 'otter',
    'panda', 'paper', 'parrot', 'pebble', 'pepper', 'petal', 'phoenix', 'pine',
    'planet', 'plum', 'pocket', 'poppy', 'prairie', 'prism', 'quartz', 'quest',
    'rabbit', 'radar', 'rainbow', 'raven', 'reef', 'river', 'robin', 'rocket',
    'rose', 'saffron', 'sage', 'sailor', 'saturn', 'scarlet', 'seashell', 'shadow',
    'silver', 'sky', 'slate', 'snow', 'solar', 'sparrow', 'spectrum', 'spice',
    'spring', 'spruce', 'star', 'stone', 'storm', 'summer', 'sunbeam', 'sunset',
    'swift', 'tangerine', 'temple', 'thistle', 'thunder', 'tiger', 'timber', 'topaz',
    'trail', 'tulip', 'tundra', 'turtle', 'twilight', 'umber', 'valley', 'velvet',
    'verbena', 'violet', 'volcano', 'walnut', 'waterfall', 'willow', 'winter', 'wren',
    'xenon', 'yarrow', 'yellow', 'zenith', 'zinnia', 'acorn', 'alpine', 'aster',
    'autumn', 'basil', 'berry', 'brass', 'butterfly', 'canyon', 'cascade', 'cello',
    'chess', 'citrus', 'clover', 'copper', 'dawn', 'drift', 'evergreen', 'flamingo',
    'frost', 'grove', 'harvest', 'indigo', 'jupiter', 'kingfisher', 'lavender', 'magnet',
    'midnight', 'mosaic', 'pancake', 'peacock', 'pinecone', 'rain', 'ripple', 'sapphire',
    'sequoia', 'shamrock', 'shimmer', 'snowflake', 'teal', 'thunderbird', 'truffle', 'voyage',
    'wave', 'whisper', 'wildflower', 'zephyr', 'zigzag', 'airship', 'asteroid', 'badminton',
    'bluebell', 'book', 'boulder', 'buttercup', 'cardinal', 'carnation', 'chestnut', 'cinnamon',
    'compass', 'dandelion', 'daybreak', 'firefly', 'footpath', 'hammock', 'heather', 'hourglass',
    'marsh', 'oatmeal', 'pavilion', 'rainfall', 'redwood', 'seaspray', 'snowdrop', 'woodland'
  ];
  const MAX_BUFFERED_AMOUNT = 1024 * 1024;
  const CHUNK_SIZE = 16 * 1024;
  const FILE_ACK_INTERVAL = 16;
  const MAX_DIRECT_DOWNLOAD_SIZE = 25 * 1024 * 1024;
  const config = window.THAYER_CREATIONS_SUPABASE || {};
  const client = window.supabase && config.url && config.anonKey
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;
  let cryptoKey = null;
  const createView = document.querySelector('#create-view');
  const joinView = document.querySelector('#join-view');
  const activeView = document.querySelector('#active-view');
  const createStatus = document.querySelector('#create-status');
  const joinStatus = document.querySelector('#join-status');
  const connectionStatus = document.querySelector('#connection-status');
  const inviteBox = document.querySelector('#invite-box');
  const inviteCode = document.querySelector('#invite-code');
  const chatLog = document.querySelector('#chat-log');
  const chatEmpty = document.querySelector('#chat-empty');
  const chatForm = document.querySelector('#chat-form');
  const autoSaveStatus = document.querySelector('#auto-save-status');
  const autoSaveFolderButton = document.querySelector('#auto-save-folder');
  const messageInput = document.querySelector('#message-input');
  const fileInput = document.querySelector('#file-input');
  const sendButton = document.querySelector('#send-message');
  const copyCodeButton = document.querySelector('#copy-code');
  const state = {
    role: '',
    roomId: '',
    channel: null,
    peer: null,
    dataChannel: null,
    acceptedPeer: false,
    remoteDescriptionSet: false,
    queuedCandidates: [],
    pendingTransfer: null,
    pendingAck: null,
    activeOutgoingTransfer: null,
    incomingOffer: null,
    incomingFile: null,
    saveDirectoryHandle: null,
    incomingMessageQueue: Promise.resolve(),
    connectTimeout: null,
    objectUrls: [],
    stopped: false
  };

  function setStatus(element, message, isError = false) {
    element.textContent = message;
    if (isError) element.dataset.error = 'true';
    else delete element.dataset.error;
  }

  function randomInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const value = new Uint32Array(1);
    do {
      crypto.getRandomValues(value);
    } while (value[0] >= limit);
    return value[0] % max;
  }

  function makePairingCode() {
    return `${WORDS[randomInt(WORDS.length)]}-${WORDS[randomInt(WORDS.length)]}-${String(randomInt(1000)).padStart(3, '0')}`;
  }

  function normalizeCode(value) {
    const code = value.trim().toLowerCase().replace(/\s+/g, '-');
    return /^[a-z]+-[a-z]+-\d{3}$/.test(code) ? code : '';
  }

  async function deriveRoomCredentials(code) {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(code),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derivation = (purpose) => crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: new TextEncoder().encode(`ThayerCreations/chat-share/v1/${purpose}`),
      iterations: 600000,
      hash: 'SHA-256'
    }, material, 256);
    const [roomBytes, keyBytes] = await Promise.all([derivation('room'), derivation('encryption')]);
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return { roomId: encodeBase64Url(new Uint8Array(roomBytes)), key };
  }

  function encodeBase64Url(bytes) {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function envelopeAdditionalData(kind, transferId = '', sequence = '', final = false) {
    return new TextEncoder().encode(`chat-share:v1:${kind}:${transferId}:${sequence}:${final ? 1 : 0}`);
  }

  async function encryptEnvelope(bytes, kind, transfer = null) {
    if (!cryptoKey) throw new Error('This room is missing its encryption key.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const transferId = transfer ? transfer.id : '';
    const sequence = transfer ? transfer.sequence : '';
    const final = Boolean(transfer && transfer.final);
    const additionalData = envelopeAdditionalData(kind, transferId, sequence, final);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, cryptoKey, bytes);
    const envelope = {
      type: 'encrypted',
      kind,
      iv: encodeBase64Url(iv),
      data: encodeBase64Url(new Uint8Array(ciphertext))
    };
    if (transfer) Object.assign(envelope, { transferId, sequence, final });
    return JSON.stringify(envelope);
  }

  async function decryptEnvelope(value) {
    let envelope;
    try {
      envelope = JSON.parse(value);
    } catch {
      throw new Error('Received an unreadable encrypted packet.');
    }
    if (!envelope || envelope.type !== 'encrypted' ||
        !['json', 'binary'].includes(envelope.kind) ||
        typeof envelope.iv !== 'string' || typeof envelope.data !== 'string') {
      throw new Error('Received an invalid encrypted packet.');
    }
    let transfer = null;
    if (envelope.kind === 'binary') {
      if (typeof envelope.transferId !== 'string' || !/^[a-f0-9-]{20,60}$/.test(envelope.transferId) ||
          !Number.isSafeInteger(envelope.sequence) || envelope.sequence < 0 ||
          typeof envelope.final !== 'boolean') {
        throw new Error('Received invalid file-transfer metadata.');
      }
      transfer = { id: envelope.transferId, sequence: envelope.sequence, final: envelope.final };
    }
    const plaintext = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: decodeBase64Url(envelope.iv),
      additionalData: envelopeAdditionalData(
        envelope.kind,
        transfer ? transfer.id : '',
        transfer ? transfer.sequence : '',
        transfer ? transfer.final : false
      )
    }, cryptoKey, decodeBase64Url(envelope.data));
    return { kind: envelope.kind, plaintext, transfer };
  }

  function setConnectionStatus(message, isError = false) {
    setStatus(connectionStatus, message, isError);
  }

  function showActiveView(role) {
    createView.hidden = true;
    joinView.hidden = true;
    activeView.hidden = false;
    document.querySelector('#room-role').textContent = role === 'host' ? 'Invite created' : 'Joining an invite';
  }

  async function chooseAutoSaveFolder() {
    try {
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      let permission = await directory.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        permission = await directory.requestPermission({ mode: 'readwrite' });
      }
      if (permission !== 'granted') {
        throw new Error('Folder permission was not granted.');
      }
      state.saveDirectoryHandle = directory;
      autoSaveFolderButton.textContent = 'Change save folder';
      setStatus(autoSaveStatus, `Auto-save is on for this page session. Incoming files will be saved to "${directory.name}".`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus(autoSaveStatus, `Could not enable auto-save: ${error.message}`, true);
      }
    }
  }

  function makeChannel(roomId) {
    if (!client) throw new Error('Supabase is unavailable. Check the site configuration and try again.');
    return client.channel(`chat-share-${roomId}`, {
      config: { broadcast: { self: false } }
    });
  }

  function subscribeToChannel(roomId) {
    return new Promise((resolve, reject) => {
      const channel = makeChannel(roomId);
      state.channel = channel;
      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignal(payload).catch((error) => {
          setConnectionStatus(`Connection setup failed: ${error.message}`, true);
        });
      });
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Timed out connecting to the room service. Please try again.'));
      }, 15000);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && !settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(channel);
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status) && !settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(`Room service connection failed (${status}).`));
        }
      });
    });
  }

  async function sendSignal(payload) {
    if (!state.channel) throw new Error('The room signaling connection is not available.');
    const result = await state.channel.send({ type: 'broadcast', event: 'signal', payload });
    if (result !== 'ok') throw new Error(`Could not send connection details (${result}).`);
  }

  function createPeerConnection() {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    state.peer = peer;
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: 'candidate', candidate: event.candidate.toJSON() }).catch((error) => {
          setConnectionStatus(`Could not exchange connection details: ${error.message}`, true);
        });
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed') {
        setConnectionStatus('Could not connect directly. This network may require a relay service.', true);
      } else if (peer.connectionState === 'disconnected') {
        setConnectionStatus('Connection interrupted. Waiting for the peer to reconnect.', true);
      } else if (peer.connectionState === 'connected' && state.dataChannel?.readyState !== 'open') {
        setConnectionStatus('Peer connection established; opening chat…');
      }
    };
    if (state.role === 'host') {
      state.dataChannel = peer.createDataChannel('chat', { ordered: true });
      configureDataChannel(state.dataChannel);
    } else {
      peer.ondatachannel = (event) => {
        state.dataChannel = event.channel;
        configureDataChannel(event.channel);
      };
    }
    return peer;
  }

  function configureDataChannel(channel) {
    channel.bufferedAmountLowThreshold = 512 * 1024;
    channel.onopen = () => {
      clearTimeout(state.connectTimeout);
      messageInput.disabled = false;
      fileInput.disabled = false;
      sendButton.disabled = false;
      setConnectionStatus('Connected. Messages and files use AES-GCM and WebRTC encryption.');
      messageInput.focus();
    };
    channel.onclose = () => {
      messageInput.disabled = true;
      fileInput.disabled = true;
      sendButton.disabled = true;
      setConnectionStatus('The peer connection closed.', true);
    };
    channel.onerror = () => {
      setConnectionStatus('The encrypted data channel reported an error.', true);
    };
    channel.onmessage = (event) => {
      state.incomingMessageQueue = state.incomingMessageQueue
        .then(() => handleDataMessage(event))
        .catch(async (error) => {
          setConnectionStatus(`File or message receive failed: ${error.message}`, true);
          await abortIncomingFile(error.message);
        });
    };
  }

  async function handleSignal(payload) {
    if (!payload || typeof payload.type !== 'string' || state.stopped) return;
    if (state.role === 'host' && payload.type === 'join') {
      if (state.acceptedPeer) return;
      state.acceptedPeer = true;
      setConnectionStatus('Room code matched. Negotiating an encrypted connection…');
      const peer = createPeerConnection();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal({ type: 'offer', description: peer.localDescription });
      return;
    }
    if (state.role === 'host' && payload.type === 'answer' && state.acceptedPeer) {
      await state.peer.setRemoteDescription(payload.description);
      state.remoteDescriptionSet = true;
      await flushCandidates();
      return;
    }
    if (state.role === 'guest' && payload.type === 'offer' && state.peer && !state.peer.remoteDescription) {
      await state.peer.setRemoteDescription(payload.description);
      state.remoteDescriptionSet = true;
      await flushCandidates();
      const answer = await state.peer.createAnswer();
      await state.peer.setLocalDescription(answer);
      await sendSignal({ type: 'answer', description: state.peer.localDescription });
      return;
    }
    if (payload.type === 'candidate' && state.peer && payload.candidate) {
      if (!state.remoteDescriptionSet) {
        state.queuedCandidates.push(payload.candidate);
      } else {
        await state.peer.addIceCandidate(payload.candidate);
      }
    }
  }

  async function flushCandidates() {
    const candidates = state.queuedCandidates.splice(0);
    for (const candidate of candidates) {
      await state.peer.addIceCandidate(candidate);
    }
  }

  function appendChatItem(text, own = false, fileInfo = null) {
    chatEmpty.hidden = true;
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.dataset.own = String(own);
    const content = document.createElement('p');
    content.textContent = text;
    item.append(content);
    const meta = document.createElement('span');
    meta.className = 'chat-meta';
    meta.textContent = `${own ? 'You' : 'Peer'} · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    item.append(meta);
    if (fileInfo) {
      if (fileInfo.progress) {
        const progress = document.createElement('progress');
        progress.className = 'transfer-progress';
        progress.max = fileInfo.progress.max;
        progress.value = fileInfo.progress.value;
        item.append(progress);
        fileInfo.setProgress = (value) => { progress.value = value; };
      }
      if (fileInfo.status) {
        const status = document.createElement('span');
        status.className = 'chat-meta';
        status.textContent = fileInfo.status;
        item.append(status);
        fileInfo.setStatus = (value) => { status.textContent = value; };
      }
      if (fileInfo.download) {
        const link = document.createElement('a');
        link.className = 'download-link';
        link.href = fileInfo.download.url;
        link.download = fileInfo.download.name;
        link.textContent = 'Download file';
        item.append(link);
      }
      if (fileInfo.actions) item.append(...fileInfo.actions);
    }
    chatLog.append(item);
    chatLog.scrollTop = chatLog.scrollHeight;
    return item;
  }

  async function sendData(payload) {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
      throw new Error('The peer is not connected.');
    }
    const packet = await encryptEnvelope(new TextEncoder().encode(JSON.stringify(payload)), 'json');
    state.dataChannel.send(packet);
  }

  async function sendBinaryData(data, transferId, sequence, final) {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
      throw new Error('The peer is not connected.');
    }
    state.dataChannel.send(await encryptEnvelope(new Uint8Array(data), 'binary', {
      id: transferId,
      sequence,
      final
    }));
  }

  async function handleDataMessage(event) {
    if (typeof event.data !== 'string') {
      setConnectionStatus('Received an invalid encrypted packet.', true);
      return;
    }
    const decrypted = await decryptEnvelope(event.data);
    if (decrypted.kind === 'binary') {
      await receiveFileChunk(decrypted.plaintext, decrypted.transfer);
      return;
    }
    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(decrypted.plaintext));
    } catch {
      setConnectionStatus('Received an unreadable message from the peer.', true);
      return;
    }
    if (!payload || typeof payload.type !== 'string') return;
    if (payload.type === 'message' && typeof payload.text === 'string' && payload.text.length <= 4000) {
      appendChatItem(payload.text);
    } else if (payload.type === 'file-offer') {
      await receiveFileOffer(payload);
    } else if (payload.type === 'file-response') {
      resolveFileOffer(payload);
    } else if (payload.type === 'file-start') {
      startReceivingFile(payload);
    } else if (payload.type === 'file-ack') {
      resolveFileAck(payload);
    } else if (payload.type === 'file-abort') {
      abortOutgoingTransfer(payload);
    } else if (payload.type === 'file-end') {
      await finishReceivingFile(payload);
    }
  }

  async function receiveFileOffer(payload) {
    if (!/^[a-f0-9-]{20,60}$/.test(payload.id || '') ||
        typeof payload.name !== 'string' || payload.name.length > 255 ||
        !Number.isSafeInteger(payload.size) || payload.size < 0) {
      return;
    }
    if (state.incomingOffer || state.incomingFile) {
      await sendData({
        type: 'file-response',
        id: payload.id,
        accepted: false,
        reason: 'Finish the current incoming file before starting another.'
      });
      return;
    }
    const canChooseSaveFolder = typeof window.showDirectoryPicker === 'function';
    const canDownloadWithoutFolder = payload.size < MAX_DIRECT_DOWNLOAD_SIZE;
    if (canChooseSaveFolder && !state.saveDirectoryHandle && !canDownloadWithoutFolder) {
      const reason = 'Choose a save folder for files 25 MB or larger before the sender tries again.';
      appendChatItem(`Could not automatically accept "${payload.name}": ${reason}`);
      await sendData({ type: 'file-response', id: payload.id, accepted: false, reason });
      return;
    }
    const canStreamToDisk = Boolean(state.saveDirectoryHandle);
    state.incomingOffer = payload.id;
    const memoryNote = canStreamToDisk
      ? ''
      : canDownloadWithoutFolder
        ? ' A download link will appear when the file is received.'
        : ' Files are buffered in memory in this browser, so very large transfers may be limited by available memory.';
    let writable = null;
    let progressInfo = null;
    try {
      let fileName = payload.name;
      if (canStreamToDisk) {
        const fileHandle = await createUniqueFileHandle(state.saveDirectoryHandle, payload.name);
        fileName = fileHandle.name;
        writable = await fileHandle.createWritable();
      }
      progressInfo = {
        progress: { max: payload.size || 1, value: 0 },
        status: canStreamToDisk ? 'Waiting to save to disk.' : 'Waiting for file data.'
      };
      state.incomingFile = {
        id: payload.id,
        name: fileName,
        size: payload.size,
        type: typeof payload.mime === 'string' ? payload.mime.slice(0, 120) : '',
        writable,
        chunks: [],
        received: 0,
        nextSequence: 0,
        totalChunks: null,
        started: false,
        progressInfo
      };
      state.incomingOffer = null;
      appendChatItem(
        `Automatically receiving "${fileName}" (${formatSize(payload.size)}).${memoryNote}`,
        false,
        progressInfo
      );
      await sendData({ type: 'file-response', id: payload.id, accepted: true });
    } catch (error) {
      state.incomingOffer = null;
      if (writable) {
        try {
          await writable.abort();
        } catch (abortError) {
          setConnectionStatus(`Could not cancel the save: ${abortError.message}`, true);
        }
      }
      state.incomingFile = null;
      const reason = `Could not prepare the file: ${error.message}`;
      if (progressInfo && progressInfo.setStatus) progressInfo.setStatus(reason);
      setConnectionStatus(reason, true);
      try {
        await sendData({ type: 'file-response', id: payload.id, accepted: false, reason });
      } catch (sendError) {
        setConnectionStatus(`Could not notify the sender: ${sendError.message}`, true);
      }
    }
  }

  async function createUniqueFileHandle(directory, name) {
    const safeName = safeFileName(name);
    const extensionIndex = safeName.lastIndexOf('.');
    const baseName = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
    const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : '';
    for (let suffix = 0; suffix < 10000; suffix += 1) {
      const candidate = suffix === 0 ? safeName : `${baseName} (${suffix})${extension}`;
      try {
        await directory.getFileHandle(candidate);
      } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
        return directory.getFileHandle(candidate, { create: true });
      }
    }
    throw new Error('Could not create a unique file name in the save folder.');
  }

  function resolveFileOffer(payload) {
    if (!state.pendingTransfer || state.pendingTransfer.id !== payload.id) return;
    const pending = state.pendingTransfer;
    state.pendingTransfer = null;
    clearTimeout(pending.timeout);
    pending.resolve({ accepted: Boolean(payload.accepted), reason: payload.reason });
  }

  function startReceivingFile(payload) {
    const file = state.incomingFile;
    const expectedChunks = file ? Math.ceil(file.size / CHUNK_SIZE) : -1;
    if (!file || payload.id !== file.id || payload.size !== file.size ||
        payload.totalChunks !== expectedChunks) {
      throw new Error('The incoming file did not match its offer.');
    }
    file.started = true;
    file.totalChunks = payload.totalChunks;
    file.progressInfo.setStatus(file.writable ? 'Saving to disk…' : 'Receiving file data…');
  }

  async function receiveFileChunk(data, transfer) {
    if (!(data instanceof ArrayBuffer)) throw new Error('Received an invalid file chunk.');
    const file = state.incomingFile;
    const expectedFinal = file && file.nextSequence === file.totalChunks - 1;
    if (!file || !file.started || transfer.id !== file.id ||
        transfer.sequence !== file.nextSequence || transfer.final !== expectedFinal ||
      data.byteLength !== Math.min(CHUNK_SIZE, file.size - file.received) ||
      file.received + data.byteLength > file.size) {
      throw new Error('The received file chunk is out of order or exceeds the offered size.');
    }
    if (file.writable) await file.writable.write(data);
    else file.chunks.push(data);
    file.received += data.byteLength;
    file.nextSequence += 1;
    file.progressInfo.setProgress(file.received);
    if (file.nextSequence % FILE_ACK_INTERVAL === 0 || transfer.final) {
      await sendData({ type: 'file-ack', id: file.id, sequence: transfer.sequence });
    }
  }

  async function finishReceivingFile(payload) {
    const file = state.incomingFile;
    if (!file || payload.id !== file.id) return;
    if (!file.started || file.received !== file.size ||
        file.nextSequence !== file.totalChunks) {
      throw new Error('The file transfer was incomplete.');
    }
    if (file.writable) {
      await file.writable.close();
      file.progressInfo.setStatus('Saved to disk.');
    } else {
      const blob = new Blob(file.chunks, { type: file.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      state.objectUrls.push(url);
      appendChatItem(`Received "${file.name}" (${formatSize(file.size)}).`, false, {
        download: { url, name: file.name }
      });
    }
    state.incomingFile = null;
  }

  function safeFileName(name) {
    const sanitized = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim();
    return sanitized || 'shared-file';
  }

  async function abortIncomingFile(reason) {
    const file = state.incomingFile;
    if (!file) return;
    state.incomingFile = null;
    file.progressInfo.setStatus(`Transfer failed: ${reason}`);
    if (file.writable) {
      try {
        await file.writable.abort();
      } catch (error) {
        setConnectionStatus(`Could not discard the incomplete file: ${error.message}`, true);
      }
    }
    try {
      await sendData({ type: 'file-abort', id: file.id, reason: reason.slice(0, 200) });
    } catch (error) {
      setConnectionStatus(`Could not notify the sender: ${error.message}`, true);
    }
  }

  function prepareFileAck(id, sequence) {
    if (state.pendingAck) throw new Error('A previous file chunk is still awaiting acknowledgement.');
    const pending = { id, sequence, acknowledged: false, error: null, resolve: null, reject: null, timeout: null };
    state.pendingAck = pending;
    return pending;
  }

  function waitForFileAck(pending) {
    if (pending.error) {
      state.pendingAck = null;
      return Promise.reject(new Error(pending.error));
    }
    if (pending.acknowledged) {
      state.pendingAck = null;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      pending.resolve = resolve;
      pending.reject = reject;
      pending.timeout = setTimeout(() => {
        if (state.pendingAck === pending) state.pendingAck = null;
        reject(new Error('The receiver stopped acknowledging file data.'));
      }, 30000);
    });
  }

  function resolveFileAck(payload) {
    const pending = state.pendingAck;
    if (!pending || payload.id !== pending.id || payload.sequence !== pending.sequence) return;
    pending.acknowledged = true;
    if (pending.resolve) {
      state.pendingAck = null;
      clearTimeout(pending.timeout);
      pending.resolve();
    }
  }

  function abortOutgoingTransfer(payload) {
    const transfer = state.activeOutgoingTransfer;
    if (!transfer || payload.id !== transfer.id) return;
    transfer.abortReason = typeof payload.reason === 'string' ? payload.reason : 'The receiver could not save the file.';
    const pending = state.pendingAck;
    if (pending && pending.id === transfer.id) {
      pending.error = transfer.abortReason;
    }
    if (pending && pending.id === transfer.id && pending.reject) {
      state.pendingAck = null;
      clearTimeout(pending.timeout);
      pending.reject(new Error(transfer.abortReason));
    }
  }

  function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`;
  }

  function waitForBuffer(channel) {
    if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.removeEventListener('bufferedamountlow', onLow);
        reject(new Error('File transfer paused because the connection is not responding.'));
      }, 30000);
      function onLow() {
        clearTimeout(timeout);
        resolve();
      }
      channel.addEventListener('bufferedamountlow', onLow, { once: true });
    });
  }

  async function sendFile(file) {
    if (!Number.isSafeInteger(file.size)) {
      setConnectionStatus('This file is too large for the browser to transfer safely.', true);
      fileInput.value = '';
      return;
    }
    if (state.pendingTransfer || state.activeOutgoingTransfer) {
      setConnectionStatus('Wait for the current file offer to finish first.', true);
      fileInput.value = '';
      return;
    }
    const id = crypto.randomUUID();
    const transfer = { id, resolve: null, timeout: null };
    const response = new Promise((resolve, reject) => {
      transfer.resolve = resolve;
      transfer.timeout = setTimeout(() => {
        if (state.pendingTransfer === transfer) state.pendingTransfer = null;
        reject(new Error('The file offer expired because the peer did not respond.'));
      }, 5 * 60 * 1000);
    });
    state.pendingTransfer = transfer;
    const progressInfo = { progress: { max: file.size || 1, value: 0 }, status: 'Waiting for recipient…' };
    appendChatItem(`Offering "${file.name}" (${formatSize(file.size)}).`, true, progressInfo);
    try {
      await sendData({
        type: 'file-offer',
        id,
        name: file.name.slice(0, 255),
        size: file.size,
        mime: file.type.slice(0, 120)
      });
      const decision = await response;
      if (!decision.accepted) {
        progressInfo.setStatus(decision.reason || 'The peer declined this file.');
        return;
      }
      state.activeOutgoingTransfer = transfer;
      progressInfo.setStatus('Sending…');
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      await sendData({ type: 'file-start', id, size: file.size, totalChunks });
      for (let sequence = 0, offset = 0; offset < file.size; sequence += 1, offset += CHUNK_SIZE) {
        if (transfer.abortReason) throw new Error(transfer.abortReason);
        const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        const isFinal = sequence === totalChunks - 1;
        const shouldWaitForAck = (sequence + 1) % FILE_ACK_INTERVAL === 0 || isFinal;
        const pendingAck = shouldWaitForAck ? prepareFileAck(id, sequence) : null;
        await waitForBuffer(state.dataChannel);
        if (state.dataChannel.readyState !== 'open') throw new Error('The peer connection closed during transfer.');
        await sendBinaryData(chunk, id, sequence, isFinal);
        progressInfo.setProgress(Math.min(offset + chunk.byteLength, file.size));
        if (pendingAck) await waitForFileAck(pendingAck);
        if (transfer.abortReason) throw new Error(transfer.abortReason);
      }
      await sendData({ type: 'file-end', id });
      progressInfo.setStatus('File sent.');
    } catch (error) {
      progressInfo.setStatus(error.message);
      setConnectionStatus(error.message, true);
    } finally {
      if (state.pendingTransfer === transfer) state.pendingTransfer = null;
      if (state.activeOutgoingTransfer === transfer) state.activeOutgoingTransfer = null;
      if (state.pendingAck && state.pendingAck.id === id) {
        const pending = state.pendingAck;
        state.pendingAck = null;
        clearTimeout(pending.timeout);
        if (pending.reject) pending.reject(new Error('File transfer ended before acknowledgement.'));
      }
      clearTimeout(transfer.timeout);
      fileInput.value = '';
    }
  }

  async function startHostRoom() {
    if (!window.isSecureContext || !window.RTCPeerConnection || !crypto.subtle) {
      setStatus(createStatus, 'This feature requires a secure HTTPS page and a modern browser.', true);
      return;
    }
    try {
      const code = makePairingCode();
      const credentials = await deriveRoomCredentials(code);
      cryptoKey = credentials.key;
      state.stopped = false;
      state.role = 'host';
      state.roomId = credentials.roomId;
      showActiveView('host');
      inviteBox.hidden = false;
      inviteCode.textContent = code;
      setConnectionStatus('Opening share chat…');
      await subscribeToChannel(state.roomId);
      setConnectionStatus('Waiting for someone to enter this code…');
    } catch (error) {
      if (activeView.hidden) setStatus(createStatus, error.message, true);
      else setConnectionStatus(error.message, true);
    }
  }

  async function joinRoom(event) {
    event.preventDefault();
    const code = normalizeCode(document.querySelector('#join-code').value);
    if (!code) {
      setStatus(joinStatus, 'Enter two words followed by three numbers, such as ember-orbit-482.', true);
      return;
    }
    if (!window.isSecureContext || !window.RTCPeerConnection || !crypto.subtle) {
      setStatus(joinStatus, 'This feature requires a secure HTTPS page and a modern browser.', true);
      return;
    }
    const joinButton = document.querySelector('#join-room');
    joinButton.disabled = true;
    state.stopped = false;
    state.role = 'guest';
    showActiveView('guest');
    inviteBox.hidden = false;
    inviteCode.textContent = code;
    setConnectionStatus('Deriving the room and encryption key…');
    try {
      const credentials = await deriveRoomCredentials(code);
      state.roomId = credentials.roomId;
      cryptoKey = credentials.key;
      createPeerConnection();
      await subscribeToChannel(state.roomId);
      await sendSignal({ type: 'join' });
      setConnectionStatus('Waiting for the host to connect…');
      state.connectTimeout = setTimeout(() => {
        if (state.dataChannel?.readyState !== 'open') {
          setConnectionStatus('No matching host responded. Check the code and that the host is still in the room.', true);
        }
      }, 60000);
    } catch (error) {
      setConnectionStatus(error.message, true);
    } finally {
      joinButton.disabled = false;
    }
  }

  function stopRoom() {
    state.stopped = true;
    clearTimeout(state.connectTimeout);
    if (state.pendingAck) {
      const pending = state.pendingAck;
      pending.error = 'The room was closed.';
      if (pending.reject) {
        state.pendingAck = null;
        clearTimeout(pending.timeout);
        pending.reject(new Error(pending.error));
      }
    }
    if (state.activeOutgoingTransfer) state.activeOutgoingTransfer.abortReason = 'The room was closed.';
    if (state.incomingFile && state.incomingFile.writable) {
      state.incomingFile.writable.abort().catch((error) => {
        setConnectionStatus(`Could not cancel the incomplete file: ${error.message}`, true);
      });
    }
    if (state.peer) state.peer.close();
    if (state.channel && client) {
      client.removeChannel(state.channel).then((status) => {
        if (status !== 'ok') setConnectionStatus(`Room cleanup failed (${status}).`, true);
      }).catch((error) => {
        setConnectionStatus(`Room cleanup failed: ${error.message}`, true);
      });
    }
    if (state.pendingTransfer) {
      clearTimeout(state.pendingTransfer.timeout);
      state.pendingTransfer.resolve(false);
    }
    state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    state.objectUrls = [];
    cryptoKey = null;
    state.role = '';
    state.roomId = '';
    state.channel = null;
    state.peer = null;
    state.dataChannel = null;
    state.acceptedPeer = false;
    state.remoteDescriptionSet = false;
    state.pendingTransfer = null;
    state.pendingAck = null;
    state.activeOutgoingTransfer = null;
    state.incomingOffer = null;
    state.incomingFile = null;
    state.queuedCandidates = [];
    inviteBox.hidden = true;
    inviteCode.textContent = '';
    messageInput.disabled = true;
    fileInput.disabled = true;
    sendButton.disabled = true;
    messageInput.value = '';
    fileInput.value = '';
    chatLog.replaceChildren(chatEmpty);
    chatEmpty.hidden = false;
    createView.hidden = false;
    joinView.hidden = false;
    activeView.hidden = true;
    setStatus(createStatus, '');
    setStatus(joinStatus, '');
  }

  document.querySelector('#create-room').addEventListener('click', startHostRoom);
  document.querySelector('#join-form').addEventListener('submit', joinRoom);
  document.querySelector('#leave-room').addEventListener('click', stopRoom);
  if (typeof window.showDirectoryPicker === 'function') {
    setStatus(autoSaveStatus, 'Choose a folder to save incoming files directly to disk. Files under 25 MB can be received without a folder and downloaded from the chat.');
    autoSaveFolderButton.addEventListener('click', () => {
      chooseAutoSaveFolder().catch((error) => {
        setStatus(autoSaveStatus, `Could not enable auto-save: ${error.message}`, true);
      });
    });
  } else {
    autoSaveFolderButton.hidden = true;
    setStatus(
      autoSaveStatus,
      'This browser cannot save directly to a chosen folder. Files will be automatically accepted into memory, so very large transfers may fail if memory runs low.'
    );
  }
  document.querySelector('#chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text || text.length > 4000) return;
    try {
      sendData({ type: 'message', text }).then(() => {
        appendChatItem(text, true);
        messageInput.value = '';
      }).catch((error) => {
        setConnectionStatus(error.message, true);
      });
    } catch (error) {
      setConnectionStatus(error.message, true);
    }
  });
  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files;
    if (file) sendFile(file);
  });
  copyCodeButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteCode.textContent);
      copyCodeButton.textContent = 'Copied';
    } catch (error) {
      setConnectionStatus(`Could not copy the pairing code: ${error.message}`, true);
    }
  });

  if (!config.url || !config.anonKey) {
    const message = 'Room service is not configured. Check the Supabase configuration.';
    setStatus(createStatus, message, true);
    setStatus(joinStatus, message, true);
    document.querySelector('#create-room').disabled = true;
    document.querySelector('#join-room').disabled = true;
  }
  if (!navigator.clipboard) copyCodeButton.disabled = true;
})();
