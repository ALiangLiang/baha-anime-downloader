const request = require('request-promise-native');

module.exports = (qs) => {
  return request({
    uri: 'https://api.gamer.com.tw/mobile_app/anime/v1/video.php',
    qs,
    json: true
  })
};
