$(document).ready(() => {
  $('#nav-menu').on('click', () => {
    $('#menu').toggleClass('btn-close');
    $('#sidebar').toggleClass('menu-open');
    $('#taunts').toggleClass('menu-open');
  });

  $('#nav-menu-card').on('click', () => {
    $('#menu').toggleClass('btn-close');
    $('#sidebar').toggleClass('menu-open');
    $('#taunts').toggleClass('menu-open');
  });

  $(window).scroll(() => {
    if ($(document).scrollTop() > 20) {
      $('#back-to-top').removeClass('hidden');
    } else {
      $('#back-to-top').addClass('hidden');
    }
  });

  $('#back-to-top').on('click', () => {
    /*==========+
     |For Safari|
     +==========*/
    $(document).scrollTop(0);
    $('#back-to-top').removeClass('hidden');
  });
});
