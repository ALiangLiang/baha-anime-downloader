let r = require('request')
let rp = require('request-promise-native')
const FileCookieStore = require('tough-cookie-filestore')
const inquirer = require('inquirer')

const login = require('./core/login')
const download = require('./core/download')
const search = require('./api/search')
const getAnimeInfo = require('./api/video')

const id = require('./.id.json')

const jar = rp.jar(new FileCookieStore('cookies.json'))

// rp.debug = true
const defaults = {
  method: 'GET',
  headers: {
    'x-requested-with': 'XMLHttpRequest',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
    referer: 'https://ani.gamer.com.tw/animeVideo.php?sn=10854'
  },
  timeout: 10000,
  jar,
  json: true
}
r = r.defaults(defaults)
rp = rp.defaults(defaults)

async function userSearchAnime () {
  const answer = await inquirer.prompt([{
    type: 'input',
    name: 'name',
    message: '請輸入動畫名關鍵字：'
  }])
  // 使用關鍵字進行搜尋。
  return search(answer.name)
}

async function userChooseAnime (animes) {
  // 如果搜尋結果剛好只有一個。
  if (animes.length === 1) {
    // 確認
    return inquirer.prompt([{
      type: 'list',
      name: 'ensure',
      message: `請問你要的是 ${animes[0].title} 嗎?`,
      choices: [
        `是的，我要下載 ${animes[0].title}`,
        '不是'
      ]
    }])
      .then((answer) => (answer.ensure !== '不是') ? animes[0] : new Error('找不到要的，再搜尋一次'))
  } else if (animes.length === 0) { // 找不到。
  // 再讓使用者搜尋一次。
    return new Error('找不到相關的動畫。')
  } else { // 搜尋到複數個動畫。
    // 讓使用者選擇。
    let question = '搜尋到多部動畫，請選擇：'
    animes.forEach((anime, i) => (question += `\n${i + 1}. ${anime.title}`))
    question += '\n'
    return inquirer.prompt([{
      type: 'list',
      name: 'selection',
      message: `搜尋到多部動畫，請選擇：`,
      choices: animes.map((e) => e.title).concat('都不是我要的。')
    }])
      .then((answer) =>
        (answer.selection !== '都不是我要的。')
          ? animes.find((e) => e.title === answer.selection)
          : new Error('找不到要的，再搜尋一次'))
  }
}

async function userGetAnime () {
  // 先搜尋。
  return userSearchAnime()
    // 再找出使用者要的是哪部。
    .then((res) => userChooseAnime(res.anime))
    .then((anime) => getAnimeInfo({
      anime_sn: anime.anime_sn
    }))
    .catch((err) => {
      // 發生錯誤。
      console.trace(err)
      // 再取得一次。
      return userGetAnime()
    })
}

async function asyncForEach (array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

async function main () {
  const target = await userGetAnime()
  // const animeName = target.anime.title
  const episodes = Object.values(target.anime.volumes)[0]

  const answer = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmDlAll',
    message: `共有 ${episodes.length} 集，請問是否全部下載？`
  }])

  let list = []
  if (answer.confirmDlAll) {
    list = episodes
  } else {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'selectEpisode',
      message: `共有 ${episodes.length} 集，請輸入要下載的集數。\n例如下載第一集、五到七集、第三集、第十集(含)之後\n就輸入「1,5-7,3,10-」(不包括引號)\n`
    }])
    const limit = episodes.length
    let episodeList = []
    answer.selectEpisode.split(',').forEach((e) => {
      if (!Number.isNaN(Number(e))) {
        episodeList.push(Number(e))
      } else if (e.match(/^\d*-$/)) {
        const min = Number(e.replace(/-$/, ''))
        episodeList = episodeList.concat(Array(limit - min + 1).fill(true).map((f, i) => i + min))
      } else if (e.match(/^\d*-\d*$/)) {
        const range = e.split('-').map((e) => Number(e))
        episodeList = episodeList.concat(Array(range[1] - range[0] + 1).fill(true).map((f, i) => i + range[0]))
      }
    })
    episodes.forEach((e, i) =>
      (episodeList.includes(i + 1)) ? list.push(e) : void 0)
  }

  // fs.mkdirSync('download')
  const deviceId = await login(rp, id.account || process.env.account, id.password || process.env.password)

  asyncForEach(list, async function (player) {
    const sn = player.video_sn
    const filename = (await getAnimeInfo({ sn })).video.title + '.ts'

    return download(rp, r, deviceId, sn, filename)
  })
}

main()
