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
});
