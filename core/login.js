const atob = (data) => Buffer.from(data, 'base64').toString('ascii')

const btoa = (data) => Buffer.from(data).toString('base64')

function b (paramString) {
  const arrayOfInt = [-1, -1]

  let localStringBuilder = paramString.substring(12, 16) + paramString.substring(7, 12) + paramString.substring(0, 7)

  paramString = atob(localStringBuilder)
  if (!paramString.match('^[0-9]{12}$')) {
    return arrayOfInt
  }

  arrayOfInt[0] = ~~paramString.substring(4, 6)
  arrayOfInt[1] = ~~paramString.substring(8, 10)

  return arrayOfInt
}

function r (paramInt1, paramInt2) {
  return ~~(Math.random() * (paramInt2 - paramInt1 + 1)) + paramInt1
}

function a (paramInt1, paramInt2) {
  const str1 = paramInt1.toString().padStart(2, 0)
  const localObject1 = paramInt2.toString().padStart(2, 0)
  const str2 = ~~(Math.random() * 9999 + 1).toString().padStart(4, 0)
  const str3 = ~~(Math.random() * 99 + 1).toString().padStart(2, 0)
  const localObject2 = ~~(Math.random() * 99 + 1).toString().padStart(2, 0)

  const localStringBuilder = str1 + str2 + str3 + localObject2 + localObject1
  const res = btoa(localStringBuilder)
  return res.substring(9, 16) + res.substring(4, 9) + res.substring(0, 4)
}

function getCode (p) {
  const z = b(p)
  const i = r(z[0] - 5, z[0] + 5)
  const j = r(z[1] - 5, z[1] + 5)
  return a(i, j)
}

module.exports = async function (rp, uid, passwd) {
  const { code: tCode } = await rp({
    url: 'https://api.gamer.com.tw/mobile_app/user/v1/login.php',
    method: 'POST',
    form: {
      token: 'e060p355E4Y'
    }
  })
  const code = getCode(tCode)
  const res = await rp({
    url: 'https://api.gamer.com.tw/mobile_app/user/v2/do_login.php',
    method: 'POST',
    form: {
      uid,
      passwd,
      token: 'e060p355E4Y',
      code
    }
  })
  console.log(res)
  const { success } = res
  if (!success) {
    throw new Error('登入失敗')
  }
  const { deviceid } = await rp('https://ani.gamer.com.tw/ajax/getdeviceid.php?id=')
  console.log(deviceid)
  return deviceid
}
