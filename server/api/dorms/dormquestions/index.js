const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dormquestions.controller')
const AnswerIndex = require('./dormquestionanswers/index')

router.use('/answers', AnswerIndex)
router.get('/', Ctrl.getQuestions)
router.post('/', Ctrl.postQuestion)
router.put('/:id', Ctrl.editQuestion)
router.delete('/:id', Ctrl.deleteQuestion)
router.post('/vote/:id', Ctrl.voteOnQuestion)

module.exports = router.routes()
