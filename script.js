const revealTargets = document.querySelectorAll('.reveal');

const platformHint = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
if (/win/i.test(platformHint)) {
  document.body.classList.add('platform-windows');
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
      }
    });
  },
  { threshold: 0.16 },
);

revealTargets.forEach((el) => revealObserver.observe(el));

const projectFilterButtons = document.querySelectorAll('#work .filter[data-filter]');
const careerFilterButtons = document.querySelectorAll('#career-tech .filter[data-career-year]');
const projectCards = document.querySelectorAll('.project-card[data-project-id]');
const heroMiniCards = document.querySelectorAll('.hero-mini-card[data-project-id]');
const careerCards = document.querySelectorAll('.career-tech-card[data-career-id]');
const carouselTracks = document.querySelectorAll('.carousel-track');
const skillCards = document.querySelectorAll('.skill-card');
const skillsGrid = document.getElementById('skillsGrid');
const skillPreview = document.getElementById('skillPreview');
const skillPreviewTitle = document.getElementById('skillPreviewTitle');
const skillPreviewList = document.getElementById('skillPreviewList');
const pageBackTop = document.getElementById('pageBackTop');
let skillShowTimer = null;
let skillHideTimer = null;
const dragScrollInitialized = new WeakSet();

function enableDragScroll(track) {
  if (!track || dragScrollInitialized.has(track)) return;
  dragScrollInitialized.add(track);
  track.classList.add('is-draggable-scroll');

  let activePointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  let pointerDown = false;
  let dragged = false;
  let pendingDeltaX = 0;
  let clickBlockUntil = 0;
  let dragFrame = 0;
  const dragThreshold = 7;

  const applyDragFrame = () => {
    track.scrollLeft = startScrollLeft - pendingDeltaX;
    dragFrame = 0;
  };

  const endDrag = (event, force = false) => {
    if (!pointerDown) return;
    if (!force && event && activePointerId !== null && event.pointerId !== activePointerId) return;

    if (dragged) {
      clickBlockUntil = performance.now() + 180;
    }

    pointerDown = false;
    dragged = false;
    activePointerId = null;
    pendingDeltaX = 0;
    if (dragFrame) {
      window.cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    }
    track.classList.remove('is-dragging-scroll');
  };

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (track.scrollWidth <= track.clientWidth + 2) return;

    pointerDown = true;
    dragged = false;
    startX = event.clientX;
    startScrollLeft = track.scrollLeft;
    activePointerId = event.pointerId;
    pendingDeltaX = 0;
  });

  track.addEventListener('pointermove', (event) => {
    if (!pointerDown || event.pointerId !== activePointerId) return;

    const deltaX = event.clientX - startX;
    if (!dragged && Math.abs(deltaX) >= dragThreshold) {
      dragged = true;
      track.classList.add('is-dragging-scroll');
    }

    if (!dragged) return;
    pendingDeltaX = deltaX;
    if (!dragFrame) {
      dragFrame = window.requestAnimationFrame(applyDragFrame);
    }
    event.preventDefault();
  });

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', (event) => endDrag(event, true));
  track.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && pointerDown) {
      endDrag(event, true);
    }
  });

  track.addEventListener('dragstart', (event) => {
    event.preventDefault();
  });

  track.addEventListener('click', (event) => {
    if (performance.now() >= clickBlockUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

function clearSkillTimers() {
  if (skillShowTimer) {
    clearTimeout(skillShowTimer);
    skillShowTimer = null;
  }
  if (skillHideTimer) {
    clearTimeout(skillHideTimer);
    skillHideTimer = null;
  }
}

function scheduleActiveSkill(card, delay = 110) {
  const previewAlreadyVisible = Boolean(skillPreview?.classList.contains('is-visible'));
  const effectiveDelay = previewAlreadyVisible ? 0 : delay;

  clearSkillTimers();
  if (effectiveDelay <= 0) {
    setActiveSkill(card);
    return;
  }

  skillShowTimer = setTimeout(() => {
    setActiveSkill(card);
    skillShowTimer = null;
  }, effectiveDelay);
}

function scheduleClearActiveSkill(delay = 160) {
  if (skillShowTimer) {
    clearTimeout(skillShowTimer);
    skillShowTimer = null;
  }
  if (skillHideTimer) {
    clearTimeout(skillHideTimer);
  }
  skillHideTimer = setTimeout(() => {
    clearActiveSkill();
    skillHideTimer = null;
  }, delay);
}

function positionSkillPreview(card) {
  if (!card || !skillsGrid || !skillPreview) return;

  const container = skillPreview.parentElement || skillsGrid;
  const containerRect = container.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const previewWidth = skillPreview.offsetWidth;

  if (!previewWidth || containerRect.width <= 0) return;

  // Keep the same alignment model as the first icon: preview left follows hovered icon left.
  let left = cardRect.left - containerRect.left;
  const viewportMaxLeft = Math.max(0, window.innerWidth - containerRect.left - previewWidth - 16);
  left = Math.max(0, Math.min(viewportMaxLeft, left));

  skillPreview.style.setProperty('--skill-preview-shift', `${Math.round(left)}px`);
}

function primeSkillPreviewPosition(card) {
  if (!card || !skillPreview) return;

  const isVisible = skillPreview.classList.contains('is-visible');
  if (!isVisible) {
    skillPreview.classList.add('is-measuring');
  }

  positionSkillPreview(card);

  if (!isVisible) {
    skillPreview.classList.remove('is-measuring');
  }
}

function setActiveSkill(card) {
  if (!card || !skillPreview || !skillPreviewTitle || !skillPreviewList) return;

  const title = card.querySelector('.skill-detail h3')?.textContent?.trim() || '';
  const detailItems = Array.from(card.querySelectorAll('.skill-detail li'))
    .map((item) => item.textContent?.trim())
    .filter(Boolean);

  if (!title || detailItems.length === 0) return;

  skillCards.forEach((node) => node.classList.remove('is-active'));
  card.classList.add('is-active');

  skillPreviewTitle.textContent = title;
  skillPreviewList.innerHTML = '';

  detailItems.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    skillPreviewList.appendChild(li);
  });

  primeSkillPreviewPosition(card);
  skillPreview.classList.add('is-visible');
}

function clearActiveSkill() {
  if (!skillPreview) return;
  skillCards.forEach((node) => node.classList.remove('is-active'));
  skillPreview.classList.remove('is-visible');
  skillPreview.classList.remove('is-measuring');
}

if (skillCards.length > 0) {
  skillCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => scheduleActiveSkill(card, 90));
    card.addEventListener('focus', () => {
      clearSkillTimers();
      setActiveSkill(card);
    });
    card.addEventListener('click', () => {
      clearSkillTimers();
      setActiveSkill(card);
    });
    card.addEventListener('mouseleave', () => scheduleClearActiveSkill(130));
    card.addEventListener('blur', () => {
      requestAnimationFrame(() => {
        if (!document.activeElement?.classList?.contains('skill-card')) {
          scheduleClearActiveSkill(120);
        }
      });
    });
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const nextIndex = event.key === 'ArrowRight'
        ? (index + 1) % skillCards.length
        : (index - 1 + skillCards.length) % skillCards.length;
      const nextCard = skillCards[nextIndex];
      nextCard.focus();
      clearSkillTimers();
      setActiveSkill(nextCard);
    });
  });

  skillsGrid?.addEventListener('mouseleave', () => scheduleClearActiveSkill(150));
  skillPreview?.addEventListener('mouseenter', () => {
    if (skillHideTimer) {
      clearTimeout(skillHideTimer);
      skillHideTimer = null;
    }
  });
  skillPreview?.addEventListener('mouseleave', () => scheduleClearActiveSkill(150));
  skillsGrid?.addEventListener('scroll', () => {
    const activeCard = document.querySelector('.skill-card.is-active');
    if (activeCard) {
      positionSkillPreview(activeCard);
    }
  }, { passive: true });
}

