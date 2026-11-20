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
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const MAX_BUFFERED_AMOUNT = 1024 * 1024;
  const CHUNK_SIZE = 16 * 1024;
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
    incomingOffer: null,
    incomingFile: null,
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

  async function encryptEnvelope(bytes, kind) {
    if (!cryptoKey) throw new Error('This room is missing its encryption key.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const additionalData = new TextEncoder().encode(`chat-share:v1:${kind}`);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, cryptoKey, bytes);
    return JSON.stringify({
      type: 'encrypted',
      kind,
      iv: encodeBase64Url(iv),
      data: encodeBase64Url(new Uint8Array(ciphertext))
    });
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
    const plaintext = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: decodeBase64Url(envelope.iv),
      additionalData: new TextEncoder().encode(`chat-share:v1:${envelope.kind}`)
    }, cryptoKey, decodeBase64Url(envelope.data));
    return { kind: envelope.kind, plaintext };
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
      handleDataMessage(event).catch((error) => {
        setConnectionStatus(`Could not decrypt received data: ${error.message}`, true);
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

  async function sendBinaryData(data) {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
      throw new Error('The peer is not connected.');
    }
    state.dataChannel.send(await encryptEnvelope(new Uint8Array(data), 'binary'));
  }

  async function handleDataMessage(event) {
    if (typeof event.data !== 'string') {
      setConnectionStatus('Received an invalid encrypted packet.', true);
      return;
    }
    const decrypted = await decryptEnvelope(event.data);
    if (decrypted.kind === 'binary') {
      receiveFileChunk(decrypted.plaintext);
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
      receiveFileOffer(payload);
    } else if (payload.type === 'file-response') {
      resolveFileOffer(payload);
    } else if (payload.type === 'file-start') {
      startReceivingFile(payload);
    } else if (payload.type === 'file-end') {
      finishReceivingFile(payload);
    }
  }

  function receiveFileOffer(payload) {
    if (state.incomingOffer || !/^[a-f0-9-]{20,60}$/.test(payload.id || '') ||
        typeof payload.name !== 'string' || payload.name.length > 255 ||
        !Number.isInteger(payload.size) || payload.size < 0 || payload.size > MAX_FILE_SIZE) {
      return;
    }
    state.incomingOffer = payload.id;
    const accept = document.createElement('button');
    accept.className = 'secondary-button';
    accept.type = 'button';
    accept.textContent = 'Accept';
    const reject = document.createElement('button');
    reject.className = 'secondary-button';
    reject.type = 'button';
    reject.textContent = 'Decline';
    const actions = document.createElement('span');
    actions.className = 'invite-actions';
    actions.append(accept, reject);
    appendChatItem(`Peer wants to send "${payload.name}" (${formatSize(payload.size)}).`, false, { actions: [actions] });
    const respond = async (accepted) => {
      if (state.incomingOffer !== payload.id) return;
      state.incomingOffer = null;
      accept.disabled = true;
      reject.disabled = true;
      try {
        await sendData({ type: 'file-response', id: payload.id, accepted });
        if (accepted) {
          state.incomingFile = {
            id: payload.id,
            name: payload.name,
            size: payload.size,
            type: typeof payload.mime === 'string' ? payload.mime.slice(0, 120) : '',
            chunks: [],
            received: 0
          };
          appendChatItem(`Receiving "${payload.name}"…`, false, { status: 'Waiting for file data.' });
        }
      } catch (error) {
        setConnectionStatus(error.message, true);
      }
    };
    accept.addEventListener('click', () => {
      respond(true).catch((error) => setConnectionStatus(error.message, true));
    }, { once: true });
    reject.addEventListener('click', () => {
      respond(false).catch((error) => setConnectionStatus(error.message, true));
    }, { once: true });
  }

  function resolveFileOffer(payload) {
    if (!state.pendingTransfer || state.pendingTransfer.id !== payload.id) return;
    const pending = state.pendingTransfer;
    state.pendingTransfer = null;
    clearTimeout(pending.timeout);
    pending.resolve(Boolean(payload.accepted));
  }

  function startReceivingFile(payload) {
    if (!state.incomingFile || payload.id !== state.incomingFile.id ||
        payload.size !== state.incomingFile.size) {
      state.incomingFile = null;
      setConnectionStatus('The incoming file did not match its offer.', true);
    }
  }

  function receiveFileChunk(data) {
    if (!state.incomingFile || !(data instanceof ArrayBuffer)) return;
    const file = state.incomingFile;
    if (file.received + data.byteLength > file.size) {
      state.incomingFile = null;
      setConnectionStatus('The received file exceeded its declared size.', true);
      return;
    }
    file.chunks.push(data);
    file.received += data.byteLength;
  }

  function finishReceivingFile(payload) {
    const file = state.incomingFile;
    if (!file || payload.id !== file.id) return;
    state.incomingFile = null;
    if (file.received !== file.size) {
      setConnectionStatus('The file transfer was incomplete.', true);
      return;
    }
    const blob = new Blob(file.chunks, { type: file.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    state.objectUrls.push(url);
    appendChatItem(`Received "${file.name}" (${formatSize(file.size)}).`, false, {
      download: { url, name: file.name }
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    if (file.size > MAX_FILE_SIZE) {
      setConnectionStatus('Files must be 25 MB or smaller.', true);
      fileInput.value = '';
      return;
    }
    if (state.pendingTransfer) {
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
      }, 60000);
    });
    state.pendingTransfer = transfer;
    const progressInfo = { progress: { max: file.size || 1, value: 0 }, status: 'Waiting for acceptance.' };
    appendChatItem(`Offering "${file.name}" (${formatSize(file.size)}).`, true, progressInfo);
    try {
      await sendData({
        type: 'file-offer',
        id,
        name: file.name.slice(0, 255),
        size: file.size,
        mime: file.type.slice(0, 120)
      });
      const accepted = await response;
      if (!accepted) {
        progressInfo.setStatus('The peer declined this file.');
        return;
      }
      progressInfo.setStatus('Sending…');
      await sendData({ type: 'file-start', id, size: file.size });
      for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
        await waitForBuffer(state.dataChannel);
        if (state.dataChannel.readyState !== 'open') throw new Error('The peer connection closed during transfer.');
        const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        await sendBinaryData(chunk);
        progressInfo.setProgress(Math.min(offset + chunk.byteLength, file.size));
      }
      await sendData({ type: 'file-end', id });
      progressInfo.setStatus('File sent.');
    } catch (error) {
      progressInfo.setStatus(error.message);
      setConnectionStatus(error.message, true);
    } finally {
      if (state.pendingTransfer === transfer) state.pendingTransfer = null;
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
