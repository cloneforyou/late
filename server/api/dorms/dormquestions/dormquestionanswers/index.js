const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dormquestionanswers.controller')

router.get('/:id', Ctrl.getAnswersForQuestion)
router.post('/:id', Ctrl.postAnswer)
router.put('/:id', Ctrl.editAnswer)
router.delete('/:id', Ctrl.deleteAnswer)
router.post('/vote/:id', Ctrl.voteOnAnswer)

module.exports = router.routes()