window.addEventListener('resize', () => {
  const activeCard = document.querySelector('.skill-card.is-active');
  if (activeCard) {
    requestAnimationFrame(() => positionSkillPreview(activeCard));
  }
});

function findCarouselControls(trackId) {
  return {
    prev: document.querySelector(`[data-carousel-prev="${trackId}"]`),
    next: document.querySelector(`[data-carousel-next="${trackId}"]`),
  };
}

function measureCarouselStep(track) {
  const visibleCards = Array.from(track.children).filter((card) => card.offsetParent !== null);
  const first = visibleCards[0];
  const second = visibleCards[1];

  if (!first) {
    return Math.max(320, Math.round(track.clientWidth * 0.88));
  }

  const firstRect = first.getBoundingClientRect();
  let gap = 0;
  if (second) {
    const secondRect = second.getBoundingClientRect();
    gap = Math.max(0, secondRect.left - firstRect.right);
  }

  return Math.max(260, Math.round(firstRect.width + gap));
}

function refreshCarouselButtons(track) {
  if (!track || !track.id) return;
  const { prev, next } = findCarouselControls(track.id);
  if (!prev || !next) return;

  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
  if (track.scrollLeft > maxScroll) {
    track.scrollLeft = maxScroll;
  }
  prev.disabled = track.scrollLeft <= 2;
  next.disabled = track.scrollLeft >= maxScroll;
}

function refreshCarouselById(trackId) {
  const track = document.getElementById(trackId);
  if (!track) return;
  requestAnimationFrame(() => refreshCarouselButtons(track));
}

if (carouselTracks.length > 0) {
  carouselTracks.forEach((track) => {
    enableDragScroll(track);
    if (!track.id) return;

    const { prev, next } = findCarouselControls(track.id);
    if (!prev || !next) return;

    const scrollByStep = (direction) => {
      const step = measureCarouselStep(track) * direction;
      track.scrollBy({ left: step, behavior: 'smooth' });
    };

    prev.addEventListener('click', () => scrollByStep(-1));
    next.addEventListener('click', () => scrollByStep(1));

    track.addEventListener('scroll', () => refreshCarouselButtons(track), { passive: true });
    refreshCarouselButtons(track);
  });

  window.addEventListener('resize', () => {
    carouselTracks.forEach((track) => refreshCarouselButtons(track));
  });
}

enableDragScroll(skillsGrid);

projectFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextFilter = button.dataset.filter;

    projectFilterButtons.forEach((btn) => btn.classList.remove('is-active'));
    button.classList.add('is-active');

    projectCards.forEach((card) => {
      const current = card.dataset.category;
      const show = nextFilter === 'all' || nextFilter === current;
      card.style.display = show ? '' : 'none';
    });

    refreshCarouselById('projectsCarousel');
  });
});

careerFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextYear = button.dataset.careerYear;

    careerFilterButtons.forEach((btn) => btn.classList.remove('is-active'));
    button.classList.add('is-active');

    careerCards.forEach((card) => {
      const currentYear = card.dataset.careerYear;
      const show = nextYear === 'all' || nextYear === currentYear;
      card.style.display = show ? '' : 'none';
    });

    refreshCarouselById('careerCarousel');
  });
});

const QUIET_LAB_RICH = {
  leadTitle: 'QUIET LAB',
  leadSubtitle: 'Objects that Detox your Senses.',
  blocks: [
    {
      title: 'Brand One-Liner',
      paragraphs: ['AI·SNS 알고리즘 시대, 감각 과부하 상태에 놓인 현대인을 위해 자극을 줄이는 오브젝트를 설계하는 브랜드'],
    },
    {
      title: 'Core Concept',
      paragraphs: [
        'Restraint is the New Luxury',
        'Less Desire, More Clarity',
        '미니멀을 스타일이 아닌 시대 문제에 대한 해결 방식으로 재정의',
      ],
    },
    {
      title: 'Problem Definition',
      paragraphs: ['이 문제를 취향이나 라이프스타일의 문제가 아닌 감각 구조의 붕괴 상태로 정의'],
      table: {
        headers: ['시대적 문제', '관점'],
        rows: [
          ['정보 과잉', '선택과 판단 피로 누적'],
          ['비교·과시 문화', '정서적 소음 증가'],
          ['과도한 자극 환경', '집중력·안정감 붕괴'],
        ],
      },
    },
    {
      title: 'Brand Purpose',
      paragraphs: [
        'WHY: 감각은 쉬지 못하고 계속 소비되고 있으며 그 결과 집중력 저하·번아웃·정서 피로가 일상화됨',
        'WHAT: 기능을 추가하는 제품이 아니라 감각을 낮추는 오브젝트를 통해 공간과 사용자의 상태를 정돈',
        'HOW: 형태(기하학적 단순성) · 색감(중성 톤) · 조명(확산광) · 구조(큰 여백, 느린 리듬)',
      ],
    },
    {
      title: 'Target Definition',
      groups: [
        {
          label: 'Core',
          items: ['감각 자극에 민감한 사용자', '초미니멀 환경 선호'],
        },
        {
          label: 'Sub',
          items: ['디자이너·크리에이터·1인 작업자', '데스크 환경·집중 공간 사용자', '디지털 과잉 자극·번아웃 경험자'],
        },
      ],
    },
    {
      title: 'Positioning Strategy',
      table: {
        headers: ['구분', '일반 브랜드', 'QUIET LAB'],
        rows: [
          ['중심', '취향·디자인', '감각 회복'],
          ['역할', '예쁜 물건', '상태를 정리하는 구조'],
          ['결과', '시각적 만족', '심리적 안정'],
        ],
      },
    },
    {
      title: 'Typography',
      paragraphs: [
        'Satoshi Variable',
        '중성적이지만 구조감 있는 서체 · 정보 전달에 집중된 리듬 · 인쇄·UI·공간 그래픽까지 확장 가능',
        'QUIET LAB의 타이포그래피는 조용하지만 흐트러지지 않는 브랜드의 말투',
      ],
    },
    {
      title: 'Visual Strategy',
      table: {
        headers: ['요소', '설계 의도'],
        rows: [
          ['이미지', '단일 오브젝트 중심'],
          ['배경', '단색·뉴트럴'],
          ['빛', '확산광, 그림자 최소'],
          ['구성', '빠른 소비 배제'],
        ],
      },
      paragraphs: ['이미지는 제품을 강조하기 위한 수단이 아니라 정리된 상태를 전달하는 도구로 사용'],
    },
    {
      title: 'What This Project Shows',
      groups: [
        {
          label: '프로젝트 증명 포인트',
          items: [
            '문제 정의',
            '컨셉 설계',
            '포지셔닝',
            '시각 언어 구조화',
            '콘텐츠 흐름 설계',
            '브랜드가 작동하기 위한 전 과정을 하나의 논리로 설계한 기획 프로젝트',
          ],
        },
      ],
    },
  ],
};

