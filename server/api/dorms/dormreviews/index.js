const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dormreviews.controller')

const requireLoggedIn = function (ctx, next) {
  if (!ctx.state.user) return ctx.unauthorized('You must be logged in to do this!')
  return next()
}

router.get('/:id', Ctrl.getReviews)
router.post('/:id', requireLoggedIn, Ctrl.postReview)
router.put('/:id', requireLoggedIn, Ctrl.editReview)
router.delete('/:id', requireLoggedIn, Ctrl.deleteReview)
router.post('/vote/:id', requireLoggedIn, Ctrl.voteOnReview)

module.exports = router.routes()
