$(document).ready(() => {
    $('#nav-menu').on('click', () => {
        $('#menu').toggleClass('btn-close');
        $('#sidebar').toggleClass('menu-open');
    });

    $(window).scroll(() => {
        if ($(document).scrollTop() > 20) {
            $('#back-to-top').removeClass('hidden');
          } else {
            $('#back-to-top').addClass('hidden');
          }
    });

    $('#back-to-top').on('click', () => {
        $(document).scrollTop(0); // For Safari
        $('#back-to-top').removeClass('hidden');
    })
});