const projectDetails = Array.isArray(window.PROJECT_DETAILS) ? window.PROJECT_DETAILS : [];
const detailsMap = new Map(projectDetails.map((project) => [project.id, project]));
const careerDetails = Array.isArray(window.CAREER_DETAILS) ? window.CAREER_DETAILS : [];
const careerMap = new Map(careerDetails.map((career) => [career.id, career]));
const introDetail = window.INTRO_DETAIL && typeof window.INTRO_DETAIL === 'object' ? window.INTRO_DETAIL : null;

const viewer = document.getElementById('detailViewer');
const viewerCategory = document.getElementById('viewerCategory');
const viewerTitle = document.getElementById('viewerTitle');
const viewerSource = document.getElementById('viewerSource');
const viewerCover = document.getElementById('viewerCover');
const viewerIntro = document.getElementById('viewerIntro');
const viewerStack = document.getElementById('viewerStack');
const viewerBackTop = document.getElementById('viewerBackTop');
const viewerRelated = document.getElementById('viewerRelated');
const viewerTopbarMain = viewer?.querySelector('.viewer-topbar-main');
const viewerScroll = viewer?.querySelector('.viewer-scroll');
const viewerCloseTargets = document.querySelectorAll('[data-viewer-close]');
const introOpenButton = document.getElementById('introOpenButton');

