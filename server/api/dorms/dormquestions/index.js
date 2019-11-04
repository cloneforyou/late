const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dormquestions.controller')
const AnswerIndex = require('./dormquestionanswers/index')

const requireLoggedIn = function (ctx, next) {
  if (!ctx.state.user) return ctx.unauthorized('You must be logged in to do this!')
  return next()
}

router.use('/answers', AnswerIndex)
router.get('/', Ctrl.getQuestions)
router.post('/', requireLoggedIn, Ctrl.postQuestion)
router.put('/:id', requireLoggedIn, Ctrl.editQuestion)
router.delete('/:id', requireLoggedIn, Ctrl.deleteQuestion)
router.post('/vote/:id', requireLoggedIn, Ctrl.voteOnQuestion)

module.exports = router.routes()
