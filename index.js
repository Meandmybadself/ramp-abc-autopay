const rp = require('request-promise')
const cheerio = require('cheerio')
const extend = require('extend')

require('dotenv').load()

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
      'username': process.env.USERNAME,
      'password': process.env.PASSWORD,
      'account': process.env.ACCOUNT_ID,
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
        return resolve()
      })
      .catch((e) => {
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
        console.log('Retrieved payment page.')
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
      'uri': PAY_URL,
      'form': postArgs,
      'followAllRedirects': true,
      'transform': function (body) {
        return cheerio.load(body)
      }
    }

    rp(opts)
      .then(($) => {
        console.log('Loaded third-party form details.')
        let form = $('form#_xclick')
        let formAct = form.attr('action')

        let formData = {}
        // console.log('form', form, formAct)
        $(form).find('input').each((i, el) => {
          formData[$(el).attr('name')] = $(el).attr('value') || ''
        })

        return resolve({'url': formAct, 'data': formData})
      })
      .catch((e) => {
        return reject(e)
      })
  })
}

function loadPaymentForm (formObj) {
  return new Promise((resolve, reject) => {
    console.log('Loading third-party payment form')

    let opts = {
      'jar': j,
      'method': 'POST',
      'uri': formObj.url,
      'form': formObj.data,
      'followAllRedirects': true,
      'transform': function (body) {
        return cheerio.load(body)
      }
    }

    rp(opts)
      .then(($) => {

        return resolve({
          'url': formObj.url,
          'data': {
            'XXX_IPG_XXX': 'confirm',
            'XXX_IPGTRXNO_XXX': $('input[name="XXX_IPGTRXNO_XXX"]').attr('value'),
            'XXX_IPGSESSION_XXX': $('input[name="XXX_IPGSESSION_XXX"]').attr('value'),
            'card_pan': process.env.CREDIT_CARD_NUMBER,
            'card_date_expiry_month': process.env.CREDIT_CARD_MONTH,
            'card_date_expiry_year': process.env.CREDIT_CARD_YEAR,
            'card_card_security_cvx_2': process.env.CREDIT_CARD_CVV,
            'card_holder_address_postal_code': process.env.CREDIT_CARD_ZIP,
            'buttonPay': 'Pay'
          }
        })
      })
      .catch((e) => {
        return reject(e)
      })
  })
}

function submitPaymentForm (formObj) {
  console.log('Submitting payment form.', formObj)
  return new Promise((resolve, reject) => {
    let opts = {
      'jar': j,
      'method': 'POST',
      'uri': formObj.url,
      'form': formObj.data,
      'followAllRedirects': true,
      'transform': function (body) {
        return cheerio.load(body)
      }
    }

    rp(opts)
      .then(($) => {
        console.log("Payment submitted.")
        // TODO - Check for presence of error message in response.
      })
      .err((e) => {
        return reject(e)
      })
  })
}

getWebformsTokens(LOGIN_URL)
  .then((tokens) => {
    authenticate(tokens)
      .then(() => {
        console.log('Authentication successful.')
        getWebformsTokens(PAY_URL)
          .then((tokens) => {
            choosePayFullAmount(tokens)
              .then((formObj) => {
                loadPaymentForm(formObj)
                  .then((payFormObj) => {
                    submitPaymentForm(payFormObj)
                  })
              })
          })
      })
      .catch((e) => {
        console.log('Authentication error.', e)
      })
  })
