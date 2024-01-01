// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    metadata: require('./library/metadata'),
    automate: require('./library/automate'),
  }
}
