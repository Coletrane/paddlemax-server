const router = require('express').Router()
const config = require('../../config')
const request = require('request-promise')
const User = require('../../models').User

// Endpoints
router.post('/user/login', (req, res, next) => {
  if (!req.body.email) {
    res.status(400)
    res.send('Email is required')
  }

  if (req.body.facebookAuthToken) {
    let fbReqUrl = buildFacebookUrl(req.body)
    request
      .get(fbReqUrl, async (err, response, body) => { // important to name that 'response' so to not clash with the name in the scope above this one
        if (err) {
          res.status(400)
          res.send(err.description)
        }

        const fbUser = JSON.parse(body)
        if (fbUser.id) {
          const existingUser = await User.findOne({
            where: {
              email: req.body.email
            }
          })
          if (existingUser) {
            res.status(200)
            res.send(existingUser)
          }

          // prioritize properties sent to us over Facebook's
          const newUser = await User.create({
            firstName: req.body.firstName || fbUser.name.split(' ')[0],
            lastName: req.body.lastName || fbUser.name.split(' ')[1],
            email: req.body.email || fbUser.email,
            location: req.body.location || fbUser.location, // FIXME: right property name?
            weightLbs: req.body.weightLbs,
            birthday: req.body.birthday || fbUser.birthday,
            facebookId: fbUser.id
          })
          res.status(200)
          res.send(newUser)
        }
      })
      .catch((err) => {
        res.status(err.statusCode)
        res.send('Error querying Facebook API')
      })
  } else if (req.body.googleAuthToken) {

  } else {
    res.status(400)
    res.send('Auth token is required')
  }
})

router.get('/user/me', config.jwt, async (req, res, next) => {
  // console.log('WEight lbs', req.body)
  if (!req.body.email) {
    res.status(400)
    res.send('Email is required')
  }

  getUser(req, res, next)
})

router.patch('/user', config.jwt, async (req, res, next) => {
  if (!req.body.email) {
    res.status(400)
    res.send('Email is required')
  }

  await User.upsert(req.body)
  getUser(req, res, next)
})

// Methods
const getUser = async (req, res, next) => {
  const user = await User.findOne({
    where: {
      email: req.body.email
    }
  })

  if (user) {
    res.status(200)
    res.send(user)
  } else {
    res.status(404)
    res.send()
  }
}

const buildFacebookUrl = (user) => {
  let url = `${config.constants.facebookBaseUrl}/me?fields=id,name`

  if (user.birthday) {
    url += ',birthday'
  }
  if (user.location) {
    url += ',location'
  }
  url += `&access_token=${user.facebookAuthToken}`

  return url
}

module.exports = router
