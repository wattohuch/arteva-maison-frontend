/**
 * ARTEVA Maison - Reviews Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only init if we are on a product page
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) return;

    loadReviews(productId);
    setupReviewForm(productId);
});

async function loadReviews(productId) {
    const reviewsList = document.getElementById('reviewsList');
    const avgRatingDisplay = document.getElementById('avgRatingDisplay');
    const reviewCountDisplay = document.getElementById('reviewCountDisplay');
    const avgStarsDisplay = document.getElementById('avgStarsDisplay');

    try {
        const data = await apiRequest(`/products/${productId}/reviews`); // Helper from api.js

        if (data.success) {
            const reviews = data.data;

            // Update stats if provided in product response (or calc locally)
            // Ideally we fetch product again or use the reviews to calc
            const count = reviews.length;
            const avg = count > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / count).toFixed(1) : '0.0';

            avgRatingDisplay.textContent = avg;
            reviewCountDisplay.textContent = count;
            renderStars(Number(avg), avgStarsDisplay);

            if (count > 0) {
                reviewsList.innerHTML = reviews.map(review => {
                    const verifiedText = window.getTranslation ? window.getTranslation('verified_purchase') : 'Verified Purchase';
                    const date = new Date(review.createdAt).toLocaleDateString(
                        document.documentElement.lang === 'ar' ? 'ar-KW' : 'en-US'
                    );

                    return `
                    <div class="review-item" style="border-bottom: 1px solid #eee; padding: 20px 0;">
                        <div class="review-header" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div class="reviewer-info">
                                <strong class="reviewer-name">${review.user.name}</strong>
                                ${review.isVerifiedPurchase ? `<span style="font-size: 0.8rem; color: #10b981; margin-left:8px;"><i class="fas fa-check-circle"></i> ${verifiedText}</span>` : ''}
                            </div>
                            <span class="review-date" style="color: #888; font-size: 0.9rem;">${date}</span>
                        </div>
                        <div class="review-stars" style="color: var(--color-gold); margin-bottom: 10px;">
                            ${getStarbox(review.rating)}
                        </div>
                        <p class="review-text" style="color: #444; line-height: 1.5;">${review.comment}</p>
                    </div>
                `}).join('');
            } else {
                const noReviewsText = window.getTranslation ? window.getTranslation('no_reviews') : 'No reviews yet. Be the first to review!';
                reviewsList.innerHTML = `<p style="color: #888; font-style: italic;">${noReviewsText}</p>`;
            }
        }
    } catch (error) {
        console.error('Failed to load reviews:', error);
    }
}

function setupReviewForm(productId) {
    const writeBtn = document.getElementById('writeReviewBtn');
    const formContainer = document.getElementById('reviewFormContainer');
    const cancelBtn = document.getElementById('cancelReviewBtn');
    const form = document.getElementById('reviewForm');
    const stars = document.querySelectorAll('.star-rating-input i');
    const ratingInput = document.getElementById('reviewRating');

    if (!AuthAPI.isLoggedIn()) {
        writeBtn.addEventListener('click', () => {
            window.location.href = `account.html?redirect=product.html?id=${productId}`;
        });
        return;
    }

    writeBtn.addEventListener('click', () => {
        formContainer.style.display = 'block';
        writeBtn.style.display = 'none';

        // Reset stars
        stars.forEach(s => {
            s.className = 'far fa-star';
            s.style.color = '#ddd';
        });
        ratingInput.value = '';
    });

    cancelBtn.addEventListener('click', () => {
        formContainer.style.display = 'none';
        writeBtn.style.display = 'block';
    });

    // Star rating interaction
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.dataset.value;
            ratingInput.value = value;
            updateStarInput(value);
        });

        star.addEventListener('mouseover', () => {
            updateStarInput(star.dataset.value, true);
        });
    });

    document.querySelector('.star-rating-input').addEventListener('mouseleave', () => {
        updateStarInput(ratingInput.value);
    });

    function updateStarInput(value, isHover = false) {
        stars.forEach(s => {
            if (s.dataset.value <= value) {
                s.className = 'fas fa-star'; // Solid
                s.style.color = 'var(--color-gold)';
            } else {
                s.className = 'far fa-star'; // Regular/Outline
                s.style.color = '#ddd';
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!ratingInput.value) {
            alert(window.getTranslation ? window.getTranslation('rating_required') || 'Please select a rating' : 'Please select a rating');
            return;
        }

        const comment = document.getElementById('reviewComment').value;
        const btn = form.querySelector('button[type="submit"]');

        const submittingText = window.getTranslation ? window.getTranslation('submitting') || 'Submitting...' : 'Submitting...';
        const submitText = window.getTranslation ? window.getTranslation('submit_review') : 'Submit Review';
        const successText = window.getTranslation ? window.getTranslation('review_submitted') : 'Review submitted successfully!';
        const failText = window.getTranslation ? window.getTranslation('review_failed') : 'Failed to submit review';

        btn.disabled = true;
        btn.textContent = submittingText;

        try {
            await apiRequest(`/products/${productId}/reviews`, {
                method: 'POST',
                body: JSON.stringify({
                    rating: ratingInput.value,
                    comment
                })
            });

            // Reset and reload
            form.reset();
            updateStarInput(0);
            ratingInput.value = '';
            formContainer.style.display = 'none';
            writeBtn.style.display = 'block';
            loadReviews(productId);
            alert(successText);
        } catch (error) {
            alert(error.message || failText);
        } finally {
            btn.disabled = false;
            btn.textContent = submitText;
        }
    });
}

function renderStars(rating, element) {
    element.innerHTML = getStarbox(rating);
}

function getStarbox(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            html += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            html += '<i class="fas fa-star-half-alt"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }
    return html;
}
