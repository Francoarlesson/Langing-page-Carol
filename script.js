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

  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach((element) => observer.observe(element));
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

document.addEventListener('DOMContentLoaded', () => {
  initRevealAnimations();
  initSmoothScroll();
});

window.initGooglePlaces = initGooglePlaces;
