const GOOGLE_API_KEY = 'SUA_API_KEY_AQUI';
const PLACE_ID = 'SEU_PLACE_ID_AQUI';
const MAX_REVIEWS = 4;

function renderStars(rating) {
  const roundedRating = Math.round(rating || 5);
  const fullStars = '★'.repeat(roundedRating);
  const emptyStars = '☆'.repeat(5 - roundedRating);
  return `${fullStars}${emptyStars}`;
}

function formatReviewDate(review) {
  if (review.relative_time_description) {
    return review.relative_time_description;
  }

  if (review.time) {
    const date = new Date(review.time * 1000);
    return date.toLocaleDateString('pt-BR');
  }

  return 'Data indisponível';
}

function createReviewCard(review) {
  const authorName = review.author_name || 'Cliente';
  const initials = authorName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const rating = review.rating || 5;
  const text = review.text || 'Avaliação fornecida pelo Google.';
  const dateText = formatReviewDate(review);

  return `
    <article class="review-card reveal">
      <div class="review-header">
        <div class="avatar">${initials}</div>
        <div>
          <h3>${authorName}</h3>
          <p>${dateText}</p>
        </div>
      </div>
      <div class="stars">${renderStars(rating)}</div>
      <p>${text}</p>
    </article>
  `;
}

function initRevealAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = document.querySelectorAll('.reveal');
  const logoImages = document.querySelectorAll('.logo img');

  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    logoImages.forEach((img) => img.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.dataset && el.dataset.delay ? parseFloat(el.dataset.delay) : 0;
          if (delay) el.style.transitionDelay = `${delay}s`;
          // If the target is an image inside logo, mark visible on the img
          if (el.tagName === 'IMG' && el.parentElement && el.parentElement.classList.contains('logo')) {
            el.classList.add('is-visible');
          } else {
            el.classList.add('is-visible');
          }
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((element) => observer.observe(element));
  logoImages.forEach((img) => observer.observe(img));

  // Hero image parallax (subtle) - respects reduced motion
  const hero = document.querySelector('.hero-image');
  if (hero && !prefersReducedMotion) {
    const img = hero.querySelector('img');
    let latestX = 0;
    let latestY = 0;
    let ticking = false;

    function onMove(e) {
      const rect = hero.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || cx;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || cy;
      latestX = (clientX - cx) / rect.width * 8; // small angle
      latestY = (clientY - cy) / rect.height * 6;
      requestTick();
    }

    function requestTick() {
      if (!ticking) {
        requestAnimationFrame(updateTransform);
      }
      ticking = true;
    }

    function updateTransform() {
      ticking = false;
      if (!img) return;
      img.style.transform = `translate3d(${latestX}px, ${latestY / 2}px, 0) scale(1.015)`;
    }

    hero.addEventListener('mousemove', onMove, { passive: true });
    hero.addEventListener('touchmove', onMove, { passive: true });
    // subtle scroll-based movement
    window.addEventListener('scroll', () => {
      if (!img) return;
      const rect = hero.getBoundingClientRect();
      const scrollFactor = Math.min(Math.max(-rect.top / 300, -10), 10);
      img.style.transform = `translate3d(0, ${scrollFactor}px, 0) scale(1.01)`;
    }, { passive: true });
  }
}

function initSmoothScroll() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  });
}

function renderReviews(reviews) {
  const container = document.getElementById('reviews-container');

  if (!container) return;

  const filteredReviews = (reviews || [])
    .filter((review) => review.rating >= 4)
    .slice(0, MAX_REVIEWS);

  if (filteredReviews.length === 0) {
    container.innerHTML = '<p class="reviews-empty">Nenhuma avaliação com nota 4 ou 5 foi encontrada.</p>';
    initRevealAnimations();
    return;
  }

  container.innerHTML = filteredReviews.map(createReviewCard).join('');

  const cards = container.querySelectorAll('.review-card');
  if (cards.length > 0) {
    cards[0].classList.add('active');
  }

  initRevealAnimations();
}

function updateSummary(place) {
  const summaryTitle = document.querySelector('.review-credibility strong');
  const summaryText = document.querySelector('.review-credibility p');
  const ratingSummary = document.getElementById('google-rating-summary');

  if (summaryTitle) {
    summaryTitle.textContent = place.name || 'Avaliação Excelente';
  }

  if (summaryText) {
    const totalReviews = place.user_ratings_total || 0;
    summaryText.textContent = `Com base em ${totalReviews} avaliações`;
  }

  if (ratingSummary) {
    ratingSummary.textContent = renderStars(place.rating || 5);
  }
}

function initGooglePlaces() {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    console.error('Google Maps Places API não foi carregada corretamente.');
    return;
  }

  const mapElement = document.getElementById('map-helper');
  if (!mapElement) {
    console.error('Elemento de apoio do mapa não encontrado.');
    return;
  }

  const map = new google.maps.Map(mapElement, {
    center: { lat: -23.5505, lng: -46.6333 },
    zoom: 15,
  });

  const service = new google.maps.places.PlacesService(map);

  service.getDetails(
    {
      placeId: PLACE_ID,
      fields: ['name', 'rating', 'user_ratings_total', 'reviews'],
    },
    (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
        console.error('Erro ao buscar detalhes do local:', status);
        const container = document.getElementById('reviews-container');
        if (container) {
          container.innerHTML = '<p class="reviews-empty">Não foi possível carregar as avaliações do Google no momento.</p>';
        }
        return;
      }

      updateSummary(place);
      renderReviews(place.reviews || []);
    }
  );
}

function initTopAlert() {
  const closeButton = document.querySelector('.top-alert__close');
  const topAlert = document.querySelector('.top-alert');

  if (!closeButton || !topAlert) return;

  closeButton.addEventListener('click', () => {
    topAlert.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initRevealAnimations();
  initSmoothScroll();
  initTopAlert();
});

window.initGooglePlaces = initGooglePlaces;
