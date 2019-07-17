const gpickr = new GPickr({
    el: '.gpickr',
    stops: [
        ['rgb(255,132,109)', 0],
        ['rgb(255,136,230)', 1]
    ]
});

gpickr.on('init', instance => {
    console.log('init', instance);
}).on('change', instance => {
    console.log('change', instance.getGradient());
});
