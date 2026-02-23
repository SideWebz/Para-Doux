document.addEventListener('DOMContentLoaded', function () {

  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const navbarNav = document.getElementById('navbarNav');

  if (hamburgerMenu && navbarNav) {

    hamburgerMenu.addEventListener('click', function () {
      hamburgerMenu.classList.toggle('active');
      navbarNav.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });

    const navLinks = navbarNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function () {
        hamburgerMenu.classList.remove('active');
        navbarNav.classList.remove('active');
        document.body.classList.remove('menu-open');
      });
    });
  }

  // Back to Top Button Functionality
  const backToTopButton = document.getElementById('backToTop');

  if (backToTopButton) {
    // Show/hide button based on scroll position
    const toggleBackToTopButton = function () {
      if (document.documentElement.scrollTop > 100 || document.body.scrollTop > 100) {
        backToTopButton.classList.add('show');
      } else {
        backToTopButton.classList.remove('show');
      }
    };

    // Listen to scroll events
    window.addEventListener('scroll', toggleBackToTopButton, { passive: true });
    
    // Check on page load
    toggleBackToTopButton();

    // Scroll to top when button is clicked
    backToTopButton.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});
