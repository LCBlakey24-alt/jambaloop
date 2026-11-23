// Fetch room-scoped photos with the existing room credential. Only a local
// blob URL is assigned to an image, so credentials never enter URLs or markup.
export function bindRoomAvatars(root) {
  const selector = '[data-room-avatar]';
  const photos = new Map();
  let current;
  let controller;

  async function show(placeholder) {
    const path = placeholder.dataset.roomAvatar;
    const session = current;
    if (!session || !placeholder.isConnected ||
        !/^\/api\/rooms\/\d{6}\/avatar\/[a-f0-9]{36}$/.test(path) ||
        !path.startsWith('/api/rooms/' + session.code + '/avatar/')) return;

    if (!photos.has(path)) {
      const {signal} = controller;
      const request = fetch(path, {headers: {'x-game-key': session.key}, signal})
        .then(response => response.ok ? response.blob() : null)
        .then(photo => photo && !signal.aborted ? URL.createObjectURL(photo) : null)
        .catch(() => null);
      photos.set(path, request);
      request.then(url => { if (!url && photos.get(path) === request) photos.delete(path); });
    }
    const url = await photos.get(path);
    if (!url || session !== current || !placeholder.isConnected) return;
    const image = document.createElement('img');
    image.className = 'player-avatar';
    image.alt = '';
    image.decoding = 'async';
    image.src = url;
    image.addEventListener('load', () => {
      if (session === current && placeholder.isConnected) placeholder.replaceWith(image);
    }, {once: true});
  }

  const visibility = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      for (const {target, isIntersecting} of entries) {
        if (!isIntersecting) continue;
        visibility.unobserve(target);
        show(target);
      }
    }) : undefined;

  function watch(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const elements = node.matches(selector) ? [node] : node.querySelectorAll(selector);
    for (const item of elements) visibility ? visibility.observe(item) : show(item);
  }

  const roster = new MutationObserver(records => {
    for (const {addedNodes, removedNodes} of records) {
      for (const node of addedNodes) watch(node);
      if (!visibility) continue;
      for (const node of removedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE || node.isConnected) continue;
        if (node.matches(selector)) visibility.unobserve(node);
        else for (const item of node.querySelectorAll(selector)) visibility.unobserve(item);
      }
    }
  });
  window.addEventListener('online', () => { if (current) watch(root); });

  return session => {
    roster.disconnect();
    visibility?.disconnect();
    controller?.abort();
    for (const photo of photos.values()) photo.then(url => { if (url) URL.revokeObjectURL(url); });
    photos.clear();
    current = session;
    if (!session) return;
    controller = new AbortController();
    roster.observe(root, {childList: true, subtree: true});
  };
}
