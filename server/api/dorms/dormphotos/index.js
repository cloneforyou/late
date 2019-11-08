const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dormphotos.controller')

const requireAdmin = function (ctx, next) {
  if (!ctx.state.user || !ctx.state.user.admin) return ctx.unauthorized('Must be logged in as an admin!')
  return next()
}
const requireLoggedIn = function (ctx, next) {
  if (!ctx.state.user) return ctx.unauthorized('You must be logged in to do this!')
  return next()
}

router.get('/:id', Ctrl.getPhotosForDorm)
router.post('/:id', requireLoggedIn, Ctrl.postPhoto)
router.post('/vote/:id', requireLoggedIn, Ctrl.voteOnPhoto)
router.put('/:id', requireLoggedIn, Ctrl.editPhoto)
router.delete('/:id', requireLoggedIn, Ctrl.deletePhoto)

module.exports = router.routes()
