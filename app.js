/* Daily Brief — vanilla JS dashboard. No libraries, no network deps. */
(function () {
  'use strict';

  var DATA_URL = './data/news.json';
  var REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  var TICK_INTERVAL_MS = 60 * 1000;         // 1 minute for relative times

  var CATEGORIES = ['top', 'tech', 'browns', 'buckeyes', 'f1', 'tarkov', 'local'];
  var CATEGORY_LABELS = {
    top: 'Top World',
    tech: 'Tech and AI',
    browns: 'Cleveland Browns',
    buckeyes: 'Ohio State Buckeyes',
    f1: 'Formula 1',
    tarkov: 'Escape from Tarkov',
    local: 'Columbus and Gahanna'
  };

  var errorBanner = document.getElementById('error-banner');
  var lastUpdatedEl = document.getElementById('last-updated');
  var refreshBtn = document.getElementById('refresh-btn');
  var filterBarEl = document.getElementById('filter-bar');
  var storiesContainer = document.getElementById('stories');

  var state = {
    filter: 'all',
    stories: null,
    meta: null
  };

  function showError(message) {
    errorBanner.textContent = message;
    errorBanner.hidden = false;
  }

  function clearError() {
    errorBanner.textContent = '';
    errorBanner.hidden = true;
  }

  function timeAgo(isoString) {
    var then = new Date(isoString).getTime();
    if (isNaN(then)) return '';
    var seconds = Math.floor((Date.now() - then) / 1000);
    if (seconds < 0) seconds = 0;

    var minutes = Math.floor(seconds / 60);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + 'm ago';

    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';

    var days = Math.floor(hours / 24);
    return days + 'd ago';
  }

  function formatUpdatedAt(isoString) {
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString();
  }

  function updateLastUpdated() {
    if (state.meta && state.meta.updatedAt) {
      lastUpdatedEl.textContent = 'Last updated: ' + formatUpdatedAt(state.meta.updatedAt) +
        ' (' + timeAgo(state.meta.updatedAt) + ')';
    } else {
      lastUpdatedEl.innerHTML = 'Last updated: &mdash;';
    }
  }

  function buildCard(story) {
    var badgeLabel = CATEGORY_LABELS[story.category] || story.category;
    var link = document.createElement('a');
    link.className = 'story-card';
    link.href = story.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('role', 'link');

    var top = document.createElement('div');
    top.className = 'story-card-top';

    var badge = document.createElement('span');
    badge.className = 'badge badge-' + story.category;
    badge.textContent = badgeLabel;

    var time = document.createElement('span');
    time.className = 'story-time';
    time.setAttribute('data-time', story.publishedAt);
    time.textContent = timeAgo(story.publishedAt);

    top.appendChild(badge);
    top.appendChild(time);

    var title = document.createElement('h3');
    title.className = 'story-title';
    title.textContent = story.title;

    var summary = document.createElement('p');
    summary.className = 'story-summary';
    summary.textContent = story.summary;

    var source = document.createElement('div');
    source.className = 'story-source';
    source.textContent = story.source;

    link.appendChild(top);
    link.appendChild(title);
    link.appendChild(summary);
    link.appendChild(source);

    return link;
  }

  function validateStory(story, index) {
    if (!story || typeof story !== 'object' || Array.isArray(story)) {
      throw new Error('Story at index ' + index + ' is not an object.');
    }
    ['category', 'title', 'summary', 'source', 'url', 'publishedAt'].forEach(function (field) {
      if (!story[field] || typeof story[field] !== 'string') {
        throw new Error('Story at index ' + index + ' is missing field "' + field + '".');
      }
    });
    if (!Array.isArray(story.tags)) {
      throw new Error('Story at index ' + index + ' is missing a tags array.');
    }
    if (CATEGORIES.indexOf(story.category) === -1) {
      throw new Error('Story at index ' + index + ' has unknown category "' + story.category + '".');
    }
  }

  function buildFilterBar() {
    var chips = ['all'].concat(CATEGORIES);
    var frag = document.createDocumentFragment();

    chips.forEach(function (key) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.setAttribute('data-filter', key);
      chip.textContent = key === 'all' ? 'All' : CATEGORY_LABELS[key];
      if (key === state.filter) chip.classList.add('active');
      chip.addEventListener('click', function () {
        setFilter(key);
      });
      frag.appendChild(chip);
    });

    filterBarEl.textContent = '';
    filterBarEl.appendChild(frag);
  }

  function setFilter(key) {
    if (state.filter === key) return;
    state.filter = key;

    var chips = filterBarEl.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].getAttribute('data-filter') === key) {
        chips[i].classList.add('active');
      } else {
        chips[i].classList.remove('active');
      }
    }

    render();
    window.scrollTo(0, 0);
  }

  function renderCategorySection(cat, stories) {
    var section = document.createElement('section');
    section.className = 'category-section';
    section.setAttribute('data-category', cat);

    var heading = document.createElement('h2');
    heading.className = 'category-heading';
    heading.textContent = CATEGORY_LABELS[cat];
    section.appendChild(heading);

    var grid = document.createElement('div');
    grid.className = 'story-grid';

    if (stories.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'story-summary';
      empty.textContent = 'No stories in this category right now.';
      grid.appendChild(empty);
    } else {
      var frag = document.createDocumentFragment();
      stories.forEach(function (story) {
        frag.appendChild(buildCard(story));
      });
      grid.appendChild(frag);
    }

    section.appendChild(grid);
    return section;
  }

  function byNewestFirst(a, b) {
    var t = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return isNaN(t) ? 0 : t;
  }

  function render() {
    if (!state.stories) return;
    storiesContainer.textContent = '';

    if (state.filter === 'all') {
      var frag = document.createDocumentFragment();
      CATEGORIES.forEach(function (cat) {
        var group = state.stories.filter(function (s) { return s.category === cat; });
        group.sort(byNewestFirst);
        frag.appendChild(renderCategorySection(cat, group));
      });
      storiesContainer.appendChild(frag);
    } else {
      var group = state.stories.filter(function (s) { return s.category === state.filter; });
      group.sort(byNewestFirst);
      storiesContainer.appendChild(renderCategorySection(state.filter, group));
    }
  }

  function renderData(data) {
    var stories = data.stories;
    if (!Array.isArray(stories)) {
      throw new Error('Data is missing a stories array.');
    }

    // Validate every story before touching the DOM.
    stories.forEach(validateStory);

    state.stories = stories;
    state.meta = (data.meta && typeof data.meta === 'object') ? data.meta : null;

    render();
    updateLastUpdated();
  }

  function load() {
    refreshBtn.disabled = true;
    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to fetch news data (HTTP ' + response.status + ').');
        }
        return response.json();
      })
      .then(function (data) {
        renderData(data);
        clearError();
      })
      .catch(function (err) {
        showError('Could not load news: ' + err.message + ' Tap Refresh to try again.');
      })
      .finally(function () {
        refreshBtn.disabled = false;
      });
  }

  function tick() {
    // Refresh relative "time ago" values across the page.
    var times = document.querySelectorAll('.story-time[data-time]');
    for (var i = 0; i < times.length; i++) {
      times[i].textContent = timeAgo(times[i].getAttribute('data-time'));
    }
    updateLastUpdated();
  }

  // Wire up refresh.
  refreshBtn.addEventListener('click', load);

  // Initial load on DOMContentLoaded (script is at end of body, but be safe).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildFilterBar();
      load();
    });
  } else {
    buildFilterBar();
    load();
  }

  // Auto-refresh every 15 minutes, and tick relative times every minute.
  setInterval(load, REFRESH_INTERVAL_MS);
  setInterval(tick, TICK_INTERVAL_MS);
})();
