const request = require('request-promise-native');

module.exports = (keyword) => request({
  uri: 'https://api.gamer.com.tw/mobile_app/anime/v1/search.php',
  qs: {
    kw: keyword
  },
  json: true
});
