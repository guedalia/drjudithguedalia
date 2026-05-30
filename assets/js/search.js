
(function(){
  var indexUrl = '/search_index.json';
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var docs = null, idx = null, lookup = {};

  function init(){
    fetch(indexUrl).then(r => r.json()).then(data => {
      docs = data;
      data.forEach(d => lookup[d.id] = d);
      idx = lunr(function() {
        this.ref('id');
        this.field('title', { boost: 8 });
        this.field('tags', { boost: 4 });
        this.field('category', { boost: 2 });
        this.field('body');
        data.forEach(d => this.add(d));
      });
      var url = new URL(window.location.href);
      var q = url.searchParams.get('q');
      if (q) { input.value = q; search(q); }
    });
  }

  function escapeHtml(s){
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function highlight(snippet, query){
    var words = query.trim().split(/\s+/).filter(w => w.length > 2);
    var out = escapeHtml(snippet);
    words.forEach(w => {
      var rx = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
      out = out.replace(rx, '<mark>$1</mark>');
    });
    return out;
  }

  function search(query){
    if (!idx) { results.innerHTML = '<p class="meta">Loading index…</p>'; return; }
    query = query.trim();
    if (!query) { results.innerHTML = ''; return; }
    try {
      var hits = idx.search(query + '*');
      if (!hits.length) {
        // try less fuzzy
        hits = idx.search(query);
      }
      if (!hits.length) {
        results.innerHTML = '<p class="meta">No results for "' + escapeHtml(query) + '"</p>';
        return;
      }
      var html = '<p class="meta">' + hits.length + ' result' + (hits.length===1?'':'s') + '</p>';
      hits.slice(0, 60).forEach(h => {
        var d = lookup[h.ref];
        if (!d) return;
        // Find a snippet containing the query
        var body = d.body || '';
        var pos = body.toLowerCase().indexOf(query.toLowerCase().split(' ')[0]);
        var snippet = pos >= 0 ? body.substring(Math.max(0, pos-60), Math.min(body.length, pos+200)) : body.substring(0, 200);
        if (pos > 60) snippet = '… ' + snippet;
        if (snippet.length < body.length) snippet += '…';
        html += '<div class="search-result">' +
          '<a class="title" href="' + d.id + '">' + escapeHtml(d.title) + '</a>' +
          ' <span class="pill pill-' + (d.category||'').toLowerCase().replace(/[^a-z]/g,'-') + '">' + escapeHtml(d.category) + '</span>' +
          (d.date ? ' <span class="meta">' + d.date + '</span>' : '') +
          '<div class="snippet">' + highlight(snippet, query) + '</div>' +
          '</div>';
      });
      results.innerHTML = html;
    } catch(e){
      results.innerHTML = '<p class="meta">Search error: ' + e.message + '</p>';
    }
  }

  var debounce;
  input.addEventListener('input', function(){
    clearTimeout(debounce);
    debounce = setTimeout(() => search(input.value), 150);
  });
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); search(input.value); }
  });

  init();
})();
