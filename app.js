"use strict";
(async () => {
  const $ = id => document.getElementById(id);
  try {
    const response = await fetch('library.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('The song catalog could not be loaded. Please refresh.');
    const data = await response.json();
    const songs = data.songs;
    const artistCounts = new Map(), albumCounts = new Map();
    const albumKey = s => JSON.stringify([s.artist, s.album]);
    for (const s of songs) {
      artistCounts.set(s.artist, (artistCounts.get(s.artist) || 0) + 1);
      if (s.album) albumCounts.set(albumKey(s), (albumCounts.get(albumKey(s)) || 0) + 1);
    }
    for (const s of songs) {
      s.artistCount = artistCounts.get(s.artist);
      s.albumCount = s.album ? albumCounts.get(albumKey(s)) : 0;
      s.searchText = [s.song, s.artist, s.album].join(' ').normalize('NFKC').toLocaleLowerCase();
    }
    function options(id, values, label) {
      const select = $(id);
      select.replaceChildren(new Option(label, ''));
      [...new Set(values)].filter(Boolean).sort((a,b) => a.localeCompare(b)).forEach(v => select.add(new Option(v, v)));
    }
    options('artist', songs.map(s => s.artist), 'All artists');
    options('album', songs.map(s => s.album), 'All albums');
    $('total').textContent = songs.length.toLocaleString();
    $('updated').textContent = 'Updated ' + new Date(data.updated).toLocaleString();
    let sortKey = 'song', direction = 1;
    function render() {
      const terms = $('search').value.normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const matches = songs.filter(s => terms.every(t => s.searchText.includes(t)) && (!$('artist').value || s.artist === $('artist').value) && (!$('album').value || s.album === $('album').value));
      matches.sort((a,b) => {
        const av = a[sortKey], bv = b[sortKey];
        return direction * (typeof av === 'number' ? av - bv : av.localeCompare(bv)) || a.song.localeCompare(b.song) || a.artist.localeCompare(b.artist);
      });
      const fragment = document.createDocumentFragment();
      for (const song of matches) {
        const tr = document.createElement('tr');
        for (const key of ['song','artist','artistCount','album','albumCount']) {
          const td = document.createElement('td');
          td.textContent = key === 'albumCount' && !song.album ? '—' : song[key] || '—';
          if (key === 'album') td.className = 'muted';
          tr.append(td);
        }
        fragment.append(tr);
      }
      if (!matches.length) {
        const tr = document.createElement('tr'), td = document.createElement('td');
        td.colSpan = 5; td.className = 'empty'; td.textContent = 'No songs match your search.'; tr.append(td); fragment.append(tr);
      }
      $('rows').replaceChildren(fragment);
      $('shown').textContent = `Showing ${matches.length.toLocaleString()} of ${songs.length.toLocaleString()} songs`;
      document.querySelectorAll('[data-sort]').forEach(button => {
        const active = button.dataset.sort === sortKey;
        button.className = active ? (direction === 1 ? 'asc' : 'desc') : '';
        button.closest('th').setAttribute('aria-sort', active ? (direction === 1 ? 'ascending' : 'descending') : 'none');
      });
    }
    $('search').addEventListener('input', render);
    $('artist').addEventListener('change', render);
    $('album').addEventListener('change', render);
    document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => {
      direction = sortKey === button.dataset.sort ? -direction : 1;
      sortKey = button.dataset.sort; render();
    }));
    render();
  } catch (error) {
    $('error').hidden = false;
    $('error').textContent = error.message;
    $('shown').textContent = 'Catalog unavailable';
  }
})();
