module.exports = {
  SlideGenerator: require('./lib/slide_generator').default,
  ensureMarkers: require('./lib/deck_import').ensureMarkers,
  copySlide: require('./lib/deck_import').copySlide,
  editSlide: require('./lib/deck_import').editSlide,
};
