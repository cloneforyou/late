const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dormquestionanswers.controller')

const requireLoggedIn = function (ctx, next) {
  if (!ctx.state.user) return ctx.unauthorized('You must be logged in to do this!')
  return next()
}

router.post('/:id', requireLoggedIn, Ctrl.postAnswer)
router.put('/:id', requireLoggedIn, Ctrl.editAnswer)
router.delete('/:id', requireLoggedIn, Ctrl.deleteAnswer)
router.post('/vote/:id', requireLoggedIn, Ctrl.voteOnAnswer)

module.exports = router.routes()
