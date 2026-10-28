(() => {
  const accountBar = document.querySelector('#customer-account-bar');
  if (!accountBar) return;

  const socialSection = document.querySelector('#contact-social');
  const socialLinks = document.querySelector('#contact-social-links');
  const myServices = document.querySelector('#my-service-requests');
  let ownerPreview = false;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  async function loadCustomerAccount() {
    try {
      const response = await fetch('/api/me', { cache: 'no-store' });
      if (!response.ok) return;
      const { user } = await response.json();
      ownerPreview = user?.role === 'owner' && new URLSearchParams(location.search).get('visao') === 'cliente';
      if (!user || (user.role !== 'customer' && !ownerPreview)) return;
      accountBar.hidden = false;
      if (ownerPreview) { if (myServices) myServices.closest('section')?.setAttribute('hidden', ''); } else { loadMyServices(); }
      document.querySelector('#customer-account-label').textContent = ownerPreview
        ? 'Prévia do site para clientes'
        : user.name ? `Olá, ${user.name}` : 'Conta de cliente';
      const button = document.querySelector('#customer-logout-main');
      if (ownerPreview && button) {
        button.textContent = 'Voltar ao painel';
        button.classList.add('owner-preview-return');
      }
    } catch {
      // A apresentação pública do site continua acessível sem sessão.
    }
  }


  function renderMyServices(items) {
    if (!myServices) return;
    myServices.innerHTML = items.length ? items.map(item => {
      const done = item.status === 'Concluída';
      const updates = item.progressUpdates || [];
      return `<article class="my-service-card"><div class="my-service-heading"><div><span class="detail-label">${done ? 'SERVIÇO CONCLUÍDO' : 'ANDAMENTO DO SERVIÇO'}</span><h3>${escapeHtml(item.device)}</h3></div><span class="service-status-badge ${done ? 'complete' : ''}">${done ? 'Serviço concluído' : escapeHtml(item.status)}</span></div><p class="my-service-problem">${escapeHtml(item.problem)}</p><div class="service-timeline">${updates.length ? updates.map(update => `<article class="customer-service-update">${update.imageUrl ? `<img src="${escapeHtml(update.imageUrl)}" alt="${escapeHtml(update.caption || 'Foto do andamento do reparo')}">` : ''}<div><small>${escapeHtml(new Date(update.createdAt).toLocaleString('pt-BR'))}</small><p>${escapeHtml(update.caption || 'Atualização do serviço')}</p>${update.videoUrl ? `<a href="${escapeHtml(update.videoUrl)}" target="_blank" rel="noopener noreferrer">Assistir vídeo relacionado ↗</a>` : ''}</div><div class="service-comments"><h4>Comentários</h4>${(update.comments || []).map(comment => `<p><b>${escapeHtml(comment.name)}:</b> ${escapeHtml(comment.text)} <small>${escapeHtml(new Date(comment.createdAt).toLocaleString('pt-BR'))}</small></p>`).join('') || '<p class="no-service-comments">Se tiver alguma dúvida, deixe um comentário.</p>'}<form class="service-comment-form" data-request="${escapeHtml(item.id)}" data-update="${escapeHtml(update.id)}"><label>Seu comentário<textarea name="text" maxlength="1000" required placeholder="Escreva uma mensagem para a equipe"></textarea></label><button class="small-button" type="submit">Enviar comentário</button><span role="status"></span></form></div></article>`).join('') : '<p class="empty-note">A equipe ainda não publicou uma atualização. O status atual é exibido acima.</p>'}</div><div class="my-service-footer"><small class="my-service-created">Pedido enviado em ${escapeHtml(new Date(item.createdAt).toLocaleString('pt-BR'))}</small><button class="small-button delete-my-service" type="button" data-request="${escapeHtml(item.id)}">Apagar solicitação</button></div></article>`;
    }).join('') : '<div class="empty-note">Você ainda não tem pedidos de serviço.</div>';
  }

  async function loadMyServices() {
    if (!myServices || ownerPreview) return;
    try {
      const response = await fetch('/api/my/requests', { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar seus serviços.');
      const { requests } = await response.json();
      renderMyServices(requests || []);
    } catch {
      myServices.innerHTML = '<div class="empty-note">Não foi possível carregar seus serviços. Atualize a página para tentar novamente.</div>';
    }
  }

  document.querySelector('#refresh-my-services')?.addEventListener('click', loadMyServices);
  window.addEventListener('rs-tech-request-submitted', async () => { await loadMyServices(); document.querySelector('#meus-servicos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  myServices?.addEventListener('click', async event => {
    const button = event.target.closest('.delete-my-service');
    if (!button) return;
    if (!confirm('Apagar esta solicitação de serviço? Esta ação não pode ser desfeita.')) return;
    button.disabled = true;
    try {
      const response = await fetch(`/api/my/requests/${encodeURIComponent(button.dataset.request)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível apagar a solicitação.');
      await loadMyServices();
    } catch (error) {
      button.disabled = false;
      button.textContent = error.message;
    }
  });

  myServices?.addEventListener('submit', async event => {
    const form = event.target.closest('.service-comment-form');
    if (!form) return;
    event.preventDefault();
    const message = form.querySelector('[role=status]');
    const button = form.querySelector('button');
    button.disabled = true;
    message.textContent = 'Enviando…';
    try {
      const response = await fetch(`/api/my/requests/${encodeURIComponent(form.dataset.request)}/updates/${encodeURIComponent(form.dataset.update)}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: form.elements.text.value.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o comentário.');
      await loadMyServices();
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
    }
  });

  async function loadSavedSocialLinks() {
    if (!socialSection || !socialLinks) return;
    try {
      const response = await fetch('/api/settings', { cache: 'no-store' });
      if (!response.ok) return;
      const { settings } = await response.json();
      const contact = settings?.contact || {};
      const phone = document.querySelector('#contact-phone');
      const address = document.querySelector('#contact-address');
      const hours = document.querySelector('#contact-hours');
      if (phone && contact.phoneDisplay) {
        phone.textContent = contact.phoneDisplay;
        const digits = String(contact.phoneDigits || '').replace(/\D/g, '');
        phone.href = digits.length >= 12 ? `https://wa.me/${digits}` : '#contato';
      }
      if (address && contact.address) address.textContent = contact.address;
      if (hours && contact.hours) hours.textContent = contact.hours;
      const entries = (settings?.socialLinks || []).flatMap(item => {
        try {
          const url = new URL(item.url);
          if (url.protocol !== 'https:' && url.protocol !== 'http:') return [];
          return [{ name: String(item.name || 'Rede social'), href: url.href }];
        } catch {
          return [];
        }
      });
      socialLinks.innerHTML = entries.map(item =>
        `<a class="social-link" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)} ↗</a>`
      ).join('');
      socialSection.hidden = entries.length === 0;
    } catch {
      socialSection.hidden = true;
    }
  }

  document.querySelector('#customer-logout-main')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    if (ownerPreview) {
      location.href = '/dashboard.html';
      return;
    }
    button.disabled = true;
    button.textContent = 'Saindo…';
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      location.replace('/');
    }
  });

  loadCustomerAccount();
  loadSavedSocialLinks();
})();