let activeTrigger = null;
const viewerRelatedScrollState = { project: 0, career: 0 };
let viewerRelatedPendingShift = null;
const CONTACT_PHONE_HREF = 'tel:+821063434110';
const CONTACT_PHONE_TEXT = '+82 10 6343 4110';
const CONTACT_PHONE_DIGITS = '+821063434110';
const CONTACT_EMAIL = 'kwoncj1025@gmail.com';
const CONTACT_EMAIL_WEB = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`;
const NARROW_MOBILE_STACK_PROJECT_IDS = new Set(['whipped-renewal', 'sirloin-renewal', 'toss-tovi']);

function showContactToast(message) {
  if (!message) return;

  const existing = document.querySelector('.contact-toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'contact-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 240);
  }, 1800);
}

async function copyText(text) {
  const value = String(text || '').trim();
  if (!value) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (error) {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', 'true');
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return Boolean(copied);
  }
}

function initWindowsContactFallback() {
  if (!document.body.classList.contains('platform-windows')) return;

  const mailLinks = document.querySelectorAll('a[href^="mailto:"]');
  mailLinks.forEach((link) => {
    link.setAttribute('href', CONTACT_EMAIL_WEB);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
  phoneLinks.forEach((link) => {
    if (link.dataset.phoneFallbackBound === '1') return;
    link.dataset.phoneFallbackBound = '1';

    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const copied = await copyText(CONTACT_PHONE_DIGITS);
      showContactToast(
        copied
          ? `전화번호가 복사되었습니다: ${CONTACT_PHONE_TEXT}`
          : `전화번호: ${CONTACT_PHONE_TEXT}`,
      );
    });
  });
}

function getTrackGap(track) {
  if (!track) return 0;
  const styles = window.getComputedStyle(track);
  const raw = styles.columnGap || styles.gap || '0';
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

function getViewerRelatedKey(detail) {
  return detail?.kind === 'career' ? 'career' : 'project';
}

function getDetailCover(detail) {
  if (!detail || typeof detail !== 'object') return '';
  if (Array.isArray(detail.images) && detail.images.length > 0) return detail.images[0];
  if (detail.cover) return detail.cover;
  return '';
}

function getViewerRelatedItems(detail) {
  if (!detail || detail.id === 'intro-essay') return [];

  const isCareer = detail.kind === 'career';
  const source = isCareer ? careerDetails : projectDetails;

  return source.map((item) => {
    const kind = item.kind === 'career' ? 'career' : 'project';
    const category = kind === 'career' ? (item.category || 'Experience Statement') : (item.category || 'Project');
    const subtitle = kind === 'career' ? (item.subtitle || category) : category;

    return {
      id: item.id,
      kind,
      title: item.title || '',
      subtitle,
      category,
      url: item.url || '#',
      cover: getDetailCover(item),
    };
  });
}

function renderViewerRelated(detail) {
  if (!viewerRelated) return;
  const relatedKey = getViewerRelatedKey(detail);
  const existingTrack = viewerRelated.querySelector('.viewer-related-track');
  if (existingTrack) {
    viewerRelatedScrollState[relatedKey] = existingTrack.scrollLeft;
  }

  const items = getViewerRelatedItems(detail);
  if (items.length === 0) {
    viewerRelated.innerHTML = '';
    viewerRelated.hidden = true;
    viewerTopbarMain?.classList.add('no-related');
    return;
  }

  viewerRelated.hidden = false;
  viewerRelated.innerHTML = '';
  viewerTopbarMain?.classList.remove('no-related');

  const track = document.createElement('div');
  track.className = 'viewer-related-track';
  const currentIndex = items.findIndex((item) => item.id === detail?.id);

  items.forEach((item, itemIndex) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'viewer-related-card';
    card.dataset.relatedId = item.id;
    if (item.id === detail?.id) {
      card.classList.add('is-active');
    }
    card.setAttribute('aria-label', `${item.title} 열기`);

    if (item.cover) {
      const thumb = document.createElement('img');
      thumb.src = item.cover;
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.setAttribute('aria-hidden', 'true');
      card.appendChild(thumb);
    }

    card.addEventListener('click', () => {
      const nextDetail = item.kind === 'career' ? careerMap.get(item.id) : detailsMap.get(item.id);
      if (!nextDetail) return;
      const currentTrack = card.parentElement;
      if (currentTrack) {
        viewerRelatedScrollState[relatedKey] = currentTrack.scrollLeft;
      }
      const delta = currentIndex === -1 ? 0 : (itemIndex - currentIndex);
      viewerRelatedPendingShift = { key: relatedKey, id: item.id, delta };
      renderViewer(nextDetail, {
        title: item.title,
        category: item.category,
        url: item.url,
      });
      viewerScroll?.scrollTo({ top: 0, behavior: 'smooth' });
    });

    track.appendChild(card);
  });

  track.addEventListener('scroll', () => {
    viewerRelatedScrollState[relatedKey] = track.scrollLeft;
  }, { passive: true });

  enableDragScroll(track);
  viewerRelated.appendChild(track);

  requestAnimationFrame(() => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const saved = viewerRelatedScrollState[relatedKey] || 0;
    const baseLeft = Math.max(0, Math.min(maxScroll, saved));
    track.scrollLeft = baseLeft;

    const pendingShift = viewerRelatedPendingShift;
    const shouldShiftFromClick = Boolean(
      pendingShift
      && pendingShift.key === relatedKey
      && pendingShift.id === detail?.id,
    );

    if (!shouldShiftFromClick) {
      viewerRelatedPendingShift = null;
      return;
    }

    const activeCard = track.querySelector('.viewer-related-card.is-active');
    let nextLeft = baseLeft;

    if (activeCard) {
      const delta = Number.isFinite(pendingShift?.delta) ? pendingShift.delta : 0;
      if (delta !== 0) {
        const step = activeCard.offsetWidth + getTrackGap(track);
        const projected = baseLeft + (step * delta);
        nextLeft = Math.max(0, Math.min(maxScroll, projected));
      } else {
        // Keep active card fully visible when movement delta is not available.
        const activeLeft = activeCard.offsetLeft;
        const activeRight = activeLeft + activeCard.offsetWidth;
        if (activeLeft < baseLeft) {
          nextLeft = activeLeft;
        } else if (activeRight > (baseLeft + track.clientWidth)) {
          nextLeft = activeRight - track.clientWidth;
        }
        nextLeft = Math.max(0, Math.min(maxScroll, nextLeft));
      }
    }

    if (Math.abs(nextLeft - baseLeft) > 2) {
      track.scrollTo({ left: nextLeft, behavior: 'smooth' });
    }
    viewerRelatedScrollState[relatedKey] = nextLeft;
    viewerRelatedPendingShift = null;
  });
}

function normalizeLines(lines, category = '') {
  if (!Array.isArray(lines)) return [];
  const skip = new Set([
    '',
    '제작:',
    'Category',
    'Project',
    '0원으로 체험하기',
    'Skip to content',
    'Get Notion free',
    'Notion 무료로 시작하기',
    '무료 체험 시작하기',
    'CHANJUN KWON',
  ]);

  if (category) {
    skip.add(category);
  }

  const cleaned = [];
  lines.forEach((line) => {
    const text = String(line || '').trim();
    if (!text || skip.has(text)) return;
    if (cleaned[cleaned.length - 1] === text) return;
    cleaned.push(text);
  });

  return cleaned;
}

function createParagraph(text) {
  const p = document.createElement('p');
  p.className = 'viewer-text-line';
  p.textContent = text;
  return p;
}

function createTable(table) {
  const t = document.createElement('table');
  t.className = 'viewer-rich-table';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  table.headers.forEach((h) => {
    const th = document.createElement('th');
    th.textContent = h;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  t.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);

  return t;
}

function renderRichBlocks(rich) {
  const root = document.createElement('div');
  root.className = 'viewer-rich';

  const lead = document.createElement('article');
  lead.className = 'viewer-rich-block';
  const leadTitle = document.createElement('h3');
  leadTitle.textContent = rich.leadTitle;
  lead.appendChild(leadTitle);
  if (rich.leadSubtitle) {
    lead.appendChild(createParagraph(rich.leadSubtitle));
  }
  root.appendChild(lead);

  rich.blocks.forEach((block) => {
    const card = document.createElement('article');
    card.className = 'viewer-rich-block';

    const h3 = document.createElement('h3');
    h3.textContent = block.title;
    card.appendChild(h3);

    if (Array.isArray(block.paragraphs)) {
      block.paragraphs.forEach((text) => {
        card.appendChild(createParagraph(text));
      });
    }

    if (Array.isArray(block.groups)) {
      block.groups.forEach((group) => {
        const sub = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = group.label;
        sub.appendChild(strong);
        card.appendChild(sub);

        const ul = document.createElement('ul');
        ul.className = 'viewer-rich-list';
        group.items.forEach((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      });
    }

    if (block.table) {
      card.appendChild(createTable(block.table));
    }

    root.appendChild(card);
  });

  return root;
}

function renderIntroTwoColumn(rich) {
  const base = renderRichBlocks(rich);
  const blocks = Array.from(base.querySelectorAll('.viewer-rich-block'));

  if (blocks.length <= 2) {
    return base;
  }

  const layout = document.createElement('div');
  layout.className = 'viewer-rich-two-col-layout';

  const lead = blocks.shift();
  if (lead) {
    lead.classList.add('viewer-rich-lead');
    layout.appendChild(lead);
  }

  const leftColumn = document.createElement('div');
  leftColumn.className = 'viewer-rich-column';
  const rightColumn = document.createElement('div');
  rightColumn.className = 'viewer-rich-column';

  let leftWeight = 0;
  let rightWeight = 0;

  blocks.forEach((block) => {
    const textLength = (block.textContent || '').replace(/\s+/g, ' ').trim().length;
    const weight = Math.max(1, Math.ceil(textLength / 120));

    if (leftWeight <= rightWeight) {
      leftColumn.appendChild(block);
      leftWeight += weight;
    } else {
      rightColumn.appendChild(block);
      rightWeight += weight;
    }
  });

  layout.appendChild(leftColumn);
  layout.appendChild(rightColumn);
  return layout;
}

function joinIntroLines(lines) {
  return lines
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildIntroSectionsFromLines(lines) {
  const markers = [
    { key: '회계·재무를 전공하여', title: '기준과 구조의 출발점' },
    { key: '사운드 엔지니어링을 통해', title: '감각과 흐름에 대한 관점' },
    { key: '바리스타로 일하며', title: '사용자 반응 중심의 시선' },
    { key: '모든 프로젝트는', title: '프로젝트 수행 방식' },
    { key: '여러 종류의 AI 툴을 활용해', title: '실무형 AI 활용 방식' },
    { key: '개인 프로젝트일수록 디자이너의 아이덴티티가 가장 솔직하게 드러난다고 생각합니다.', title: '앞으로의 방향' },
  ];

  const findIndex = (needle) => lines.findIndex((line) => line.includes(needle));

  const anchors = [{ index: 0, title: '디자인 관점' }];
  markers.forEach((marker) => {
    const index = findIndex(marker.key);
    if (index !== -1) {
      anchors.push({ index, title: marker.title });
    }
  });

  anchors.sort((a, b) => a.index - b.index);

  const sections = [];
  anchors.forEach((anchor, idx) => {
    const start = anchor.index;
    const end = idx === anchors.length - 1 ? lines.length : anchors[idx + 1].index;
    const slice = lines.slice(start, end).filter(Boolean);
    if (slice.length === 0) return;

    if (slice.length <= 6) {
      sections.push({
        title: anchor.title,
        paragraphs: [joinIntroLines(slice)],
      });
      return;
    }

    const midpoint = Math.ceil(slice.length / 2);
    sections.push({
      title: anchor.title,
      paragraphs: [joinIntroLines(slice.slice(0, midpoint)), joinIntroLines(slice.slice(midpoint))].filter(Boolean),
    });
  });

  return sections;
}

function renderIntroCentered(detail, lines) {
  const root = document.createElement('div');
  root.className = 'cover-letter-flow';

  const lead = document.createElement('article');
  lead.className = 'cover-letter-lead';
  const leadTitle = document.createElement('h3');
  leadTitle.textContent = detail?.title || 'Cover Letter';
  lead.appendChild(leadTitle);
  root.appendChild(lead);

  const sections = buildIntroSectionsFromLines(lines);
  sections.forEach((section) => {
    const article = document.createElement('article');
    article.className = 'cover-letter-section';

    const title = document.createElement('h4');
    title.textContent = section.title;
    article.appendChild(title);

    section.paragraphs.forEach((paragraph) => {
      article.appendChild(createParagraph(paragraph));
    });

    root.appendChild(article);
  });

  return root;
}

function buildIntroRichFromLines(lines) {
  const markers = [
    { key: '회계·재무를 전공하여', title: 'Background & Method' },
    { key: '사운드 엔지니어링을 통해', title: 'Sensory Perspective' },
    { key: '바리스타로 일하며', title: 'User Observation' },
    { key: '모든 프로젝트는', title: 'Project Execution' },
    { key: '여러 종류의 AI 툴을 활용해', title: 'AI Workflow' },
    { key: '개인 프로젝트일수록 디자이너의 아이덴티티가 가장 솔직하게 드러난다고 생각합니다.', title: 'Direction' },
  ];

  const findIndex = (needle) => lines.findIndex((line) => line.includes(needle));
  const idx = markers.map((m) => findIndex(m.key));

  const cut = (from, to) => {
    const start = Math.max(0, from);
    const end = to === -1 ? lines.length : Math.max(start, to);
    return lines.slice(start, end);
  };

  const i0 = idx[0] === -1 ? lines.length : idx[0];
  const i1 = idx[1] === -1 ? lines.length : idx[1];
  const i2 = idx[2] === -1 ? lines.length : idx[2];
  const i3 = idx[3] === -1 ? lines.length : idx[3];
  const i4 = idx[4] === -1 ? lines.length : idx[4];
  const i5 = idx[5] === -1 ? lines.length : idx[5];

  return {
    leadTitle: '시각적 구조를 설계하는 디자이너',
    leadSubtitle: '원문 기반 자기소개',
    blocks: [
      { title: 'Design Perspective', paragraphs: cut(0, i0) },
      { title: 'Background & Method', paragraphs: cut(i0, i1) },
      { title: 'Sensory Perspective', paragraphs: cut(i1, i2) },
      { title: 'User Observation', paragraphs: cut(i2, i3) },
      { title: 'Project Execution', paragraphs: cut(i3, i4) },
      { title: 'AI Workflow', paragraphs: cut(i4, i5) },
      { title: 'Direction', paragraphs: cut(i5, -1) },
    ].filter((block) => Array.isArray(block.paragraphs) && block.paragraphs.length > 0),
  };
}

function splitList(text) {
  return String(text || '')
    .split(/[,/·]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function extractField(lines, labels) {
  for (const line of lines) {
    const normalized = line.replace(/\s+/g, ' ').trim();
    for (const label of labels) {
      const regex = new RegExp(`^${label}\\s*:\\s*(.+)$`);
      const match = normalized.match(regex);
      if (match) return match[1].trim();
    }
  }
  return '';
}

function buildProjectRichFromDetail(detail, summaryLines, headingLines) {
  const projectName = extractField(summaryLines, ['프로젝트명']);
  const projectType = extractField(summaryLines, ['프로젝트 성격']);
  const purpose = extractField(summaryLines, ['목적']);
  const scope = extractField(summaryLines, ['작업 범위']);
  const toolsRaw = extractField(summaryLines, ['활용툴']);

  const sectionStops = new Set([
    '☑︎ 프로젝트 개요',
    '☑︎ 전략 & 기획 프로세스',
    '기획 배경 및 목표',
    '주요 타겟층',
    '주요 타겟',
    '키워드 도출',
    '콘텐츠 기획',
    '콘텐츠 구성',
    '콘텐츠 제작 전략',
    '상세페이지 흐름',
    '디자인 방향성',
    '핵심 구조 정의',
    '핵심 메시지',
  ]);

  const used = new Set();
  const markUsed = (value) => {
    if (value) used.add(value);
  };

  markUsed(projectName);
  markUsed(projectType);
  markUsed(purpose);
  markUsed(scope);
  markUsed(toolsRaw);
  sectionStops.forEach((v) => used.add(v));

  const detailPoints = summaryLines.filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (used.has(t)) return false;
    if (t.includes(':')) return false;
    if (t === detail.category || t === detail.title) return false;
    return true;
  });

  const tools = splitList(toolsRaw);
  const headingItems = headingLines.filter((line) => !line.includes('☑︎'));

  const blocks = [];

  blocks.push({
    title: '프로젝트 개요',
    paragraphs: [
      projectName ? `프로젝트명: ${projectName}` : `프로젝트명: ${detail.title}`,
      `카테고리: ${detail.category}`,
      projectType ? `프로젝트 성격: ${projectType}` : '',
    ].filter(Boolean),
  });

  if (purpose) {
    blocks.push({
      title: '목표 및 의도',
      paragraphs: [purpose],
    });
  }

  if (scope) {
    blocks.push({
      title: '작업 범위',
      paragraphs: [scope],
    });
  }

  if (tools.length > 0) {
    blocks.push({
      title: '활용 툴',
      groups: [{ label: 'Tools', items: tools }],
    });
  }

  const strategyItems = [...headingItems, ...detailPoints];
  if (strategyItems.length > 0) {
    blocks.push({
      title: '기획/전략 포인트',
      groups: [{ label: 'Key Points', items: strategyItems }],
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      title: '프로젝트 정보',
      paragraphs: ['세부 내용이 곧 업데이트됩니다.'],
    });
  }

  return {
    leadTitle: detail.title,
    leadSubtitle: detail.category,
    blocks,
  };
}

function isDesignDirectionHeading(text = '') {
  const normalized = String(text || '')
    .replace(/[\uFE0E\uFE0F]/g, '')
    .normalize('NFKC')
    .replace(/\s+/g, '');
  return normalized.includes('디자인방향성');
}

function isKeywordHeading(text = '') {
  const normalized = String(text || '')
    .replace(/[\uFE0E\uFE0F]/g, '')
    .normalize('NFKC')
    .replace(/\s+/g, '');
  return normalized.includes('키워드도출');
}

function isFlowHeading(text = '') {
  const normalized = String(text || '')
    .replace(/[\uFE0E\uFE0F]/g, '')
    .normalize('NFKC')
    .replace(/\s+/g, '');
  return (
    normalized.includes('핵심구조정의')
    || normalized.includes('콘텐츠구성')
    || normalized.includes('콘텐츠기획')
    || normalized.includes('콘텐츠제작전략')
    || normalized.includes('상세페이지흐름')
    || normalized.includes('핵심메시지')
  );
}

function normalizeChipText(text = '') {
  return String(text || '')
    .replace(/[\uFE0E\uFE0F]/g, '')
    .trim()
    .replace(/^[▫▪◻◼□◦✔✓▶▷▹▸•·\-]+\s*/, '')
    .trim();
}

function createDirectionItem(label, description) {
  const item = document.createElement('p');
  item.className = 'viewer-direction-item';

  const itemLabel = document.createElement('strong');
  itemLabel.className = 'viewer-direction-label';
  itemLabel.textContent = `${label}:`;
  item.appendChild(itemLabel);

  if (description) {
    item.appendChild(document.createTextNode(` ${description}`));
  }

  return item;
}

function renderProjectRichFromBlocks(detail) {
  const layout = document.createElement('div');
  layout.className = 'viewer-rich viewer-rich-project-layout';

  const lead = document.createElement('article');
  lead.className = 'viewer-rich-block viewer-rich-project-lead viewer-rich-lead';
  const leadTitle = document.createElement('h3');
  leadTitle.textContent = detail.title || 'Project';
  lead.appendChild(leadTitle);
  if (detail.category) {
    lead.appendChild(createParagraph(detail.category));
  }
  layout.appendChild(lead);

  const blocks = Array.isArray(detail.blocks) ? detail.blocks : [];
  const sections = [];
  let current = null;
  let currentSectionTitle = '';
  let pendingDirectionLabel = '';

  const ensureSection = () => {
    if (current) return current;
    current = document.createElement('article');
    current.className = 'viewer-rich-block viewer-rich-project-section';
    sections.push(current);
    return current;
  };

  blocks.forEach((block) => {
    if (!block || typeof block !== 'object') return;

    if (block.type === 'divider') {
      pendingDirectionLabel = '';
      currentSectionTitle = '';
      current = null;
      return;
    }

    if (block.type === 'heading') {
      const headingText = String(block.text || '').trim();
      if (!headingText || headingText === detail.title || headingText === detail.category) return;

      pendingDirectionLabel = '';
      currentSectionTitle = headingText;
      current = document.createElement('article');
      current.className = 'viewer-rich-block viewer-rich-project-section';
      if (isKeywordHeading(headingText)) {
        current.classList.add('is-keyword-section');
      }
      if (isFlowHeading(headingText)) {
        current.classList.add('is-flow-section');
      }

      const h3 = document.createElement('h3');
      h3.textContent = headingText;
      current.appendChild(h3);

      sections.push(current);
      return;
    }

    const inDirectionSection = isDesignDirectionHeading(currentSectionTitle);
    const inKeywordSection = isKeywordHeading(currentSectionTitle);
    const inFlowSection = isFlowHeading(currentSectionTitle);
    const appendDirectionItem = (text) => {
      const rawText = String(text || '').trim();
      if (!rawText) return false;

      const section = ensureSection();
      if (pendingDirectionLabel) {
        section.appendChild(createDirectionItem(pendingDirectionLabel, rawText));
        pendingDirectionLabel = '';
        return true;
      }

      const colonIndex = rawText.indexOf(':');
      if (colonIndex === -1) return false;

      const label = rawText.slice(0, colonIndex).trim();
      const body = rawText.slice(colonIndex + 1).trim();
      if (!label) return false;

      if (body) {
        section.appendChild(createDirectionItem(label, body));
      } else {
        pendingDirectionLabel = label;
      }
      return true;
    };

    const appendKeywordItem = (text) => {
      const rawText = normalizeChipText(text);
      if (!rawText) return false;

      const section = ensureSection();
      let row = section.querySelector('.viewer-keyword-row');
      if (!row) {
        row = document.createElement('div');
        row.className = 'viewer-keyword-row';
        section.appendChild(row);
      }

      const item = document.createElement('span');
      item.className = 'viewer-keyword-item';
      item.textContent = rawText;
      row.appendChild(item);
      return true;
    };

    const appendFlowItem = (text) => {
      const rawText = normalizeChipText(text);
      if (!rawText) return false;

      if (rawText === '▽' || rawText === '▼' || rawText === '→') {
        return true;
      }

      const section = ensureSection();

      if (rawText.endsWith(':')) {
        const label = document.createElement('p');
        label.className = 'viewer-flow-label';
        label.textContent = rawText;
        section.appendChild(label);
        return true;
      }

      let row = section.querySelector('.viewer-flow-row');
      if (!row) {
        row = document.createElement('div');
        row.className = 'viewer-flow-row';
        section.appendChild(row);
      }

      const item = document.createElement('span');
      item.className = 'viewer-flow-item';
      item.textContent = rawText;
      row.appendChild(item);
      return true;
    };

    if (block.type === 'bullet') {
      if (inFlowSection && appendFlowItem(block.text)) {
        return;
      }
      if (inKeywordSection && appendKeywordItem(block.text)) {
        return;
      }
      if (inDirectionSection && appendDirectionItem(block.text)) {
        return;
      }
      const section = ensureSection();
      let list = section.lastElementChild;
      if (!list || list.tagName !== 'UL' || !list.classList.contains('viewer-rich-list')) {
        list = document.createElement('ul');
        list.className = 'viewer-rich-list';
        section.appendChild(list);
      }
      const li = document.createElement('li');
      li.textContent = block.text || '';
      list.appendChild(li);
      return;
    }

    if (block.type === 'number') {
      const section = ensureSection();
      let list = section.lastElementChild;
      if (!list || list.tagName !== 'OL' || !list.classList.contains('viewer-rich-ordered')) {
        list = document.createElement('ol');
        list.className = 'viewer-rich-ordered';
        section.appendChild(list);
      }
      const li = document.createElement('li');
      li.textContent = block.text || '';
      list.appendChild(li);
      return;
    }

    if (block.type === 'quote') {
      const section = ensureSection();
      const quote = document.createElement('blockquote');
      quote.className = 'viewer-rich-quote';
      quote.textContent = block.text || '';
      section.appendChild(quote);
      return;
    }

    if (block.type === 'paragraph') {
      if (inFlowSection && appendFlowItem(block.text)) {
        return;
      }
      if (inKeywordSection && appendKeywordItem(block.text)) {
        return;
      }
      if (inDirectionSection && appendDirectionItem(block.text)) {
        return;
      }
      const section = ensureSection();
      section.appendChild(createParagraph(block.text || ''));
    }
  });

  if (sections.length === 0) {
    return layout;
  }

  const enforceKeywordLayout = (section) => {
    const heading = section.querySelector(':scope > h3');
    if (!heading || !isKeywordHeading(heading.textContent || '')) return;

    const chips = [];
    const pushKeywordText = (value) => {
      const text = normalizeChipText(value);
      if (!text) return;
      chips.push(text);
    };

    Array.from(section.children).forEach((child) => {
      if (child.tagName === 'H3') return;

      if (child.classList.contains('viewer-keyword-row')) {
        Array.from(child.querySelectorAll('.viewer-keyword-item')).forEach((item) => {
          pushKeywordText(item.textContent || '');
        });
        return;
      }

      if (child.classList.contains('viewer-keyword-note')) {
        pushKeywordText(child.textContent || '');
        return;
      }

      if (child.tagName === 'P') {
        pushKeywordText(child.textContent || '');
        return;
      }

      if (child.tagName === 'UL' || child.tagName === 'OL') {
        Array.from(child.querySelectorAll('li')).forEach((li) => {
          pushKeywordText(li.textContent || '');
        });
      }
    });

    if (chips.length === 0) return;

    Array.from(section.children).forEach((child) => {
      if (child.tagName !== 'H3') {
        child.remove();
      }
    });

    if (chips.length > 0) {
      const row = document.createElement('div');
      row.className = 'viewer-keyword-row';
      const seen = new Set();
      chips.forEach((text) => {
        if (seen.has(text)) return;
        seen.add(text);
        const item = document.createElement('span');
        item.className = 'viewer-keyword-item';
        item.textContent = text;
        row.appendChild(item);
      });
      if (row.childElementCount > 0) {
        section.appendChild(row);
      }
    }

  };

  const enforceFlowLayout = (section) => {
    const heading = section.querySelector(':scope > h3');
    const headingText = heading?.textContent || '';
    const hasFlowHeading = isFlowHeading(headingText);
    const hasFlowSignal = Array.from(section.querySelectorAll('p, li')).some((node) => {
      const raw = String(node.textContent || '').trim();
      const normalized = normalizeChipText(raw).replace(/\s+/g, '');
      return (
        raw.startsWith('▫') || raw.startsWith('▪') || raw.startsWith('◻') || raw.startsWith('◦')
        || normalized.includes('랜딩페이지흐름:')
        || normalized.includes('랜딩페이지흐름')
      );
    });

    if (!hasFlowHeading && !hasFlowSignal) return;
    section.classList.add('is-flow-section');

    const extracted = [];
    Array.from(section.children).forEach((child) => {
      if (child.tagName === 'H3') return;

      if (child.classList.contains('viewer-flow-label')) {
        const text = normalizeChipText(child.textContent || '');
        if (text) extracted.push(text);
        return;
      }

      if (child.classList.contains('viewer-flow-row')) {
        Array.from(child.querySelectorAll('.viewer-flow-item')).forEach((item) => {
          const text = normalizeChipText(item.textContent || '');
          if (text) extracted.push(text);
        });
        return;
      }

      if (child.classList.contains('viewer-flow-note')) {
        const text = normalizeChipText(child.textContent || '');
        if (text) extracted.push(text);
        return;
      }

      if (child.tagName === 'P') {
        const text = normalizeChipText(child.textContent || '');
        if (text) extracted.push(text);
        return;
      }

      if (child.tagName === 'UL' || child.tagName === 'OL') {
        Array.from(child.querySelectorAll('li')).forEach((li) => {
          const text = normalizeChipText(li.textContent || '');
          if (text) extracted.push(text);
        });
      }
    });

    if (extracted.length === 0) return;

    Array.from(section.children).forEach((child) => {
      if (child.tagName !== 'H3') {
        child.remove();
      }
    });

    const compacted = [];
    for (let i = 0; i < extracted.length; i += 1) {
      const text = normalizeChipText(extracted[i]);
      if (!text || text === '▽' || text === '▼' || text === '→') continue;

      if (text.endsWith(':')) {
        compacted.push({ type: 'label', text });
        continue;
      }

      const next = normalizeChipText(extracted[i + 1] || '');
      const canPairWithNext = Boolean(
        next
        && !next.endsWith(':')
        && next !== '▽'
        && next !== '▼'
        && next !== '→'
        && text.length <= 24
        && next.length >= 26,
      );

      if (canPairWithNext) {
        compacted.push({ type: 'pair', label: text, detail: next });
        i += 1;
        continue;
      }

      compacted.push({ type: 'item', text });
    }

    const segments = [];
    let currentSegment = { label: '', entries: [] };
    compacted.forEach((entry) => {
      if (entry.type === 'label') {
        if (currentSegment.label || currentSegment.entries.length > 0) {
          segments.push(currentSegment);
        }
        currentSegment = { label: entry.text, entries: [] };
        return;
      }
      currentSegment.entries.push(entry);
    });
    if (currentSegment.label || currentSegment.entries.length > 0) {
      segments.push(currentSegment);
    }

    if (segments.length === 0) {
      segments.push({ label: '', entries: compacted.filter((entry) => entry.type !== 'label') });
    }

    segments.forEach((segment) => {
      if (segment.label) {
        const label = document.createElement('p');
        label.className = 'viewer-flow-label';
        label.textContent = segment.label;
        section.appendChild(label);
      }

      const stepItems = segment.entries
        .filter((entry) => entry.type === 'item')
        .map((entry) => entry.text)
        .filter(Boolean);
      const pairItems = segment.entries
        .filter((entry) => entry.type === 'pair')
        .filter((entry) => entry.label && entry.detail);

      if (stepItems.length > 0) {
        if (stepItems.length === 1) {
          const sentence = document.createElement('p');
          sentence.className = 'viewer-flow-sentence';
          sentence.textContent = stepItems[0];
          section.appendChild(sentence);
        } else {
          const shortFlow = stepItems.length <= 6 && stepItems.every((text) => text.length <= 28);
          if (shortFlow) {
            const row = document.createElement('div');
            row.className = 'viewer-flow-row';
            stepItems.forEach((text) => {
              const chip = document.createElement('span');
              chip.className = 'viewer-flow-item';
              chip.textContent = text;
              row.appendChild(chip);
            });
            section.appendChild(row);
          } else {
            const list = document.createElement('ul');
            list.className = 'viewer-flow-list';
            stepItems.forEach((text) => {
              const li = document.createElement('li');
              li.className = 'viewer-flow-list-item';
              li.textContent = text;
              list.appendChild(li);
            });
            section.appendChild(list);
          }
        }
      }

      if (pairItems.length > 0) {
        const pairList = document.createElement('div');
        pairList.className = 'viewer-flow-pairs';
        pairItems.forEach((entry) => {
          const line = document.createElement('p');
          line.className = 'viewer-flow-pair-line';

          const key = document.createElement('strong');
          key.className = 'viewer-flow-key';
          key.textContent = `${entry.label}:`;
          line.appendChild(key);
          line.appendChild(document.createTextNode(` ${entry.detail}`));

          pairList.appendChild(line);
        });
        section.appendChild(pairList);
      }
    });
  };

  const enforceInlineSectionLayout = (section) => {
    const heading = section.querySelector(':scope > h3');
    if (!heading) return;

    const headingText = String(heading.textContent || '').trim();
    if (
      isKeywordHeading(headingText)
      || isFlowHeading(headingText)
      || isDesignDirectionHeading(headingText)
    ) {
      return;
    }

    const contentChildren = Array.from(section.children).filter((child) => child.tagName !== 'H3');
    if (contentChildren.length < 2) return;

    const onlyParagraphs = contentChildren.every(
      (child) => child.tagName === 'P' && child.classList.contains('viewer-text-line'),
    );
    if (!onlyParagraphs) return;

    const lines = contentChildren
      .map((child) => normalizeChipText(child.textContent || ''))
      .filter(Boolean);
    if (lines.length < 2) return;

    const shouldInline = lines.every((line) => line.length <= 96)
      || /기획\s*배경\s*및\s*목표|주요\s*타겟|캐릭터\s*전략/.test(headingText);
    if (!shouldInline) return;

    contentChildren.forEach((node) => node.remove());

    const row = document.createElement('div');
    row.className = 'viewer-inline-row';
    lines.forEach((line) => {
      const item = document.createElement('span');
      item.className = 'viewer-inline-item';
      item.textContent = line;
      row.appendChild(item);
    });
    section.appendChild(row);
  };

  sections.forEach((section) => {
    enforceKeywordLayout(section);
    enforceFlowLayout(section);
    enforceInlineSectionLayout(section);
    if (section.children.length === 1 && section.firstElementChild?.tagName === 'H3') {
      section.classList.add('is-heading-only');
    }
  });

  sections.forEach((section) => {
    layout.appendChild(section);
  });
  return layout;
}

function renderCareerRich(detail) {
  const root = document.createElement('div');
  root.className = 'viewer-rich viewer-rich-career';

  const lead = document.createElement('article');
  lead.className = 'viewer-rich-block viewer-rich-career-lead';

  const title = document.createElement('h3');
  title.textContent = detail.title || 'Career';
  lead.appendChild(title);

  if (detail.subtitle) {
    lead.appendChild(createParagraph(detail.subtitle));
  }

  root.appendChild(lead);

  const blocks = Array.isArray(detail.blocks) ? detail.blocks : [];
  let current = null;

  const ensureSection = () => {
    if (current) return current;
    current = document.createElement('article');
    current.className = 'viewer-rich-block viewer-rich-career-section';
    root.appendChild(current);
    return current;
  };

  blocks.forEach((block) => {
    if (!block || typeof block !== 'object') return;

    if (block.type === 'divider') {
      const hr = document.createElement('hr');
      hr.className = 'viewer-rich-divider';
      root.appendChild(hr);
      current = null;
      return;
    }

    if (block.type === 'heading') {
      current = document.createElement('article');
      current.className = 'viewer-rich-block viewer-rich-career-section';

      const h3 = document.createElement('h3');
      h3.textContent = block.text || '';
      current.appendChild(h3);

      root.appendChild(current);
      return;
    }

    if (block.type === 'bullet') {
      const section = ensureSection();
      let list = section.lastElementChild;
      if (!list || list.tagName !== 'UL' || !list.classList.contains('viewer-rich-list')) {
        list = document.createElement('ul');
        list.className = 'viewer-rich-list';
        section.appendChild(list);
      }
      const li = document.createElement('li');
      li.textContent = block.text || '';
      list.appendChild(li);
      return;
    }

    if (block.type === 'quote') {
      const section = ensureSection();
      const quote = document.createElement('blockquote');
      quote.className = 'viewer-rich-quote';
      quote.textContent = block.text || '';
      section.appendChild(quote);
      return;
    }

    if (block.type === 'paragraph') {
      const section = ensureSection();
      section.appendChild(createParagraph(block.text || ''));
    }
  });

  return root;
}

function renderViewer(detail, fallback = {}) {
  const baseTitle = detail?.title || fallback.title || 'Project';
  const title = detail?.id === 'branding-concept' ? 'QUIET LAB' : baseTitle;
  const category = detail?.category || fallback.category || '';
  const summaryLines = normalizeLines(detail?.summary || [], category);
  const headingLines = normalizeLines(detail?.headings || []);
  const images = Array.isArray(detail?.images)
    ? detail.images
    : detail?.cover
      ? [detail.cover]
      : [];
  const imageOnlyDetail = detail?.id === 'ai-image-gen';
  const leadImage = images.length > 1 ? images[1] : images[0] || '';
  const contentImages = images.length > 2 ? images.slice(2) : [];

  viewerCategory.textContent = category;
  viewerTitle.textContent = title;
  viewerSource.href = CONTACT_PHONE_HREF;
  viewer.classList.toggle('is-cover-letter', detail?.id === 'intro-essay');
  viewer.classList.toggle('is-career-detail', detail?.kind === 'career');
  viewer.classList.toggle('is-mobile-stack-project', NARROW_MOBILE_STACK_PROJECT_IDS.has(detail?.id));

  renderViewerRelated(detail);

  viewerCover.innerHTML = '';
  viewerCover.hidden = !leadImage;
  if (leadImage) {
    const cover = document.createElement('img');
    cover.src = leadImage;
    cover.alt = `${title} 상세 이미지 1`;
    cover.loading = 'lazy';
    viewerCover.appendChild(cover);
  }

  viewerIntro.innerHTML = '';
  viewerIntro.hidden = imageOnlyDetail;
  viewerIntro.classList.remove('viewer-intro-cover-letter');

  if (imageOnlyDetail) {
    // Render only images for this project detail page.
  } else if (detail?.id === 'branding-concept') {
    viewerIntro.appendChild(renderRichBlocks(QUIET_LAB_RICH));
  } else if (detail?.id === 'intro-essay') {
    const introLines = normalizeLines(detail?.summary || [], category);
    viewerIntro.classList.add('viewer-intro-cover-letter');
    viewerIntro.appendChild(renderIntroCentered(detail, introLines));
  } else if (detail?.kind === 'career') {
    viewerIntro.appendChild(renderCareerRich(detail));
  } else if (Array.isArray(detail?.blocks) && detail.blocks.length > 0) {
    viewerIntro.appendChild(renderProjectRichFromBlocks(detail));
  } else {
    viewerIntro.appendChild(renderRichBlocks(buildProjectRichFromDetail(detail, summaryLines, headingLines)));
  }

  viewerStack.innerHTML = '';
  contentImages.forEach((src, idx) => {
    const frame = document.createElement('figure');
    frame.className = 'viewer-frame';

    const img = document.createElement('img');
    img.src = src;
    img.loading = 'lazy';
    img.alt = `${title} 상세 이미지 ${idx + 2}`;

    frame.appendChild(img);
    viewerStack.appendChild(frame);
  });
}

function openViewer(detail, fallback = {}) {
  if (!viewer) return;
  renderViewer(detail, fallback);
  viewerScroll?.scrollTo({ top: 0, behavior: 'auto' });
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeViewer() {
  if (!viewer) return;
  viewer.classList.remove('is-open');
  viewer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (activeTrigger) {
    activeTrigger.focus();
    activeTrigger = null;
  }
}

function openProjectDetailFromCard(card, event) {
  event?.preventDefault();
  const projectId = card.dataset.projectId;
  const detail = detailsMap.get(projectId);
  const fallbackTitle =
    card.querySelector('.hero-mini-meta h3')?.textContent?.trim() ||
    card.querySelector('h3')?.textContent?.trim() ||
    '';
  const fallbackCategory =
    card.dataset.category ||
    card.querySelector('.hero-mini-meta p')?.textContent?.trim() ||
    card.querySelector('p')?.textContent?.trim() ||
    '';
  activeTrigger = card;
  openViewer(detail, {
    title: fallbackTitle,
    category: fallbackCategory,
    url: card.getAttribute('href') || '',
  });
}

[...projectCards, ...heroMiniCards].forEach((card) => {
  card.addEventListener('click', (event) => openProjectDetailFromCard(card, event));
});

careerCards.forEach((card) => {
  card.addEventListener('click', (event) => {
    event.preventDefault();
    const careerId = card.dataset.careerId;
    const detail = careerMap.get(careerId);
    activeTrigger = card;
    openViewer(detail, {
      title: card.querySelector('h3')?.textContent?.trim(),
      category: 'Experience Statement',
      url: card.getAttribute('href'),
    });
  });
});

if (introOpenButton) {
  introOpenButton.addEventListener('click', () => {
    activeTrigger = introOpenButton;
    openViewer(introDetail, {
      title: '시각적 구조를 설계하는 디자이너',
      category: 'Essay',
      url: 'https://early-cap-da5.notion.site/2feda7ea3ca48012a045ed6126be7d64?pvs=25',
    });
  });
}

viewerCloseTargets.forEach((el) => {
  el.addEventListener('click', closeViewer);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && viewer?.classList.contains('is-open')) {
    closeViewer();
  }
});

if (viewerBackTop) {
  viewerBackTop.addEventListener('click', () => {
    viewerScroll?.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (pageBackTop) {
  pageBackTop.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const year = document.getElementById('year');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

initWindowsContactFallback();
