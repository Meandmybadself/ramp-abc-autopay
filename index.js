const rp = require('request-promise')
const cheerio = require('cheerio')
const extend = require('extend')
require('dotenv').load()

// These are defined in .env (which is gitignored)
const USERNAME = process.env.USERNAME
const PASSWORD = process.env.PASSWORD
const ACCOUNT_ID = process.env.ACCOUNT_ID

const LOGIN_URL = 'https://www2.mplsparking.com/secure/Login/Login.aspx'
const PAY_URL = 'https://www2.mplsparking.com/secure/AdminWebUser/payment.aspx'

let j = rp.jar()

function getWebformsTokens (url) {
  console.log('Fetching webforms tokens.')
  return new Promise((resolve, reject) => {
    let opts = {
      'uri': url,
      'jar': j,
      'transform': function (body) {
        return cheerio.load(body)
      }
    }

    rp(opts)
      .then(($) => {
        let rsp = {}

        // Run through all the hidden input tags.
        $('input[type="hidden"]').each((i, el) => {
          rsp[$(el).attr('name')] = $(el).attr('value')
        })

        return resolve(rsp)
      })
      .catch((e) => {
        return reject(e)
      })
  })
}

function authenticate (tokens) {
  console.log('Authenticating.')
  return new Promise((resolve, reject) => {
    let postArgs = {
      'username': USERNAME,
      'password': PASSWORD,
      'account': ACCOUNT_ID,
      'Submit1': 'Login',
      '__EVENTTARGET': '',
      '__EVENTARGUMENT': ''
    }

    postArgs = extend(postArgs, tokens)

    let opts = {
      'jar': j,
      'method': 'POST',
      'uri': LOGIN_URL,
      'form': postArgs,
      'followAllRedirects': true
    }

    rp(opts)
      .then((body) => {
        console.log('Authentication successful.')
        return resolve()
      })
      .catch((e) => {
        console.log('Authentication failed.')
        return reject()
      })
  })
}

function getPaymentPage () {
  console.log('Getting the payment page.')
  return new Promise((resolve, reject) => {
    let opts = {
      'jar': j,
      'method': 'GET',
      'uri': PAY_URL,
      'followAllRedirects': true,
      'transform': function (body) {
        return cheerio.load(body)
      }
    }

    rp(opts)
      .then((body) => {
        console.log()
      })
  })
}

function choosePayFullAmount (tokens) {
  console.log('Selecting to pay full amount.')
  return new Promise((resolve, reject) => {

    let postArgs = {
      '__EVENTTARGET': 'Submit2',
      '__EVENTARGUMENT': '',
      'RadioGroup': 'rdoBalance',
      'txtTotalFullOther': '',
      'Submit2': 'Submit'
    }

    postArgs = extend(postArgs, tokens)

    let opts = {
      'jar': j,
      'method': 'POST',
      'uri': LOGIN_URL,
      'form': postArgs,
      'followAllRedirects': true,
      'transform': function (body) {
        return cheerio.load(body)
      }
    }

    rp(opts)
      .then(($) => {
        let form = $('form#_xclick')
        let formAct = form.attr('action')

        let formVals = {}
        $(form).find('input').each((i, el) => {
          console.log(i, el)
        })

      // console.log('body', body)
      })
      .catch((e) => {
        console.log('err', e)
      })
  })
}

getWebformsTokens(LOGIN_URL)
  .then((tokens) => {
    authenticate(tokens)
      .then(() => {
        console.log('?')
        getWebformsTokens(PAYMENT_URL)
          .then((tokens) => {
            console.log('aa')
            choosePayFullAmount(tokens)
          })
      })
  })
