// X Unfollow Pro – Welcome Page Script

document.addEventListener('DOMContentLoaded', () => {
  // Load plan status
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (data) => {
      if (!data) return;
      // Could update plan display if needed
    });
  }

  // Animate elements on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.step-card, .plan-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  // Add staggered delays to cards
  document.querySelectorAll('.steps-grid .step-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
  });

  document.querySelectorAll('.plan-grid .plan-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
  });
});

// CSS class for animation
const style = document.createElement('style');
style.textContent = `.animate-in { opacity: 1 !important; transform: translateY(0) !important; }`;
document.head.appendChild(style);
