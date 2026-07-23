function renderPost(p, currentUser) {
  const isMine = currentUser && currentUser.id === p.user_id;
  return `
  <div class="post" data-post-id="${p.id}">
    ${avatarHTML({ name: p.author_name, avatar_color: p.avatar_color })}
    <div class="post-body">
      <div class="post-header">
        <span class="name">${p.author_name}</span>
        <a class="username" href="/profile.html?username=${p.author_username}">@${p.author_username}</a>
        <span class="time">· ${timeAgo(p.created_at)}</span>
      </div>
      <div class="post-content">${escapeHtml(p.content)}</div>
      <div class="post-actions">
        <button class="like-btn ${p.likedByMe ? 'liked' : ''}">${p.likedByMe ? '❤️' : '🤍'} <span class="like-count">${p.likeCount}</span></button>
        <button class="comment-toggle-btn">💬 <span class="comment-count">${p.commentCount}</span></button>
        ${isMine ? `<button class="post-delete delete-btn">🗑 Delete</button>` : ''}
      </div>
      <div class="comments" style="display:none"></div>
    </div>
  </div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function attachPostHandlers(container, currentUser) {
  container.querySelectorAll('.post').forEach(postEl => {
    const postId = postEl.dataset.postId;

    const likeBtn = postEl.querySelector('.like-btn');
    likeBtn.addEventListener('click', async () => {
      if (!currentUser) { window.location.href = '/login.html'; return; }
      const result = await api(`/posts/${postId}/like`, { method: 'POST' });
      const countEl = likeBtn.querySelector('.like-count');
      let count = parseInt(countEl.textContent);
      count += result.liked ? 1 : -1;
      countEl.textContent = count;
      likeBtn.classList.toggle('liked', result.liked);
      likeBtn.innerHTML = `${result.liked ? '❤️' : '🤍'} <span class="like-count">${count}</span>`;
    });

    const commentToggle = postEl.querySelector('.comment-toggle-btn');
    const commentsDiv = postEl.querySelector('.comments');
    let loaded = false;
    commentToggle.addEventListener('click', async () => {
      const visible = commentsDiv.style.display !== 'none';
      if (visible) { commentsDiv.style.display = 'none'; return; }
      commentsDiv.style.display = 'block';
      if (!loaded) {
        await loadComments(postId, commentsDiv, currentUser);
        loaded = true;
      }
    });

    const deleteBtn = postEl.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this post?')) return;
        await api(`/posts/${postId}`, { method: 'DELETE' });
        postEl.remove();
      });
    }
  });
}

async function loadComments(postId, container, currentUser) {
  const comments = await api(`/posts/${postId}/comments`);
  container.innerHTML = `
    <div class="comment-list">
      ${comments.map(c => `
        <div class="comment">
          ${avatarHTML({ name: c.author_name, avatar_color: c.avatar_color }, 'sm')}
          <div class="comment-body">
            <div class="name">${c.author_name} <span style="color:#94a3b8;font-weight:400">@${c.author_username}</span></div>
            <div class="text">${escapeHtml(c.content)}</div>
          </div>
        </div>
      `).join('') || '<p style="color:#94a3b8;font-size:0.85rem">No comments yet.</p>'}
    </div>
    ${currentUser ? `
      <div class="comment-form">
        <input type="text" placeholder="Write a comment..." class="new-comment-input">
        <button class="btn btn-sm post-comment-btn">Post</button>
      </div>
    ` : ''}
  `;
  const input = container.querySelector('.new-comment-input');
  const btn = container.querySelector('.post-comment-btn');
  if (btn) {
    const submit = async () => {
      const text = input.value.trim();
      if (!text) return;
      await api(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content: text }) });
      input.value = '';
      await loadComments(postId, container, currentUser);
      const countEl = document.querySelector(`.post[data-post-id="${postId}"] .comment-count`);
      if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
    };
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }
}
