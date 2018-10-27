const m3u8 = require('m3u8')
const fs = require('fs')
const HlsSegmentReader = require('hls-segment-reader')
const HlsTools = require('hls-tools')

module.exports = async function (rp, r, deviceid, sn, filename) {
  const { login, vip } = await rp(`https://ani.gamer.com.tw/ajax/token.php?adID=80900&sn=${sn}&device=${deviceid}&hash=7ca44439f724`)
  if (!login) {
    throw new Error('尚未登入或 session 過期')
  } else if (!vip) {
    throw new Error('未付費會員')
  }

  const src = 'https:' + (await rp(`https://ani.gamer.com.tw/ajax/m3u8.php?sn=${sn}&device=${deviceid}`)).src

  console.log(await rp(`https://ani.gamer.com.tw/ajax/unlock.php?sn=${sn}&ttl=0`))

  console.log(await rp('https://ani.gamer.com.tw/ajax/checklock.php?device=' + deviceid))

  const parser = m3u8.createStream()
  r(src).pipe(parser)
  const url = await new Promise((resolve, reject) => {
    parser.on('m3u', function (m3u) {
      const maxResolutionChannel = m3u.items.StreamItem.map((e) => {
        console.log(e.attributes.attributes.resolution)
        return {
          resolution: e.attributes.attributes.resolution,
          uri: e.properties.uri
        }
      }).reduce((pre, cur) => (pre.resolution[0] < cur.resolution[0]) ? cur : pre)
      return resolve(src.match(/.*\//)[0] + maxResolutionChannel.uri)
    })
  })

  return new Promise((resolve, reject) => {
    const segmentReader = new HlsSegmentReader(url, {
      withData: true,
      highWaterMark: 0
    })
    const reader = new HlsTools.reader(segmentReader) // eslint-disable-line new-cap
    /* ts segment 串接 */
    reader.pipe(fs.createWriteStream('download/' + filename))
    let totalDownloadSize = 0 // bytes
    /* 每個 ts 片段影片 */
    reader.on('segment', (segmentInfo) => {
      const downloadSize = segmentInfo.file.size // bytes

      const duration = segmentInfo.details.duration
      const speed = ((downloadSize) / (duration * 1024)).toFixed(1) // kbps

      const displayDownloadSize = ((totalDownloadSize += downloadSize) < 1024 * 1024) ? (totalDownloadSize / 1024).toFixed(2) + 'kB' : (totalDownloadSize / (1024 * 1024)).toFixed(2) + 'mB'
      console.log(speed, displayDownloadSize)
    // this.emit('update', displayDownloadSize, speed)
    })
    reader.on('error', (err) => {
    // this.emit('error', err)
      console.log(err)
      reject(err)
    })
    reader.on('end', (code) => {
    // this.emit('end')
      resolve()
    })
  })
}
