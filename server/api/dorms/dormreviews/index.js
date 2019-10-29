const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dormreviews.controller')

router.get('/', Ctrl.getReviews)
router.post('/:id', Ctrl.postReview)
router.put('/:id', Ctrl.editReview)
router.delete('/:id', Ctrl.deleteReview)
router.post('/vote/:id', Ctrl.voteOnReview)

module.exports = router.routes()
